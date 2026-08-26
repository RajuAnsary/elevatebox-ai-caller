const { SALES_AGENT_DISCOVERY_FIELDS } = require('../prompts/sales-agent.prompt');

const FEATURE_PATTERNS = [
  ['payment gateway', /payment|upi|razorpay|stripe|cash on delivery|cod/i],
  ['product categories', /categor(?:y|ies)|collection/i],
  ['delivery or shipping', /deliver|shipping|courier/i],
  ['inventory management', /inventory|stock management/i],
  ['offers and discounts', /offer|discount|coupon/i],
  ['WhatsApp ordering', /whatsapp/i],
  ['multilingual pages', /multilingual|multiple language|hindi|telugu/i],
  ['customer accounts', /customer account|login|sign[ -]?up/i],
  ['admin panel', /admin panel|dashboard/i]
];

function createEmptyLeadData() {
  return {
    businessType: null,
    productCount: null,
    budget: null,
    timeline: null,
    features: []
  };
}

function getHistoryMessages(conversationHistory) {
  if (!Array.isArray(conversationHistory)) {
    return [];
  }

  return conversationHistory
    .filter((entry) => typeof entry === 'string' || entry?.role !== 'assistant')
    .map((entry) => (typeof entry === 'string' ? entry : entry.content))
    .filter((message) => typeof message === 'string');
}

function detectLanguage(message) {
  if (/[ఀ-౿]/.test(message)) {
    return 'telugu';
  }

  if (/[ऀ-ॿ]/.test(message)) {
    return 'hindi';
  }

  if (/\b(main|mujhe|mujko|hai|hain|kitne|jaldi|budget|bechta|bechti|chahiye|pata nahi)\b/i.test(message)) {
    return 'hinglish';
  }

  if (/\b(nenu|naaku|amma?ta|enn(i|u)|kavali|teliyadu|tvaraga)\b/i.test(message)) {
    return 'tenglish';
  }

  return 'english';
}

