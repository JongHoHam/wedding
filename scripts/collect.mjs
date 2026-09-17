import { loadBuffer, load } from 'cheerio';
import { mkdir, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const samples = new Map();
const sources = [];
const normalize = (text) => text.replace(/\s+/g, ' ').trim();

async function read(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(25000) });
  if (!response.ok) throw new Error(`${response.status}: ${url}`);
  sources.push({ url, status: response.status, checkedAt: new Date().toISOString() });
  const bytes = Buffer.from(await response.arrayBuffer());
  return url.includes('itscard.co.kr') ? load(new TextDecoder('euc-kr').decode(bytes)) : loadBuffer(bytes);
}

const itsUrl = 'https://www.itscard.co.kr/script/mcard/new/';
const its = await read(new URL('mcard_list.asp', itsUrl).href);
its('a[href*="mcard_view.asp?CardCode="]').each((index, element) => {
  const anchor = its(element);
  const url = new URL(anchor.attr('href'), itsUrl).href;
  const code = new URL(url).searchParams.get('CardCode');
  const container = anchor.closest('li').length ? anchor.closest('li') : anchor.parent();
  const text = normalize(container.text());
  const name = text.split(`(${code})`)[0].replace(/^(NEW|BEST)\s*/g, '').trim();
  samples.set(url, { provider: '잇츠카드', code, name: name || code, url, source: itsUrl, thumbnail: new URL(container.find('img').first().attr('src') || '', itsUrl).href, category: text.includes('무빙') ? '무빙' : '일반·세트', verification: '공개 모바일 상품 목록에서 확인' });
});

for (let page = 1; page <= 9 && samples.size < 100; page++) {
  const source = `https://mcard.barunsoncard.com/Product/List/${page}/18/1/0/0/0`;
  const card = await read(source);
  card('li[id]').each((index, element) => {
    if (samples.size >= 100) return;
    const item = card(element);
    const code = normalize(item.find('.product_title .line_l').text());
    if (!/^MC\d{4}$/.test(code)) return;
    const url = `https://mcard.barunsoncard.com/Product/Detail/${item.attr('id')}`;
    samples.set(url, { provider: '바른손M카드', code, name: normalize(item.find('.product_title strong').text()), url, source, thumbnail: item.find('.img_con img').attr('src'), category: '모바일 청첩장', verification: '공개 모바일 상품 목록에서 확인' });
  });
  console.log(`Collected ${samples.size} unique mobile designs`);
}

if (samples.size !== 100 || new Set([...samples.values()].map(entry => entry.provider)).size < 2) throw new Error(`Expected 100 unique entries from two providers, got ${samples.size}`);
const result = { collectedAt: new Date().toISOString(), scope: '업체 공개 모바일 청첩장 상품 100종. 실제 고객 청첩장 개인정보 및 원본 디자인 파일은 수집하지 않음. 개별 상세 페이지 전체 기능을 100건 모두 테스트한 것은 아님.', sources, samples: [...samples.values()].map((entry, index) => ({ id: index + 1, ...entry })) };
await mkdir(new URL('public/research/', root), { recursive: true });
await writeFile(new URL('public/research/samples.json', root), JSON.stringify(result, null, 2));
const lines = ['# 한국 모바일 청첩장 공개 샘플 100종', '', `수집 시각: ${result.collectedAt}`, '', result.scope, '', '| 번호 | 업체 | 이름 | 코드 | 원본 |', '|---|---|---|---|---|', ...result.samples.map((entry) => `| ${entry.id} | ${entry.provider} | ${entry.name.replace(/\|/g, '/')} | ${entry.code} | [보기](${entry.url}) |`)];
await writeFile(new URL('public/research/samples.md', root), lines.join('\n') + '\n');
console.log(JSON.stringify({ count: result.samples.length, providers: Object.fromEntries([...new Set(result.samples.map(entry => entry.provider))].map(provider => [provider, result.samples.filter(entry => entry.provider === provider).length])), first: result.samples[0], last: result.samples.at(-1) }, null, 2));