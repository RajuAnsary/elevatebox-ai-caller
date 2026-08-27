const DEFAULT_API_VERSION = 'v23.0';
const DEFAULT_TIMEOUT_MS = 10000;

class MockWhatsAppProvider {
  constructor() {
    this.name = 'mock';
  }

  async sendMessage({ conversationId, message, messageType }) {
    console.log(`[Mock WhatsApp] type=${messageType} conversation=${conversationId} message=${message}`);
    return { provider: this.name, sent: true, providerMessageId: null, error: null };
  }

  async sendImage({ conversationId, url }) {
    console.log(`[Mock WhatsApp] image conversation=${conversationId} url=${url}`);
    return { provider: this.name, sent: true, providerMessageId: null, error: null };
  }

  async sendDocument({ conversationId, url }) {
    console.log(`[Mock WhatsApp] document conversation=${conversationId} url=${url}`);
    return { provider: this.name, sent: true, providerMessageId: null, error: null };
  }
}

function normalizeIndianPhoneNumber(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return null;

  const digits = String(value).trim().replace(/[^\d]/g, '');
  if (!digits) return null;

  // Bare ten-digit Indian mobiles require a country code; existing international
  // numbers are preserved, with only their leading plus removed.
  return digits.length === 10 ? `91${digits}` : digits;
}

function getMetaConfig() {
  const provider = (process.env.WHATSAPP_PROVIDER || '').trim().toLowerCase();
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const recipientNumber = normalizeIndianPhoneNumber(process.env.WHATSAPP_RECIPIENT_NUMBER);

  if (provider !== 'meta' || !accessToken || !phoneNumberId || !recipientNumber) return null;

  return {
    accessToken,
    phoneNumberId,
    recipientNumber,
    apiVersion: process.env.WHATSAPP_API_VERSION?.trim() || DEFAULT_API_VERSION
  };
}

function getTimeoutMs() {
  const timeout = Number(process.env.WHATSAPP_TIMEOUT_MS);
  return Number.isFinite(timeout) && timeout > 0 ? timeout : DEFAULT_TIMEOUT_MS;
}

function getErrorMessage(payload, fallback) {
  return payload?.error?.message || payload?.message || fallback;
}

class MetaWhatsAppProvider {
  constructor(config, fetchImplementation) {
    this.name = 'meta';
    this.config = config;
    this.fetchImplementation = fetchImplementation;
  }

  getMessagesUrl() {
    return `https://graph.facebook.com/${this.config.apiVersion}/${this.config.phoneNumberId}/messages`;
  }

