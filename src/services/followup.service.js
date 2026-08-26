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

function formatBusinessType(businessType) {
  if (!businessType) return null;
  return businessType.toLowerCase() === 'clothes' ? 'clothing' : businessType;
}

function getWarmBarrier(barrier, transcript = '') {
  if (barrier) return barrier;
  if (/budget (?:is )?(?:too |very )?low|low budget|budget (?:is )?kam|paise kam/i.test(transcript)) {
    return 'budget is a consideration right now';
  }
  if (/partner.*discuss|discuss.*partner|brother handles|approval|manager.*decide/i.test(transcript)) {
    return 'you need to discuss this with another decision maker';
  }
  if (/next month|later|not now|agle mahine|baad mein/i.test(transcript)) {
    return 'the timing needs to be revisited';
  }
  return null;
}

function formatCallbackTime(callback) {
  if (!callback?.scheduledFor) return null;

  const callbackDate = new Date(callback.scheduledFor);
  if (Number.isNaN(callbackDate.getTime())) return null;

  return new Intl.DateTimeFormat('en-IN', {
    timeZone: callback.timezone || 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit'
  }).format(callbackDate);
}

function createLeadSummary(leadData = {}) {
  const businessType = formatBusinessType(leadData.businessType);
  const sentences = [];

  if (businessType) {
    const productCount = Number(leadData.productCount);
    const productText = Number.isFinite(productCount) && productCount > 0
      ? ` with around ${productCount} products`
      : '';
    sentences.push(`You’re looking to build an e-commerce website for your ${businessType} business${productText}.`);
  }

  const budget = formatBudget(leadData.budget);
  if (budget) sentences.push(`We noted a budget of around ${budget}.`);
  if (leadData.timeline) sentences.push(`You’re aiming for a timeline of ${leadData.timeline}.`);
  if (Array.isArray(leadData.features) && leadData.features.length > 0) {
    sentences.push(`Key requirements include ${leadData.features.join(', ')}.`);
  }

  return sentences;
}

function getAttachments() {
  return {
    resume: process.env.RESUME_PATH || null,
    architectureImage: process.env.ARCHITECTURE_IMAGE_PATH || null
  };
}

function validateFollowupInput({ conversationId, classification }) {
  if (typeof conversationId !== 'string' || !conversationId.trim()) {
    throw new TypeError('conversationId must be a non-empty string.');
  }

  if (!['HOT', 'WARM', 'COLD'].includes(classification)) {
    throw new TypeError('classification must be HOT, WARM, or COLD.');
  }
}

function generateFollowup({
  conversationId,
  classification,
  leadData = {},
  transcript = '',
  callback = null,
  barrier = null
}) {
  validateFollowupInput({ conversationId, classification });

  const summary = createLeadSummary(leadData);
  const callbackTime = formatCallbackTime(callback);
  const messageParts = ['Hi, it was great speaking with you.'];

  if (classification === 'HOT') {
    messageParts.push(...summary);
    messageParts.push('I’ll share the next steps shortly so we can get started.');
  } else if (classification === 'WARM') {
    messageParts.push(...summary);
    const warmBarrier = getWarmBarrier(barrier, transcript);
    if (warmBarrier) messageParts.push(`I understand that ${warmBarrier}.`);
    if (callbackTime) {
      messageParts.push(`I’ll call you back on ${callbackTime} to continue the discussion.`);
    } else {
      messageParts.push('Whenever you’re ready, we can discuss the best next step for your store.');
    }
  } else {
    if (summary.length > 0) messageParts.push(...summary);
    messageParts.push('Sharing this as a helpful reference for whenever you decide to explore your online store—no rush at all.');
  }

  return {
    conversationId,
    message: messageParts.join(' '),
    attachments: getAttachments(),
    phoneNumber: process.env.MY_PHONE_NUMBER || null
  };
}

async function sendFollowup(input) {
  const followup = generateFollowup(input);
  const attachments = Object.values(followup.attachments).filter(Boolean);
  const deliveryResult = await sendWhatsAppMessage({
    conversationId: followup.conversationId,
    message: followup.message,
    attachments,
    messageType: 'final-followup'
  });

  return {
    ...followup,
    sent: deliveryResult.sent,
    duplicate: deliveryResult.duplicate,
    delivery: deliveryResult.delivery
  };
}

module.exports = { generateFollowup, sendFollowup };
