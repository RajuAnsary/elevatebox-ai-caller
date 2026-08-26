const STRONG_INTENT_PATTERN = /how soon can (?:you|we) start|can (?:you|we) start(?:\s+next week)?|send (?:me )?(?:the )?(?:quotation|quote)|final price|next steps?|ready to proceed|let'?s start|start (?:the )?project|quotation bhej|kab shuru|(?:agli|next) week (?:mein )?start|jaldi start/i;
const BARRIER_PATTERNS = [
  ['budget is currently too low', /budget (?:is )?(?:too |very )?low|low budget|budget (?:is )?kam|paise kam/i],
  ['another decision maker needs to be involved', /brother handles|partner.*discuss|discuss.*partner|family.*decide|manager.*decide|approval/i],
  ['timing is delayed', /maybe next month|next month|later|not now|agle mahine|baad mein/i]
];
const EXPLORATION_PATTERN = /just (?:checking|exploring)|no plan (?:right )?now|just wanted to know (?:the )?price|sirf (?:price )?(?:dekh|puch)|bas information|abhi (?:koi )?plan nahi/i;
const SHORT_TIMELINE_PATTERN = /\b(?:soon|asap|urgent|immediately|this month|next week)\b|\b(?:within|in)\s+\d+\s*(?:days?|weeks?)\b|\b1\s*month\b|jaldi|tvaraga/i;

function normalizeLeadData(leadData = {}) {
  return {
    businessType: leadData.businessType || null,
    productCount: Number.isFinite(Number(leadData.productCount)) && Number(leadData.productCount) > 0
      ? Number(leadData.productCount)
      : null,
    budget: Number.isFinite(Number(leadData.budget)) && Number(leadData.budget) > 0
      ? Number(leadData.budget)
      : null,
    timeline: leadData.timeline || null,
    features: Array.isArray(leadData.features) ? leadData.features.filter(Boolean) : []
  };
}

function getBarrier(transcript) {
  const match = BARRIER_PATTERNS.find(([, pattern]) => pattern.test(transcript));
  return match ? match[0] : null;
}

function hasClearNeed(transcript, leadData) {
  return Boolean(
    leadData.businessType ||
    leadData.features.length > 0 ||
    /e-?commerce|online store|website (?:for|need|banana|banwani)|sell (?:online|products)|web ?site chahiye/i.test(transcript)
  );
}

function hasShortTimeline(transcript, leadData) {
  return SHORT_TIMELINE_PATTERN.test(transcript) || SHORT_TIMELINE_PATTERN.test(leadData.timeline || '');
}

function getQualificationSignals(transcript, leadData) {
  const signals = [];
  const clearNeed = hasClearNeed(transcript, leadData);
  const strongIntent = STRONG_INTENT_PATTERN.test(transcript);
  const shortTimeline = hasShortTimeline(transcript, leadData);
  const completeDataPoints = [
    leadData.businessType,
    leadData.productCount,
    leadData.budget,
    leadData.timeline,
    leadData.features.length > 0
  ].filter(Boolean).length;

  if (clearNeed) signals.push('clear e-commerce need');
  if (leadData.budget) signals.push('clear budget');
  if (shortTimeline) signals.push('short timeline');
  if (strongIntent) signals.push('strong buying intent');
  if (leadData.productCount) signals.push('known product count');
  if (leadData.features.length > 0) signals.push('defined feature requirements');

  return { clearNeed, completeDataPoints, shortTimeline, signals, strongIntent };
}

function classifyLead({ transcript, leadData }) {
  if (typeof transcript !== 'string' || !transcript.trim()) {
    throw new TypeError('transcript must be a non-empty string.');
  }

  if (!leadData || typeof leadData !== 'object' || Array.isArray(leadData)) {
    throw new TypeError('leadData must be an object.');
  }

  const normalizedLeadData = normalizeLeadData(leadData);
  const context = transcript.trim();
  const barrier = getBarrier(context);
  const explorationOnly = EXPLORATION_PATTERN.test(context);
  const qualification = getQualificationSignals(context, normalizedLeadData);
  const { clearNeed, completeDataPoints, shortTimeline, signals, strongIntent } = qualification;
  const hasSupportingReadiness = normalizedLeadData.budget && shortTimeline;

  if (strongIntent && clearNeed && hasSupportingReadiness && !barrier) {
    return {
      classification: 'HOT',
      confidence: 0.9,
      reason: 'Customer has a clear need, budget, short timeline, and is asking about starting soon.',
      signals,
      barrier: null
    };
  }

  if (clearNeed && (barrier || completeDataPoints >= 2)) {
    return {
      classification: 'WARM',
      confidence: barrier ? 0.8 : 0.65,
      reason: barrier
        ? `Customer has genuine e-commerce interest, but ${barrier}.`
        : 'Customer has a real e-commerce need but needs more qualification before they are ready to proceed.',
      signals: [...signals, ...(barrier ? ['active buying barrier'] : ['incomplete qualification'])],
      barrier: barrier || 'Budget, timeline, or decision readiness is not confirmed.'
    };
  }

  if (explorationOnly || (!clearNeed && completeDataPoints === 0)) {
    return {
      classification: 'COLD',
      confidence: explorationOnly ? 0.85 : 0.7,
      reason: 'Customer is exploring only and has not shared a concrete need, budget, or timeline.',
      signals: explorationOnly ? ['exploratory language', 'incomplete qualification'] : ['no clear e-commerce need'],
      barrier: 'No confirmed project intent.'
    };
  }

  return {
    classification: 'WARM',
    confidence: 0.55,
    reason: 'Customer may have a need, but budget, timeline, and buying readiness need clarification.',
    signals: [...signals, 'incomplete qualification'],
    barrier: 'Budget, timeline, or decision readiness is not confirmed.'
  };
}

module.exports = { classifyLead };
