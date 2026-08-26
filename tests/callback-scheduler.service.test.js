const assert = require('node:assert/strict');
const { parseCallbackTime } = require('../src/services/callback-parser.service');
const {
  getScheduledCallback,
  resetScheduler,
  scheduleCallback
} = require('../src/services/scheduler.service');

const now = new Date('2026-08-26T04:00:00.000Z');
const timezone = 'Asia/Kolkata';

assert.equal(
  parseCallbackTime({ requestedTime: 'call me back tomorrow morning', timezone, now }),
  '2026-08-27T10:00:00+05:30'
);
assert.equal(
  parseCallbackTime({ requestedTime: 'today at 6 pm', timezone, now }),
  '2026-08-26T18:00:00+05:30'
);
assert.equal(
  parseCallbackTime({ requestedTime: 'next Monday', timezone, now }),
  '2026-08-31T10:00:00+05:30'
);
assert.equal(
  parseCallbackTime({ requestedTime: 'kal subah call karna', timezone, now }),
  '2026-08-27T10:00:00+05:30'
);
assert.equal(
  parseCallbackTime({ requestedTime: 'after two days', timezone, now }),
  '2026-08-28T10:00:00+05:30'
);
assert.equal(
  parseCallbackTime({ requestedTime: 'Monday ko 10 baje', timezone, now }),
  '2026-08-31T10:00:00+05:30'
);
assert.equal(
  parseCallbackTime({ requestedTime: 'call me later', timezone, now }),
  null
);

resetScheduler();
const firstCallback = scheduleCallback({
  conversationId: 'callback-1',
  requestedTime: 'tomorrow morning',
  timezone
});
assert.equal(firstCallback.status, 'SCHEDULED');
assert.ok(getScheduledCallback('callback-1'));

const duplicateCallback = scheduleCallback({
  conversationId: 'callback-1',
  requestedTime: 'next Monday',
  timezone
});
assert.equal(duplicateCallback.status, 'ALREADY_SCHEDULED');
assert.equal(duplicateCallback.scheduledFor, firstCallback.scheduledFor);

console.log('Callback scheduler service tests passed.');
