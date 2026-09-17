const personFields = ['name', 'short', 'english', 'father', 'mother', 'phone', 'fatherPhone', 'motherPhone'];
const textFields = ['title', 'description', 'date', 'siteUrl', 'kakaoJsKey', 'shareImage'];
const allowedFields = [...textFields, 'groom', 'bride', 'accounts'];
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const fail = () => { throw new Error('WEDDING_PRIVATE_CONFIG is invalid. Check the documented JSON structure; values are not logged.'); };

export function mergePrivateConfig(base, raw, { required = false } = {}) {
  if (!raw?.trim()) {
    if (required) throw new Error('WEDDING_PRIVATE_CONFIG is required for deployment.');
    return structuredClone(base);
  }
  let values;
  try { values = JSON.parse(raw); } catch { fail(); }
  if (!isObject(values) || Object.keys(values).some(key => !allowedFields.includes(key))) fail();
  for (const key of textFields) {
    if (key in values && typeof values[key] !== 'string') fail();
  }
  for (const side of ['groom', 'bride']) {
    if (side in values && (!isObject(values[side]) || Object.entries(values[side]).some(([key, value]) => !personFields.includes(key) || typeof value !== 'string'))) fail();
  }
  if ('accounts' in values) {
    const fields = ['side', 'role', 'name', 'bank', 'number'];
    if (!Array.isArray(values.accounts) || values.accounts.length !== base.accounts.length) fail();
    const expected = new Set(base.accounts.map(account => `${account.side}:${account.role}`));
    for (const account of values.accounts) {
      if (!isObject(account) || Object.keys(account).some(key => !fields.includes(key)) || fields.some(key => typeof account[key] !== 'string')) fail();
      if (!expected.delete(`${account.side}:${account.role}`)) fail();
    }
  }
  if (required && (!values.groom?.name?.trim() || !values.bride?.name?.trim() || !values.accounts)) fail();
  const merged = {
    ...structuredClone(base), ...values,
    groom: { ...base.groom, ...values.groom },
    bride: { ...base.bride, ...values.bride },
    demo: false,
  };
  for (const side of ['groom', 'bride']) {
    if (values[side]?.name) {
      if (!values[side].short) merged[side].short = values[side].name;
      for (const field of ['english', 'father', 'mother']) {
        if (!(field in values[side])) merged[side][field] = '';
      }
    }
  }
  if (!values.title) merged.title = `${merged.groom.short} · ${merged.bride.short}, 결혼합니다`;
  if (!Number.isFinite(Date.parse(merged.date))) fail();
  let address;
  try { address = new URL(merged.siteUrl); } catch { fail(); }
  if (address.protocol !== 'https:' || address.hostname === 'github.com' || address.username || address.password || address.search || address.hash || !address.pathname.endsWith('/')) fail();
  return merged;
}

export function invitationMetadata(html, config) {
  const escape = value => String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const base = config.siteUrl || 'http://localhost:5173/';
  const tags = [
    `<title>${escape(config.title)}</title>`,
    `<meta name="description" content="${escape(config.description)}" />`,
    '<meta property="og:type" content="website" />',
    '<meta property="og:locale" content="ko_KR" />',
    `<meta property="og:title" content="${escape(config.title)}" />`,
    `<meta property="og:description" content="${escape(config.description)}" />`,
    `<meta property="og:image" content="${escape(new URL(config.shareImage, base).href)}" />`,
    `<meta property="og:url" content="${escape(base)}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
  ];
  return html.replace(/<!-- invitation-metadata:start -->[\s\S]*?<!-- invitation-metadata:end -->/, `<!-- invitation-metadata:start -->\n${tags.join('\n')}\n<!-- invitation-metadata:end -->`);
}