class MockWhatsAppProvider {
  async sendMessage({ conversationId, message, messageType }) {
    console.log(`[Mock WhatsApp] type=${messageType} conversation=${conversationId} message=${message}`);

    return {
      provider: 'mock',
      status: 'sent'
    };
  }
}

let activeProvider = new MockWhatsAppProvider();
const sentMessages = new Map();
const pendingMessages = new Map();

function getDeliveryKey(conversationId, messageType) {
  return `${conversationId}:${messageType}`;
}

function setWhatsAppProvider(provider) {
  if (!provider || typeof provider.sendMessage !== 'function') {
    throw new TypeError('WhatsApp provider must implement sendMessage(payload).');
  }

  activeProvider = provider;
}

async function sendWhatsAppMessage({
  conversationId,
  message,
  attachments = [],
  messageType = 'mid-call'
}) {
  const deliveryKey = getDeliveryKey(conversationId, messageType);

  if (sentMessages.has(deliveryKey)) {
    return {
      sent: false,
      duplicate: true,
      delivery: sentMessages.get(deliveryKey)
    };
  }

  if (pendingMessages.has(deliveryKey)) {
    const delivery = await pendingMessages.get(deliveryKey);
    return { sent: false, duplicate: true, delivery };
  }

  const deliveryPromise = activeProvider.sendMessage({
    conversationId,
    message,
    attachments,
    messageType
  })
    .then((providerResult) => ({
      conversationId,
      message,
      attachments,
      messageType,
      sentAt: new Date().toISOString(),
      ...providerResult
    }));
  pendingMessages.set(deliveryKey, deliveryPromise);

  let delivery;

  try {
    delivery = await deliveryPromise;
  } finally {
    pendingMessages.delete(deliveryKey);
  }

  sentMessages.set(deliveryKey, delivery);

  return {
    sent: true,
    duplicate: false,
    delivery
  };
}

function getWhatsAppDelivery(conversationId, messageType = 'mid-call') {
  return sentMessages.get(getDeliveryKey(conversationId, messageType)) || null;
}

function resetMockWhatsAppService() {
  activeProvider = new MockWhatsAppProvider();
  sentMessages.clear();
  pendingMessages.clear();
}

module.exports = {
  getWhatsAppDelivery,
  resetMockWhatsAppService,
  sendWhatsAppMessage,
  setWhatsAppProvider
};
