const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

// Récupérer toutes les conversations de l'utilisateur connecté, enrichies (participants et lastMessage)
exports.getUserConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    const conversations = await Conversation.find({ participants: userId })
      .populate('participants', 'name profilePicture') // n'affiche que les champs nécessaires
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'name profilePicture' } // enrichit le lastMessage avec l'expéditeur
      })
      .sort({ updatedAt: -1 });

    res.json(conversations);
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la récupération des conversations" });
  }
};

// Marquer une conversation comme lue pour l'utilisateur connecté (remet unreadCount à zéro)
exports.markConversationAsRead = async (req, res) => {
  try {
    const userId = req.user._id;
    const { conversationId } = req.body;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation non trouvée' });
    }

    // Remet à zéro le compteur de non-lus pour cet utilisateur
    conversation.unreadCount.set(userId.toString(), 0);
    await conversation.save();

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la mise à jour de la conversation' });
  }
};
