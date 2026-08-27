const vapiService = require('../services/vapi.service');
const exotelService = require('../services/exotel.service');

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
    const provider = (process.env.TELEPHONY_PROVIDER || 'vapi').trim().toLowerCase();

    if (provider === 'exotel') {
      const call = await exotelService.startOutboundCall({});
      response.status(call.started ? 201 : 502).json(call);
      return;
    }

    if (provider !== 'vapi') {
      response.status(400).json({ error: 'Unsupported telephony provider. Use vapi or exotel.' });
      return;
    }

    const call = await vapiService.startOutboundCall();

    response.status(201).json({
      id: call.id,
      status: call.status || null
    });
  } catch (error) {
    if (error instanceof vapiService.VapiConfigurationError || error instanceof exotelService.ExotelConfigurationError) {
      response.status(500).json({
        error: 'Telephony configuration is incomplete.',
        details: error.message
      });
      return;
    }

    console.error('Unable to start outbound call:', error.message);
    response.status(getUpstreamStatus(error)).json({
      error: 'Unable to start outbound call.',
      details: error.message || 'Vapi did not return an error message.'
    });
  }
}

async function configureAssistant(_request, response) {
  try {
    const assistant = await vapiService.configureSalesAssistant();

    response.status(200).json({
      id: assistant.id,
      message: 'Sales assistant behavior is configured.'
    });
  } catch (error) {
    if (error instanceof vapiService.VapiConfigurationError) {
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
