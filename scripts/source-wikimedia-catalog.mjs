import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const ROOT = resolve(import.meta.dirname, '..');
const OUTPUT_DIR = join(ROOT, 'catalog', 'wikimedia');
const MANIFEST_PATH = join(ROOT, 'catalog', 'wikimedia-manifest.json');
const ATTRIBUTION_PATH = join(ROOT, 'catalog', 'ATTRIBUTIONS.md');
const PER_CATEGORY = Number(process.env.CATALOG_PER_CATEGORY ?? 30);
const USER_AGENT = 'PoseMatchCatalogSeeder/1.0 (https://github.com/Prxx09/posematch-camera)';

const SEARCHES = {
  solo: ['intitle:portrait standing', 'intitle:portrait sitting', '"full body portrait"', '"street portrait"', '"fashion portrait"', '"outdoor portrait"', '"studio portrait"', '"casual portrait"'],
  couple: ['"couple standing" photograph', '"couple sitting" photograph', '"couple walking" photograph', '"couple selfie"', '"couple on beach" photograph', '"couple in park" photograph', '"traveling couple" photograph', '"wedding couple" photograph'],
  group: ['intitle:"group portrait"', '"group portrait" friends', '"family portrait"', '"team portrait"', '"friends standing together"', '"friends sitting together"', '"group photograph"', '"people posing together"'],
  pet: ['intitle:"with dog" person', 'intitle:"with cat" person', '"person with dog"', '"person with cat"', '"walking a dog" person', '"holding a cat" person', '"family with dog"', '"person with horse" portrait'],
  'airport fit check': ['airport traveler suitcase', 'airport passenger luggage', 'airport terminal traveler', 'airport people luggage', 'airport woman suitcase', 'airport man suitcase', 'airport fashion traveler', 'terminal passenger standing'],
  'mirror selfie': ['intitle:"mirror selfie"', '"mirror selfie" person', '"mirror self portrait"', '"taking a mirror selfie"', '"phone mirror selfie"', '"full body mirror selfie"', '"dressing room selfie"', '"couple mirror selfie"', '"bathroom mirror selfie"', '"elevator mirror selfie"', '"outfit mirror selfie"', '"selfie in a mirror"', 'mirror photograph "self portrait"'],
};

const ALLOWED_LICENSES = /^(public domain|cc0|cc by(?:-sa)?(?: |$))/i;
const BLOCKED_LICENSES = /(?:-nc|-nd)/i;
const BLOCKED_TITLES = /\b(?:drawing|engraving|painting|paintings|painter|painters|artwork|illustration|poster|map|diagram|sculpture|statue|grave|memorial|logo|icon|flag|coat of arms|passport|advertisement|screenshot|book|manuscript|anime|cosplay|louvre|museum|seal|scarab|ceramic|tree|album cover|walters|google art project|wga\d*|met|art institute|nude|nudist|naked|penis|genital|explicit|porn|topless|shirtless)\b/i;

function cleanHtml(value = '') {
  return value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 72);
}

function orientation(width, height) {
  const ratio = width / height;
  if (ratio > 1.15) return 'landscape';
  if (ratio < 0.87) return 'portrait';
  return 'square';
}

async function commonsSearch(query, limit = 40) {
  const pages = [];
  let continuation;
  while (pages.length < limit) {
    const params = new URLSearchParams({
      action: 'query', generator: 'search', gsrsearch: `${query} filetype:bitmap`,
      gsrnamespace: '6', gsrlimit: String(Math.min(50, limit - pages.length)), prop: 'imageinfo',
      iiprop: 'url|mime|size|extmetadata', iiurlwidth: '1600', format: 'json',
      formatversion: '2', origin: '*',
    });
    if (continuation) params.set('gsroffset', continuation);
    const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, { headers: { 'user-agent': USER_AGENT } });
    if (!response.ok) throw Error(`Commons search failed (${response.status}) for ${query}`);
    const json = await response.json();
    pages.push(...(json.query?.pages ?? []));
    continuation = json.continue?.gsroffset;
    if (!continuation) break;
    await new Promise(resolvePromise => setTimeout(resolvePromise, 1100));
  }
  return pages;
}

function candidate(page, category, query) {
  const info = page.imageinfo?.[0];
  const metadata = info?.extmetadata ?? {};
  const license = cleanHtml(metadata.LicenseShortName?.value);
  if (!info?.thumburl || !['image/jpeg', 'image/png', 'image/webp'].includes(info.mime)) return null;
  if (info.width < 700 || info.height < 700 || BLOCKED_TITLES.test(page.title)) return null;
  if (!ALLOWED_LICENSES.test(license) || BLOCKED_LICENSES.test(license)) return null;
  const title = page.title.replace(/^File:/, '').replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
  const description = cleanHtml(metadata.ImageDescription?.value);
  const haystack = `${title} ${description}`.toLowerCase();
  if (BLOCKED_TITLES.test(haystack)) return null;
  const relevant = {
    solo: /\b(portrait|posing|standing|sitting|fashion)\b/.test(haystack) && /\b(person|woman|man|girl|boy|human|self portrait|actor|actress|artist|author|athlete|model|politician|singer)\b/.test(haystack) && !/\b(group|family|couple|team|cat|dog|horse|bird|animal|people|men|women|pair|double portrait|girl and boy|woman and kid)\b/.test(haystack),
    couple: /\b(couple|pair|engagement|bride and groom|two people|husband and wife)\b/.test(haystack) && /\b(person|people|woman|man|girl|boy|bride|groom|wife|husband|selfie|walking|sitting|standing)\b/.test(haystack),
    group: /\b(group|family|team|friends|people posing|class photo)\b/.test(haystack) && /\b(person|people|woman|man|girl|boy|student|player|participant|member|friend|family|team)\b/.test(haystack) && !/\b(animal|farm animals|telescope)\b/.test(haystack),
    pet: /\b(dog|cat|horse|pet|puppy|kitten)\b/.test(haystack) && /\b(person|people|woman|man|girl|boy|family|owner|visitor|walking|holding|sitting|standing|with)\b/.test(haystack) && !/\b(tag|emblem|artifact|object)\b/.test(haystack),
    'airport fit check': /\b(airport|terminal|air passenger)\b/.test(haystack) && /\b(person|people|woman|man|traveler|traveller|passenger|luggage|suitcase)\b/.test(haystack),
    'mirror selfie': /\bmirror\b/.test(haystack) && /\bselfie|self portrait\b/.test(haystack),
  }[category];
  if (!relevant) return null;
  const sourceUrl = `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`;
  return {
    source_id: String(page.pageid), title, category, query,
    source_url: sourceUrl, download_url: info.thumburl,
    creator: cleanHtml(metadata.Artist?.value) || 'Unknown creator',
    license, license_url: metadata.LicenseUrl?.value || 'https://commons.wikimedia.org/wiki/Commons:Licensing',
    description: description.slice(0, 500),
    source_width: info.width, source_height: info.height,
    orientation: orientation(info.width, info.height),
  };
}

