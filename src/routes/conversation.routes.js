const express = require('express');
const { sendConversationMessage } = require('../controllers/conversation.controller');

const router = express.Router();

router.post('/message', sendConversationMessage);

module.exports = router;
