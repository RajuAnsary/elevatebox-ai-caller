const { evaluateAction } = require('./action-decision.service');
const { processConversationMessage } = require('./conversation.service');
const { sendFollowup } = require('./followup.service');
const { classifyLead } = require('./lead-classification.service');
const { scheduleCallback } = require('./scheduler.service');

const sessions = new Map();

function createSession(conversationId) {
  return {
    conversationId,
    conversationHistory: [],
    leadData: {
      businessType: null,
      productCount: null,
      budget: null,
      timeline: null,
      features: []
    },
    classification: null,
    classificationConfidence: null,
    classificationDetails: null,
    midCallAction: null,
    callback: null,
    finalFollowup: null,
    callStatus: 'ACTIVE'
  };
}

function getOrCreateSession(conversationId) {
  if (typeof conversationId !== 'string' || !conversationId.trim()) {
    throw new TypeError('conversationId must be a non-empty string.');
  }

  if (!sessions.has(conversationId)) {
    sessions.set(conversationId, createSession(conversationId));
  }

  return sessions.get(conversationId);
}

function getSession(conversationId) {
  return sessions.get(conversationId) || null;
}

function parseBudget(budget) {
  if (Number.isFinite(Number(budget)) && Number(budget) > 0) {
    return Number(budget);
  }

  if (typeof budget === 'string') {
    const numericValue = Number(budget.replace(/[^\d.]/g, ''));
    return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : null;
  }

  return null;
}

function isBudgetCorrection(message) {
  return /\b(?:actually|instead|correction|correct that|make that|change (?:it|the budget)|not .+ but)\b/i.test(message);
}

function mergeBudget(existingBudget, extractedBudget, message) {
  const candidateBudget = parseBudget(extractedBudget);
  if (!candidateBudget) return existingBudget;
  if (!existingBudget || candidateBudget >= existingBudget) return candidateBudget;

  return isBudgetCorrection(message) ? candidateBudget : existingBudget;
}

function mergeLeadData(existingLeadData, extractedLeadData, message) {
  const combinedFeatures = [...existingLeadData.features, ...(extractedLeadData.features || [])];

  return {
    businessType: extractedLeadData.businessType || existingLeadData.businessType,
    productCount: extractedLeadData.productCount || existingLeadData.productCount,
    budget: mergeBudget(existingLeadData.budget, extractedLeadData.budget, message),
    timeline: extractedLeadData.timeline || existingLeadData.timeline,
    features: [...new Set(combinedFeatures)]
  };
}

function createTranscript(history) {
  return history
    .map((entry) => `${entry.role === 'assistant' ? 'Assistant' : 'Customer'}: ${entry.content}`)
    .join('\n');
}

function isCallbackRequest(message) {
  return /\b(?:call|callback|phone)\b/i.test(message);
}

function buildMessageResponse(session, reply) {
  return {
    conversationId: session.conversationId,
    reply,
    leadData: session.leadData,
    classification: session.classification,
    confidence: session.classificationConfidence,
    action: session.midCallAction,
    callback: session.callback,
    callStatus: session.callStatus
  };
}

async function processSessionMessage({ conversationId, message, timezone = 'Asia/Kolkata' }) {
  const session = getOrCreateSession(conversationId);
  if (session.callStatus === 'ENDED') {
    throw new TypeError('This session has already ended.');
  }

  const conversationResult = processConversationMessage({
    message,
    conversationHistory: session.conversationHistory
  });
  session.conversationHistory.push({ role: 'user', content: message.trim() });
  session.leadData = mergeLeadData(session.leadData, conversationResult.extractedData, message);

  const transcript = createTranscript(session.conversationHistory);
  const classificationResult = classifyLead({ transcript, leadData: session.leadData });
  session.classification = classificationResult.classification;
  session.classificationConfidence = classificationResult.confidence;
  session.classificationDetails = classificationResult;
  session.midCallAction = await evaluateAction({
    conversationId,
    classification: session.classification,
    confidence: session.classificationConfidence,
    leadData: session.leadData,
    transcript
  });

  if (isCallbackRequest(message)) {
    const callback = scheduleCallback({
      conversationId,
      requestedTime: message,
      timezone
    });
    session.callback = callback.status === 'NEEDS_CLARIFICATION' ? null : callback;
  }

  session.conversationHistory.push({ role: 'assistant', content: conversationResult.reply });

  return buildMessageResponse(session, conversationResult.reply);
}

async function endSession(conversationId) {
  const session = getSession(conversationId);
  if (!session) {
    throw new TypeError('Session was not found.');
  }

  if (session.callStatus === 'ENDED') {
    return session;
  }

  if (!session.classification) {
    throw new TypeError('Cannot end a session before processing a customer message.');
  }

  session.finalFollowup = await sendFollowup({
    conversationId,
    classification: session.classification,
    leadData: session.leadData,
    transcript: createTranscript(session.conversationHistory),
    callback: session.callback,
    barrier: session.classificationDetails?.barrier
  });
  session.callStatus = 'ENDED';

  return session;
}

function resetSessions() {
  sessions.clear();
}

module.exports = {
  endSession,
  getOrCreateSession,
  getSession,
  processSessionMessage,
  resetSessions
};
