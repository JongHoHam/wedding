import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = await mkdtemp(join(tmpdir(), 'wedding-build-check-'));
const sourceFiles = ['src/config.mjs', 'index.html'];
const hashes = () => Promise.all(sourceFiles.map(async file => createHash('sha256').update(await readFile(join(root, file))).digest('hex')));
const before = await hashes();
const fixture = JSON.parse(await readFile(join(root, 'private-config.example.json'), 'utf8'));
fixture.title = 'BUILD_PRIVATE_SENTINEL_TITLE';
fixture.groom.name = 'BUILD_PRIVATE_SENTINEL_NAME';
fixture.groom.phone = 'BUILD_PRIVATE_SENTINEL_PHONE';
fixture.accounts[0].number = 'BUILD_PRIVATE_SENTINEL_ACCOUNT';
fixture.siteUrl = 'https://example.github.io/wedding/';
fixture.shareImage = './images/hero.jpg';
const run = raw => spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--outDir', output], {
  cwd: root,
  env: { ...process.env, GITHUB_ACTIONS: 'true', REQUIRE_PRIVATE_CONFIG: 'true', WEDDING_PRIVATE_CONFIG: raw },
  encoding: 'utf8',
});
try {
  for (const raw of ['', '{BUILD_PRIVATE_SENTINEL_MALFORMED']) {
    const result = run(raw);
    assert.notEqual(result.status, 0, 'Missing or invalid deployment secret must fail even with a local private file');
    assert.ok(!`${result.stdout}${result.stderr}`.includes('BUILD_PRIVATE_SENTINEL'), 'Build error must not echo secret');
  }
  const result = run(JSON.stringify(fixture));
  assert.equal(result.status, 0, 'Synthetic private build failed; output intentionally withheld');
  assert.ok(!`${result.stdout}${result.stderr}`.includes('BUILD_PRIVATE_SENTINEL'), 'Build log leaked a private field');
  const html = await readFile(join(output, 'index.html'), 'utf8');
  const assets = await readdir(join(output, 'assets'));
  const javascript = (await Promise.all(assets.filter(file => file.endsWith('.js')).map(file => readFile(join(output, 'assets', file), 'utf8')))).join('\n');
  assert.ok(html.includes(fixture.title), 'Private title missing from metadata');
  assert.ok(html.includes('<meta property="og:image" content="https://example.github.io/wedding/images/share-p20260405-centered.jpg" />'), 'New link preview image missing from built metadata');
  for (const file of ['share-p20260405-centered.jpg', 'DSCF5881.jpg']) {
    assert.ok((await readFile(join(output, 'images', file))).length > 0, 'Requested image missing from build');
  }
  for (const value of [fixture.groom.name, fixture.groom.phone, fixture.accounts[0].number]) {
    assert.ok(javascript.includes(value), 'Private field missing from compiled app');
  }
  assert.ok(!(await readdir(output)).includes('private-config.local.json'), 'Private source JSON must not be published');
  assert.deepEqual(await hashes(), before, 'Build changed a source file');
  console.log('PASS: missing/invalid secrets fail; synthetic values reach HTML/app only; logs and source files stay clean.');
} finally {
  await rm(output, { recursive: true, force: true });
}