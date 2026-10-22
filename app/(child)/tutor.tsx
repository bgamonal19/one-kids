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

import { CompanionStatus } from '@/components/CompanionStatus';
import { useCompanionReaction } from '@/hooks/useCompanionReaction';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { getAgeBand, getAgeProfile } from '@/lib/ages';
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
  const band = child ? getAgeBand(child.age) : '7-9';
  const profile = getAgeProfile(child?.age ?? 8);
  const aiMode = isSupabaseConfigured
    ? 'Estoy conectado a OpenAI Vision.'
    : 'Modo local (sin OpenAI). Un adulto puede conectar Supabase + OPENAI_API_KEY.';

  const [messages, setMessages] = useState<TutorMessage[]>([
    {
      id: 'welcome',
      role: 'tutor',
      text: `¡Hola ${child?.name ?? ''}! ${profile.tutorHint}\n\n${profile.bandTitle}. ${aiMode}`,
    },
  ]);
  const { expression, react } = useCompanionReaction();
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
    react('focused');
    setPendingImage(asset.uri);
    setPendingBase64(asset.base64 ?? null);
  };

  const send = async (message = input, responseReaction: 'explain' | 'hint' = 'explain') => {
    if (loading) return;
    if (!message.trim() && !pendingBase64 && !pendingImage) return;
    const childMsg: TutorMessage = {
      id: uid(),
      role: 'child',
      text: message.trim() || 'Ayúdame con esta foto de mi tarea',
      imageUri: pendingImage ?? undefined,
    };
    const nextHistory = [...messages, childMsg];
    setMessages(nextHistory);
    setInput('');
    setLoading(true);
    react('think');

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
      react(responseReaction, 6000);
    } catch {
      react('retry');
      setMessages(prev => [...prev, { id: uid(), role: 'tutor', text: 'No pude recibir la respuesta. Podemos intentarlo de nuevo.' }]);
    } finally {
      setPendingImage(null);
      setPendingBase64(null);
      setLoading(false);
    }
  };

  return (
    <Screen style={{ flex: 1, paddingBottom: 0 }}>
      <View style={styles.headerRow}>

        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Tutor IA</Text>
          <Text style={styles.hint}>Tu compañero y el tutor te guían paso a paso.</Text>
        </View>
      </View>

      <CompanionStatus expression={expression} message={loading ? 'Estoy preparando el siguiente paso…' : undefined} />
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
        <View style={styles.row}>
          <PrimaryButton label="Una pista" variant="secondary" onPress={() => send('Dame una pista del ejercicio que estamos viendo, sin decirme la respuesta.', 'hint')} disabled={loading} style={styles.half} />
          <PrimaryButton label="Tú puedes" variant="secondary" onPress={() => {
            react('encourage', 5000);
            setMessages(prev => [...prev, { id: uid(), role: 'tutor', text: (child?.age ?? 8) <= 8 ? '¡Tú puedes! Respira y probemos un pasito más.' : 'Si te atascas, divide el problema en una parte más pequeña. Vamos paso a paso.' }]);
          }} disabled={loading} style={styles.half} />
        </View>
        <TextInput
          value={input}
          onFocus={() => { if (!loading) react('listen'); }}
          onChangeText={value => { setInput(value); if (!loading) react('listen'); }}
          placeholder="Escribe tu duda…"
          placeholderTextColor={colors.inkMuted}
          style={styles.input}
        />
        <View style={styles.row}>
          <PrimaryButton label="Foto" variant="secondary" onPress={pickPhoto} style={styles.half} />
          <PrimaryButton label="Enviar" onPress={() => send()} disabled={loading} style={styles.half} />
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
