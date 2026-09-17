import { mkdir, writeFile } from 'node:fs/promises';
const directory = new URL('../public/images/', import.meta.url);
await mkdir(directory, { recursive: true });
const images = [
  ['hero', 'photo-1532712938310-34cb3982ef74'],
  ['moment-1', 'photo-1519741497674-611481863552'],
  ['moment-2', 'photo-1523438885200-e635ba2c371e'],
  ['moment-3', 'photo-1525310072745-f49212b5ac6d'],
  ['moment-4', 'photo-1511285560929-80b456fea0bc'],
  ['moment-5', 'photo-1511795409834-ef04bbd61622'],
  ['moment-6', 'photo-1519225421980-715cb0215aed'],
  ['moment-7', 'photo-1526045478516-99145907023c'],
  ['moment-8', 'photo-1464366400600-7168b8af9bc3'],
  ['moment-9', 'photo-1478146896981-b80fe463b330'],
  ['moment-10', 'photo-1515934751635-c81c6bc9a2d8'],
  ['moment-11', 'photo-1507504031003-b417219a0fde'],
  ['moment-12', 'photo-1469371670807-013ccf25f16a'],
  ['moment-13', 'photo-1519167758481-83f550bb49b3'],
  ['moment-14', 'photo-1529636798458-92182e662485'],
  ['moment-15', 'photo-1490750967868-88aa4486c946'],
  ['moment-16', 'photo-1520854221256-17451cc331bf'],
  ['moment-17', 'photo-1544078751-58fee2d8a03b'],
  ['moment-18', 'photo-1522673607200-164d1b6ce486'],
  ['moment-19', 'photo-1513278974582-3e1b4a4fa21e'],
];
const unavailable = [];
for (const [name, id] of images) {
  const source = `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${name === 'hero' ? 1800 : 1000}&q=85&fm=jpg`;
  const response = await fetch(source, { signal: AbortSignal.timeout(30000) });
  if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) {
    unavailable.push(`${name}: ${id}`);
    continue;
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(new URL(`${name}.jpg`, directory), bytes);
  console.log(`${name}.jpg: ${bytes.length} bytes`);
}
if (unavailable.length) throw new Error(`Images unavailable: ${unavailable.join(', ')}`);
await writeFile(new URL('sources.json', directory), JSON.stringify({ note: 'Unsplash sample photographs, not the actual couple. Replace before publishing. https://unsplash.com/license', images: images.map(([name,id]) => ({ file: `${name}.jpg`, source: `https://images.unsplash.com/${id}` })) }, null, 2));