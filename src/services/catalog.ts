import type { CatalogPoseRow, PoseReference } from '../types/pose';
import { supabase } from '../lib/supabase';
export interface CatalogResult { poses: PoseReference[]; mode: 'cloud' | 'demo'; message?: string; }
export async function loadCatalog(): Promise<CatalogResult> {
  const client = supabase;
  if (!client) return { poses: [], mode: 'demo', message: 'Configure Supabase to load catalog photos. My poses works without it.' };
  const { data, error } = await client.from('poses')
    .select('id,title,category,image_path,orientation,tags,is_featured,sort_order')
    .eq('is_active', true).order('sort_order').order('created_at', { ascending: false })
    .limit(500);
  if (error) return { poses: [], mode: 'demo', message: 'Catalog unavailable: ' + error.message + '. You can still use My poses.' };
  const poses = ((data ?? []) as CatalogPoseRow[]).map<PoseReference>(row => ({
    id: row.id, title: row.title, category: row.category,
    imageSource: { uri: client.storage.from('pose-catalog').getPublicUrl(row.image_path).data.publicUrl },
    source: 'catalog', orientation: row.orientation, tags: row.tags ?? [], featured: row.is_featured,
  }));
  return { poses, mode: 'cloud', message: poses.length ? undefined : 'Catalog connected. Add curated photos in Supabase, or use My poses to start now.' };
}
