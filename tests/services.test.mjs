import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { createMusic, mapLinks, sharePayload } from '../src/services.mjs';
import { config } from '../src/config.mjs';
import { invitationMetadata, mergePrivateConfig } from '../scripts/private-config.mjs';

test('upbeat music schedules 112 BPM melody and accompaniment, pauses and loops on audio time', async context => {
  const originalAudioContext = globalThis.AudioContext;
  const oscillators = [];
  let audio;
  let tick;
  let cleared = false;
  globalThis.AudioContext = class {
    state = 'suspended';
    currentTime = 0;
    destination = {};
    constructor() { audio = this; }
    createGain() {
      return { gain: { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, disconnect() {} };
    }
    createOscillator() {
      const oscillator = { frequency: {}, connect() {}, disconnect() {}, start(at) { this.at = at; }, stop(at) { this.until = at; } };
      oscillators.push(oscillator);
      return oscillator;
    }
    async resume() { this.state = 'running'; }
    async suspend() { this.state = 'suspended'; }
    async close() { this.state = 'closed'; }
  };
  context.after(() => {
    if (originalAudioContext === undefined) delete globalThis.AudioContext;
    else globalThis.AudioContext = originalAudioContext;
  });
  context.mock.method(globalThis, 'setInterval', callback => { tick = callback; return 123; });
  context.mock.method(globalThis, 'clearInterval', timer => { assert.equal(timer, 123); cleared = true; });
  const music = createMusic();
  assert.equal(oscillators.length, 0);
  await music.play();
  const phraseNotes = oscillators.length;
  assert.ok(phraseNotes > 100);
  assert.ok(Math.abs(oscillators[1].at - oscillators[0].at - 60 / 112 / 2) < 0.0001);
  assert.ok(oscillators.some(oscillator => oscillator.type === 'sine'));
  assert.ok(oscillators.some(oscillator => oscillator.type === 'triangle'));
  assert.ok(oscillators.every(oscillator => oscillator.until - oscillator.at < 0.5));
  tick();
  assert.equal(oscillators.length, phraseNotes);
  await music.pause();
  tick();
  assert.equal(oscillators.length, phraseNotes);
  await music.play();
  assert.equal(oscillators.length, phraseNotes);
  audio.currentTime = 0.04 + 32 * 60 / 112 - 0.1;
  tick();
  assert.equal(oscillators.length, phraseNotes * 2);
  assert.ok(Math.abs(oscillators[phraseNotes].at - 0.04 - 32 * 60 / 112) < 0.0001);
  await music.close();
  assert.equal(cleared, true);
  assert.equal(audio.state, 'closed');
});

test('background music uses the original Morning MP3 with attribution', async () => {
  assert.equal(config.musicUrl, './music/Morning.mp3');
  assert.equal(config.musicCredit.title, 'Morning');
  assert.equal(config.musicCredit.artist, 'Kevin MacLeod');
  assert.equal(config.musicCredit.licenseUrl, 'https://creativecommons.org/licenses/by/4.0/');
  const music = await readFile(new URL(`../public/${config.musicUrl}`, import.meta.url));
  assert.ok(music.length > 1000000);
  assert.ok(music.subarray(0, 3).toString() === 'ID3' || (music[0] === 0xff && (music[1] & 0xe0) === 0xe0));
  const attribution = await readFile(new URL('../public/music/ATTRIBUTION.txt', import.meta.url), 'utf8');
  assert.ok(attribution.includes(config.musicCredit.source));
  assert.ok(attribution.includes(config.musicCredit.artist));
});

test('share has two separate targets and absolute image URL under repository subpath', () => {
  const payload = sharePayload(config, 'https://example.github.io/wedding/?preview=1#home');
  assert.equal(payload.buttons.length, 2);
  assert.equal(payload.buttons[0].link.webUrl, 'https://example.github.io/wedding/');
  assert.equal(payload.buttons[1].link.mobileWebUrl, 'https://example.github.io/wedding/?view=location');
  assert.equal(payload.content.imageUrl, 'https://example.github.io/wedding/images/DSCF5872.jpg');
});

test('navigation links keep longitude and latitude in provider-specific order', () => {
  const links = mapLinks(config.venue);
  assert.equal(config.venue.name, '제주국제컨벤션센터(ICC jeju)');
  assert.equal(config.venue.detail, '오션뷰홀 5층');
  for (const provider of ['naver', 'naverApp', 'kakao', 'tmap', 'apple', 'android']) {
    assert.ok(decodeURIComponent(links[provider]).includes('제주국제컨벤션센터(ICC jeju)'));
  }
  assert.ok(links.tmap.includes(`goalx=${config.venue.lng}&goaly=${config.venue.lat}`));
  assert.ok(links.kakao.endsWith(`,${config.venue.lat},${config.venue.lng}`));
  assert.ok(links.android.startsWith(`geo:${config.venue.lat},${config.venue.lng}`));
});

test('parking offers limited complimentary tickets and explains standard rates when exhausted', () => {
  assert.equal(config.venue.parking, '예식 하객분들께 무료 주차권을 제공합니다. 준비된 수량이 소진될 수 있습니다. 무료 주차권 소진 시 일반 주차요금이 적용됩니다. 입차 후 1시간은 무료이며, 이후 30분당 1,000원, 1일 최대 5,000원이 부과됩니다.');
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

test('gallery uses every P-prefixed photo in filename order independently of hero and share images', async () => {
  const photos = (await readdir(new URL('../public/images/', import.meta.url)))
    .filter(filename => /^p.*\.(jpe?g|png|webp)$/i.test(filename)).sort();
  assert.equal(photos.length, 16);
  assert.deepEqual(config.gallery.map(photo => photo.src), photos.map(filename => `./images/${filename}`));
  assert.equal(config.hero, './images/wedding-first-frame.jpg');
  const hero = await readFile(new URL(`../public/${config.hero}`, import.meta.url));
  assert.equal(hero.subarray(0, 3).toString('hex'), 'ffd8ff');
  assert.equal(config.shareImage, './images/DSCF5872.jpg');
  for (const photo of config.gallery) {
    const image = await readFile(new URL(`../public/${photo.src}`, import.meta.url));
    assert.equal(image.subarray(0, 3).toString('hex'), 'ffd8ff');
    assert.ok(photo.alt);
  }
  const closing = await readFile(new URL('../public/images/DSCF5881.jpg', import.meta.url));
  assert.equal(closing.subarray(0, 3).toString('hex'), 'ffd8ff');
});

test('link previews use the new share photo even with the legacy default in private settings', async () => {
  for (const shareImage of ['./images/hero.jpg', new URL('./images/hero.jpg', config.siteUrl).href, './images/DSCF5872.jpg']) {
    const merged = mergePrivateConfig(config, JSON.stringify({ shareImage }));
    const expected = new URL('./images/DSCF5872.jpg', config.siteUrl).href;
    assert.equal(sharePayload(merged, config.siteUrl).content.imageUrl, expected);
    const html = invitationMetadata('<!-- invitation-metadata:start --><!-- invitation-metadata:end -->', merged);
    assert.ok(html.includes(`<meta property="og:image" content="${expected}" />`));
  }
  const custom = mergePrivateConfig(config, JSON.stringify({ shareImage: 'https://example.com/custom.jpg' }));
  assert.equal(custom.shareImage, 'https://example.com/custom.jpg');
  const image = await readFile(new URL('../public/images/DSCF5872.jpg', import.meta.url));
  assert.equal(image.subarray(0, 3).toString('hex'), 'ffd8ff');
});