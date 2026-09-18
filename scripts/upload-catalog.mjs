// Admin-only local script. NEVER import into the mobile application.
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { validatePose } from './catalog-validation.mjs';
const manifestPath = process.argv[2];
if (!manifestPath) throw Error('Usage: npm run catalog:upload -- catalog/manifest.json');
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) throw Error('Set SUPABASE_URL and SUPABASE_SECRET_KEY in .env.admin.local (never EXPO_PUBLIC).');
const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
if (!Array.isArray(manifest)) throw Error('Manifest must be an array.');
// Validate the entire manifest before making any writes.
const entries = await Promise.all(manifest.map(async p => {
  const row = validatePose(p);
  if (typeof p.file !== 'string') throw Error('Each entry needs a local file path.');
  const bytes = await readFile(resolve(dirname(manifestPath), p.file));
  if (!bytes.length || bytes.length > 10485760) throw Error('Image must be between 1 byte and 10 MiB.');
  return { row, bytes };
}));
for (const { row, bytes } of entries) {
  const ext = row.image_path.split('.').at(-1);
  const contentType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/' + ext;
  const upload = await client.storage.from('pose-catalog').upload(row.image_path, bytes, { contentType, upsert: false });
  if (upload.error) throw upload.error;
  const insert = await client.from('poses').insert(row);
  if (insert.error) {
    const cleanup = await client.storage.from('pose-catalog').remove([row.image_path]);
    if (cleanup.error) console.error('Metadata insert failed; remove orphan manually:', row.image_path);
    throw insert.error;
  }
  console.log('Added:', row.title);
}
