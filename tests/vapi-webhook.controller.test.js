const assert = require('node:assert/strict');
const {
  handleVapiWebhook,
  resetVapiWebhookState
} = require('../src/controllers/webhook.controller');
const { getSession, resetSessions } = require('../src/services/call-orchestrator.service');
const { resetScheduler } = require('../src/services/scheduler.service');
const {
  getWhatsAppDelivery,
  resetMockWhatsAppService
} = require('../src/services/whatsapp.service');

const callId = 'vapi-call-001';

function event(message) {
  return { message: { call: { id: callId }, ...message } };
}

async function run() {
  resetSessions();
  resetScheduler();
  resetMockWhatsAppService();
  resetVapiWebhookState();

  const started = await handleVapiWebhook(event({
    type: 'status-update',
    status: 'in-progress'
  }));
  assert.equal(started.sessionCreated, true);
  assert.equal(getSession(callId).callStatus, 'ACTIVE');

  const warm = await handleVapiWebhook(event({
    type: 'transcript',
    role: 'user',
    transcriptType: 'final',
    transcript: 'I sell clothes and want an online store.',
    timestamp: '2026-08-26T10:00:00Z'
  }));
  assert.equal(warm.result.classification, 'WARM');
  assert.equal(warm.result.action.action, 'RECOMMEND_CALLBACK');

  const hotPayload = event({
    type: 'transcript',
    role: 'user',
    transcriptType: 'final',
    transcript: 'My budget is 50000. Can you start next week? Please send the quotation.',
    timestamp: '2026-08-26T10:00:10Z'
  });
  const hot = await handleVapiWebhook(hotPayload);
  assert.equal(hot.result.classification, 'HOT');
  assert.equal(hot.result.action.action, 'SEND_WHATSAPP');
  assert.equal(hot.result.action.triggered, true);
  assert.ok(getWhatsAppDelivery(callId, 'mid-call'));

  const duplicate = await handleVapiWebhook(hotPayload);
  assert.equal(duplicate.duplicate, true);
  assert.equal(getSession(callId).conversationHistory.filter((entry) => entry.role === 'user').length, 2);

  const callback = await handleVapiWebhook(event({
    type: 'transcript',
    role: 'user',
    transcriptType: 'final',
    transcript: 'Please call me back tomorrow morning.',
    timestamp: '2026-08-26T10:00:20Z'
  }));
  assert.equal(callback.result.callback.status, 'SCHEDULED');
  assert.equal(callback.result.action.triggered, false);

  const assistantTranscript = await handleVapiWebhook(event({
    type: 'transcript',
    role: 'assistant',
    transcriptType: 'final',
    transcript: 'Thanks for sharing those details.',
    timestamp: '2026-08-26T10:00:25Z'
  }));
  assert.equal(assistantTranscript.ignored, true);

  const ended = await handleVapiWebhook(event({ type: 'end-of-call-report' }));
  assert.equal(ended.ended, true);
  assert.equal(getSession(callId).callStatus, 'ENDED');
  assert.equal(getSession(callId).finalFollowup.sent, true);
  assert.ok(getWhatsAppDelivery(callId, 'final-followup'));

  await handleVapiWebhook(event({ type: 'end-of-call-report' }));
  assert.equal(getSession(callId).finalFollowup.sent, true);

  const unknown = await handleVapiWebhook(event({ type: 'unrecognized-event' }));
  assert.equal(unknown.received, true);
  assert.equal(unknown.ignored, true);

  console.log('Vapi webhook controller tests passed.');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
