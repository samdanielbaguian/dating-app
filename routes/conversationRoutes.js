const express = require('express');
const router = express.Router();
const { getUserConversations, markConversationAsRead } = require('../controllers/conversationController');
const { sendMessage } = require('../controllers/messageController');
const auth = require('../middleware/authMiddleware');

router.get('/conversations', auth, getUserConversations);
router.post('/conversations/read', auth, markConversationAsRead);
router.post('/messages/send', auth, sendMessage);

module.exports = router;
