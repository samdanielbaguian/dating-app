// routes/messages.js

const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');
const authMiddleware = require('../routes/auth');
// Envoyer un message (POST)
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
  
      // Vérifier si match mutuel
      const hasMatch = sender.likes.includes(receiverId) && receiver.likes.includes(senderId);
  
      if (!hasMatch && !sender.isPremium) {
        return res.status(403).json({ message: "Pas de match. Passe en premium pour envoyer un message." });
      }
  
      const newMessage = new Message({
        sender: senderId,
        receiver: receiverId,
        content: message,
      });
  
      await newMessage.save();
  
      res.status(201).json({ message: 'Message envoyé avec succès !', 
        data: newMessage,
         sender: sender.name,
         receiver: receiver.name
        });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Erreur serveur." });
    }
  });
  
  // Récupérer les messages entre deux utilisateurs (GET)
  router.get('/:userId', authMiddleware, async (req, res) => {
    const currentUserId = req.user.id;
    const otherUserId = req.params.userId;
  
    try {
      const messages = await Message.find({
        $or: [
          { sender: currentUserId, receiver: otherUserId },
          { sender: otherUserId, receiver: currentUserId }
        ]
      }).sort({ createdAt: 1 }); // Trier par date croissante
  
      res.status(200).json(messages);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Erreur lors de la récupération des messages." });
    }
  });
  

  

module.exports = router;
