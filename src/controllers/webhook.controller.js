const {
  endSession,
  getOrCreateSession,
  getSession,
  processSessionMessage
} = require('../services/call-orchestrator.service');

const processedEventFingerprints = new Set();

function acknowledgePlaceholderWebhook(webhookName) {
  return (_request, response) => {
    response.status(202).json({
      received: true,
      webhook: webhookName,
      message: 'Placeholder endpoint. Provider integration has not been configured yet.'
    });
  };
}

function getWebhookMessage(payload) {
  if (payload?.message && typeof payload.message === 'object') {
    return payload.message;
  }

  return payload && typeof payload === 'object' ? payload : null;
}

function getCallId(message) {
  return message?.call?.id || message?.callId || null;
}

function getText(message) {
  return message?.transcript || message?.content || message?.message || null;
}

function getFingerprint(callId, eventType, role, text, message) {
  return [
    callId,
    role === 'user' ? 'customer-message' : eventType,
    role || '',
    text || '',
    message?.id || message?.timestamp || ''
  ].join(':');
}

function isDuplicateEvent(callId, eventType, role, text, message) {
  const fingerprint = getFingerprint(callId, eventType, role, text, message);
  if (processedEventFingerprints.has(fingerprint)) {
    return true;
  }

  processedEventFingerprints.add(fingerprint);
  return false;
}

function logWebhookEvent({ callId, eventType, classification = null, action = null }) {
  console.log(JSON.stringify({
    source: 'vapi-webhook',
    callId,
    eventType,
    classification,
    action
  }));
}

function isEndEvent(eventType, message) {
  return eventType === 'end-of-call-report' ||
    eventType === 'call-ended' ||
    eventType === 'ended' ||
    (eventType === 'status-update' && message.status === 'ended');
}

function isStartEvent(eventType, message) {
  return eventType === 'call-started' ||
    eventType === 'assistant.started' ||
    (eventType === 'status-update' && message.status === 'in-progress');
}

async function processCustomerTranscript(callId, eventType, message, text) {
  if (isDuplicateEvent(callId, eventType, 'user', text, message)) {
    return { duplicate: true, result: null };
  }

  const result = await processSessionMessage({ conversationId: callId, message: text });
  return { duplicate: false, result };
}

async function handleConversationUpdate(callId, message) {
  const messages = Array.isArray(message.messages) ? message.messages : [];
  let lastResult = null;
  let duplicate = false;

  for (const entry of messages) {
    const role = entry?.role?.toLowerCase();
    const text = entry?.content || entry?.message || entry?.transcript;
    if (role !== 'user' || typeof text !== 'string' || !text.trim()) continue;

    const processed = await processCustomerTranscript(callId, 'conversation-update', entry, text.trim());
    duplicate ||= processed.duplicate;
    lastResult = processed.result || lastResult;
  }

  return { duplicate, result: lastResult };
}

async function handleVapiWebhook(payload) {
  const message = getWebhookMessage(payload);
  const eventType = message?.type || 'unknown';
  const callId = getCallId(message);

  if (!message || !callId) {
    logWebhookEvent({ callId: callId || null, eventType });
    return { received: true, ignored: true, eventType, callId: callId || null };
  }

  if (isStartEvent(eventType, message)) {
    const session = getOrCreateSession(callId);
    logWebhookEvent({ callId, eventType, classification: session.classification });
    return { received: true, eventType, callId, sessionCreated: true };
  }

  if (isEndEvent(eventType, message)) {
    const session = getSession(callId);
    if (!session || !session.classification) {
      logWebhookEvent({ callId, eventType });
      return { received: true, eventType, callId, ignored: true };
    }

    const endedSession = await endSession(callId);
    logWebhookEvent({
      callId,
      eventType,
      classification: endedSession.classification,
      action: endedSession.finalFollowup?.sent ? 'SEND_FINAL_FOLLOWUP' : null
    });
    return { received: true, eventType, callId, ended: true };
  }

  if (eventType === 'conversation-update') {
    const processed = await handleConversationUpdate(callId, message);
    logWebhookEvent({
      callId,
      eventType,
      classification: processed.result?.classification || getSession(callId)?.classification,
      action: processed.result?.action?.action || null
    });
    return { received: true, eventType, callId, ...processed };
  }

  const role = message.role?.toLowerCase();
  const text = getText(message);
  const isTranscript = eventType === 'transcript' || eventType.startsWith('transcript[');
  const isFinalTranscript = message.transcriptType !== 'partial';

  if (isTranscript && role === 'user' && isFinalTranscript && typeof text === 'string' && text.trim()) {
    const processed = await processCustomerTranscript(callId, eventType, message, text.trim());
    logWebhookEvent({
      callId,
      eventType,
      classification: processed.result?.classification || getSession(callId)?.classification,
      action: processed.result?.action?.action || null
    });
    return { received: true, eventType, callId, ...processed };
  }

  logWebhookEvent({ callId, eventType, classification: getSession(callId)?.classification });
  return { received: true, eventType, callId, ignored: true };
}

async function handleVapiWebhookRequest(request, response) {
  try {
    response.status(200).json(await handleVapiWebhook(request.body));
  } catch (error) {
    console.error(JSON.stringify({
      source: 'vapi-webhook',
      eventType: request.body?.message?.type || 'unknown',
      error: error.message
    }));
    response.status(200).json({ received: true, ignored: true });
  }
}

function resetVapiWebhookState() {
  processedEventFingerprints.clear();
}

module.exports = {
  acknowledgePlaceholderWebhook,
  handleVapiWebhook,
  handleVapiWebhookRequest,
  resetVapiWebhookState
};
