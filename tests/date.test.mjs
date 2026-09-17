import test from 'node:test';
import assert from 'node:assert/strict';
import { countdown, calendarDays, calendarFile } from '../src/date.mjs';

test('countdown uses the KST instant and clamps past events', () => {
  assert.deepEqual(countdown('2027-05-22T12:00:00+09:00', Date.parse('2027-05-21T02:58:59Z')), { days: 1, hours: 0, minutes: 1, seconds: 1 });
  assert.deepEqual(countdown('2020-01-01T00:00:00+09:00'), { days: 0, hours: 0, minutes: 0, seconds: 0 });
});

test('calendar is independent of browser timezone', () => {
  assert.deepEqual(calendarDays('2027-05-22T12:00:00+09:00'), { year: 2027, month: 5, day: 22, offset: 6, total: 31 });
});

test('ICS exports UTC with escaped fields and byte-safe folding', () => {
  const text = calendarFile({ date: '2027-05-22T12:00:00+09:00', title: 'Wedding, together', venue: { name: '제주'.repeat(35), address: 'Hall; room\n2' } });
  assert.match(text, /DTSTART:20270522T030000Z/);
  assert.match(text, /SUMMARY:Wedding\\, together/);
  assert.ok(text.split('\r\n').every((line) => Buffer.byteLength(line) <= 75));
  assert.match(text, /Hall\\; room\\n2/);
});