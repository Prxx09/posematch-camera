import type { ImageSourcePropType } from 'react-native';

export type PoseSource = 'catalog' | 'local' | 'demo';

export type PoseOrientation = 'portrait' | 'landscape' | 'square';

export interface PoseReference {
  id: string;
  title: string;
  category: string;
  imageSource: ImageSourcePropType;
  source: PoseSource;
  orientation: PoseOrientation;
  tags: string[];
  featured?: boolean;
}

export interface CatalogPoseRow {
  id: string;
  title: string;
  category: string;
  image_path: string;
  orientation: PoseOrientation;
  tags: string[] | null;
  is_featured: boolean;
  sort_order: number;
}

export interface LocalPoseRow {
  id: string;
  title: string;
  uri: string;
  created_at: string;
}
