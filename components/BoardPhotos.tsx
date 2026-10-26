import { openBrowserAsync } from 'expo-web-browser';
import { Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { useState } from 'react';
import { BoardVisualView, visualSteps } from './BoardVisual';
import { WritingPencil } from './WritingPencil';
import { printPicture } from '@/lib/print';
import type { BoardVisual, TutorPhoto } from '@/lib/tutor';
import { colors, fonts } from '@/constants/theme';

const handwriting = 'PatrickHand_400Regular';
const tilt = [-2.5, 2, -1.2];

/** Real photos taped onto the board like printed pictures. Tapping one opens it big. */
export function TapedPhotos({ photos, drawingLabel, width, onOpen }: { photos: TutorPhoto[]; drawingLabel?: string; width: number; onOpen: (photo: TutorPhoto) => void }) {
  const one = photos.length + (drawingLabel ? 1 : 0) === 1;
  const cardWidth = Math.min(one ? 420 : 300, one ? width : (width - 24) / 2);
  return (
    <View style={s.photos}>
      {drawingLabel ? <Animated.View entering={ZoomIn.duration(450)} accessibilityLiveRegion="polite" accessibilityLabel={`El tutor está haciendo ${drawingLabel}`} style={[s.card, { width: cardWidth, transform: [{ rotate: '-1.5deg' }] }]}>
        <View style={[s.drawing, { width: cardWidth - 16, height: cardWidth - 16 }]}>
          <WritingPencil size={44} />
          <Text style={s.drawingText}>🎨 Dibujando…</Text>
        </View>
        <Text style={s.caption} numberOfLines={2}>{drawingLabel}</Text>
        <View pointerEvents="none" style={[s.tape, s.tapeLeft]} />
        <View pointerEvents="none" style={[s.tape, s.tapeRight]} />
      </Animated.View> : null}
      {photos.map((photo, i) => {
        const ratio = photo.width && photo.height ? Math.min(1.4, Math.max(0.6, photo.height / photo.width)) : 0.75;
        return <Animated.View key={photo.url} entering={ZoomIn.duration(450).delay(i * 250)} style={[s.card, { width: cardWidth, transform: [{ rotate: `${tilt[i % tilt.length]}deg` }] }]}>
          <Pressable accessibilityRole="imagebutton" accessibilityLabel={`${photo.label || photo.title || photo.query}. Toca para verla en grande`} onPress={() => onOpen(photo)}>
            <Image source={{ uri: photo.url }} resizeMode="cover" style={{ width: cardWidth - 16, height: (cardWidth - 16) * ratio, backgroundColor: '#EEF2F6' }} />
            <Text style={s.caption} numberOfLines={2}>{photo.generated ? '🎨 ' : ''}{photo.label || photo.title}</Text>
            <Text style={s.zoomHint}>🔍 Toca para ampliar o imprimir</Text>
          </Pressable>
          <View pointerEvents="none" style={[s.tape, s.tapeLeft]} />
          <View pointerEvents="none" style={[s.tape, s.tapeRight]} />
        </Animated.View>;
      })}
    </View>
  );
}

const drawingId = 'onekids-zoomed-drawing';

export type Zoomed = { photo: TutorPhoto } | { visual: BoardVisual } | null;

/** Full-screen view of a photo or of the tutor's drawing. */
export function ZoomView({ zoomed, onClose }: { zoomed: Zoomed; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const max = Math.min(width - 32, 1000);
  const photo = zoomed && 'photo' in zoomed ? zoomed.photo : null;
  const visual = zoomed && 'visual' in zoomed ? zoomed.visual : null;
  const ratio = photo?.width && photo.height ? photo.height / photo.width : 0.75;
  const photoWidth = Math.min(max, (height - 190) / ratio);
  const [printError, setPrintError] = useState('');
  // On the web a drawing is printed from its rendered markup. Phones print photos only for now.
  const canPrint = Boolean(photo) || (Boolean(visual) && Platform.OS === 'web');
  const print = async () => {
    setPrintError('');
    try {
      if (photo) await printPicture(photo.label || photo.title || 'Imagen del tutor', { imageUrl: photo.url });
      else if (visual) {
        const markup = document.getElementById(drawingId)?.innerHTML;
        if (!markup) throw new Error('missing drawing');
        await printPicture(visual.title || 'Dibujo del tutor', { markup });
      }
    } catch { setPrintError('No se pudo imprimir. Revisa que haya una impresora conectada.'); }
  };
  return (
    <Modal visible={Boolean(zoomed)} transparent animationType="fade" onRequestClose={onClose} supportedOrientations={['portrait', 'landscape']}>
      <View style={s.backdrop}>
        <View style={s.bar}>
          {canPrint ? <Pressable accessibilityRole="button" accessibilityLabel="Imprimir esta imagen" onPress={() => void print()} style={s.close}><Text style={s.closeText}>🖨️ Imprimir</Text></Pressable> : null}
          <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={onClose} style={s.close}><Text style={s.closeText}>✕ Cerrar</Text></Pressable>
        </View>
        {printError ? <Text accessibilityRole="alert" style={s.printError}>{printError}</Text> : null}
        <ScrollView contentContainerStyle={s.zoomBody} maximumZoomScale={4} minimumZoomScale={1} centerContent>
          {photo ? <>
            <Image source={{ uri: photo.url }} resizeMode="contain" accessibilityLabel={photo.label || photo.title} style={{ width: photoWidth, height: photoWidth * ratio, borderRadius: 8 }} />
            <Text style={s.zoomTitle}>{photo.label || photo.title}</Text>
            {photo.generated ? <Text style={s.credit}>Imagen creada por la IA del tutor</Text> : null}
            {photo.page ? <Pressable accessibilityRole="link" onPress={() => void openBrowserAsync(photo.page!)}><Text style={s.credit}>Foto: Wikipedia · {photo.title} ↗</Text></Pressable> : null}
          </> : null}
          {visual ? <View style={s.paper} nativeID={drawingId}>
            <BoardVisualView visual={visual} drawn={visualSteps(visual)} width={Math.min(max - 32, (height - 200) * (visual.type === 'map' ? 1.43 : 1))} drawing={false} max={1000} />
          </View> : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  photos: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 24, paddingVertical: 14 },
  card: { backgroundColor: '#FFFFFF', padding: 8, paddingBottom: 6, borderRadius: 3, shadowColor: '#16394D', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 5, borderWidth: 1, borderColor: '#E3E8EE' },
  drawing: { alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#F4F7FA', borderWidth: 2, borderStyle: 'dashed', borderColor: '#C9D6E2' },
  drawingText: { fontFamily: handwriting, fontSize: 24, color: colors.inkMuted },
  caption: { fontFamily: handwriting, fontSize: 20, color: colors.ink, textAlign: 'center', marginTop: 6 },
  zoomHint: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.inkMuted, textAlign: 'center' },
  tape: { position: 'absolute', top: -10, width: 64, height: 22, backgroundColor: 'rgba(250, 228, 150, 0.78)', borderWidth: 1, borderColor: 'rgba(214, 186, 96, 0.5)' },
  tapeLeft: { left: -16, transform: [{ rotate: '-35deg' }] },
  tapeRight: { right: -16, transform: [{ rotate: '35deg' }] },
  backdrop: { flex: 1, backgroundColor: 'rgba(10, 24, 36, 0.92)' },
  bar: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, margin: 14, marginTop: 24, zIndex: 2 },
  printError: { fontFamily: fonts.bodySemi, fontSize: 14, color: '#FFD3C7', textAlign: 'center' },
  close: { minHeight: 44, paddingHorizontal: 16, borderRadius: 22, backgroundColor: colors.white, justifyContent: 'center', zIndex: 2 },
  closeText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink },
  zoomBody: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 16, gap: 10 },
  zoomTitle: { fontFamily: handwriting, fontSize: 28, color: colors.white, textAlign: 'center' },
  credit: { fontFamily: fonts.body, fontSize: 13, color: '#C9D6E2', textDecorationLine: 'underline' },
  paper: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16 },
});
