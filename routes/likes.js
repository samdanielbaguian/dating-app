const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const User = require("../models/User");
const Match = require("../models/Match");
const { io } = require("../server");

// Like un utilisateur
router.post("/:userId", authMiddleware, async (req, res) => {
  const { userId } = req.params;

  // Empêche de liker soi-même
  if (req.user.id === userId) {
    return res.status(400).json({ message: "Impossible de liker ton propre profil." });
  }

  try {
    const currentUser = await User.findById(req.user.id);
    const likedUser = await User.findById(userId);

    if (!currentUser || !likedUser) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    // Éviter le double-like
    if (currentUser.likes.includes(userId)) {
      return res.status(200).json({ message: "Déjà liké." });
    }

    // Ajouter le like
    currentUser.likes.push(userId);
    await currentUser.save();

    // Vérifier si l'autre utilisateur a également liké
    let isMatch = false;
    if (likedUser.likes.includes(req.user.id)) {
      // Vérifie s'il n'y a pas déjà un match
      const existingMatch = await Match.findOne({
        $or: [
          { user1: req.user.id, user2: userId },
          { user1: userId, user2: req.user.id }
        ]
      });

      if (!existingMatch) {
        // Créer le match
        const match = new Match({
          user1: req.user.id,
          user2: userId,
        });
        await match.save();
        isMatch = true;

        // Optionnel : ne transmets que les infos publiques
        const sanitizedCurrentUser = {
          _id: currentUser._id,
          name: currentUser.name,
          profilePictures: currentUser.profilePictures,
        };
        const sanitizedLikedUser = {
          _id: likedUser._id,
          name: likedUser.name,
          profilePictures: likedUser.profilePictures,
        };

        // Notifie les deux via socket.io
        io.to(req.user.id).emit("newMatch", { matchId: match._id, user: sanitizedLikedUser });
        io.to(userId).emit("newMatch", { matchId: match._id, user: sanitizedCurrentUser });
      }
    }

    res.status(200).json({
      message: "Profil liké avec succès.",
      likedUserId: userId,
      match: isMatch
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Récupère la liste des utilisateurs qui ont liké l'utilisateur connecté
router.get("/received", authMiddleware, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    if (!currentUser) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    // Cherche tous les utilisateurs qui ont liké le user courant
    const usersWhoLikedMe = await User.find({ likes: req.user.id })
      .select("name age city profilePictures bio likes")
      .lean();

    const received = usersWhoLikedMe.map(u => ({
      id: u._id,
      name: u.name,
      age: u.age,
      city: u.city,
      profilePictures: u.profilePictures,
      bio: u.bio,
      isMatched: currentUser.likes.includes(String(u._id)) && u.likes.includes(req.user.id),
    }));

    res.status(200).json(received);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
