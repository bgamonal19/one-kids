import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COMPANIONS, KikoMascot } from '@/components/KikoMascot';
import { fonts } from '@/constants/theme';
import { useCompanionReaction } from '@/hooks/useCompanionReaction';
import { useFamily } from '@/lib/store';

type Stage = 'junior' | 'adventure' | 'creator' | 'pro';
const stageForAge = (age: number): Stage =>
  age <= 8 ? 'junior' : age <= 11 ? 'adventure' : age <= 14 ? 'creator' : 'pro';

const modes: Record<Stage, { label: string; agent: string; bg: string; primary: string; ink: string; soft: string; welcome: string; action: string }> = {
  junior: { label: 'Exploradores · 6–8', agent: 'Kiko', bg: '#F0FAFF', primary: '#397CE8', ink: '#203758', soft: '#DCF0FF', welcome: '¡Hoy aprenderemos jugando!', action: '¡Vamos a descubrir!' },
  adventure: { label: 'Aventureros · 9–11', agent: 'Kiko', bg: '#F5F4FF', primary: '#7357DB', ink: '#302B57', soft: '#E9E3FF', welcome: '¿Listo para una nueva misión?', action: 'Empezar aventura' },
  creator: { label: 'Creadores · 12–14', agent: 'Nova (próximamente)', bg: '#F2F7FC', primary: '#327DA4', ink: '#17354B', soft: '#DCEEF7', welcome: 'Convierte tus ideas en proyectos.', action: 'Explorar temas' },
  pro: { label: 'Pro · 15–16', agent: 'Axon (próximamente)', bg: '#F0F3F9', primary: '#344E84', ink: '#17243E', soft: '#DFE7F5', welcome: 'Organiza tu aprendizaje a tu manera.', action: 'Planificar mi estudio' },
};

