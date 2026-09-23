export function stabilizeHeroViewport(browser) {
  const root = browser.document.documentElement;
  const mobile = /Android|iPhone|iPad|iPod|KAKAOTALK/i.test(browser.navigator.userAgent)
    || (browser.navigator.platform === 'MacIntel' && browser.navigator.maxTouchPoints > 1);
  if (mobile && browser.CSS?.supports('height', '100svh')) {
    root.style.setProperty('--hero-viewport', '100svh');
    return () => root.style.removeProperty('--hero-viewport');
  }
  let width;
  const update = () => {
    const nextWidth = root.clientWidth;
    if (mobile && width === nextWidth) return;
    const height = browser.innerHeight;
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