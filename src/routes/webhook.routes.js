const express = require('express');
const { acknowledgePlaceholderWebhook } = require('../controllers/webhook.controller');

const router = express.Router();

// Reserved routes for call-provider and messaging-provider events in later stages.
router.post('/call-events', acknowledgePlaceholderWebhook('call-events'));
router.post('/whatsapp-events', acknowledgePlaceholderWebhook('whatsapp-events'));

module.exports = router;
