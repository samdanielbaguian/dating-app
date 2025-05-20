const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const authMiddleware = require("../middleware/authMiddleware");
const User = require("../models/User");

const router = express.Router();

// === CONFIGURATION DE MULTER ===
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, "uploads/"),
    filename: (req, file, cb) =>
        cb(null, Date.now() + path.extname(file.originalname))
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mime = allowedTypes.test(file.mimetype);
    if (ext && mime) {
        cb(null, true);
    } else {
        cb(new Error("Format de fichier non valide."));
    }
};

const upload = multer({
    storage,
    limits: { files: 4, fileSize: 10 * 1024 * 1024 }, // max 4 fichiers de 10 Mo chacun
    fileFilter
});

// === UPLOAD DE PHOTOS ===
router.post("/upload", authMiddleware, upload.array("photos", 4), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable." });

    const existingPhotos = user.profilePictures || [];
    const files = req.files.map(f => `/uploads/${f.filename}`);

    if (files.length === 0) {
      return res.status(400).json({ message: "Aucune photo envoyée." });
    }

    const totalPhotos = existingPhotos.length + (user.profilePicture ? 1 : 0) + files.length;
    if (totalPhotos > 4) {
      // Nettoyage des fichiers uploadés
      req.files.forEach(f => {
        const filePath = path.join(__dirname, "..", "uploads", f.filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      });
      return res.status(400).json({ message: "Nombre total de photos limité à 4." });
    }

    if (!user.profilePicture) {
      user.profilePicture = files[0];
      user.profilePictures = [...existingPhotos, ...files.slice(1)];
    } else {
      user.profilePictures = [...existingPhotos, ...files];
    }

    await user.save();

    res.json({
      message: "Photo(s) ajoutée(s) avec succès.",
      profilePicture: user.profilePicture,
      profilePictures: user.profilePictures
    });

  } catch (error) {
    if (req.files) {
      req.files.forEach(f => {
        const filePath = path.join(__dirname, "..", "uploads", f.filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      });
    }
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});


// === METTRE À JOUR LA PHOTO DE PROFIL ===
router.put("/profile-picture", authMiddleware, async (req, res) => {
    try {
        const { photo } = req.body;
        const user = await User.findById(req.user.id);

        if (!user || !user.profilePictures.includes(photo)) {
            return res.status(400).json({ message: "Photo non autorisée." });
        }

        if (user.profilePicture) {
            user.profilePictures.push(user.profilePicture);
        }

        user.profilePictures = user.profilePictures.filter(p => p !== photo);
        user.profilePicture = photo;

        await user.save();
        res.json({ message: "Photo de profil mise à jour.", user });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// === SUPPRIMER UNE PHOTO DE LA GALERIE ===
router.delete("/gallery-photo", authMiddleware, async (req, res) => {
    try {
        const { photo } = req.body;
        const user = await User.findById(req.user.id);

        if (!user || !user.profilePictures.includes(photo)) {
            return res.status(400).json({ message: "Photo non trouvée dans la galerie." });
        }

        user.profilePictures = user.profilePictures.filter(p => p !== photo);

        // Supprimer le fichier du disque
        const filePath = path.join(__dirname, "..", photo);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        await user.save();
        res.json({ message: "Photo supprimée.", user });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
