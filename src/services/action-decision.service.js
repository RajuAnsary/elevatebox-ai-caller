const { sendWhatsAppMessage } = require('./whatsapp.service');

function formatBudget(budget) {
  const numericBudget = Number(budget);

  if (!Number.isFinite(numericBudget) || numericBudget <= 0) {
    return null;
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(numericBudget);
}

function getBusinessDescription(businessType) {
  if (!businessType) return 'business';
  if (businessType.toLowerCase() === 'clothes') return 'clothing business';
  return `${businessType} business`;
}

function createWhatsAppMessage(leadData = {}) {
  const details = [`an e-commerce website for your ${getBusinessDescription(leadData.businessType)}`];
  const budget = formatBudget(leadData.budget);

  if (budget) {
    details.push(`around ${budget} budget`);
  }

  if (leadData.timeline) {
    details.push(`a target timeline of ${leadData.timeline}`);
  }

  if (Array.isArray(leadData.features) && leadData.features.length > 0) {
    details.push(`features such as ${leadData.features.join(', ')}`);
  }

  return `Hi, great speaking with you. Based on our discussion, you're looking for ${details.join(', ')}. I'll share the next steps shortly.`;
}

function validateActionInput({ conversationId, classification }) {
  if (typeof conversationId !== 'string' || !conversationId.trim()) {
    throw new TypeError('conversationId must be a non-empty string.');
  }

  if (!['HOT', 'WARM', 'COLD'].includes(classification)) {
    throw new TypeError('classification must be HOT, WARM, or COLD.');
  }
}

async function evaluateAction({ conversationId, classification, confidence, leadData = {}, transcript = '' }) {
  validateActionInput({ conversationId, classification });

  if (classification === 'HOT') {
    const message = createWhatsAppMessage(leadData);
    const deliveryResult = await sendWhatsAppMessage({ conversationId, message });

    return {
      action: 'SEND_WHATSAPP',
      triggered: deliveryResult.sent,
      message,
      reason: deliveryResult.duplicate
        ? 'High buying intent was already handled for this conversation.'
        : 'High buying intent detected'
    };
  }

  if (classification === 'WARM') {
    return {
      action: 'RECOMMEND_CALLBACK',
      triggered: false,
      message: null,
      reason: 'Lead is interested but needs follow-up before a high-intent message is appropriate.'
    };
  }

  return {
    action: 'LOW_PRIORITY_FOLLOW_UP',
    triggered: false,
    message: null,
    reason: 'Lead is exploratory and does not require a mid-call WhatsApp message.'
  };
}

module.exports = { evaluateAction };
