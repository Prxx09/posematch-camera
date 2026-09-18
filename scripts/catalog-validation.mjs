export const categories = ['solo', 'couple', 'group', 'pet', 'airport fit check', 'mirror selfie'];
export function validatePose(p) {
  if (!p || typeof p.title !== 'string' || !p.title.trim() || p.title.length > 120) throw Error('Title must be 1–120 characters.');
  if (!categories.includes(p.category)) throw Error('Unsupported category.');
  if (typeof p.image_path !== 'string' || !/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/.test(p.image_path)) throw Error('image_path must be category/filename.jpg, .png or .webp.');
  if (p.orientation && !['portrait', 'landscape', 'square'].includes(p.orientation)) throw Error('Unsupported orientation.');
  if (p.tags && (!Array.isArray(p.tags) || p.tags.some(t => typeof t !== 'string'))) throw Error('Tags must be strings.');
  return { title: p.title.trim(), category: p.category, image_path: p.image_path, orientation: p.orientation ?? 'portrait', tags: p.tags ?? [], is_active: true, is_featured: Boolean(p.is_featured), sort_order: Number.isInteger(p.sort_order) ? p.sort_order : 0 };
}
