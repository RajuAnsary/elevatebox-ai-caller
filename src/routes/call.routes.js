const express = require('express');
const { configureAssistant, startCall } = require('../controllers/call.controller');

const router = express.Router();

router.post('/configure-assistant', configureAssistant);
router.post('/start', startCall);

module.exports = router;
