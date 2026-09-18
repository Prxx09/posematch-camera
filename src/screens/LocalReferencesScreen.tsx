import * as ImagePicker from 'expo-image-picker';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { SQLiteDatabase } from 'expo-sqlite';

import { EmptyState } from '../components/EmptyState';
import { PoseCard } from '../components/PoseCard';
import { deleteLocalReference, saveLocalReference } from '../services/localReferences';
import type { PoseReference } from '../types/pose';

interface LocalReferencesScreenProps {
  db: SQLiteDatabase;
  poses: PoseReference[];
  onBack: () => void;
  onChange: () => void;
  onSelect: (pose: PoseReference) => void;
}

export function LocalReferencesScreen({ db, poses, onBack, onChange, onSelect }: LocalReferencesScreenProps) {
  const addReference = async () => {
    try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1,
      selectionLimit: 1,
    });

    if (result.canceled || !result.assets[0]) return;

    try {
      const asset = result.assets[0];
      const fallbackTitle = asset.fileName?.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
      await saveLocalReference(db, asset, fallbackTitle);
      onChange();
    } catch (error) {
      Alert.alert('Could not save reference', error instanceof Error ? error.message : 'Please try another image.');
    }
    } catch (error) {
      Alert.alert('Could not open photo picker', String(error));
    }
  };

  const confirmDelete = (pose: PoseReference) => {
    Alert.alert('Delete local reference?', 'The private copy stored inside PoseMatch will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteLocalReference(db, pose);
            onChange();
          } catch (error) {
            Alert.alert('Could not delete reference', error instanceof Error ? error.message : 'Please try again.');
          }
        },
      },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>PRIVATE LIBRARY</Text>
          <Text style={styles.title}>My references</Text>
        </View>
      </View>

      <View style={styles.privacyCard}>
        <Text style={styles.privacyIcon}>◉</Text>
        <View style={styles.privacyCopy}>
          <Text style={styles.privacyTitle}>Stored only on this device</Text>
          <Text style={styles.privacyBody}>
            These images are copied into the app’s private storage. They are never sent to Supabase.
          </Text>
        </View>
      </View>

      <Pressable onPress={addReference} style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}>
        <Text style={styles.addIcon}>＋</Text>
        <Text style={styles.addText}>Add a reference photo</Text>
      </Pressable>

      {poses.length === 0 ? (
        <EmptyState
          title="No private poses yet"
          body="Choose a photo from your gallery. PoseMatch keeps its reference copy on this device."
          action="Choose photo"
          onAction={addReference}
        />
      ) : (
        <View style={styles.grid}>
          {poses.map((pose) => (
            <View key={pose.id} style={styles.gridItem}>
              <PoseCard pose={pose} onPress={onSelect} onDelete={confirmDelete} />
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 40,
    backgroundColor: '#F4F1EC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#151418',
    marginRight: 13,
  },
  backText: {
    color: '#FFFFFF',
    fontSize: 36,
    lineHeight: 37,
    marginTop: -3,
  },
  headerCopy: { flex: 1 },
  eyebrow: {
    color: '#7A736C',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.8,
  },
  title: {
    color: '#151418',
    fontSize: 29,
    fontWeight: '900',
    letterSpacing: -1,
  },
  privacyCard: {
    flexDirection: 'row',
    borderRadius: 24,
    backgroundColor: '#DBF0DA',
    padding: 18,
    marginBottom: 14,
  },
  privacyIcon: {
    color: '#2D6A37',
    fontSize: 20,
    marginRight: 13,
  },
  privacyCopy: { flex: 1 },
  privacyTitle: {
    color: '#214C29',
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 5,
  },
  privacyBody: {
    color: '#426748',
    fontSize: 12,
    lineHeight: 18,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#151418',
    paddingVertical: 15,
    marginBottom: 22,
  },
  pressed: { opacity: 0.82 },
  addIcon: {
    color: '#E9FF72',
    fontSize: 22,
    lineHeight: 22,
    marginRight: 7,
  },
  addText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: { width: '48%' },
});
