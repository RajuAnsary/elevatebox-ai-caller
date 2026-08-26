const DAYPART_HOURS = {
  morning: 10,
  afternoon: 15,
  evening: 18
};

const WEEKDAYS = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6
};

function getZonedDateParts(date, timezone) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)])
  );

  return parts;
}

function addDays(dateParts, days) {
  const date = new Date(Date.UTC(dateParts.year, dateParts.month - 1, dateParts.day + days));

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate()
  };
}

function getTimezoneOffsetMinutes(timezone, instant) {
  const parts = getZonedDateParts(instant, timezone);
  const displayedAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );

  return Math.round((displayedAsUtc - instant.getTime()) / 60000);
}

function formatOffset(offsetMinutes) {
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absoluteOffset = Math.abs(offsetMinutes);
  const hours = String(Math.floor(absoluteOffset / 60)).padStart(2, '0');
  const minutes = String(absoluteOffset % 60).padStart(2, '0');

  return `${sign}${hours}:${minutes}`;
}

function formatScheduledDateTime(localDateTime, timezone) {
  let utcMilliseconds = Date.UTC(
    localDateTime.year,
    localDateTime.month - 1,
    localDateTime.day,
    localDateTime.hour,
    localDateTime.minute,
    0
  );
  let offsetMinutes = getTimezoneOffsetMinutes(timezone, new Date(utcMilliseconds));
  utcMilliseconds -= offsetMinutes * 60 * 1000;
  offsetMinutes = getTimezoneOffsetMinutes(timezone, new Date(utcMilliseconds));
  utcMilliseconds = Date.UTC(
    localDateTime.year,
    localDateTime.month - 1,
    localDateTime.day,
    localDateTime.hour,
    localDateTime.minute,
    0
  ) - offsetMinutes * 60 * 1000;

  const year = String(localDateTime.year).padStart(4, '0');
  const month = String(localDateTime.month).padStart(2, '0');
  const day = String(localDateTime.day).padStart(2, '0');
  const hour = String(localDateTime.hour).padStart(2, '0');
  const minute = String(localDateTime.minute).padStart(2, '0');

  return `${year}-${month}-${day}T${hour}:${minute}:00${formatOffset(offsetMinutes)}`;
}

function findRequestedDateOffset(text, nowParts) {
  if (/\b(?:today|aaj)\b/i.test(text)) return 0;
  if (/\b(?:tomorrow|kal)\b/i.test(text)) return 1;
  if (/\b(?:after\s+two\s+days|after\s+2\s+days|two\s+days\s+later|do\s+din\s+baad)\b/i.test(text)) return 2;
  if (/\b(?:next\s+week|agle\s+hafte)\b/i.test(text)) {
    const weekday = new Date(Date.UTC(nowParts.year, nowParts.month - 1, nowParts.day)).getUTCDay();
    return ((WEEKDAYS.monday - weekday + 7) % 7) || 7;
  }

  const weekdayMatch = text.match(/\b(next\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i);
  if (weekdayMatch) {
    const currentWeekday = new Date(Date.UTC(nowParts.year, nowParts.month - 1, nowParts.day)).getUTCDay();
    const targetWeekday = WEEKDAYS[weekdayMatch[2].toLowerCase()];
    const daysUntilTarget = (targetWeekday - currentWeekday + 7) % 7;
    return weekdayMatch[1] ? (daysUntilTarget || 7) : daysUntilTarget;
  }

  return null;
}

function findRequestedTime(text) {
  const daypartMatch = text.match(/\b(morning|afternoon|evening|subah|shaam)\b/i);
  const daypart = daypartMatch?.[1]?.toLowerCase();
  const normalizedDaypart = daypart === 'subah' ? 'morning' : daypart === 'shaam' ? 'evening' : daypart;
  const timeMatch = text.match(/(?:\bat\s*)?(\d{1,2})(?:\s*:\s*(\d{2}))?\s*(am|pm|baje)?\b/i);

  if (timeMatch) {
    let hour = Number(timeMatch[1]);
    const minute = timeMatch[2] ? Number(timeMatch[2]) : 0;
    const suffix = timeMatch[3]?.toLowerCase();

    if (suffix === 'pm' && hour < 12) hour += 12;
    if (suffix === 'am' && hour === 12) hour = 0;

    if (hour <= 23 && minute <= 59) {
      return { hour, minute };
    }
  }

  if (normalizedDaypart) {
    return { hour: DAYPART_HOURS[normalizedDaypart], minute: 0 };
  }

  return { hour: DAYPART_HOURS.morning, minute: 0 };
}

function parseCallbackTime({ requestedTime, timezone = 'Asia/Kolkata', now = new Date() }) {
  if (typeof requestedTime !== 'string' || !requestedTime.trim()) {
    throw new TypeError('requestedTime must be a non-empty string.');
  }

  let nowParts;
  try {
    nowParts = getZonedDateParts(now, timezone);
  } catch {
    throw new TypeError('timezone must be a valid IANA timezone.');
  }

  const dayOffset = findRequestedDateOffset(requestedTime.trim(), nowParts);
  if (dayOffset === null) {
    return null;
  }

  const requestedDate = addDays(nowParts, dayOffset);
  const requestedClockTime = findRequestedTime(requestedTime.trim());

  return formatScheduledDateTime(
    { ...requestedDate, ...requestedClockTime },
    timezone
  );
}

module.exports = { parseCallbackTime };
