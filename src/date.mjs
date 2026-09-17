export function countdown(target, now = Date.now()) {
  const remaining = Math.max(0, Math.floor((Date.parse(target) - now) / 1000));
  return {
    days: Math.floor(remaining / 86400),
    hours: Math.floor(remaining / 3600) % 24,
    minutes: Math.floor(remaining / 60) % 60,
    seconds: remaining % 60,
  };
}

export function calendarDays(target) {
  const [year, month, day] = target.slice(0, 10).split('-').map(Number);
  return {
    year, month, day,
    offset: new Date(Date.UTC(year, month - 1, 1)).getUTCDay(),
    total: new Date(Date.UTC(year, month, 0)).getUTCDate(),
  };
}

function escapeICS(value) {
  return value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

export function calendarFile(config) {
  const stamp = (value) => new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Our Wedding//KO', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT', `UID:${stamp(config.date)}-wedding@invitation.local`, `DTSTAMP:${stamp(Date.now())}`, `DTSTART:${stamp(config.date)}`, `DTEND:${stamp(Date.parse(config.date) + 7200000)}`, `SUMMARY:${escapeICS(config.title)}`, `LOCATION:${escapeICS(config.venue.name + ' ' + config.venue.address)}`, 'END:VEVENT', 'END:VCALENDAR'];
  return lines.map((line) => {
    const folded = [];
    let current = '';
    for (const char of line) {
      if (new TextEncoder().encode(current + char).length > 73) {
        folded.push(current);
        current = ' ';
      }
      current += char;
    }
    return [...folded, current].join('\r\n');
  }).join('\r\n') + '\r\n';
}