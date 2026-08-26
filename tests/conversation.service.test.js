const assert = require('node:assert/strict');
const { processConversationMessage } = require('../src/services/conversation.service');

const firstTurn = processConversationMessage({
  message: 'I sell clothes and need a website soon',
  conversationHistory: []
});

assert.equal(firstTurn.extractedData.businessType, 'clothes');
assert.equal(firstTurn.extractedData.timeline, 'soon');
assert.equal(firstTurn.extractedData.productCount, null);

const secondTurn = processConversationMessage({
  message: 'Around 50 products, with payments and delivery. My budget is ₹50,000.',
  conversationHistory: [
    { role: 'user', content: 'I sell clothes and need a website soon' },
    { role: 'assistant', content: firstTurn.reply }
  ]
});

assert.equal(secondTurn.extractedData.businessType, 'clothes');
assert.equal(secondTurn.extractedData.productCount, 50);
assert.equal(secondTurn.extractedData.budget, 50000);
assert.deepEqual(secondTurn.extractedData.features, [
  'payment gateway',
  'delivery or shipping'
]);

const budgetAndTimelineTurn = processConversationMessage({
  message: 'My budget is 50000. I need to start next week.',
  conversationHistory: []
});

assert.equal(budgetAndTimelineTurn.extractedData.budget, 50000);
assert.equal(budgetAndTimelineTurn.extractedData.timeline, 'next week');

const abbreviatedBudgetTurn = processConversationMessage({
  message: 'I can spend 50k, or 50 thousand.',
  conversationHistory: []
});

assert.equal(abbreviatedBudgetTurn.extractedData.budget, 50000);

const partialBudgetTurn = processConversationMessage({
  message: 'My budget is 15...',
  conversationHistory: []
});

assert.equal(partialBudgetTurn.extractedData.budget, null);

for (const [message, expectedBudget] of [
  ['My budget is 15000', 15000],
  ['My budget is 15,000', 15000],
  ['My budget is 15. 000', 15000],
  ['My budget is 15 . 000 rupees', 15000],
  ['Budget around 50. 000', 50000],
  ['My budget is 1. 50. 000', 150000],
  ['My budget is ₹15000', 15000],
  ['My budget is ₹15,000', 15000],
  ['My budget is 15 thousand', 15000],
  ['My budget is fifteen thousand', 15000],
  ['My budget is 15k', 15000]
]) {
  const result = processConversationMessage({ message, conversationHistory: [] });
  assert.equal(result.extractedData.budget, expectedBudget, message);
}

const hindiTurn = processConversationMessage({
  message: 'मुझे जल्द वेबसाइट चाहिए',
  conversationHistory: []
});

assert.match(hindiTurn.reply, /प्रोडक्ट|वेबसाइट/);

const teluguTurn = processConversationMessage({
  message: 'నాకు త్వరగా వెబ్‌సైట్ కావాలి',
  conversationHistory: []
});

assert.match(teluguTurn.reply, /ప్రొడక్ట్స్|వెబ్‌సైట్/);

console.log('Conversation service tests passed.');
