const {
  configureSalesAssistant,
  startOutboundCall,
  VapiConfigurationError
} = require('../services/vapi.service');

function getUpstreamStatus(error) {
  if (Number.isInteger(error.statusCode)) {
    return error.statusCode;
  }

  if (Number.isInteger(error.status)) {
    return error.status;
  }

  return 502;
}

async function startCall(_request, response) {
  try {
    const call = await startOutboundCall();

    response.status(201).json({
      id: call.id,
      status: call.status || null
    });
  } catch (error) {
    if (error instanceof VapiConfigurationError) {
      response.status(500).json({
        error: 'Vapi configuration is incomplete.',
        details: error.message
      });
      return;
    }

    console.error('Unable to start Vapi outbound call:', error);
    response.status(getUpstreamStatus(error)).json({
      error: 'Unable to start outbound call.',
      details: error.message || 'Vapi did not return an error message.'
    });
  }
}

async function configureAssistant(_request, response) {
  try {
    const assistant = await configureSalesAssistant();

    response.status(200).json({
      id: assistant.id,
      message: 'Sales assistant behavior is configured.'
    });
  } catch (error) {
    if (error instanceof VapiConfigurationError) {
      response.status(500).json({
        error: 'Vapi configuration is incomplete.',
        details: error.message
      });
      return;
    }

    console.error('Unable to configure Vapi sales assistant:', error);
    response.status(getUpstreamStatus(error)).json({
      error: 'Unable to configure sales assistant.',
      details: error.message || 'Vapi did not return an error message.'
    });
  }
}

module.exports = { configureAssistant, startCall };
