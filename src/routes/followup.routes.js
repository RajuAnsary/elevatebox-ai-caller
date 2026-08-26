const express = require('express');
const {
  generateFollowupRequest,
  sendFollowupRequest
} = require('../controllers/followup.controller');

const router = express.Router();

router.post('/generate', generateFollowupRequest);
router.post('/send', sendFollowupRequest);

module.exports = router;
