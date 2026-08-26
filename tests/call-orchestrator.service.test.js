const assert = require('node:assert/strict');
const {
  endSession,
  getSession,
  processSessionMessage,
  resetSessions
} = require('../src/services/call-orchestrator.service');
const { resetScheduler } = require('../src/services/scheduler.service');
const {
  getWhatsAppDelivery,
  resetMockWhatsAppService
} = require('../src/services/whatsapp.service');

async function run() {
  resetSessions();
  resetScheduler();
  resetMockWhatsAppService();

  await processSessionMessage({
    conversationId: 'session-hot',
    message: 'I sell clothes and want an online store.'
  });
  const hotTurn = await processSessionMessage({
    conversationId: 'session-hot',
    message: 'My budget is 50000. Can you start next week? Please send the quotation.'
  });
  assert.equal(hotTurn.classification, 'HOT');
  assert.equal(hotTurn.action.action, 'SEND_WHATSAPP');
  assert.equal(hotTurn.action.triggered, true);
  assert.equal(hotTurn.leadData.budget, 50000);
  assert.equal(hotTurn.leadData.timeline, 'next week');

  await processSessionMessage({
    conversationId: 'spoken-budget-hot',
    message: 'I sell clothes and want an online store.'
  });
  const spokenBudgetHotTurn = await processSessionMessage({
    conversationId: 'spoken-budget-hot',
    message: 'My budget is 15. 000 and I need it next week. Please send the quotation.'
  });
  assert.equal(spokenBudgetHotTurn.leadData.budget, 15000);
  assert.equal(spokenBudgetHotTurn.leadData.timeline, 'next week');
  assert.equal(spokenBudgetHotTurn.classification, 'HOT');
  assert.equal(spokenBudgetHotTurn.action.action, 'SEND_WHATSAPP');

  const partialToComplete = await processSessionMessage({
    conversationId: 'budget-15-to-15000',
    message: 'My budget is 15...'
  });
  assert.equal(partialToComplete.leadData.budget, null);
  const completeBudget = await processSessionMessage({
    conversationId: 'budget-15-to-15000',
    message: '15,000'
  });
  assert.equal(completeBudget.leadData.budget, 15000);

  await processSessionMessage({
    conversationId: 'budget-15-to-thousand',
    message: 'My budget is 15...'
  });
  const thousandBudget = await processSessionMessage({
    conversationId: 'budget-15-to-thousand',
    message: '15 thousand'
  });
  assert.equal(thousandBudget.leadData.budget, 15000);

  await processSessionMessage({
    conversationId: 'budget-50-to-50k',
    message: 'My budget is 50...'
  });
  const abbreviatedBudget = await processSessionMessage({
    conversationId: 'budget-50-to-50k',
    message: '50k'
  });
  assert.equal(abbreviatedBudget.leadData.budget, 50000);

  const duplicateHotTurn = await processSessionMessage({
    conversationId: 'session-hot',
    message: 'I am ready to proceed. Can you start next week?'
  });
  assert.equal(duplicateHotTurn.action.action, 'SEND_WHATSAPP');
  assert.equal(duplicateHotTurn.action.triggered, false);
  assert.equal(duplicateHotTurn.leadData.budget, 50000);
  assert.ok(getWhatsAppDelivery('session-hot', 'mid-call'));

  const hotEnd = await endSession('session-hot');
  assert.equal(hotEnd.callStatus, 'ENDED');
  assert.equal(hotEnd.finalFollowup.sent, true);
  assert.ok(getWhatsAppDelivery('session-hot', 'final-followup'));
  const repeatedEnd = await endSession('session-hot');
  assert.equal(repeatedEnd.finalFollowup.sent, true);

  const warmTurn = await processSessionMessage({
    conversationId: 'session-warm',
    message: 'I sell jewellery online, but my budget is low right now. Please call me back tomorrow morning.'
  });
  assert.equal(warmTurn.classification, 'WARM');
  assert.equal(warmTurn.action.action, 'RECOMMEND_CALLBACK');
  assert.equal(warmTurn.callback.status, 'SCHEDULED');

  const coldTurn = await processSessionMessage({
    conversationId: 'session-cold',
    message: 'I am just checking. No plan right now.'
  });
  assert.equal(coldTurn.classification, 'COLD');
  assert.equal(coldTurn.action.action, 'LOW_PRIORITY_FOLLOW_UP');
  assert.equal(getSession('session-cold').callStatus, 'ACTIVE');

  console.log('Call orchestrator service tests passed.');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
