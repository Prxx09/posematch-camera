import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Alert, BackHandler } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { CatalogScreen } from './src/screens/CatalogScreen';
import { LocalReferencesScreen } from './src/screens/LocalReferencesScreen';
import { CameraScreen } from './src/screens/CameraScreen';
import { initializeLocalDatabase, listLocalReferences } from './src/services/localReferences';
import { loadCatalog, type CatalogResult } from './src/services/catalog';
import type { PoseReference } from './src/types/pose';

export default function App() {
  return <SafeAreaProvider><SQLiteProvider databaseName="posematch.db" onInit={initializeLocalDatabase}><Content /></SQLiteProvider></SafeAreaProvider>;
}
function Content() {
  const db = useSQLiteContext();
  const [catalog, setCatalog] = useState<CatalogResult>({ poses: [], mode: 'demo' });
  const [local, setLocal] = useState<PoseReference[]>([]);
  const [loading, setLoading] = useState(false);
  const [privateScreen, setPrivateScreen] = useState(false);
  const [selected, setSelected] = useState<PoseReference>();
  const refresh = async () => { setLoading(true); try { setCatalog(await loadCatalog()); } catch (e) { Alert.alert('Catalog unavailable', String(e)); } finally { setLoading(false); } };
  const refreshLocal = async () => { try { setLocal(await listLocalReferences(db)); } catch (e) { Alert.alert('Local library error', String(e)); } };
  useEffect(() => { void refresh(); void refreshLocal(); }, []);
  useEffect(() => { const sub = BackHandler.addEventListener('hardwareBackPress', () => { if (selected) { setSelected(undefined); return true; } if (privateScreen) { setPrivateScreen(false); return true; } return false; }); return () => sub.remove(); }, [selected, privateScreen]);
  return <SafeAreaView style={{ flex: 1, backgroundColor: selected ? '#151418' : '#F4F1EC' }}><StatusBar style={selected ? 'light' : 'dark'} />{selected ? <CameraScreen pose={selected} onBack={() => setSelected(undefined)} /> : privateScreen ? <LocalReferencesScreen db={db} poses={local} onBack={() => setPrivateScreen(false)} onChange={refreshLocal} onSelect={setSelected} /> : <CatalogScreen poses={catalog.poses} mode={catalog.mode} notice={catalog.message} loading={loading} onRefresh={refresh} onSelect={setSelected} onOpenLocal={() => setPrivateScreen(true)} />}</SafeAreaView>;
}
