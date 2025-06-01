const express = require("express");
const bcrypt = require("bcrypt");
const speakeasy = require("speakeasy");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
require("dotenv").config();
const authMiddleware = require("../middleware/authMiddleware");
const multer = require("multer");
const path = require("path");

const router = express.Router();

// === MULTER CONFIGURATION ===
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, "uploads/"),
    filename: (req, file, cb) => {
        // Ajout de l'ID utilisateur dans le nom si disponible pour éviter les collisions
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

// === TOKEN GENERATION FUNCTIONS ===
function generateAccessToken(user) {
    return jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
    );
}

function generateRefreshToken(user) {
    return jwt.sign(
        { id: user._id },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: "7d" }
    );
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

        // On renvoie l'id pour que le frontend puisse continuer la saisie sur une autre page
        res.status(201).json({
            message: "Utilisateur créé avec succès !",
            userId: newUser._id
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// === COMPLETE PROFILE ROUTE (corrigé : auth + contrôle d’identité) ===
// Mise à jour des infos complémentaires du profil après inscription
router.put("/complete-profile/:userId", authMiddleware, async (req, res) => {
    try {
        const { userId } = req.params;
        if (req.user.id !== userId) {
            return res.status(403).json({ message: "Accès refusé." });
        }

        const {
            bio,
            location,        // Exemple: { type: "Point", coordinates: [lng, lat] }
            distanceMax,
            preferences,     // Exemple: { ageRange: {min, max} }
            relationshipType,
            dateOfBirth,
            genderPreference,
            languages,
            profilePictures  // Tableau de chemins d’images
        } = req.body;

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "Utilisateur non trouvé." });

        // Mise à jour des champs si présents dans la requête
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
// Met à jour le profil utilisateur connecté (bio, distance, préférences, langues, etc.)
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
        console.error("Erreur mise à jour profil:", error);
        res.status(500).json({ message: "Erreur serveur" });
    }
});

// === LOGIN ROUTE ===
// Note : ici on vérifie si 2FA activé, si oui, il faut un code, sinon on renvoie tokens directement
router.post("/login", async (req, res) => {
    try {
        const { email, password, code } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "Utilisateur non trouvé !" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Mot de passe incorrect !" });

        if (user.twoFactorEnabled) {
            // Si 2FA activé mais pas de code fourni : demande d’envoi du code 2FA
            if (!code) {
                return res.status(206).json({ // 206 Partial Content: code manquant
                    message: "Code 2FA requis.",
                    twoFactorRequired: true
                });
            }

            // Vérification du code 2FA
            const valid2FA = speakeasy.totp.verify({
                secret: user.twoFactorSecret,
                encoding: "base32",
                token: code,
                window: 1 // tolérance d’une période avant/après
            });

            if (!valid2FA) return res.status(403).json({ message: "Code 2FA invalide." });
        }

        // Génération tokens
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        // Sauvegarde refresh token côté utilisateur
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
// Cette route est utile si tu veux valider le code 2FA dans une étape séparée, 
// par exemple dans une page dédiée de vérification 2FA
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

        // Génération tokens après validation 2FA
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
// Ici, le front doit envoyer l'email de l'utilisateur pour retrouver le secret 2FA
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

// === REFRESH TOKEN ROUTE ===
router.post("/refresh-token", async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) return res.status(401).json({ message: "Refresh token requis." });

        let payload;
        try {
            payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        } catch {
            return res.status(403).json({ message: "Refresh token invalide." });
        }

        const user = await User.findById(payload.id);
        if (!user || !user.refreshTokens.includes(refreshToken)) {
            return res.status(403).json({ message: "Refresh token non reconnu." });
        }

        const newAccessToken = generateAccessToken(user);
        res.json({ accessToken: newAccessToken });

    } catch (error) {
        res.status(500).json({ error: error.message });
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
