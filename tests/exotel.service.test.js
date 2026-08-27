const assert = require('node:assert/strict');
const exotelService = require('../src/services/exotel.service');
const vapiService = require('../src/services/vapi.service');
const { startCall } = require('../src/controllers/call.controller');

const environmentKeys = [
  'TELEPHONY_PROVIDER',
  'EXOTEL_ACCOUNT_SID',
  'EXOTEL_API_KEY',
  'EXOTEL_API_TOKEN',
  'EXOTEL_SUBDOMAIN',
  'EXOTEL_CALLER_ID',
  'EXOTEL_TARGET_NUMBER',
  'PUBLIC_BASE_URL'
];
const originalEnvironment = Object.fromEntries(environmentKeys.map((key) => [key, process.env[key]]));

function restoreEnvironment() {
  for (const key of environmentKeys) {
    if (originalEnvironment[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnvironment[key];
  }
}

function configureExotel() {
  process.env.TELEPHONY_PROVIDER = 'exotel';
  process.env.EXOTEL_ACCOUNT_SID = 'account-sid';
  process.env.EXOTEL_API_KEY = 'api-key';
  process.env.EXOTEL_API_TOKEN = 'api-token';
  process.env.EXOTEL_SUBDOMAIN = 'api.exotel.com';
  process.env.EXOTEL_CALLER_ID = '8016178534';
  process.env.EXOTEL_TARGET_NUMBER = '8688664337';
  process.env.PUBLIC_BASE_URL = 'https://example.com';
}

function createResponse() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };
}

async function run() {
  const originalVapiStart = vapiService.startOutboundCall;
  const originalExotelStart = exotelService.startOutboundCall;

  try {
    configureExotel();
    assert.equal(exotelService.normalizeIndianPhoneNumber('8016178534'), '+918016178534');
    assert.equal(exotelService.normalizeIndianPhoneNumber('918016178534'), '+918016178534');
    assert.equal(exotelService.normalizeIndianPhoneNumber('+918016178534'), '+918016178534');

    const calls = [];
    exotelService.resetExotelService();
    exotelService.setExotelFetch(async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        status: 200,
        json: async () => ({ Call: { Sid: 'call-sid-123', Status: 'queued' } })
      };
    });

    const success = await exotelService.startOutboundCall({
      from: '8016178534',
      to: '8688664337',
      callbackUrl: 'https://example.com/webhooks/call-events'
    });
    assert.deepEqual(success, {
      provider: 'exotel',
      started: true,
      callId: 'call-sid-123',
      status: 'queued',
      error: null
    });
    assert.equal(calls[0].url, 'https://api.exotel.com/v1/Accounts/account-sid/Calls/connect.json');
    assert.equal(calls[0].options.headers.Authorization, `Basic ${Buffer.from('api-key:api-token').toString('base64')}`);
    const requestParams = new URLSearchParams(calls[0].options.body);
    assert.equal(requestParams.get('From'), '+918016178534');
    assert.equal(requestParams.get('To'), '+918688664337');
    assert.equal(requestParams.get('CallerId'), '+918016178534');
    assert.equal(requestParams.get('CallType'), 'trans');
    assert.equal(requestParams.get('StatusCallback'), 'https://example.com/webhooks/call-events');

    exotelService.resetExotelService();
    exotelService.setExotelFetch(async () => ({
      ok: false,
      status: 403,
      json: async () => ({ RestException: { Message: 'Destination is restricted for this account.' } })
    }));
    const restricted = await exotelService.startOutboundCall({});
    assert.equal(restricted.provider, 'exotel');
    assert.equal(restricted.started, false);
    assert.equal(restricted.callId, null);
    assert.equal(restricted.error, 'Destination is restricted for this account.');

    exotelService.startOutboundCall = async () => ({
      provider: 'exotel', started: true, callId: 'exotel-call-123', status: 'queued', error: null
    });
    process.env.TELEPHONY_PROVIDER = 'exotel';
    const exotelResponse = createResponse();
    await startCall({}, exotelResponse);
    assert.equal(exotelResponse.statusCode, 201);
    assert.equal(exotelResponse.body.provider, 'exotel');
    assert.equal(exotelResponse.body.callId, 'exotel-call-123');

    process.env.TELEPHONY_PROVIDER = 'vapi';
    vapiService.startOutboundCall = async () => ({ id: 'vapi-call-123', status: 'queued' });
    const vapiResponse = createResponse();
    await startCall({}, vapiResponse);
    assert.equal(vapiResponse.statusCode, 201);
    assert.deepEqual(vapiResponse.body, { id: 'vapi-call-123', status: 'queued' });

    console.log('Exotel service tests passed.');
  } finally {
    vapiService.startOutboundCall = originalVapiStart;
    exotelService.startOutboundCall = originalExotelStart;
    exotelService.resetExotelService();
    restoreEnvironment();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
