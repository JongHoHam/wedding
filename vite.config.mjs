import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { defineConfig, normalizePath } from 'vite';
import { config as publicConfig } from './src/config.mjs';
import { invitationMetadata, mergePrivateConfig } from './scripts/private-config.mjs';

export default defineConfig(async ({ command }) => {
  const required = process.env.REQUIRE_PRIVATE_CONFIG === 'true' || (command === 'build' && process.env.GITHUB_ACTIONS === 'true');
  let raw = process.env.WEDDING_PRIVATE_CONFIG;
  if (!required && !raw) {
    try {
      raw = await readFile(new URL('./private-config.local.json', import.meta.url), 'utf8');
    } catch (error) {
      if (error.code !== 'ENOENT') throw new Error('Cannot read private-config.local.json.');
    }
  }
  const config = mergePrivateConfig(publicConfig, raw, { required });
  const configPath = normalizePath(fileURLToPath(new URL('./src/config.mjs', import.meta.url)));
  return {
    base: './',
    server: { fs: { deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/private-config.local.json'] } },
    plugins: [{
      name: 'wedding-private-config',
      enforce: 'pre',
      transform(source, id) {
        if (normalizePath(id.split('?')[0]) === configPath) {
          return { code: `export const config = ${JSON.stringify(config)};`, map: null };
        }
      },
      transformIndexHtml(html) { return invitationMetadata(html, config); },
    }],
  };
});