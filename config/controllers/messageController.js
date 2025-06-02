const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');

exports.sendMessage = async (req, res) => {
  try {
    const { sender, receiver, message, type, fileUrl } = req.body;

    // 1. Crée le message
    const newMessage = new Message({
      sender,
      receiver,
      message,
      type,
      fileUrl,
      seen: false
    });
    await newMessage.save();

    // 2. Récupère ou crée la conversation
    let conversation = await Conversation.findOne({
      participants: { $all: [sender, receiver], $size: 2 }
    });

    if (!conversation) {
      conversation = new Conversation({
        participants: [sender, receiver],
        lastMessage: newMessage._id,
        unreadCount: {
          [receiver]: 1
        }
      });
    } else {
      conversation.lastMessage = newMessage._id;
      // Incrémente le compteur de non-lus pour le destinataire
      const currentUnread = conversation.unreadCount.get(receiver.toString()) || 0;
      conversation.unreadCount.set(receiver.toString(), currentUnread + 1);
    }

    await conversation.save();

    res.status(201).json({
      message: 'Message envoyé',
      messageId: newMessage._id,
      conversationId: conversation._id
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de l\'envoi du message' });
  }
};