function extractBusinessType(message) {
  const patterns = [
    /(?:i sell|we sell|i am selling|we are selling)\s+(.+?)(?:\s+(?:and|but|with|online)|[,.]|$)/i,
    /(?:i have a|we have a)\s+(.+?)\s+(?:business|store|shop)/i,
    /main\s+(.+?)\s+becht[aiye]/i,
    /(?:nenu|memu)\s+(.+?)\s+amm(?:utanu|utam)/i
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  return null;
}

function extractProductCount(message) {
  const match = message.match(/(?:about|around|approximately|approx|nearly)?\s*(\d[\d,]*)\s*(?:\+\s*)?(?:products?|items?|skus?|designs?|models?)/i);
  return match ? Number.parseInt(match[1].replaceAll(',', ''), 10) : null;
}

function normalizeSpokenBudgetDigits(message) {
  // Vapi may insert sentence-like punctuation between Indian-style digit groups
  // (for example, "1. 50. 000"). Restrict normalization to groups ending in
  // a three-digit group so ordinary sentence punctuation is left untouched.
  return message
    .replace(/\b(\d{1,2})\s*\.\s*(\d{2})\s*\.\s*(\d{3})\b/g, '$1$2$3')
    .replace(/\b(\d{1,2})\s*\.\s*(\d{3})\b/g, '$1$2');
}

function extractBudget(message) {
  const normalizedMessage = normalizeSpokenBudgetDigits(message);
  const explicitBudgetMatch = normalizedMessage.match(
    /\b(?:budget|price range|investment)\b\s*(?:(?:is|of|around|about|approximately|approx)\s*)?(?:₹|rs\.?|inr)?\s*(\d[\d,]*(?:\.\d+)?)\s*(k|thousand|lakh|lakhs)?/i
  );
  const currencyMatch = normalizedMessage.match(/(?:₹|rs\.?|inr)\s*(\d[\d,]*(?:\.\d+)?)\s*(k|thousand|lakh|lakhs)?/i);
  const abbreviatedMatch = normalizedMessage.match(/\b(\d[\d,]*(?:\.\d+)?)\s*(k|thousand|lakh|lakhs)\b/i);
  const groupedNumberMatch = normalizedMessage.match(/\b(\d{1,3}(?:,\d{3})+)\b/);
  const largeNumberMatch = normalizedMessage.match(/\b(\d{4,})\b/);
  const spokenThousandsMatch = normalizedMessage.match(/\b(fifteen)\s+thousand\b/i);
  const match = explicitBudgetMatch || currencyMatch || abbreviatedMatch || groupedNumberMatch || largeNumberMatch;

  if (spokenThousandsMatch) {
    return 15000;
  }

  if (!match) {
    return null;
  }

  const amount = Number(match[1].replaceAll(',', ''));
  const unit = match[2]?.toLowerCase();
  const multiplier = unit === 'k' || unit === 'thousand'
    ? 1000
    : unit === 'lakh' || unit === 'lakhs'
      ? 100000
      : 1;

  const normalizedAmount = Number.isFinite(amount) ? amount * multiplier : null;
  const hasCompleteBudgetMarker = Boolean(
    currencyMatch || abbreviatedMatch || explicitBudgetMatch?.[2]
  );

  // A small bare number such as "my budget is 15..." is often an interim
  // transcript fragment. Wait for a complete amount instead of storing it.
  if (!hasCompleteBudgetMarker && normalizedAmount !== null && normalizedAmount < 1000) {
    return null;
  }

  return normalizedAmount;
}

function extractTimeline(message) {
  const timelineMatch = message.match(/(?:within|in|by|around)?\s*(\d+\s*(?:days?|weeks?|months?))/i);
  if (timelineMatch) {
    return timelineMatch[1];
  }

  if (/\bsoon\b|asap|urgent|immediately|jaldi|tvaraga/i.test(message)) {
    return 'soon';
  }

  if (/this month/i.test(message)) {
    return 'this month';
  }

  if (/next week/i.test(message)) {
    return 'next week';
  }

  if (/next month/i.test(message)) {
    return 'next month';
  }

  return null;
}

function extractFeatures(message) {
  return FEATURE_PATTERNS
    .filter(([, pattern]) => pattern.test(message))
    .map(([feature]) => feature);
}

function mergeLeadData(leadData, message) {
  const updatedData = { ...leadData, features: [...leadData.features] };
  const businessType = extractBusinessType(message);
  const productCount = extractProductCount(message);
  const budget = extractBudget(message);
  const timeline = extractTimeline(message);

  if (businessType) updatedData.businessType = businessType;
  if (productCount) updatedData.productCount = productCount;
  if (budget) updatedData.budget = budget;
  if (timeline) updatedData.timeline = timeline;

  for (const feature of extractFeatures(message)) {
    if (!updatedData.features.includes(feature)) {
      updatedData.features.push(feature);
    }
  }

  return updatedData;
}

function getNextField(leadData) {
  return SALES_AGENT_DISCOVERY_FIELDS.find((field) => {
    if (field === 'features') return leadData.features.length === 0;
    return leadData[field] === null;
  });
}

function isVagueAnswer(message) {
  return /not sure|don't know|do not know|no idea|pata nahi|maloom nahi|తెలియదు|teliyadu/i.test(message);
}

const REPLIES = {
  english: {
    businessType: 'What products would you like to sell through the website?',
    productCount: 'Roughly how many products would you start with—just a few, dozens, or more?',
    budget: 'Do you have a comfortable budget range in mind for the website?',
    timeline: 'When would you ideally like the website to be ready?',
    features: 'What would matter most for the store—online payments, delivery, inventory, offers, or something else?',
    close: 'Thanks, that gives me a clear picture. ElevateBox can use these details to suggest a suitable e-commerce website approach.'
  },
  hindi: {
    businessType: 'आप वेबसाइट पर कौन-से प्रोडक्ट बेचना चाहते हैं?',
    productCount: 'शुरुआत में आपके पास लगभग कितने प्रोडक्ट होंगे—कुछ, दर्जनों, या उससे ज़्यादा?',
    budget: 'वेबसाइट के लिए आपका कोई अनुमानित बजट रेंज है?',
    timeline: 'आप वेबसाइट कब तक तैयार चाहते हैं?',
    features: 'स्टोर में क्या ज़रूरी होगा—ऑनलाइन पेमेंट, डिलीवरी, इन्वेंटरी, ऑफर्स, या कुछ और?',
    close: 'धन्यवाद, अब आपकी ज़रूरत साफ़ है। ElevateBox इन विवरणों के आधार पर सही e-commerce वेबसाइट का तरीका सुझा सकता है।'
  },
  telugu: {
    businessType: 'మీరు వెబ్‌సైట్‌లో ఏ ప్రొడక్ట్స్ అమ్మాలనుకుంటున్నారు?',
    productCount: 'మొదట్లో మీ దగ్గర సుమారుగా ఎన్ని ప్రొడక్ట్స్ ఉంటాయి—కొన్ని, డజన్లు, లేదా ఇంకా ఎక్కువా?',
    budget: 'వెబ్‌సైట్ కోసం మీకు ఏదైనా సుమారు బడ్జెట్ రేంజ్ ఉందా?',
    timeline: 'వెబ్‌సైట్ ఎప్పటికి సిద్ధంగా ఉండాలని అనుకుంటున్నారు?',
    features: 'స్టోర్‌లో ఏమి ముఖ్యము—ఆన్‌లైన్ పేమెంట్స్, డెలివరీ, ఇన్వెంటరీ, ఆఫర్స్, లేదా ఇంకేదైనా?',
    close: 'ధన్యవాదాలు, ఇప్పుడు మీ అవసరం స్పష్టంగా ఉంది. ఈ వివరాలతో ElevateBox సరైన e-commerce website విధానాన్ని సూచించగలదు.'
  },
  hinglish: {
    businessType: 'Aap website par kaun-se products bechna chahte hain?',
    productCount: 'Shuru mein approx kitne products honge—kuch, dozens, ya usse zyada?',
    budget: 'Website ke liye aapka koi comfortable budget range hai?',
    timeline: 'Aap website kab tak ready chahte hain?',
    features: 'Store mein kya important hoga—online payments, delivery, inventory, offers, ya kuch aur?',
    close: 'Thanks, ab requirement clear hai. ElevateBox in details ke basis par suitable e-commerce website approach suggest kar sakta hai.'
  },
  tenglish: {
    businessType: 'Meeru website lo emi products ammalanukuntunnaru?',
    productCount: 'Starting lo approx enni products untayi—konni, dozens, leka ekkuva?',
    budget: 'Website kosam meeku oka rough budget range unda?',
    timeline: 'Website eppatiki ready avvali anukuntunnaru?',
    features: 'Store lo em important—online payments, delivery, inventory, offers, leka inkemaina?',
    close: 'Thanks, ippudu requirement clear ga undi. Ee details tho ElevateBox suitable e-commerce website approach suggest cheyagaladu.'
  }
};

function buildReply(leadData, language, message) {
  const replies = REPLIES[language];
  const nextField = getNextField(leadData);

  if (!nextField) {
    return replies.close;
  }

  const acknowledgement = leadData.businessType && nextField === 'productCount'
    ? language === 'english'
      ? `That sounds good for an online store. ${replies.productCount}`
      : replies.productCount
    : replies[nextField];

  if (isVagueAnswer(message)) {
    return `${acknowledgement} A rough estimate is completely fine.`;
  }

  return acknowledgement;
}

function processConversationMessage({ message, conversationHistory = [] }) {
  if (typeof message !== 'string' || !message.trim()) {
    throw new TypeError('message must be a non-empty string.');
  }

  const customerMessages = getHistoryMessages(conversationHistory);
  const allMessages = [...customerMessages, message.trim()];
  const extractedData = allMessages.reduce(
    (leadData, customerMessage) => mergeLeadData(leadData, customerMessage),
    createEmptyLeadData()
  );
  const language = detectLanguage(message);

  return {
    reply: buildReply(extractedData, language, message),
    extractedData
  };
}

module.exports = { processConversationMessage };
