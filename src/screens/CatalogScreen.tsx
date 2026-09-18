import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PoseCard } from '../components/PoseCard';
import type { PoseReference } from '../types/pose';

interface CatalogScreenProps {
  poses: PoseReference[];
  loading: boolean;
  notice?: string;
  mode: 'cloud' | 'demo';
  onRefresh: () => void;
  onSelect: (pose: PoseReference) => void;
  onOpenLocal: () => void;
}

export function CatalogScreen({
  poses,
  loading,
  notice,
  mode,
  onRefresh,
  onSelect,
  onOpenLocal,
}: CatalogScreenProps) {
  const categories = ['all', ...Array.from(new Set(poses.map((pose) => pose.category)))];
  const [selectedCategory, setSelectedCategory] = React.useState('all');
  const visiblePoses =
    selectedCategory === 'all' ? poses : poses.filter((pose) => pose.category === selectedCategory);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor="#151418" />}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.eyebrow}>POSEMATCH</Text>
          <Text style={styles.heading}>Find your frame.</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={onOpenLocal} style={styles.localButton}>
          <Text style={styles.localButtonIcon}>＋</Text>
          <Text style={styles.localButtonText}>My poses</Text>
        </Pressable>
      </View>

      <View style={styles.hero}>
        <Text style={styles.heroKicker}>REFERENCE → OVERLAY → CAPTURE</Text>
        <Text style={styles.heroTitle}>Recreate the photo you saved.</Text>
        <Text style={styles.heroBody}>
          Pick a pose, align it over your live camera, and take the shot. No scoring. No uploads of your photos.
        </Text>
      </View>

      {notice ? (
        <View style={styles.notice}>
          <View style={[styles.statusDot, mode === 'cloud' ? styles.cloudDot : styles.demoDot]} />
          <Text style={styles.noticeText}>{notice}</Text>
        </View>
      ) : null}

      <ScrollView
        horizontal
        contentContainerStyle={styles.categories}
        showsHorizontalScrollIndicator={false}
      >
        {categories.map((category) => {
          const selected = selectedCategory === category;
          return (
            <Pressable
              key={category}
              onPress={() => setSelectedCategory(category)}
              style={[styles.categoryPill, selected && styles.categoryPillSelected]}
            >
              <Text style={[styles.categoryText, selected && styles.categoryTextSelected]}>
                {category}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>{selectedCategory === 'all' ? 'Curated poses' : selectedCategory}</Text>
        <Text style={styles.count}>{visiblePoses.length} references</Text>
      </View>

      {loading && poses.length === 0 ? (
        <ActivityIndicator color="#151418" size="large" style={styles.loader} />
      ) : (
        <View style={styles.grid}>
          {visiblePoses.map((pose) => (
            <View key={pose.id} style={styles.gridItem}>
              <PoseCard pose={pose} onPress={onSelect} />
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

import React from 'react';

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 40,
    backgroundColor: '#F4F1EC',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  eyebrow: {
    color: '#7A736C',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },
  heading: {
    color: '#151418',
    fontSize: 29,
    fontWeight: '900',
    letterSpacing: -1.2,
    marginTop: 3,
  },
  localButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    backgroundColor: '#151418',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  localButtonIcon: {
    color: '#E9FF72',
    fontSize: 18,
    lineHeight: 18,
    marginRight: 5,
  },
  localButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  hero: {
    borderRadius: 30,
    backgroundColor: '#151418',
    padding: 24,
    marginBottom: 16,
  },
  heroKicker: {
    color: '#E9FF72',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
    marginBottom: 12,
  },
  heroTitle: {
    maxWidth: 280,
    color: '#FFFFFF',
    fontSize: 34,
    lineHeight: 37,
    fontWeight: '900',
    letterSpacing: -1.3,
    marginBottom: 12,
  },
  heroBody: {
    color: '#BAB5AE',
    fontSize: 14,
    lineHeight: 21,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 16,
    backgroundColor: '#E9E4DC',
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
    marginRight: 9,
  },
  cloudDot: { backgroundColor: '#4E8D57' },
  demoDot: { backgroundColor: '#C58A35' },
  noticeText: {
    flex: 1,
    color: '#59534D',
    fontSize: 12,
    lineHeight: 17,
  },
  categories: {
    gap: 8,
    paddingVertical: 7,
    paddingRight: 20,
  },
  categoryPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D7D1C9',
    backgroundColor: '#F9F7F4',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  categoryPillSelected: {
    borderColor: '#151418',
    backgroundColor: '#151418',
  },
  categoryText: {
    color: '#5F5953',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  categoryTextSelected: { color: '#FFFFFF' },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: 18,
    marginBottom: 14,
  },
  sectionTitle: {
    color: '#151418',
    fontSize: 21,
    fontWeight: '900',
    textTransform: 'capitalize',
    letterSpacing: -0.5,
  },
  count: {
    color: '#817A73',
    fontSize: 12,
    fontWeight: '600',
  },
  loader: { marginTop: 60 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '48%',
  },
});
