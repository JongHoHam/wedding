import { readFile, writeFile } from 'node:fs/promises';
import { config } from '../src/config.mjs';

const path = new URL('../index.html', import.meta.url);
const escape = (value) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
if (!config.demo && !/^https:\/\//.test(config.siteUrl)) throw new Error('Production requires a public HTTPS siteUrl.');
const base = config.siteUrl || 'http://localhost:5173/';
const tags = [`<title>${escape(config.title)}</title>`, `<meta name="description" content="${escape(config.description)}" />`, '<meta property="og:type" content="website" />', '<meta property="og:locale" content="ko_KR" />', `<meta property="og:title" content="${escape(config.title)}" />`, `<meta property="og:description" content="${escape(config.description)}" />`, `<meta property="og:image" content="${escape(new URL(config.shareImage, base).href)}" />`, `<meta property="og:url" content="${escape(base)}" />`, '<meta name="twitter:card" content="summary_large_image" />'];
const html = await readFile(path, 'utf8');
await writeFile(path, html.replace(/<!-- invitation-metadata:start -->[\s\S]*?<!-- invitation-metadata:end -->/, `<!-- invitation-metadata:start -->\n    ${tags.join('\n    ')}\n    <!-- invitation-metadata:end -->`));
console.log(`Static share metadata generated (${config.demo ? 'demo' : 'production'}).`);