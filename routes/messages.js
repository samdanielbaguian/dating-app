const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');
const {
  MAX_NEW_NONMATCH_PER_DAY,
  countNewNonMatchToday,
  hasContactedToday
} = require('../utils/messageRules');

router.post('/', authMiddleware, async (req, res) => {
  const { receiverId, message } = req.body;
  const senderId = req.user.id;

  if (!message || !receiverId) {
    return res.status(400).json({ message: 'Message et destinataire requis.' });
  }

  try {
    const sender = await User.findById(senderId);
    const receiver = await User.findById(receiverId);

    if (!receiver) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    // 1. Blocage
    if (!sender.likes.includes(receiverId) || !receiver.likes.includes(senderId)) {
      if (receiver.blockNonMatchMessages) {
        return res.status(403).json({ message: "Cet utilisateur n’accepte que les messages de ses matchs." });
      }
    }

    const hasMatch = sender.likes.includes(receiverId) && receiver.likes.includes(senderId);

    // 2. Cas premium ou non-premium
    if (!hasMatch) {
      // PREMIUM
      if (sender.isPremium) {
        // Limite de nouveaux contacts non-match par jour
        const newNonMatchToday = countNewNonMatchToday(sender);
        if (newNonMatchToday >= MAX_NEW_NONMATCH_PER_DAY &&
          !hasContactedToday(sender, receiver._id)) {
          return res.status(403).json({ message: "Tu as atteint ta limite de nouveaux contacts aujourd’hui. Reviens demain ou attends un match !" });
        }
        // Logger ce contact
        if (!hasContactedToday(sender, receiver._id)) {
          sender.nonMatchContactsLog.push({ userId: receiver._id, date: new Date() });
          await sender.save();
        }
      } else {
        // NON PREMIUM
        // Peut envoyer UN SEUL message d’approche, pas plus (sauf si match)
        const alreadyMessaged = await Message.exists({
          sender: senderId,
          receiver: receiverId
        });
        if (alreadyMessaged) {
          return res.status(403).json({ message: "Tu as déjà envoyé un message à cet utilisateur. Passe en premium ou attends un match." });
        }
      }
    }

    // Création du message
    const newMessage = new Message({
      sender: senderId,
      receiver: receiverId,
      content: message,
    });
    await newMessage.save();

    // TODO : Notifier le destinataire si premium non-match (bonus)
    // ex : if (!hasMatch && sender.isPremium) { ... }

    res.status(201).json({
      message: 'Message envoyé avec succès !',
      data: newMessage,
      sender: sender.name,
      receiver: receiver.name
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

module.exports = router;
