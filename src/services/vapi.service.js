const { VapiClient } = require('@vapi-ai/server-sdk');
const {
  SALES_AGENT_FIRST_MESSAGE,
  SALES_AGENT_SYSTEM_PROMPT
} = require('../prompts/sales-agent.prompt');

class VapiConfigurationError extends Error {
  constructor(missingVariables) {
    super(`Missing required environment variables: ${missingVariables.join(', ')}`);
    this.name = 'VapiConfigurationError';
  }
}

function getVapiConfiguration({
  requiresPhoneNumberId = true,
  requiresTargetPhoneNumber = true
} = {}) {
  const requiredVariables = ['VAPI_API_KEY', 'VAPI_ASSISTANT_ID'];

  if (requiresPhoneNumberId) {
    requiredVariables.push('VAPI_PHONE_NUMBER_ID');
  }

  if (requiresTargetPhoneNumber) {
    requiredVariables.push('TARGET_PHONE_NUMBER');
  }
  const missingVariables = requiredVariables.filter((variable) => !process.env[variable]);

  if (missingVariables.length > 0) {
    throw new VapiConfigurationError(missingVariables);
  }

  return {
    apiKey: process.env.VAPI_API_KEY,
    assistantId: process.env.VAPI_ASSISTANT_ID,
    phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
    targetPhoneNumber: process.env.TARGET_PHONE_NUMBER
  };
}

function getSystemMessage(model) {
  return model?.messages?.find((message) => message.role === 'system');
}

async function configureSalesAssistant() {
  const { apiKey, assistantId } = getVapiConfiguration({
    requiresPhoneNumberId: false,
    requiresTargetPhoneNumber: false
  });
  const vapi = new VapiClient({ token: apiKey });
  const assistant = await vapi.assistants.get({ id: assistantId });
  const existingSystemMessage = getSystemMessage(assistant.model);
  const isConfigured =
    assistant.firstMessage === SALES_AGENT_FIRST_MESSAGE &&
    existingSystemMessage?.content === SALES_AGENT_SYSTEM_PROMPT;

  if (isConfigured) {
    return assistant;
  }

  if (!assistant.model) {
    throw new VapiConfigurationError([
      'a model configuration on the selected Vapi assistant'
    ]);
  }

  return vapi.assistants.update({
    id: assistantId,
    firstMessage: SALES_AGENT_FIRST_MESSAGE,
    firstMessageMode: 'assistant-speaks-first',
    model: {
      ...assistant.model,
      messages: [{ role: 'system', content: SALES_AGENT_SYSTEM_PROMPT }]
    }
  });
}

async function startOutboundCall() {
  const { apiKey, assistantId, phoneNumberId, targetPhoneNumber } = getVapiConfiguration();
  await configureSalesAssistant();
  const vapi = new VapiClient({ token: apiKey });

  return vapi.calls.create({
    assistantId,
    phoneNumberId,
    customer: { number: targetPhoneNumber }
  });
}

module.exports = {
  configureSalesAssistant,
  startOutboundCall,
  VapiConfigurationError
};