  async postMessage(body) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), getTimeoutMs());

    try {
      const response = await this.fetchImplementation(this.getMessagesUrl(), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        return {
          provider: this.name,
          sent: false,
          providerMessageId: null,
          error: getErrorMessage(payload, `Meta WhatsApp request failed with status ${response.status}.`)
        };
      }

      return {
        provider: this.name,
        sent: true,
        providerMessageId: payload?.messages?.[0]?.id || null,
        error: null
      };
    } catch (error) {
      return {
        provider: this.name,
        sent: false,
        providerMessageId: null,
        error: error.name === 'AbortError' ? 'Meta WhatsApp request timed out.' : error.message
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  async sendMessage({ message, recipientNumber }) {
    return this.postMessage({
      messaging_product: 'whatsapp',
      to: normalizeIndianPhoneNumber(recipientNumber) || this.config.recipientNumber,
      type: 'text',
      text: { body: message }
    });
  }

  async sendImage({ url, recipientNumber }) {
    return this.postMessage({
      messaging_product: 'whatsapp',
      to: normalizeIndianPhoneNumber(recipientNumber) || this.config.recipientNumber,
      type: 'image',
      image: { link: url }
    });
  }

  async sendDocument({ url, filename, recipientNumber }) {
    return this.postMessage({
      messaging_product: 'whatsapp',
      to: normalizeIndianPhoneNumber(recipientNumber) || this.config.recipientNumber,
      type: 'document',
      document: { link: url, ...(filename ? { filename } : {}) }
    });
  }
}

let activeProvider = null;
let fetchImplementation = global.fetch;
const sentMessages = new Map();
const pendingMessages = new Map();

function getDeliveryKey(conversationId, messageType) {
  return `${conversationId}:${messageType}`;
}

function createSendResult(delivery, duplicate) {
  return {
    provider: delivery.provider,
    sent: duplicate ? false : delivery.sent,
    providerMessageId: delivery.providerMessageId,
    error: delivery.error,
    duplicate,
    delivery
  };
}

function getActiveProvider() {
  if (activeProvider) return activeProvider;
  const metaConfig = getMetaConfig();
  return metaConfig && typeof fetchImplementation === 'function'
    ? new MetaWhatsAppProvider(metaConfig, fetchImplementation)
    : new MockWhatsAppProvider();
}

function setWhatsAppProvider(provider) {
  if (!provider || typeof provider.sendMessage !== 'function') {
    throw new TypeError('WhatsApp provider must implement sendMessage(payload).');
  }
  activeProvider = provider;
}

function setWhatsAppFetch(fetchFunction) {
  if (typeof fetchFunction !== 'function') throw new TypeError('fetchFunction must be a function.');
  fetchImplementation = fetchFunction;
}

function normalizeAttachments(attachments) {
  if (Array.isArray(attachments)) return attachments.map((url) => ({ type: 'document', url }));
  if (!attachments || typeof attachments !== 'object') return [];

  return [
    { type: 'image', url: attachments.architectureImage, label: 'architecture image' },
    { type: 'document', url: attachments.resume, label: 'resume', filename: 'resume.pdf' }
  ].filter((attachment) => Boolean(attachment.url));
}

function isPublicUrl(value) {
  return typeof value === 'string' && /^https:\/\//i.test(value);
}

async function sendAttachments(provider, conversationId, attachments, recipientNumber) {
  const results = [];

  for (const attachment of normalizeAttachments(attachments)) {
    if (!isPublicUrl(attachment.url)) {
      console.warn(`[WhatsApp] Skipping ${attachment.label || 'attachment'}: Meta requires a public HTTPS URL.`);
      results.push({ ...attachment, sent: false, skipped: true, error: 'Attachment URL must be public HTTPS.' });
      continue;
    }

    const method = attachment.type === 'image' ? provider.sendImage : provider.sendDocument;
    if (typeof method !== 'function') {
      results.push({ ...attachment, sent: false, skipped: true, error: 'Provider does not support media delivery.' });
      continue;
    }

    try {
      const result = await method.call(provider, { ...attachment, conversationId, recipientNumber });
      results.push({ ...attachment, ...result });
    } catch (error) {
      console.warn(`[WhatsApp] ${attachment.label || 'Attachment'} delivery failed: ${error.message}`);
      results.push({ ...attachment, sent: false, error: error.message });
    }
  }

  return results;
}

async function sendWhatsAppMessage({
  conversationId,
  message,
  attachments = [],
  messageType = 'mid-call',
  deliveryType,
  recipientNumber
}) {
  const resolvedMessageType = deliveryType || messageType;
  const deliveryKey = getDeliveryKey(conversationId, resolvedMessageType);

  if (sentMessages.has(deliveryKey)) return createSendResult(sentMessages.get(deliveryKey), true);
  if (pendingMessages.has(deliveryKey)) {
    const delivery = await pendingMessages.get(deliveryKey);
    return createSendResult(delivery, true);
  }

  const provider = getActiveProvider();
  const deliveryPromise = Promise.resolve(provider.sendMessage({
    conversationId, message, attachments, messageType: resolvedMessageType, recipientNumber
  }))
    .then(async (providerResult) => {
      const normalizedResult = {
        provider: providerResult?.provider || provider.name || 'custom',
        sent: Boolean(providerResult?.sent),
        providerMessageId: providerResult?.providerMessageId || null,
        error: providerResult?.error || null
      };
      const media = normalizedResult.sent
        ? await sendAttachments(provider, conversationId, attachments, recipientNumber)
        : [];

      return {
        conversationId,
        message,
        attachments,
        messageType: resolvedMessageType,
        sentAt: new Date().toISOString(),
        ...normalizedResult,
        media
      };
    })
    .catch((error) => ({
      conversationId,
      message,
      attachments,
      messageType: resolvedMessageType,
      sentAt: new Date().toISOString(),
      provider: provider.name || 'custom',
      sent: false,
      providerMessageId: null,
      error: error.message,
      media: []
    }));
  pendingMessages.set(deliveryKey, deliveryPromise);

  let delivery;
  try {
    delivery = await deliveryPromise;
  } finally {
    pendingMessages.delete(deliveryKey);
  }

  sentMessages.set(deliveryKey, delivery);
  return createSendResult(delivery, false);
}

function getWhatsAppDelivery(conversationId, messageType = 'mid-call') {
  return sentMessages.get(getDeliveryKey(conversationId, messageType)) || null;
}

function resetMockWhatsAppService() {
  activeProvider = null;
  fetchImplementation = global.fetch;
  sentMessages.clear();
  pendingMessages.clear();
}

module.exports = {
  MetaWhatsAppProvider,
  getWhatsAppDelivery,
  normalizeIndianPhoneNumber,
  resetMockWhatsAppService,
  sendWhatsAppMessage,
  setWhatsAppFetch,
  setWhatsAppProvider
};
