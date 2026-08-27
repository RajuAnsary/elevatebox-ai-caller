const assert = require('node:assert/strict');
const { generateFollowup, sendFollowup } = require('../src/services/followup.service');
const {
  getWhatsAppDelivery,
  resetMockWhatsAppService,
  setWhatsAppProvider
} = require('../src/services/whatsapp.service');

const hotInput = {
  conversationId: 'followup-hot',
  classification: 'HOT',
  leadData: {
    businessType: 'clothes',
    productCount: 100,
    budget: 50000,
    timeline: '1 month',
    features: ['payment gateway', 'admin panel']
  },
  transcript: 'Customer wants to start soon.',
  callback: null
};

async function run() {
  resetMockWhatsAppService();

  const hotFollowup = generateFollowup(hotInput);
  assert.match(hotFollowup.message, /clothing business/);
  assert.match(hotFollowup.message, /100 products/);
  assert.match(hotFollowup.message, /₹50,000/);
  assert.match(hotFollowup.message, /payment gateway, admin panel/);
  assert.match(hotFollowup.message, /next steps/i);

  const warmFollowup = generateFollowup({
    conversationId: 'followup-warm',
    classification: 'WARM',
    leadData: { businessType: 'jewellery', features: ['payment gateway'] },
    transcript: 'My budget is low right now and I need to discuss with my partner.',
    callback: {
      status: 'SCHEDULED',
      scheduledFor: '2026-08-27T10:00:00+05:30',
      timezone: 'Asia/Kolkata'
    }
  });
  assert.match(warmFollowup.message, /budget is a consideration/i);
  assert.match(warmFollowup.message, /27 Aug/i);

  const coldFollowup = generateFollowup({
    conversationId: 'followup-cold',
    classification: 'COLD',
    leadData: {},
    transcript: 'I am just checking.',
    callback: null
  });
  assert.match(coldFollowup.message, /no rush/i);

  const missingFieldsFollowup = generateFollowup({
    conversationId: 'followup-missing',
    classification: 'HOT',
    leadData: {},
    transcript: '',
    callback: null
  });
  assert.doesNotMatch(missingFieldsFollowup.message, /undefined|null/i);

  const firstSend = await sendFollowup(hotInput);
  assert.equal(firstSend.sent, true);
  assert.ok(getWhatsAppDelivery('followup-hot', 'final-followup'));

  const duplicateSend = await sendFollowup(hotInput);
  assert.equal(duplicateSend.sent, false);
  assert.equal(duplicateSend.duplicate, true);

  const originalPhone = process.env.MY_PHONE_NUMBER;
  const originalResume = process.env.RESUME_PATH;
  const originalArchitectureImage = process.env.ARCHITECTURE_IMAGE_PATH;
  const mediaCalls = [];
  process.env.MY_PHONE_NUMBER = '918688664337';
  process.env.RESUME_PATH = 'https://example.com/resume.pdf';
  process.env.ARCHITECTURE_IMAGE_PATH = 'https://example.com/architecture.png';
  resetMockWhatsAppService();
  setWhatsAppProvider({
    name: 'test-provider',
    async sendMessage(payload) {
      mediaCalls.push({ type: 'text', payload });
      return { provider: 'test-provider', sent: true, providerMessageId: 'text-id', error: null };
    },
    async sendImage(payload) {
      mediaCalls.push({ type: 'image', payload });
      return { provider: 'test-provider', sent: true, providerMessageId: 'image-id', error: null };
    },
    async sendDocument(payload) {
      mediaCalls.push({ type: 'document', payload });
      return { provider: 'test-provider', sent: true, providerMessageId: 'document-id', error: null };
    }
  });
  const mediaFollowup = await sendFollowup({ ...hotInput, conversationId: 'followup-media' });
  assert.equal(mediaFollowup.sent, true);
  assert.match(mediaFollowup.message, /You can reach me at: 918688664337/);
  assert.deepEqual(mediaCalls.map((call) => call.type), ['text', 'image', 'document']);
  if (originalPhone === undefined) delete process.env.MY_PHONE_NUMBER; else process.env.MY_PHONE_NUMBER = originalPhone;
  if (originalResume === undefined) delete process.env.RESUME_PATH; else process.env.RESUME_PATH = originalResume;
  if (originalArchitectureImage === undefined) delete process.env.ARCHITECTURE_IMAGE_PATH; else process.env.ARCHITECTURE_IMAGE_PATH = originalArchitectureImage;
  resetMockWhatsAppService();

  console.log('Follow-up service tests passed.');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
