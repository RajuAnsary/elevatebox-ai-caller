const assert = require('node:assert/strict');
const { evaluateAction } = require('../src/services/action-decision.service');
const {
  getWhatsAppDelivery,
  resetMockWhatsAppService
} = require('../src/services/whatsapp.service');

const hotLead = {
  conversationId: 'hot-conversation',
  classification: 'HOT',
  confidence: 0.91,
  leadData: {
    businessType: 'clothes',
    budget: 50000,
    timeline: '1 month',
    features: ['payment gateway']
  },
  transcript: 'I need the website next month. Can you start next week?'
};

async function run() {
  resetMockWhatsAppService();

  const firstHotAction = await evaluateAction(hotLead);
  assert.equal(firstHotAction.action, 'SEND_WHATSAPP');
  assert.equal(firstHotAction.triggered, true);
  assert.match(firstHotAction.message, /clothing business/);
  assert.match(firstHotAction.message, /₹50,000/);
  assert.ok(getWhatsAppDelivery(hotLead.conversationId));

  const duplicateHotAction = await evaluateAction(hotLead);
  assert.equal(duplicateHotAction.action, 'SEND_WHATSAPP');
  assert.equal(duplicateHotAction.triggered, false);
  assert.match(duplicateHotAction.reason, /already handled/);

  const warmAction = await evaluateAction({
    ...hotLead,
    conversationId: 'warm-conversation',
    classification: 'WARM'
  });
  assert.equal(warmAction.action, 'RECOMMEND_CALLBACK');
  assert.equal(warmAction.triggered, false);
  assert.equal(getWhatsAppDelivery('warm-conversation'), null);

  const coldAction = await evaluateAction({
    ...hotLead,
    conversationId: 'cold-conversation',
    classification: 'COLD'
  });
  assert.equal(coldAction.action, 'LOW_PRIORITY_FOLLOW_UP');
  assert.equal(coldAction.triggered, false);
  assert.equal(getWhatsAppDelivery('cold-conversation'), null);

  console.log('Action decision service tests passed.');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
