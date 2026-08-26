const { nodeEnv } = require('../config/env');

function getHealth(_request, response) {
  response.status(200).json({
    status: 'ok',
    service: 'elevatebox-ai-caller',
    environment: nodeEnv,
    timestamp: new Date().toISOString()
  });
}

module.exports = { getHealth };