async function run(command, args) {
  await new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', code => code === 0 ? resolvePromise() : reject(Error(`${command} exited ${code}`)));
  });
}

async function downloadAndNormalize(item, index) {
  const folder = slug(item.category);
  const fileName = `${String(index + 1).padStart(2, '0')}-${slug(item.title) || item.source_id}.jpg`;
  const relativeFile = join('wikimedia', folder, fileName);
  const destination = join(ROOT, 'catalog', relativeFile);
  const temp = `${destination}.source`;
  await mkdir(dirname(destination), { recursive: true });
  const response = await fetch(item.download_url, { headers: { 'user-agent': USER_AGENT } });
  if (!response.ok) throw Error(`Image download failed (${response.status}): ${item.source_url}`);
  await writeFile(temp, Buffer.from(await response.arrayBuffer()));
  await run('convert', [temp, '-auto-orient', '-strip', '-resize', '1600x1600>', '-quality', '84', destination]);
  await run('rm', ['-f', temp]);
  return {
    id: `commons-${item.source_id}`,
    title: item.title.slice(0, 120), category: item.category,
    image_path: `seed/wikimedia/${folder}/${fileName}`,
    file: relativeFile, orientation: item.orientation,
    tags: [...new Set(item.query.toLowerCase().split(/\s+/).filter(Boolean))],
    is_featured: index < 4, is_active: true, sort_order: index,
    source_id: item.source_id, source_url: item.source_url,
    creator: item.creator, license: item.license, license_url: item.license_url,
    provider: 'Wikimedia Commons', alt_text: item.description || `${item.category} pose reference`,
  };
}

async function main() {
  if (!Number.isInteger(PER_CATEGORY) || PER_CATEGORY < 1 || PER_CATEGORY > 40) throw Error('CATALOG_PER_CATEGORY must be 1-40.');
  await mkdir(OUTPUT_DIR, { recursive: true });
  const selected = [];
  const usedIds = new Set();
  for (const [category, queries] of Object.entries(SEARCHES)) {
    const pools = [];
    for (const query of queries) {
      await new Promise(resolvePromise => setTimeout(resolvePromise, 1100));
      pools.push((await commonsSearch(query, category === 'mirror selfie' ? 200 : 50)).map(page => candidate(page, category, query)).filter(Boolean));
    }
    const categoryItems = [];
    let cursor = 0;
    while (categoryItems.length < PER_CATEGORY && pools.some(pool => cursor < pool.length)) {
      for (const pool of pools) {
        const item = pool[cursor];
        if (item && !usedIds.has(item.source_id)) {
          usedIds.add(item.source_id); categoryItems.push(item);
          if (categoryItems.length === PER_CATEGORY) break;
        }
      }
      cursor += 1;
    }
    if (categoryItems.length < PER_CATEGORY) throw Error(`Only found ${categoryItems.length}/${PER_CATEGORY} reusable images for ${category}.`);
    console.log(`Selected ${categoryItems.length} for ${category}`);
    selected.push(...categoryItems.map((item, index) => ({ ...item, categoryIndex: index })));
  }
  const manifest = [];
  for (let offset = 0; offset < selected.length; offset += 6) {
    const batch = selected.slice(offset, offset + 6);
    const downloaded = await Promise.all(batch.map(item => {
      console.log(`Downloading ${item.category} ${item.categoryIndex + 1}/${PER_CATEGORY}: ${item.title}`);
      return downloadAndNormalize(item, item.categoryIndex);
    }));
    manifest.push(...downloaded);
  }
  await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  const lines = ['# Pose catalog sources', '', `Generated from Wikimedia Commons. ${manifest.length} images; license and source metadata were captured at import time.`, '', '| Category | Image | Creator | License | Source |', '|---|---|---|---|---|'];
  for (const item of manifest) lines.push(`| ${item.category} | ${item.title.replace(/\|/g, '\\|')} | ${item.creator.replace(/\|/g, '\\|')} | [${item.license}](${item.license_url}) | [Commons](${item.source_url}) |`);
  await writeFile(ATTRIBUTION_PATH, `${lines.join('\n')}\n`);
  console.log(`Wrote ${relative(ROOT, MANIFEST_PATH)} and ${relative(ROOT, ATTRIBUTION_PATH)}`);
}

await main();
