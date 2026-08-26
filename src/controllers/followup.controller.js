const { generateFollowup, sendFollowup } = require('../services/followup.service');

function generateFollowupRequest(request, response) {
  try {
    response.status(200).json(generateFollowup(request.body || {}));
  } catch (error) {
    response.status(400).json({ error: error.message });
  }
}

async function sendFollowupRequest(request, response) {
  try {
    response.status(200).json(await sendFollowup(request.body || {}));
  } catch (error) {
    response.status(400).json({ error: error.message });
  }
}

module.exports = { generateFollowupRequest, sendFollowupRequest };
