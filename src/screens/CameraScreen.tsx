import React, { useRef, useState } from 'react';
import { Alert, AppState, Image, Linking, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Slider from '@react-native-community/slider';
// Expo Go on some installed Android builds exposes the stable legacy native
// module, but not the new class-based ExpoMediaLibraryNext module.
// The legacy API supports the only operations this screen needs: permission
// prompts and saving a captured file.
import * as MediaLibrary from 'expo-media-library/legacy';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import type { PoseReference } from '../types/pose';

export function CameraScreen({ pose, onBack }: { pose: PoseReference; onBack: () => void }) {
  const camera = useRef<CameraView>(null);
  const comparison = useRef<View>(null);
  const [referenceLoaded, setReferenceLoaded] = useState(false);
  const [shotLoaded, setShotLoaded] = useState(false);
  const saveComparison = async () => {
    if (!comparison.current || busy || !referenceLoaded || !shotLoaded) return;
    setBusy(true);
    try {
      const p = await MediaLibrary.requestPermissionsAsync(true, ['photo']);
      if (!p.granted) { Alert.alert('Permission needed', 'Allow photo saving in Settings.'); return; }
      const uri = await captureRef(comparison, { format: 'jpg', quality: 0.95, result: 'tmpfile', width: 1440 });
      await MediaLibrary.createAssetAsync(uri);
      Alert.alert('Comparison saved', 'Reference and your shot are saved side by side.');
    } catch (e) { Alert.alert('Comparison failed', String(e)); } finally { setBusy(false); }
  };
  const [permission, requestPermission] = useCameraPermissions();
  const [front, setFront] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [photo, setPhoto] = useState<string>();
  const [saved, setSaved] = useState(false);
  const [opacity, setOpacity] = useState(0.35);
  const [scale, setScale] = useState(1);
  const [mirror, setMirror] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const origin = useRef({ x: 0, y: 0 });
  const [active, setActive] = useState(AppState.currentState === 'active');
  React.useEffect(() => { const s = AppState.addEventListener('change', state => { setActive(state === 'active'); setReady(false); }); return () => s.remove(); }, []);
  const pan = React.useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, g) => setPosition({ x: origin.current.x + g.dx, y: origin.current.y + g.dy }),
    onPanResponderRelease: (_, g) => { origin.current = { x: origin.current.x + g.dx, y: origin.current.y + g.dy }; },
  }), []);
  const capture = async () => {
    if (!ready || busy) return;
    setBusy(true);
    try { const result = await camera.current?.takePictureAsync({ quality: 0.95 }); if (result) { setPhoto(result.uri); setSaved(false); } }
    catch (e) { Alert.alert('Capture failed', String(e)); }
    finally { setBusy(false); }
  };
  const save = async () => {
    if (!photo || busy || saved) return;
    setBusy(true);
    try { const p = await MediaLibrary.requestPermissionsAsync(true, ['photo']); if (!p.granted) { Alert.alert('Permission needed', 'Allow saving photos in Settings.'); return; } await MediaLibrary.createAssetAsync(photo); setSaved(true); }
    catch (e) { Alert.alert('Save failed', String(e)); } finally { setBusy(false); }
  };
  const share = async () => { try { if (photo && await Sharing.isAvailableAsync()) await Sharing.shareAsync(photo, { mimeType: 'image/jpeg' }); else Alert.alert('Sharing unavailable'); } catch (e) { Alert.alert('Share failed', String(e)); } };
  const button = (title: string, action: () => void, disabled = false) => <Pressable accessibilityRole="button" disabled={disabled} onPress={action} style={[s.button, disabled && { opacity: 0.4 }]}><Text style={s.text}>{title}</Text></Pressable>;
  return <View style={s.root}>
    <View style={s.row}>{button('‹ Back', onBack, busy)}<Text numberOfLines={1} style={[s.text, { flex: 1 }]}>{pose.title}</Text></View>
    {!permission?.granted ? <View style={s.center}><Text style={s.text}>Camera permission is needed to frame your shot.</Text>{button(permission?.canAskAgain === false ? 'Open Settings' : 'Enable camera', () => { if (permission?.canAskAgain === false) void Linking.openSettings(); else void requestPermission(); })}</View> : photo ?
      <ScrollView contentContainerStyle={{ padding: 16 }}><Text style={s.text}>Your shot — reference overlay is not included</Text><Image source={{ uri: photo }} style={{ width: '100%', aspectRatio: 3 / 4, marginVertical: 16 }} resizeMode="contain" /><View ref={comparison} collapsable={false} style={{ backgroundColor: '#151418', padding: 10, flexDirection: 'row' }}><View style={{ flex: 1 }}><Text style={s.text}>REFERENCE</Text><Image onLoad={() => setReferenceLoaded(true)} source={pose.imageSource} style={{ width: '100%', aspectRatio: 3 / 4 }} resizeMode="contain" /></View><View style={{ flex: 1 }}><Text style={s.text}>YOUR SHOT</Text><Image onLoad={() => setShotLoaded(true)} source={{ uri: photo }} style={{ width: '100%', aspectRatio: 3 / 4 }} resizeMode="contain" /></View></View><View style={s.row}>{button(saved ? 'Saved ✓' : 'Save photo', save, busy || saved)}{button('Save comparison', saveComparison, busy || !referenceLoaded || !shotLoaded)}{button('Share photo', share, busy)}{button('Retake', () => { setPhoto(undefined); setShotLoaded(false); setReferenceLoaded(false); setReady(false); }, busy)}</View></ScrollView> : <>
      <View style={s.stage}>
        {active && <CameraView key={String(front)} ref={camera} style={StyleSheet.absoluteFill} facing={front ? 'front' : 'back'} mirror={front} ratio="4:3" onCameraReady={() => setReady(true)} onMountError={e => Alert.alert('Camera error', e.message)} />}
        <View {...pan.panHandlers} style={StyleSheet.absoluteFill}><Image source={pose.imageSource} resizeMode="contain" style={[StyleSheet.absoluteFill, { opacity, transform: [{ translateX: position.x }, { translateY: position.y }, { scale }, { scaleX: mirror ? -1 : 1 }] }]} /></View>
      </View>
      <View style={s.controls}><Text style={s.muted}>Drag the reference to reposition it</Text><Text style={s.text}>Opacity {Math.round(opacity * 100)}%</Text><Slider minimumValue={0} maximumValue={0.8} value={opacity} onValueChange={setOpacity} minimumTrackTintColor="#E9FF72" /><Text style={s.text}>Reference size</Text><Slider minimumValue={0.3} maximumValue={2} value={scale} onValueChange={setScale} minimumTrackTintColor="#E9FF72" /><View style={s.row}>{button('Flip camera', () => { setReady(false); setFront(!front); }, busy)}{button('Mirror pose', () => setMirror(!mirror))}{button('Reset', () => { origin.current = { x: 0, y: 0 }; setPosition(origin.current); setScale(1); setOpacity(0.35); setMirror(false); })}</View>{button(busy ? 'Capturing…' : '● Capture', capture, !ready || busy)}</View>
    </>}
  </View>;
}
const s = StyleSheet.create({ root: { flex: 1, backgroundColor: '#151418' }, row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }, text: { color: 'white', fontWeight: '700', fontSize: 13 }, muted: { color: '#BEB8AE', textAlign: 'center', marginBottom: 10 }, button: { padding: 13, backgroundColor: '#37333B', borderRadius: 16, margin: 3 }, stage: { flex: 1, overflow: 'hidden', marginHorizontal: 12, borderRadius: 20 }, controls: { padding: 12 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 } });
