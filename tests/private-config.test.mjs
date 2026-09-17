import test from 'node:test';
import assert from 'node:assert/strict';
import { mergePrivateConfig, invitationMetadata } from '../scripts/private-config.mjs';

const base = {
  demo: true, title: 'Sample', description: 'Sample description', date: '2027-05-22T12:00:00+09:00',
  siteUrl: 'https://example.github.io/wedding/', shareImage: './images/hero.jpg',
  groom: { name: 'Sample groom', short: 'Sample', english: 'Groom', phone: '' },
  bride: { name: 'Sample bride', short: 'Sample', english: 'Bride', phone: '' },
  accounts: ['groom', 'bride'].flatMap(side => ['couple', 'father', 'mother'].map(role => ({ side, role, name: '', bank: '', number: '' }))),
};
const values = { title: 'Test wedding', date: base.date, groom: { name: 'Test groom', phone: 'test-phone' }, bride: { name: 'Test bride' }, accounts: base.accounts };
test('private fields merge without mutating public defaults', () => {
  const merged = mergePrivateConfig(base, JSON.stringify(values), { required: true });
  assert.equal(merged.demo, false);
  assert.equal(merged.groom.phone, 'test-phone');
  assert.equal(merged.groom.short, 'Test groom');
  assert.equal(merged.groom.english, '');
  assert.equal(base.groom.phone, '');
});
test('deployment rejects missing, malformed and incomplete secrets without echoing values', () => {
  for (const raw of [undefined, '', '{PRIVATE_SENTINEL', '{}', JSON.stringify({ ...values, accounts: [] }), JSON.stringify({ ...values, groom: { phone: 123 } })]) {
    assert.throws(() => mergePrivateConfig(base, raw, { required: true }), error => !error.message.includes('PRIVATE_SENTINEL'));
  }
});
test('unknown fields and repository URLs are rejected', () => {
  for (const patch of [{ bad: true }, { siteUrl: 'https://github.com/user/wedding/' }, { siteUrl: 'https://example.github.io/wedding' }, { groom: { constructor: 'bad' } }]) {
    assert.throws(() => mergePrivateConfig(base, JSON.stringify({ ...values, ...patch }), { required: true }));
  }
});
test('local build without private values uses public demo', () => {
  assert.deepEqual(mergePrivateConfig(base), base);
});
test('minimal secret derives the title and retains the configured wedding date', () => {
  const { title, date, ...minimal } = values;
  const merged = mergePrivateConfig(base, JSON.stringify(minimal), { required: true });
  assert.ok(merged.title.includes(minimal.groom.name));
  assert.equal(merged.date, base.date);
});
test('metadata escapes private fields in output only', () => {
  const html = '<!-- invitation-metadata:start -->sample<!-- invitation-metadata:end -->';
  const result = invitationMetadata(html, { ...base, title: '<Test & "title">' });
  assert.ok(result.includes('&lt;Test &amp; &quot;title&quot;&gt;'));
  assert.ok(result.includes('https://example.github.io/wedding/images/hero.jpg'));
  assert.ok(html.includes('sample'));
});