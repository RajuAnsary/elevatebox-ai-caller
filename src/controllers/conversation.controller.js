const { processConversationMessage } = require('../services/conversation.service');

function sendConversationMessage(request, response) {
  try {
    const result = processConversationMessage(request.body || {});
    response.status(200).json(result);
  } catch (error) {
    response.status(400).json({ error: error.message });
  }
}

module.exports = { sendConversationMessage };
