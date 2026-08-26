const { parseCallbackTime } = require('./callback-parser.service');

const scheduledCallbacks = new Map();

function scheduleCallback({
  conversationId,
  requestedTime,
  timezone = 'Asia/Kolkata',
  update = false
}) {
  if (typeof conversationId !== 'string' || !conversationId.trim()) {
    throw new TypeError('conversationId must be a non-empty string.');
  }

  const existingCallback = scheduledCallbacks.get(conversationId);
  if (existingCallback && !update) {
    return {
      conversationId,
      status: 'ALREADY_SCHEDULED',
      scheduledFor: existingCallback.scheduledFor,
      originalText: existingCallback.originalText
    };
  }

  const scheduledFor = parseCallbackTime({ requestedTime, timezone });
  if (!scheduledFor) {
    return {
      conversationId,
      status: 'NEEDS_CLARIFICATION',
      originalText: requestedTime
    };
  }

  const callback = {
    conversationId,
    status: 'SCHEDULED',
    scheduledFor,
    originalText: requestedTime,
    timezone
  };
  scheduledCallbacks.set(conversationId, callback);

  return callback;
}

function getScheduledCallback(conversationId) {
  return scheduledCallbacks.get(conversationId) || null;
}

function resetScheduler() {
  scheduledCallbacks.clear();
}

module.exports = { getScheduledCallback, resetScheduler, scheduleCallback };