export default function ChildHome() {
  const { expression, react } = useCompanionReaction();
  const [interaction, setInteraction] = useState(0);
  const { state, worldsUnlocked, allTasksDone } = useFamily();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const age = state.child?.age ?? 8;
  const stage = stageForAge(age);
  const mode = modes[stage];
  const young = stage === 'junior' || stage === 'adventure';
  const companion = state.child?.companion ?? 'bear';
  const companionName = COMPANIONS[companion].name;
  const prompts = age <= 8 ? ['¡Choca esos cinco! ¿Contamos tres estrellas?', '¡Cada intento te hace crecer!'] : age <= 11 ? ['Misión: aprende algo y explícamelo con tus palabras.', 'Un error es una pista. ¡Investiguemos!'] : age <= 14 ? ['Divide tu reto en pasos. ¿Cuál harías primero?', 'Prueba otra estrategia y compara los resultados.'] : ['Define una meta concreta para esta sesión.', '¿Qué evidencia respalda tu respuesta?'];
  const personality = COMPANIONS[companion].intro;
  const compact = width < 520;
  const unfinished = state.tasks.filter(task => !task.done);
  const finished = state.tasks.length - unfinished.length;
  const progress = state.tasks.length ? finished / state.tasks.length : 0;
  const routes = [
    { label: 'Mis tareas', icon: '✓', route: '/(child)/tasks' as const, color: '#FFBFA9' },
    { label: 'Tutor IA', icon: '✦', route: '/(child)/tutor' as const, color: '#C5CCFF' },
    { label: 'Mis cursos', icon: '▤', route: '/(child)/courses' as const, color: '#A9E8D7' },
    { label: 'Mi agenda', icon: '▦', route: '/(child)/calendar' as const, color: '#FFE5A4' },
    { label: young ? 'Mundos' : 'Practicar', icon: '✧', route: '/(child)/worlds' as const, color: '#D9C5FD' },
    { label: 'Calculadora', icon: '∑', route: '/(child)/calculator' as const, color: '#B9E2FA' },
  ];

  return (
    <View style={[styles.root, { backgroundColor: mode.bg }]}>
      <ScrollView contentContainerStyle={[styles.container, { paddingTop: insets.top + 54, paddingBottom: insets.bottom + 28, maxWidth: 1080 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.brandRow}>
          <View>
            <Text style={[styles.brand, { color: mode.ink }]}>ONE <Text style={{ color: mode.primary }}>KIDS</Text></Text>
            <Text style={[styles.subtitle, { color: mode.primary }]}>{mode.label} · {age} años{state.child?.grade ? ' · ' + state.child.grade : ''}</Text>
          </View>
          <View style={[styles.stars, { backgroundColor: mode.soft }]}><Text style={[styles.starLabel, { color: mode.ink }]}>★ {state.child?.stars ?? 0}</Text></View>
        </View>

        <View style={[styles.hero, { backgroundColor: mode.primary, flexDirection: compact ? 'column' : 'row' }]}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroKicker}>TU ESPACIO DE APRENDIZAJE</Text>
            <Text style={[styles.heroTitle, { fontSize: young ? 28 : 25 }]}>¡Hola, {state.child?.name ?? 'estudiante'}!</Text>
            <Text style={styles.heroDescription}>{allTasksDone ? '¡Excelente! Has terminado tus tareas.' : mode.welcome}</Text>
            <Pressable onPress={() => router.push('/(child)/tutor')} accessibilityRole="button" style={styles.heroButton}>
              <Text style={[styles.heroButtonText, { color: mode.primary }]}>{mode.action} →</Text>
            </Pressable>
          </View>
          <View style={styles.heroAgent}>
            <Pressable accessibilityRole="button" accessibilityLabel={`Hablar con ${companionName}`} onPress={() => { setInteraction(n => n + 1); react(interaction % 2 ? 'encourage' : 'curious', 4000); }}><KikoMascot character={companion} age={age} expression={allTasksDone && interaction === 0 ? 'celebrate' : expression} mood={allTasksDone ? 'celebrate' : 'wave'} size={young ? 190 : 160} /></Pressable>
            <Text style={styles.agentName}>{companionName} · {COMPANIONS[companion].role}</Text>
          </View>
        </View>

        <Pressable accessibilityRole="button" accessibilityLabel="Pedir un consejo a mi compañero" onPress={() => { setInteraction(n => n + 1); react(interaction % 2 ? 'encourage' : 'curious', 4000); }} style={{ backgroundColor: mode.soft, borderRadius: 20, padding: 18, marginTop: 12 }}>
          <Text style={{ fontFamily: fonts.bodyBold, color: mode.ink, fontSize: 16 }}>{interaction ? personality + prompts[(interaction - 1) % prompts.length] : `Toca a ${companionName} para descubrir tu reto de hoy.`}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.push('./profile')} style={[styles.profileLink, { backgroundColor: mode.soft }]}><Text style={[styles.actionText, { color: mode.primary }]}>✦ Elegir personaje 3D y personalizar mi perfil →</Text></Pressable>
        {state.child?.interests?.length ? <Text style={[styles.interests, { color: mode.ink }]}>Me interesa: {state.child.interests.join(' · ')}</Text> : null}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: mode.ink }]}>Tu día de aprendizaje</Text>
          <Text style={[styles.subtle, { color: mode.ink }]}>{finished}/{state.tasks.length} tareas</Text>
        </View>
        <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: mode.primary }]} /></View>
        <View style={styles.taskCard}>
          {unfinished.length === 0 ? (
            <Text style={[styles.taskText, { color: mode.ink }]}>{state.tasks.length ? '¡Todo listo! Buen trabajo.' : 'Empieza añadiendo tu primera tarea.'}</Text>
          ) : unfinished.slice(0, 3).map((task, index) => (
            <Pressable key={task.id} onPress={() => router.push('/(child)/tasks')} style={[styles.taskRow, index > 0 && styles.separator]}>
              <Text style={[styles.check, { color: mode.primary }]}>○</Text>
              <Text style={[styles.taskText, { color: mode.ink }]} numberOfLines={2}>{task.title}</Text>
              <Text style={{ color: mode.primary }}>›</Text>
            </Pressable>
          ))}
          <Pressable onPress={() => router.push('/(child)/tasks')} style={styles.textAction}><Text style={[styles.actionText, { color: mode.primary }]}>Ver todas las tareas →</Text></Pressable>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: mode.ink }]}>Mis herramientas</Text>
        </View>
        <View style={styles.grid}>
          {routes.map(item => {
            const locked = item.route === '/(child)/worlds' && !worldsUnlocked;
            return (
              <Pressable
                key={item.label}
                accessibilityRole="button"
                accessibilityLabel={locked ? `${item.label}, termina tus tareas para entrar` : item.label}
                onPress={() => router.push(locked ? '/(child)/tasks' : item.route)}
                style={[styles.tool, { width: compact ? '48%' : '31%', opacity: locked ? 0.65 : 1 }]}
              >
                <View style={[styles.iconCircle, { backgroundColor: item.color }]}><Text style={styles.toolIcon}>{locked ? '🔒' : item.icon}</Text></View>
                <Text style={[styles.toolLabel, { color: mode.ink }]}>{item.label}</Text>
                {locked ? <Text style={styles.lockHint}>Termina tus tareas</Text> : null}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: mode.ink }]}>Continúa aprendiendo</Text>
          <Pressable onPress={() => router.push('/(child)/courses')}><Text style={[styles.actionText, { color: mode.primary }]}>Ver cursos →</Text></Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.courseList}>
          {state.courses.slice(0, 8).map(course => (
            <Pressable key={course.id} onPress={() => router.push('/(child)/courses')} style={[styles.courseCard, { borderTopColor: course.color }]}>
              <Text style={[styles.courseTitle, { color: mode.ink }]} numberOfLines={2}>{course.title}</Text>
              <Text style={styles.courseDesc} numberOfLines={2}>{course.desc}</Text>
              <Text style={[styles.actionText, { color: mode.primary }]}>Explorar →</Text>
            </Pressable>
          ))}
        </ScrollView>
        <Text style={styles.footer}>Tu aprendizaje, a tu ritmo. ✨</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  profileLink: { alignSelf: 'flex-start', borderRadius: 16, paddingHorizontal: 15, paddingVertical: 12, marginTop: 16 },
  interests: { fontFamily: fonts.bodySemi, marginTop: 10, fontSize: 13 },
  container: { width: '100%', alignSelf: 'center', paddingHorizontal: 18 },
  brandRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  brand: { fontSize: 25, fontFamily: fonts.displayBold },
  subtitle: { fontSize: 12, fontFamily: fonts.bodyBold, marginTop: 2 },
  stars: { borderRadius: 30, paddingHorizontal: 16, paddingVertical: 10 },
  starLabel: { fontSize: 17, fontFamily: fonts.bodyBold },
  hero: { borderRadius: 26, padding: 22, alignItems: 'center', overflow: 'hidden', minHeight: 194 },
  heroCopy: { flex: 1, alignSelf: 'stretch', justifyContent: 'center' },
  heroKicker: { color: '#DCEAFF', fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1.2 },
  heroTitle: { color: '#FFFFFF', fontFamily: fonts.displayBold, marginTop: 9 },
  heroDescription: { color: '#FFFFFF', fontFamily: fonts.bodySemi, fontSize: 15, marginTop: 6, marginBottom: 14 },
  heroButton: { backgroundColor: '#FFFFFF', borderRadius: 18, alignSelf: 'flex-start', paddingVertical: 10, paddingHorizontal: 16 },
  heroButtonText: { fontFamily: fonts.bodyBold, fontSize: 14 },
  heroAgent: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, minWidth: 115 },
  agentName: { color: '#FFFFFF', fontFamily: fonts.bodyBold, fontSize: 11, textAlign: 'center', marginTop: 4 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 12, gap: 8 },
  sectionTitle: { fontFamily: fonts.displayBold, fontSize: 20, flexShrink: 1 },
  subtle: { fontFamily: fonts.bodySemi, fontSize: 13 },
  progressTrack: { height: 8, backgroundColor: '#DDE6F0', borderRadius: 6, overflow: 'hidden', marginBottom: 12 },
  progressFill: { height: 8, borderRadius: 6 },
  taskCard: { backgroundColor: '#FFFFFF', borderRadius: 20, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6 },
  taskRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, gap: 10 },
  separator: { borderTopWidth: 1, borderTopColor: '#F0F3F7' },
  check: { fontSize: 23 },
  taskText: { fontFamily: fonts.bodySemi, fontSize: 15, flex: 1 },
  textAction: { paddingVertical: 11, alignSelf: 'flex-start' },
  actionText: { fontFamily: fonts.bodyBold, fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  tool: { minHeight: 125, borderRadius: 19, backgroundColor: '#FFFFFF', padding: 15, justifyContent: 'center', alignItems: 'flex-start' },
  iconCircle: { width: 48, height: 48, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  toolIcon: { fontFamily: fonts.displayBold, fontSize: 27, color: '#233C64' },
  toolLabel: { fontFamily: fonts.bodyBold, fontSize: 15 },
  lockHint: { fontFamily: fonts.body, fontSize: 10, color: '#607087' },
  courseList: { gap: 12, paddingBottom: 4 },
  courseCard: { backgroundColor: '#FFFFFF', borderRadius: 17, borderTopWidth: 5, width: 175, minHeight: 135, padding: 15, justifyContent: 'space-between' },
  courseTitle: { fontFamily: fonts.displayBold, fontSize: 16 },
  courseDesc: { fontFamily: fonts.body, color: '#607087', fontSize: 12, marginVertical: 8 },
  footer: { fontFamily: fonts.bodySemi, textAlign: 'center', color: '#8492A4', paddingTop: 28, paddingBottom: 6, fontSize: 12 },
});
