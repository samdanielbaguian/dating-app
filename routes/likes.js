const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const User = require("../models/User");
const Match = require("../models/Match");
const { io } = require("../server");

// Like un utilisateur
router.post("/:userId", authMiddleware, async (req, res) => {
  const { userId } = req.params;

  if (req.user.id === userId) {
    return res.status(400).json({ message: "Impossible de liker ton propre profil." });
  }

  try {
    const currentUser = await User.findById(req.user.id);
    const likedUser = await User.findById(userId);

    if (!currentUser || !likedUser) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    if (currentUser.likes.includes(userId)) {
      return res.status(200).json({ message: "Déjà liké." });
    }

    currentUser.likes.push(userId);
    await currentUser.save();

    let isMatch = false;
    if (likedUser.likes.includes(req.user.id)) {
      const existingMatch = await Match.findOne({
        $or: [
          { user1: req.user.id, user2: userId },
          { user1: userId, user2: req.user.id }
        ]
      });

      if (!existingMatch) {
        const match = new Match({
          user1: req.user.id,
          user2: userId,
        });
        await match.save();
        isMatch = true;

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

// Suppression d'un like (unlike)
router.delete("/:userId", authMiddleware, async (req, res) => {
  const { userId } = req.params;

  if (req.user.id === userId) {
    return res.status(400).json({ message: "Impossible de retirer un like sur toi-même." });
  }

  try {
    const currentUser = await User.findById(req.user.id);
    if (!currentUser) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    if (!currentUser.likes.includes(userId)) {
      return res.status(400).json({ message: "Ce like n'existe pas." });
    }

    currentUser.likes = currentUser.likes.filter(id => id.toString() !== userId);
    await currentUser.save();

    // (Optionnel) Suppression du match si besoin
    await Match.deleteOne({
      $or: [
        { user1: req.user.id, user2: userId },
        { user1: userId, user2: req.user.id }
      ]
    });

    res.status(200).json({ message: "Like retiré avec succès." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Affiche les matchs de l'utilisateur connecté
router.get("/matches", authMiddleware, async (req, res) => {
  try {
    const matches = await Match.find({
      $or: [
        { user1: req.user.id },
        { user2: req.user.id }
      ]
    }).populate("user1 user2", "name profilePictures");

    // Optionnel : transformer le résultat pour ne donner que l'autre utilisateur du match
    const formattedMatches = matches.map(match => {
      const otherUser = match.user1._id.toString() === req.user.id
        ? match.user2
        : match.user1;
      return {
        matchId: match._id,
        user: {
          id: otherUser._id,
          name: otherUser.name,
          profilePictures: otherUser.profilePictures
        }
      };
    });

    res.status(200).json(formattedMatches);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Likes reçus avec pagination et filtrage "non-matchés"
router.get("/received", authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20, onlyNonMatched = false } = req.query;
    const currentUser = await User.findById(req.user.id);
    if (!currentUser) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    // Cherche tous les utilisateurs qui ont liké le user courant
    const usersWhoLikedMe = await User.find({ likes: req.user.id })
      .select("name age city profilePictures bio likes")
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .lean();

    let received = usersWhoLikedMe.map(u => ({
      id: u._id,
      name: u.name,
      age: u.age,
      city: u.city,
      profilePictures: u.profilePictures,
      bio: u.bio,
      isMatched:
        currentUser.likes.map(String).includes(String(u._id)) &&
        u.likes.map(String).includes(req.user.id),
    }));

    if (onlyNonMatched === "true" || onlyNonMatched === true) {
      received = received.filter(u => !u.isMatched);
    }

    res.status(200).json(received);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
