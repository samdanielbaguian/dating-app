const express = require("express");
const bcrypt = require("bcrypt");
const speakeasy = require("speakeasy");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");
const multer = require("multer");
const path = require("path");
require("dotenv").config();

const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require("../utils/jwt");

const router = express.Router();

// === MULTER CONFIGURATION ===
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const userId = req.user ? req.user.id + "_" : "";
    cb(null, userId + Date.now() + path.extname(file.originalname));
  }
});
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error("Format de fichier non valide."));
  }
};
const upload = multer({
  storage,
  limits: { files: 4, fileSize: 10 * 1024 * 1024 },
  fileFilter
});

// === UTILS ===
function userToSafeObject(user) {
  const obj = user.toObject ? user.toObject() : { ...user._doc };
  delete obj.password;
  delete obj.refreshTokens;
  delete obj.twoFactorSecret;
  delete obj.twoFactorTempSecret;
  return obj;
}

// === REGISTER ROUTE ===
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Cet email est déjà utilisé !" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();
    res.status(201).json({
      message: "Utilisateur créé avec succès !",
      userId: newUser._id
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// === COMPLETE PROFILE ROUTE ===
router.put("/complete-profile/:userId", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    if (req.user.id !== userId) return res.status(403).json({ message: "Accès refusé." });
    const {
      bio,
      location,
      distanceMax,
      preferences,
      relationshipType,
      dateOfBirth,
      genderPreference,
      languages,
      profilePictures
    } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "Utilisateur non trouvé." });
    if (bio !== undefined) user.bio = bio;
    if (location !== undefined) user.location = location;
    if (distanceMax !== undefined) user.distanceMax = distanceMax;
    if (preferences !== undefined) user.preferences = preferences;
    if (relationshipType !== undefined) user.relationshipType = relationshipType;
    if (dateOfBirth !== undefined) user.dateOfBirth = dateOfBirth;
    if (genderPreference !== undefined) user.genderPreference = genderPreference;
    if (languages !== undefined) user.languages = languages;
    if (profilePictures !== undefined) user.profilePictures = profilePictures;
    await user.save();
    res.json({
      message: "Profil complété avec succès.",
      user: userToSafeObject(user)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// === UPDATE PROFILE ROUTE ===
router.put("/update", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { bio, distanceMax, preferences, languages } = req.body;
    const updateFields = {};
    if (bio !== undefined) updateFields.bio = bio;
    if (distanceMax !== undefined) updateFields.distanceMax = distanceMax;
    if (preferences?.ageRange) updateFields["preferences.ageRange"] = preferences.ageRange;
    if (languages !== undefined) updateFields.languages = languages;
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      { new: true }
    );
    res.json({ message: "Profil mis à jour avec succès", user: userToSafeObject(updatedUser) });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// === LOGIN ROUTE ===
router.post("/login", async (req, res) => {
  try {
    const { email, password, code } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Utilisateur non trouvé !" });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Mot de passe incorrect !" });

    // Gestion 2FA
    if (user.twoFactorEnabled) {
      if (!code) {
        return res.status(206).json({
          message: "Code 2FA requis.",
          twoFactorRequired: true
        });
      }
      const valid2FA = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: "base32",
        token: code,
        window: 1
      });
      if (!valid2FA) return res.status(403).json({ message: "Code 2FA invalide." });
    }

    // Génération tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.refreshTokens = user.refreshTokens || [];
    user.refreshTokens.push(refreshToken);
    await user.save();

    res.json({
      message: "Connexion réussie !",
      accessToken,
      refreshToken,
      user: userToSafeObject(user)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// === VERIFY 2FA ROUTE ===
router.post("/verify-2fa", async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ message: "Email et code requis." });
    }
    const user = await User.findOne({ email });
    if (!user || !user.twoFactorSecret) {
      return res.status(404).json({ message: "Utilisateur ou secret 2FA introuvable." });
    }
    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token: code,
      window: 1
    });
    if (!isValid) {
      return res.status(403).json({ message: "Code 2FA invalide ou expiré." });
    }
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    user.refreshTokens = user.refreshTokens || [];
    user.refreshTokens.push(refreshToken);
    await user.save();
    res.json({
      message: "Code 2FA vérifié avec succès.",
      accessToken,
      refreshToken,
      user: userToSafeObject(user)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === RESEND 2FA CODE (simulé) ===
router.post("/resend-2fa", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email requis." });
    const user = await User.findOne({ email });
    if (!user || !user.twoFactorSecret) {
      return res.status(404).json({ message: "Utilisateur ou secret introuvable." });
    }
    // Génération du code 2FA actuel (simulé)
    const code = speakeasy.totp({
      secret: user.twoFactorSecret,
      encoding: "base32"
    });
    // Ici tu enverrais le code par mail ou sms, ici on le log
    console.log(`Code 2FA pour ${email} : ${code}`);
    res.json({ message: "Code 2FA renvoyé (simulé)." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === REFRESH TOKEN ROUTE (avec rotation du refresh token) ===
router.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ message: "Refresh token manquant." });
  try {
    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.id);
    if (!user || !user.refreshTokens.includes(refreshToken)) {
      return res.status(403).json({ message: "Refresh token invalide." });
    }
    // Génère nouveaux tokens
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    // Remplace le refresh token (rotation)
    user.refreshTokens = user.refreshTokens.filter(token => token !== refreshToken);
    user.refreshTokens.push(newRefreshToken);
    await user.save();

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    });
  } catch {
    return res.status(403).json({ message: "Refresh token invalide ou expiré." });
  }
});

// === GET ME (Profil utilisateur connecté) ===
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "Utilisateur non trouvé." });
    res.json({ user: user.toSafeObject() });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// === LOGOUT ROUTE ===
router.post("/logout", authMiddleware, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ message: "Refresh token requis." });
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "Utilisateur non trouvé." });
    user.refreshTokens = user.refreshTokens.filter(token => token !== refreshToken);
    await user.save();
    res.json({ message: "Déconnecté avec succès." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
