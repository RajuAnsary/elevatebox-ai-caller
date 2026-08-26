const { classifyLead } = require('../services/lead-classification.service');

function classifyLeadRequest(request, response) {
  try {
    const result = classifyLead(request.body || {});
    response.status(200).json(result);
  } catch (error) {
    response.status(400).json({ error: error.message });
  }
}

module.exports = { classifyLeadRequest };
