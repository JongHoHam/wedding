import test from 'node:test';
import assert from 'node:assert/strict';
import { stabilizeHeroViewport } from '../src/viewport.mjs';

function fixture({ touch = 1, userAgent = 'Android', platform = '', width = 390, height = 844 } = {}) {
  const properties = new Map();
  const listeners = new Map();
  const visualListeners = new Map();
  const browser = {
    scrollY: 0,
    visualViewport: {
      height, scale: 1,
      addEventListener: (name, callback) => visualListeners.set(name, callback),
      removeEventListener: name => visualListeners.delete(name),
    },
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
  return { browser, properties, listeners, visualListeners, resize: () => listeners.get('resize')?.() };
}

test('modern Kakao first entry and reload use the same small viewport instead of transient innerHeight', () => {
  for (const height of [932, 844, 724]) {
    const { browser, properties, listeners, resize } = fixture({ height, userAgent: 'KAKAOTALK', touch: 0 });
    browser.CSS = { supports: (property, value) => property === 'height' && value === '100svh' };
    let smallHeight = 724;
    let probes = 0;
    browser.document.createElement = () => ({
      style: {},
      getBoundingClientRect: () => ({ height: smallHeight }),
      remove: () => { probes--; },
    });
    browser.document.documentElement.appendChild = () => { probes++; };
    const cleanup = stabilizeHeroViewport(browser);
    assert.equal(properties.get('--hero-viewport'), '724px');
    listeners.get('touchstart')({ type: 'touchstart' });
    browser.innerHeight = 400;
    smallHeight = 900;
    resize();
    assert.equal(properties.get('--hero-viewport'), '724px');
    browser.document.documentElement.clientWidth = 844;
    smallHeight = 390;
    resize();
    assert.equal(properties.get('--hero-viewport'), '390px');
    smallHeight = 450;
    resize();
    assert.equal(properties.get('--hero-viewport'), '390px');
    assert.equal(probes, 0);
    cleanup();
    assert.equal(listeners.size, 0);
    assert.equal(properties.size, 0);
  }
});

test('mobile toolbar and keyboard height changes do not resize the hero', () => {
  const { browser, properties, listeners, resize } = fixture();
  stabilizeHeroViewport(browser);
  listeners.get('touchstart')({ type: 'touchstart' });
  assert.equal(properties.get('--hero-viewport'), '844px');
  for (const height of [724, 844, 400, 900]) {
    browser.innerHeight = height;
    resize();
    assert.equal(properties.get('--hero-viewport'), '844px');
  }
});

test('width changes refresh the mobile hero once; subsequent toolbar changes do not', () => {
  const { browser, properties, listeners, resize } = fixture();
  stabilizeHeroViewport(browser);
  listeners.get('touchstart')({ type: 'touchstart' });
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
  const { browser, properties, listeners, resize } = fixture({ touch: 0, userAgent: 'KAKAOTALK' });
  stabilizeHeroViewport(browser);
  listeners.get('wheel')({ type: 'wheel' });
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
  const { browser, properties, listeners, resize } = fixture({ touch: 5, userAgent: 'Macintosh', platform: 'MacIntel' });
  stabilizeHeroViewport(browser);
  listeners.get('keydown')({ type: 'keydown' });
  browser.innerHeight = 700;
  resize();
  assert.equal(properties.get('--hero-viewport'), '844px');
});

test('late initial viewport correction matches reload then stays fixed during interaction', () => {
  const { browser, properties, listeners, visualListeners, resize } = fixture({ height: 900, userAgent: 'KAKAOTALK' });
  browser.CSS = { supports: () => true };
  browser.document.createElement = () => ({ style: {}, getBoundingClientRect: () => ({ height: 900 }), remove() {} });
  browser.document.documentElement.appendChild = () => {};
  const cleanup = stabilizeHeroViewport(browser);
  assert.equal(properties.get('--hero-viewport'), '900px');
  browser.visualViewport.height = 700;
  visualListeners.get('resize')();
  assert.equal(properties.get('--hero-viewport'), '700px');
  browser.innerHeight = 700;
  listeners.get('pageshow')();
  assert.equal(properties.get('--hero-viewport'), '700px');
  listeners.get('touchstart')({ type: 'touchstart' });
  for (const height of [850, 500, 900]) {
    browser.innerHeight = height;
    browser.visualViewport.height = height;
    resize();
    visualListeners.get('resize')();
    assert.equal(properties.get('--hero-viewport'), '700px');
  }
  cleanup();
  assert.equal(listeners.size, 0);
  assert.equal(visualListeners.size, 0);
  browser.innerHeight = 700;
  browser.visualViewport.height = 700;
  const releaseReload = stabilizeHeroViewport(browser);
  assert.equal(properties.get('--hero-viewport'), '700px');
  releaseReload();
  assert.equal(properties.size, 0);
});

test('load corrects legacy initial height; scrolling locks it and never grows it', () => {
  const { browser, properties, listeners, resize } = fixture({ height: 900 });
  stabilizeHeroViewport(browser);
  browser.innerHeight = 700;
  listeners.get('load')();
  assert.equal(properties.get('--hero-viewport'), '700px');
  browser.innerHeight = 850;
  resize();
  assert.equal(properties.get('--hero-viewport'), '700px');
  browser.scrollY = 100;
  listeners.get('scroll')({ type: 'scroll' });
  browser.innerHeight = 400;
  resize();
  assert.equal(properties.get('--hero-viewport'), '700px');
});