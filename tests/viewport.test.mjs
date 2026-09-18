import test from 'node:test';
import assert from 'node:assert/strict';
import { stabilizeHeroViewport } from '../src/viewport.mjs';

function fixture({ touch = 1, userAgent = 'Android', platform = '', width = 390, height = 844 } = {}) {
  const properties = new Map();
  const listeners = new Map();
  const browser = {
    navigator: { maxTouchPoints: touch, userAgent, platform },
    innerHeight: height,
    document: { documentElement: { clientWidth: width, style: {
      setProperty: (name, value) => properties.set(name, value),
      removeProperty: name => properties.delete(name),
    } } },
    addEventListener: (name, callback) => listeners.set(name, callback),
    removeEventListener: (name, callback) => { if (listeners.get(name) === callback) listeners.delete(name); },
    scrollTo: () => assert.fail('Viewport updates must never adjust scroll position'),
  };
  return { browser, properties, listeners, resize: () => listeners.get('resize')?.() };
}

test('mobile toolbar and keyboard height changes do not resize the hero', () => {
  const { browser, properties, resize } = fixture();
  stabilizeHeroViewport(browser);
  assert.equal(properties.get('--hero-viewport'), '844px');
  for (const height of [724, 844, 400, 900]) {
    browser.innerHeight = height;
    resize();
    assert.equal(properties.get('--hero-viewport'), '844px');
  }
});

test('width changes refresh the mobile hero once; subsequent toolbar changes do not', () => {
  const { browser, properties, resize } = fixture();
  stabilizeHeroViewport(browser);
  browser.document.documentElement.clientWidth = 844;
  browser.innerHeight = 390;
  resize();
  assert.equal(properties.get('--hero-viewport'), '390px');
  browser.innerHeight = 330;
  resize();
  assert.equal(properties.get('--hero-viewport'), '390px');
  browser.document.documentElement.clientWidth = 390;
  browser.innerHeight = 844;
  resize();
  assert.equal(properties.get('--hero-viewport'), '844px');
});

test('Kakao webviews use stable height even without reported touch points', () => {
  const { browser, properties, resize } = fixture({ touch: 0, userAgent: 'KAKAOTALK' });
  stabilizeHeroViewport(browser);
  browser.innerHeight = 700;
  resize();
  assert.equal(properties.get('--hero-viewport'), '844px');
});

test('touch desktop height resizing remains responsive and cleanup removes the listener', () => {
  const { browser, properties, listeners, resize } = fixture({ touch: 10, userAgent: 'Windows', width: 1440 });
  const cleanup = stabilizeHeroViewport(browser);
  browser.innerHeight = 1000;
  resize();
  assert.equal(properties.get('--hero-viewport'), '1000px');
  cleanup();
  assert.equal(listeners.size, 0);
  assert.equal(properties.size, 0);
});

test('iPad desktop user agent still preserves the mobile hero height', () => {
  const { browser, properties, resize } = fixture({ touch: 5, userAgent: 'Macintosh', platform: 'MacIntel' });
  stabilizeHeroViewport(browser);
  browser.innerHeight = 700;
  resize();
  assert.equal(properties.get('--hero-viewport'), '844px');
});