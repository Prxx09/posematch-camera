import { Directory, File, Paths } from 'expo-file-system';
import type { ImagePickerAsset } from 'expo-image-picker';
import type { SQLiteDatabase } from 'expo-sqlite';

import type { LocalPoseRow, PoseReference } from '../types/pose';

const referencesDirectory = new Directory(Paths.document, 'posematch-references');

export async function initializeLocalDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS local_references (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      uri TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    );
  `);
}

export async function listLocalReferences(db: SQLiteDatabase): Promise<PoseReference[]> {
  const rows = await db.getAllAsync<LocalPoseRow>(
    'SELECT id, title, uri, created_at FROM local_references ORDER BY created_at DESC',
  );

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    category: 'my references',
    imageSource: { uri: row.uri },
    source: 'local',
    orientation: 'portrait',
    tags: ['private', 'on-device'],
  }));
}

function extensionFor(asset: ImagePickerAsset): string {
  const fromName = asset.fileName?.split('.').pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) {
    return fromName;
  }

  if (asset.mimeType === 'image/png') return 'png';
  if (asset.mimeType === 'image/webp') return 'webp';
  return 'jpg';
}

export async function saveLocalReference(
  db: SQLiteDatabase,
  asset: ImagePickerAsset,
  title?: string,
): Promise<PoseReference> {
  if (!referencesDirectory.exists) {
    referencesDirectory.create({ idempotent: true, intermediates: true });
  }

  const id = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const destination = new File(referencesDirectory, `${id}.${extensionFor(asset)}`);
  const source = new File(asset.uri);
  await source.copy(destination);

  const createdAt = new Date().toISOString();
  const resolvedTitle = title?.trim() || `My pose ${new Date().toLocaleDateString()}`;

  try {
    await db.runAsync(
      'INSERT INTO local_references (id, title, uri, created_at) VALUES (?, ?, ?, ?)',
      id,
      resolvedTitle,
      destination.uri,
      createdAt,
    );
  } catch (error) {
    if (destination.exists) destination.delete();
    throw error;
  }

  return {
    id,
    title: resolvedTitle,
    category: 'my references',
    imageSource: { uri: destination.uri },
    source: 'local',
    orientation: 'portrait',
    tags: ['private', 'on-device'],
  };
}

export async function deleteLocalReference(db: SQLiteDatabase, pose: PoseReference): Promise<void> {
  if (pose.source !== 'local') return;

  await db.runAsync('DELETE FROM local_references WHERE id = ?', pose.id);
  const uri = typeof pose.imageSource === 'object' && 'uri' in pose.imageSource ? pose.imageSource.uri : null;
  if (uri) {
    const file = new File(uri);
    if (file.exists) file.delete();
  }
}
