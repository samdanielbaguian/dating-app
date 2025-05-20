const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const User = require("../models/User");
const Match = require("../models/Match"); // ✅ Ajout de l'import du modèle Match
const { io } = require("../server"); // ✅ Utilisation correcte de l'instance io exportée

// Route unique pour liker un utilisateur
router.post("/like/:userId", authMiddleware, async (req, res) => {
  const { userId } = req.params;

  try {
    const currentUser = await User.findById(req.user.id);
    const likedUser = await User.findById(userId);

    if (!currentUser || !likedUser) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    // Éviter de liker deux fois
    if (currentUser.likes.includes(userId)) {
      return res.status(200).json({ message: "Déjà liké." });
    }

    // Ajouter le like
    currentUser.likes.push(userId);
    await currentUser.save();

    // Vérifier si l'autre utilisateur a également liké
    if (likedUser.likes.includes(req.user.id)) {
      // Créer un match
      const match = new Match({
        user1: req.user.id,
        user2: userId,
      });
      await match.save();

      // Émettre un événement WebSocket à chaque utilisateur
      io.to(req.user.id).emit("newMatch", { matchId: match._id, user: likedUser });
      io.to(userId).emit("newMatch", { matchId: match._id, user: currentUser });
    }

    res.status(200).json({ message: "Profil liké avec succès.", likedUserId: userId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
