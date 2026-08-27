const DEFAULT_SUBDOMAIN = 'api.exotel.com';
const DEFAULT_TIMEOUT_MS = 10000;

class ExotelConfigurationError extends Error {
  constructor(missingVariables) {
    super(`Missing required environment variables: ${missingVariables.join(', ')}`);
    this.name = 'ExotelConfigurationError';
  }
}

function normalizeIndianPhoneNumber(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return null;

  const digits = String(value).replace(/[^\d]/g, '');
  if (!digits) return null;
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  return `+${digits}`;
}

function getExotelConfiguration() {
  const requiredVariables = [
    'EXOTEL_ACCOUNT_SID',
    'EXOTEL_API_KEY',
    'EXOTEL_API_TOKEN',
    'EXOTEL_CALLER_ID',
    'EXOTEL_TARGET_NUMBER'
  ];
  const missingVariables = requiredVariables.filter((variable) => !process.env[variable]);
  if (missingVariables.length > 0) throw new ExotelConfigurationError(missingVariables);

  return {
    accountSid: process.env.EXOTEL_ACCOUNT_SID,
    apiKey: process.env.EXOTEL_API_KEY,
    apiToken: process.env.EXOTEL_API_TOKEN,
    subdomain: process.env.EXOTEL_SUBDOMAIN || DEFAULT_SUBDOMAIN,
    callerId: normalizeIndianPhoneNumber(process.env.EXOTEL_CALLER_ID),
    targetNumber: normalizeIndianPhoneNumber(process.env.EXOTEL_TARGET_NUMBER)
  };
}

function getExotelConnectUrl({ subdomain, accountSid }) {
  const host = subdomain.replace(/^https?:\/\//i, '').replace(/\/$/, '');
  return `https://${host}/v1/Accounts/${encodeURIComponent(accountSid)}/Calls/connect.json`;
}

function getCallbackUrl() {
  if (!process.env.PUBLIC_BASE_URL) return null;
  return new URL('/webhooks/call-events', process.env.PUBLIC_BASE_URL).toString();
}

function getErrorMessage(payload, fallback) {
  return payload?.RestException?.Message || payload?.error?.message || payload?.message || fallback;
}

let fetchImplementation = global.fetch;

function setExotelFetch(fetchFunction) {
  if (typeof fetchFunction !== 'function') throw new TypeError('fetchFunction must be a function.');
  fetchImplementation = fetchFunction;
}

function resetExotelService() {
  fetchImplementation = global.fetch;
}

async function startOutboundCall({ from, to, callbackUrl } = {}) {
  const configuration = getExotelConfiguration();
  const normalizedFrom = normalizeIndianPhoneNumber(from || configuration.callerId);
  const normalizedTo = normalizeIndianPhoneNumber(to || configuration.targetNumber);

  if (!normalizedFrom || !normalizedTo) {
    return { provider: 'exotel', started: false, callId: null, status: null, error: 'A valid caller and target number are required.' };
  }

  const requestBody = new URLSearchParams({
    From: normalizedFrom,
    To: normalizedTo,
    CallerId: configuration.callerId,
    CallType: 'trans'
  });
  const resolvedCallbackUrl = callbackUrl || getCallbackUrl();
  if (resolvedCallbackUrl) requestBody.set('StatusCallback', resolvedCallbackUrl);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetchImplementation(getExotelConnectUrl(configuration), {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${configuration.apiKey}:${configuration.apiToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json'
      },
      body: requestBody.toString(),
      signal: controller.signal
    });
    const payload = await response.json().catch(() => null);
    const call = payload?.Call || payload?.call || null;

    if (!response.ok) {
      return {
        provider: 'exotel',
        started: false,
        callId: null,
        status: call?.Status || call?.status || null,
        error: getErrorMessage(payload, `Exotel rejected the call request with status ${response.status}.`)
      };
    }

    return {
      provider: 'exotel',
      started: true,
      callId: call?.Sid || call?.sid || null,
      status: call?.Status || call?.status || null,
      error: null
    };
  } catch (error) {
    return {
      provider: 'exotel',
      started: false,
      callId: null,
      status: null,
      error: error.name === 'AbortError' ? 'Exotel request timed out.' : error.message
    };
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  ExotelConfigurationError,
  getExotelConnectUrl,
  normalizeIndianPhoneNumber,
  resetExotelService,
  setExotelFetch,
  startOutboundCall
};
