import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import type { PoseReference } from '../types/pose';

interface PoseCardProps {
  pose: PoseReference;
  onPress: (pose: PoseReference) => void;
  onDelete?: (pose: PoseReference) => void;
}

export function PoseCard({ pose, onPress, onDelete }: PoseCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Use ${pose.title} as a reference`}
      onPress={() => onPress(pose)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <Image source={pose.imageSource} style={styles.image} resizeMode="cover" />
      <View style={styles.scrim} />
      {pose.source === 'local' ? (
        <View style={styles.privateBadge}>
          <Text style={styles.badgeText}>ON DEVICE</Text>
        </View>
      ) : null}
      {onDelete ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Delete ${pose.title}`}
          hitSlop={10}
          onPress={(event) => {
            event.stopPropagation();
            onDelete(pose);
          }}
          style={styles.deleteButton}
        >
          <Text style={styles.deleteText}>×</Text>
        </Pressable>
      ) : null}
      <View style={styles.copy}>
        <Text style={styles.category}>{pose.category.toUpperCase()}</Text>
        <Text numberOfLines={2} style={styles.title}>
          {pose.title}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 238,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#DDD7D0',
    marginBottom: 16,
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.985 }],
  },
  image: {
    width: '100%',
    height: '100%',
  },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(10, 10, 14, 0.12)',
  },
  copy: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
  },
  category: {
    color: '#E9FF72',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  privateBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(10, 10, 14, 0.72)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  deleteButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10, 10, 14, 0.72)',
  },
  deleteText: {
    color: '#FFFFFF',
    fontSize: 24,
    lineHeight: 27,
    fontWeight: '400',
  },
});
