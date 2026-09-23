export function stabilizeHeroViewport(browser) {
  const root = browser.document.documentElement;
  const mobile = /Android|iPhone|iPad|iPod|KAKAOTALK/i.test(browser.navigator.userAgent)
    || (browser.navigator.platform === 'MacIntel' && browser.navigator.maxTouchPoints > 1);
  const smallViewport = mobile && browser.CSS?.supports('height', '100svh');
  let width;
  let fixedHeight;
  let locked = browser.scrollY > 0;
  const lock = event => {
    if (event.type !== 'scroll' || browser.scrollY > 0) locked = true;
  };
  const update = () => {
    const nextWidth = root.clientWidth;
    if (mobile && width === nextWidth && locked) return;
    let height = browser.innerHeight;
    if (smallViewport) {
      const probe = browser.document.createElement('div');
      probe.style.cssText = 'position:fixed;width:0;height:100svh;visibility:hidden;pointer-events:none';
      root.appendChild(probe);
      height = probe.getBoundingClientRect().height;
      probe.remove();
    }
    if (mobile) {
      height = Math.min(height, browser.innerHeight);
      const visible = browser.visualViewport;
      if (visible?.scale === 1 && visible.height > 0) height = Math.min(height, visible.height);
      if (width === nextWidth && fixedHeight !== undefined) height = Math.min(height, fixedHeight);
    }
    if (nextWidth <= 0 || height <= 0) return;
    width = nextWidth;
    fixedHeight = height;
    root.style.setProperty('--hero-viewport', `${height}px`);
  };
  const lifecycleEvents = ['resize', 'load', 'pageshow'];
  const lockEvents = mobile ? ['touchstart', 'wheel', 'keydown', 'focusin', 'scroll'] : [];
  update();
  for (const name of lifecycleEvents) browser.addEventListener(name, update, { passive: true });
  for (const name of lockEvents) browser.addEventListener(name, lock, { passive: true });
  browser.visualViewport?.addEventListener('resize', update, { passive: true });
  return () => {
    for (const name of lifecycleEvents) browser.removeEventListener(name, update);
    for (const name of lockEvents) browser.removeEventListener(name, lock);
    browser.visualViewport?.removeEventListener('resize', update);
    root.style.removeProperty('--hero-viewport');
  };
}