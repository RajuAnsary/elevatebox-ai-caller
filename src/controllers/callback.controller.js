const { scheduleCallback } = require('../services/scheduler.service');

function scheduleCallbackRequest(request, response) {
  try {
    const result = scheduleCallback(request.body || {});
    response.status(200).json(result);
  } catch (error) {
    response.status(400).json({ error: error.message });
  }
}

module.exports = { scheduleCallbackRequest };
