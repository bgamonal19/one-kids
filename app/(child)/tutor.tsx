import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { KikoMascot } from '@/components/KikoMascot';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { getAgeBand } from '@/lib/ages';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useFamily } from '@/lib/store';
import { askTutor } from '@/lib/tutor';
import type { TutorMessage } from '@/lib/types';

function uid() {
  return `m_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

export default function TutorScreen() {
  const { state } = useFamily();
  const child = state.child;
  const band = child ? getAgeBand(child.age) : '8-10';
  const aiMode = isSupabaseConfigured
    ? 'Estoy conectado a OpenAI Vision.'
    : 'Ahora mismo estoy en modo local (sin OpenAI). Pide a un adulto configurar Supabase + OPENAI_API_KEY.';

  const [messages, setMessages] = useState<TutorMessage[]>([
    {
      id: 'welcome',
      role: 'tutor',
      text: `¡Hola ${child?.name ?? ''}! Soy tu tutor. Toma foto de tu tarea o escríbeme el problema. Te guío paso a paso.\n\n${aiMode}`,
    },
  ]);
  const [input, setInput] = useState('');
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [pendingBase64, setPendingBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const pickPhoto = async () => {
    const cam = await ImagePicker.requestCameraPermissionsAsync();
    let result: ImagePicker.ImagePickerResult;

    if (cam.granted) {
      result = await ImagePicker.launchCameraAsync({
        quality: 0.6,
        base64: true,
        allowsEditing: true,
      });
    } else {
      const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!lib.granted) return;
      result = await ImagePicker.launchImageLibraryAsync({
        quality: 0.6,
        base64: true,
        mediaTypes: ['images'],
      });
    }

    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setPendingImage(asset.uri);
    setPendingBase64(asset.base64 ?? null);
  };

  const send = async () => {
    if (!input.trim() && !pendingBase64 && !pendingImage) return;
    const childMsg: TutorMessage = {
      id: uid(),
      role: 'child',
      text: input.trim() || 'Ayúdame con esta foto de mi tarea',
      imageUri: pendingImage ?? undefined,
    };
    const nextHistory = [...messages, childMsg];
    setMessages(nextHistory);
    setInput('');
    setLoading(true);

    const history = nextHistory
      .filter((m) => m.id !== 'welcome')
      .map((m) => ({ role: m.role, text: m.text }));

    try {
      const res = await askTutor({
        ageBand: band,
        childName: child?.name ?? 'amigo',
        message: childMsg.text,
        imageBase64: pendingBase64 ?? undefined,
        history,
      });
      setMessages((prev) => [...prev, { id: uid(), role: 'tutor', text: res.reply }]);
    } finally {
      setPendingImage(null);
      setPendingBase64(null);
      setLoading(false);
    }
  };

  return (
    <Screen style={{ flex: 1, paddingBottom: 0 }}>
      <View style={styles.headerRow}>
        <KikoMascot mood={loading ? 'think' : 'happy'} size={72} />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Tutor IA</Text>
          <Text style={styles.hint}>Kiko y el tutor te guían paso a paso.</Text>
        </View>
      </View>

      <ScrollView
        style={styles.chat}
        contentContainerStyle={{ gap: 10, paddingBottom: 12 }}
      >
        {messages.map((m) => (
          <View
            key={m.id}
            style={[styles.bubble, m.role === 'tutor' ? styles.tutorBubble : styles.childBubble]}
          >
            {m.imageUri ? <Image source={{ uri: m.imageUri }} style={styles.thumb} /> : null}
            <Text style={[styles.bubbleText, m.role === 'child' && styles.childText]}>{m.text}</Text>
          </View>
        ))}
        {loading ? <ActivityIndicator color={colors.coral} /> : null}
      </ScrollView>

      {pendingImage ? (
        <View style={styles.preview}>
          <Image source={{ uri: pendingImage }} style={styles.previewImg} />
          <Text style={styles.previewLabel}>Foto lista para enviar</Text>
        </View>
      ) : null}

      <View style={styles.composer}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Escribe tu duda…"
          placeholderTextColor={colors.inkMuted}
          style={styles.input}
        />
        <View style={styles.row}>
          <PrimaryButton label="Foto" variant="secondary" onPress={pickPhoto} style={styles.half} />
          <PrimaryButton label="Enviar" onPress={send} disabled={loading} style={styles.half} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 26,
    color: colors.ink,
  },
  hint: {
    marginTop: 4,
    fontFamily: fonts.body,
    color: colors.inkMuted,
  },
  chat: { flex: 1 },
  bubble: {
    borderRadius: radii.md,
    padding: 12,
    maxWidth: '92%',
  },
  tutorBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.white,
  },
  childBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.sky,
  },
  bubbleText: { fontFamily: fonts.body, color: colors.ink, fontSize: 15, lineHeight: 22 },
  childText: { color: colors.white },
  thumb: { width: 140, height: 100, borderRadius: 10, marginBottom: 8 },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  previewImg: { width: 48, height: 48, borderRadius: 8 },
  previewLabel: { fontFamily: fonts.bodySemi, color: colors.inkMuted },
  composer: { gap: 8, paddingBottom: spacing.md },
  input: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink,
  },
  row: { flexDirection: 'row', gap: 8 },
  half: { flex: 1 },
});
