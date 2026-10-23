import { CameraView, useCameraPermissions } from 'expo-camera';
import { useEffect, useRef, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '@/constants/theme';
import { PrimaryButton } from './PrimaryButton';

export type TaskPhoto = { uri: string; width: number; height: number };

/** Mounted only while open, so the browser camera stream stops on close. */
export function TaskCamera({ onClose, onCapture }: { onClose: () => void; onCapture: (photo: TaskPhoto) => void }) {
  const camera = useRef<CameraView>(null);
  const active = useRef(true);
  const locked = useRef(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [ready, setReady] = useState(false);
  const [taking, setTaking] = useState(false);
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [error, setError] = useState('');
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const capture = async () => {
    if (!ready || !camera.current || locked.current) return;
    locked.current = true; setTaking(true); setError('');
    try {
      const photo = await camera.current.takePictureAsync({ quality: 0.9 });
      if (active.current) { onCapture(photo); onClose(); }
    } catch { if (active.current) setError('No se pudo tomar la foto. Inténtalo de nuevo o usa «Subir foto».'); }
    finally { locked.current = false; if (active.current) setTaking(false); }
  };
  return <Modal visible transparent animationType="fade" onRequestClose={onClose}>
    <View style={s.backdrop}><View style={s.card}>
      <Text style={s.title}>Foto de tu tarea</Text>
      <Text style={s.hint}>Apunta solo al ejercicio y busca buena luz. La foto no se envía hasta que elijas leerla.</Text>
      {permission?.granted ? <CameraView ref={camera} facing={facing} style={s.camera} onCameraReady={() => setReady(true)} onMountError={() => { setReady(false); setError('No pudimos abrir la cámara. Revisa el permiso del navegador o usa «Subir foto».'); }} /> : <View style={s.permission}>
        <Text style={s.hint}>Necesitamos permiso para mostrar la cámara. También puedes cancelar y subir una foto guardada.</Text>
        <PrimaryButton label="Permitir cámara" onPress={() => { void requestPermission().then(result => { if (!result.granted) setError('El permiso no está activado. Puedes subir una foto guardada.'); }).catch(() => setError('Este navegador no pudo abrir la cámara. Puedes subir una foto.')); }} />
      </View>}
      {error ? <Text accessibilityRole="alert" style={s.error}>{error}</Text> : null}
      {permission?.granted ? <>
        <PrimaryButton label={taking ? 'Tomando foto…' : 'Capturar tarea'} disabled={!ready || taking} onPress={() => void capture()} />
        <PrimaryButton label="Cambiar cámara" variant="secondary" disabled={taking} onPress={() => { setReady(false); setFacing(value => value === 'back' ? 'front' : 'back'); }} />
      </> : null}
      <PrimaryButton label="Cancelar cámara" variant="secondary" onPress={onClose} />
    </View></View>
  </Modal>;
}
const s = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16, backgroundColor: 'rgba(16,34,55,0.7)' },
  card: { width: '100%', maxWidth: 620, maxHeight: '98%', padding: 20, gap: 12, borderRadius: 24, backgroundColor: colors.paper },
  title: { fontFamily: fonts.displayBold, fontSize: 25, color: colors.ink },
  hint: { fontFamily: fonts.body, lineHeight: 21, color: colors.inkMuted },
  camera: { width: '100%', height: 280, borderRadius: 16, overflow: 'hidden' },
  permission: { gap: 14, paddingVertical: 20 },
  error: { fontFamily: fonts.bodySemi, color: '#9D3025', lineHeight: 22 },
});
