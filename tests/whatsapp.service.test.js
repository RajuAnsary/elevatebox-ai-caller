const assert = require('node:assert/strict');
const {
  getWhatsAppDelivery,
  normalizeIndianPhoneNumber,
  resetMockWhatsAppService,
  sendWhatsAppMessage,
  setWhatsAppFetch
} = require('../src/services/whatsapp.service');
const { evaluateAction } = require('../src/services/action-decision.service');

const environmentKeys = [
  'WHATSAPP_PROVIDER',
  'WHATSAPP_ACCESS_TOKEN',
  'WHATSAPP_PHONE_NUMBER_ID',
  'WHATSAPP_API_VERSION',
  'WHATSAPP_RECIPIENT_NUMBER'
];
const originalEnvironment = Object.fromEntries(environmentKeys.map((key) => [key, process.env[key]]));

function restoreEnvironment() {
  for (const key of environmentKeys) {
    if (originalEnvironment[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnvironment[key];
  }
}

function configureMetaEnvironment() {
  process.env.WHATSAPP_PROVIDER = 'meta';
  process.env.WHATSAPP_ACCESS_TOKEN = 'test-access-token';
  process.env.WHATSAPP_PHONE_NUMBER_ID = 'phone-number-id';
  process.env.WHATSAPP_API_VERSION = 'v23.0';
  process.env.WHATSAPP_RECIPIENT_NUMBER = '8688664337';
}

async function run() {
  try {
    for (const key of environmentKeys) delete process.env[key];
    resetMockWhatsAppService();
    const mockResult = await sendWhatsAppMessage({
      conversationId: 'mock-fallback',
      message: 'Hello from the local test.'
    });
    assert.equal(mockResult.sent, true);
    assert.equal(mockResult.delivery.provider, 'mock');

    assert.equal(normalizeIndianPhoneNumber('8688664337'), '918688664337');
    assert.equal(normalizeIndianPhoneNumber('+918688664337'), '918688664337');
    assert.equal(normalizeIndianPhoneNumber('+14155552671'), '14155552671');

    configureMetaEnvironment();
    const calls = [];
    resetMockWhatsAppService();
    setWhatsAppFetch(async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        status: 200,
        json: async () => ({ messages: [{ id: `wamid.${calls.length}` }] })
      };
    });

    const metaResult = await sendWhatsAppMessage({
      conversationId: 'meta-text',
      message: 'Meta delivery test.'
    });
    assert.equal(metaResult.sent, true);
    assert.equal(metaResult.delivery.provider, 'meta');
    assert.equal(metaResult.delivery.providerMessageId, 'wamid.1');
    assert.equal(calls[0].url, 'https://graph.facebook.com/v23.0/phone-number-id/messages');
    assert.equal(calls[0].options.headers.Authorization, 'Bearer test-access-token');
    assert.deepEqual(JSON.parse(calls[0].options.body), {
      messaging_product: 'whatsapp',
      to: '918688664337',
      type: 'text',
      text: { body: 'Meta delivery test.' }
    });

    const mediaResult = await sendWhatsAppMessage({
      conversationId: 'meta-final',
      message: 'Final follow-up text.',
      messageType: 'final-followup',
      attachments: {
        architectureImage: 'https://example.com/architecture.png',
        resume: 'https://example.com/resume.pdf'
      }
    });
    assert.equal(mediaResult.sent, true);
    assert.equal(mediaResult.delivery.media.length, 2);
    assert.equal(JSON.parse(calls[2].options.body).type, 'image');
    assert.equal(JSON.parse(calls[3].options.body).type, 'document');

    resetMockWhatsAppService();
    setWhatsAppFetch(async () => ({
      ok: false,
      status: 401,
      json: async () => ({ error: { message: 'Invalid access token' } })
    }));
    const failedAction = await evaluateAction({
      conversationId: 'provider-error',
      classification: 'HOT',
      confidence: 0.9,
      leadData: { businessType: 'clothes', budget: 50000, timeline: 'next week' },
      transcript: 'Please send the quotation.'
    });
    assert.equal(failedAction.action, 'SEND_WHATSAPP');
    assert.equal(failedAction.triggered, false);
    assert.equal(getWhatsAppDelivery('provider-error').error, 'Invalid access token');

    console.log('WhatsApp service tests passed.');
  } finally {
    restoreEnvironment();
    resetMockWhatsAppService();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
