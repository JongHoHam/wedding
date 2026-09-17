import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { mapLinks, sharePayload } from '../src/services.mjs';
import { config } from '../src/config.mjs';

test('share has two separate targets and absolute image URL under repository subpath', () => {
  const payload = sharePayload(config, 'https://example.github.io/wedding/?preview=1#home');
  assert.equal(payload.buttons.length, 2);
  assert.equal(payload.buttons[0].link.webUrl, 'https://example.github.io/wedding/');
  assert.equal(payload.buttons[1].link.mobileWebUrl, 'https://example.github.io/wedding/?view=location');
  assert.equal(payload.content.imageUrl, 'https://example.github.io/wedding/images/hero.jpg');
});

test('navigation links keep longitude and latitude in provider-specific order', () => {
  const links = mapLinks(config.venue);
  assert.ok(links.tmap.includes(`goalx=${config.venue.lng}&goaly=${config.venue.lat}`));
  assert.ok(links.kakao.endsWith(`,${config.venue.lat},${config.venue.lng}`));
  assert.ok(links.android.startsWith(`geo:${config.venue.lat},${config.venue.lng}`));
});

test('exactly 100 distinct mobile wedding references from two providers', async () => {
  const data = JSON.parse(await readFile(new URL('../public/research/samples.json', import.meta.url), 'utf8'));
  assert.equal(data.samples.length, 100);
  assert.equal(new Set(data.samples.map(entry => entry.url)).size, 100);
  assert.equal(data.samples.filter(entry => entry.provider === '잇츠카드').length, 42);
  assert.ok(data.samples.every(entry => entry.name && /^https:/.test(entry.url)));
  assert.ok(data.samples.some(entry => entry.name === '이순간, 영원히(무빙)'));
});

test('demo never supplies callable personal numbers or transferable accounts', () => {
  assert.equal(config.accounts.length, 6);
  if (config.demo) {
    assert.ok(config.accounts.every(account => !account.number));
    assert.equal(config.groom.phone, '');
    assert.equal(config.bride.phone, '');
  }
});

test('car route contains road-level coordinates and conservative time allowance', () => {
  const route = config.routes.find(item => item.id === 'car');
  assert.equal(route.roadGeometry, true);
  assert.ok(route.points.length > 500);
  assert.ok(route.roads.includes('평화로'));
  assert.ok(route.minutes[0] > route.engineMinutes);
  assert.ok(route.points.every(([lat, lng]) => lat > 33 && lat < 34 && lng > 126 && lng < 127));
  assert.deepEqual(config.routes.filter(item => item.mode === 'bus').map(item => item.id), ['bus600', 'bus601']);
});