const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

exports.getUserConversations = async (req, res) => {
  try {
    const userId = req.user._id; // Supposé que tu utilises un middleware d’auth

    const conversations = await Conversation.find({ participants: userId })
      .populate({
        path: "participants",
        select: "name profilePictures isOnline isPremium"
      })
      .populate({
        path: "lastMessage",
        select: "message sender receiver timestamp seen"
      })
      .sort({ updatedAt: -1 });

    const result = conversations.map(conv => {
      return {
        _id: conv._id,
        participants: conv.participants,
        lastMessage: conv.lastMessage,
        unreadCount: conv.unreadCount.get(userId.toString()) || 0
      };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la récupération des conversations" });
  }
};

exports.markConversationAsRead = async (req, res) => {
  try {
    const userId = req.user._id;
    const { conversationId } = req.body;

    // 1. Met le compteur à 0 pour cet utilisateur
    await Conversation.findByIdAndUpdate(conversationId, {
      $set: { [`unreadCount.${userId}`]: 0 }
    });

    // 2. Marque les messages reçus comme lus
    await Message.updateMany(
      { receiver: userId, seen: false },
      { $set: { seen: true } }
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Erreur lors du passage en lu" });
  }
};