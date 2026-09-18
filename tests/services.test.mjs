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
  assert.equal(config.venue.name, '중문컨벤션센터');
  assert.equal(config.venue.detail, '5층 오션뷰 홀');
  for (const provider of ['naver', 'naverApp', 'kakao', 'tmap', 'apple', 'android']) {
    assert.ok(decodeURIComponent(links[provider]).includes('중문컨벤션센터'));
  }
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

test('routes contain road geometry and the requested travel estimates', () => {
  const route = config.routes.find(item => item.id === 'car');
  assert.equal(route.roadGeometry, true);
  assert.ok(route.points.length > 500);
  assert.ok(route.roads.includes('평화로'));
  assert.deepEqual(route.minutes, [40, 60]);
  for (const bus of config.routes.filter(item => item.mode === 'bus')) {
    assert.deepEqual(bus.minutes, [60, 90]);
  }
  assert.ok(route.points.every(([lat, lng]) => lat > 33 && lat < 34 && lng > 126 && lng < 127));
  assert.deepEqual(config.routes.filter(item => item.mode === 'bus').map(item => item.id), ['bus600', 'bus601']);
});

test('both airport buses display the bundled official timetable image', async () => {
  for (const route of config.routes.filter(item => item.mode === 'bus')) {
    assert.equal(route.timetable, './images/bus-600-601.png');
    const image = await readFile(new URL(`../public/${route.timetable}`, import.meta.url));
    assert.equal(image.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.ok(image.readUInt32BE(16) >= 1600);
    assert.ok(image.readUInt32BE(20) >= 1600);
  }
});

test('gallery includes all 29 supplied photos without replacing the hero or closing image', async () => {
  assert.equal(config.gallery.length, 29);
  assert.equal(new Set(config.gallery.map(photo => photo.src)).size, 29);
  assert.equal(config.gallery.filter(photo => /\/DSCF\d+\.JPG$/.test(photo.src)).length, 28);
  assert.ok(config.gallery.at(-1).src.endsWith('P20260517_214302000_DFD2D9ED-B33A-49E4-ADD1-25ED0DB15000.JPG'));
  assert.equal(config.hero, './images/hero.jpg');
  assert.equal(config.shareImage, './images/hero.jpg');
  for (const photo of config.gallery) {
    const image = await readFile(new URL(`../public/${photo.src}`, import.meta.url));
    assert.equal(image.subarray(0, 3).toString('hex'), 'ffd8ff');
    assert.ok(photo.alt);
  }
  const closing = await readFile(new URL('../public/images/moment-1.jpg', import.meta.url));
  assert.equal(closing.subarray(0, 3).toString('hex'), 'ffd8ff');
});