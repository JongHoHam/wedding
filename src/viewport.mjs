export function stabilizeHeroViewport(browser) {
  const root = browser.document.documentElement;
  const mobile = /Android|iPhone|iPad|iPod|KAKAOTALK/i.test(browser.navigator.userAgent)
    || (browser.navigator.platform === 'MacIntel' && browser.navigator.maxTouchPoints > 1);
  const smallViewport = mobile && browser.CSS?.supports('height', '100svh');
  let width;
  const update = () => {
    const nextWidth = root.clientWidth;
    if (mobile && width === nextWidth) return;
    let height = browser.innerHeight;
    if (smallViewport) {
      const probe = browser.document.createElement('div');
      probe.style.cssText = 'position:fixed;width:0;height:100svh;visibility:hidden;pointer-events:none';
      root.appendChild(probe);
      height = probe.getBoundingClientRect().height;
      probe.remove();
    }
    if (nextWidth <= 0 || height <= 0) return;
    width = nextWidth;
    root.style.setProperty('--hero-viewport', `${height}px`);
  };
  update();
  browser.addEventListener('resize', update, { passive: true });
  return () => {
    browser.removeEventListener('resize', update);
    root.style.removeProperty('--hero-viewport');
  };
}