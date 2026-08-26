const { evaluateAction } = require('../services/action-decision.service');

async function evaluateActionRequest(request, response) {
  try {
    const result = await evaluateAction(request.body || {});
    response.status(200).json(result);
  } catch (error) {
    response.status(400).json({ error: error.message });
  }
}

module.exports = { evaluateActionRequest };
