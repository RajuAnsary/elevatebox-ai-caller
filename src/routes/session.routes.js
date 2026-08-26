const express = require('express');
const {
  endSessionRequest,
  getSessionRequest,
  processMessageRequest
} = require('../controllers/session.controller');

const router = express.Router();

router.post('/:conversationId/message', processMessageRequest);
router.post('/:conversationId/end', endSessionRequest);
router.get('/:conversationId', getSessionRequest);

module.exports = router;
