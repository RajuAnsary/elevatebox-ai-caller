const {
  endSession,
  getSession,
  processSessionMessage
} = require('../services/call-orchestrator.service');

async function processMessageRequest(request, response) {
  try {
    const result = await processSessionMessage({
      conversationId: request.params.conversationId,
      ...request.body
    });
    response.status(200).json(result);
  } catch (error) {
    response.status(400).json({ error: error.message });
  }
}

async function endSessionRequest(request, response) {
  try {
    response.status(200).json(await endSession(request.params.conversationId));
  } catch (error) {
    response.status(400).json({ error: error.message });
  }
}

function getSessionRequest(request, response) {
  const session = getSession(request.params.conversationId);

  if (!session) {
    response.status(404).json({ error: 'Session was not found.' });
    return;
  }

  response.status(200).json(session);
}

module.exports = { endSessionRequest, getSessionRequest, processMessageRequest };
