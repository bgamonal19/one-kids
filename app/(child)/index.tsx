import { useEffect, useState } from 'react';
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
  const agentSize = compact ? 120 : 150;
  const gutter = width >= 900 ? 32 : compact ? 16 : 24;
  const columns = width >= 900 ? 5 : compact ? 2 : 3;
  const tileWidth = (width - gutter * 2 - TILE_GAP * (columns - 1)) / columns;
  const openTutor = () => router.push('/(child)/tutor');
  const [cheering, setCheering] = useState(false);
  useEffect(() => {
    if (!cheering) return;
    const timer = setTimeout(() => setCheering(false), 4000);
    return () => clearTimeout(timer);
  }, [cheering]);
  // With nothing pending, the first tap congratulates; tapping again while the bubble shows opens the tutor.
  const tapCompanion = () => { if (allTasksDone && !cheering) setCheering(true); else openTutor(); };
  const unfinished = state.tasks.filter(task => !task.done);
  const finished = state.tasks.length - unfinished.length;
  const progress = state.tasks.length ? finished / state.tasks.length : 0;
  const routes = [
    { label: young ? 'Tareas' : 'Mis tareas', icon: '📝', route: '/(child)/tasks' as const, color: '#FFD9CC' },
    { label: young ? 'Jugar' : 'Practicar', icon: '🌍', route: '/(child)/worlds' as const, color: '#E6DAFE' },
    { label: young ? 'Cursos' : 'Mis cursos', icon: '📚', route: '/(child)/courses' as const, color: '#C9F1E6' },
    { label: young ? 'Agenda' : 'Mi agenda', icon: '📅', route: '/(child)/calendar' as const, color: '#FFEDBF' },
    { label: 'Calculadora', icon: '🧮', route: '/(child)/calculator' as const, color: '#D3EDFC' },
  ];

  return (
    <View style={[styles.root, { backgroundColor: mode.bg }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 28 }} showsVerticalScrollIndicator={false}>
        {/* Short blue band; the companion floats over its bottom edge instead of making it taller. */}
        <View style={[styles.hero, { backgroundColor: mode.primary, paddingTop: insets.top + (compact ? 60 : 12), paddingHorizontal: gutter, paddingBottom: compact ? agentSize * 0.7 : 18 }]}>
          <View style={styles.brandRow}>
            <Text style={styles.brand}>ONE <Text style={{ color: mode.soft }}>KIDS</Text></Text>
            <View style={styles.stars}><Text style={styles.starLabel}>★ {state.child?.stars ?? 0}</Text></View>
          </View>
          <Text style={styles.subtitle}>{mode.label} · {age} años{state.child?.grade ? ' · ' + state.child.grade : ''}</Text>
          <View style={styles.greeting}>
            <Text style={[styles.heroTitle, { fontSize: young ? 28 : 25 }]}>¡Hola, {state.child?.name ?? 'estudiante'}!</Text>
            <Text style={styles.heroDescription}>{mode.welcome}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={`Aprender con ${companionName} en la pizarra`} onPress={openTutor} style={styles.heroHint}>
              <Text style={styles.heroHintText}>👉 Toca a {companionName} para aprender</Text>
            </Pressable>
          </View>
          {cheering ? (
            <View accessibilityLiveRegion="polite" style={[styles.cheer, { right: gutter + agentSize * 0.7, bottom: agentSize * 0.25 }]}>
              <Text style={[styles.cheerText, { color: mode.ink }]}>🎉 ¡Excelente! Has terminado tus pendientes.</Text>
            </View>
          ) : null}
          <Pressable accessibilityRole="button" accessibilityLabel={allTasksDone ? `${companionName}: ¡Excelente! Has terminado tus pendientes` : `Hablar con ${companionName}, tu tutor`} onPress={tapCompanion} style={[styles.agentTap, { right: gutter, bottom: -agentSize * 0.4 }]}>
            <KikoMascot character={companion} age={age} expression={allTasksDone ? 'celebrate' : expression} mood={allTasksDone ? 'celebrate' : 'wave'} size={agentSize} />
          </Pressable>
        </View>

        <View style={{ paddingHorizontal: gutter }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Pedir un consejo a mi compañero" onPress={() => { setInteraction(n => n + 1); react(interaction % 2 ? 'encourage' : 'curious', 4000); }} style={{ backgroundColor: mode.soft, borderRadius: 20, padding: 18, paddingRight: agentSize * 0.8, marginTop: 16 }}>
          <Text style={{ fontFamily: fonts.bodyBold, color: mode.ink, fontSize: 16 }}>{interaction ? personality + prompts[(interaction - 1) % prompts.length] : `💡 Toca aquí y ${companionName} te dará un reto para hoy.`}</Text>
        </Pressable>
        {state.child?.interests?.length ? <Text style={[styles.interests, { color: mode.ink }]}>Me interesa: {state.child.interests.join(' · ')}</Text> : null}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: mode.ink }]}>{young ? '¿Qué hacemos hoy?' : 'Mis herramientas'}</Text>
        </View>
        <View style={styles.grid}>
          {routes.map((item, index) => {
            // A lone tile on the last row takes the whole width instead of leaving a gap.
            const alone = index === routes.length - 1 && routes.length % columns === 1;
            const locked = item.route === '/(child)/worlds' && !worldsUnlocked;
            return (
              <Pressable
                key={item.label}
                accessibilityRole="button"
                accessibilityLabel={locked ? `${item.label}, termina tus tareas para entrar` : item.label}
                onPress={() => router.push(locked ? '/(child)/tasks' : item.route)}
                style={[styles.tool, { width: alone ? '100%' : tileWidth, opacity: locked ? 0.65 : 1 }]}
              >
                <View style={[styles.iconCircle, { backgroundColor: item.color, width: young ? 68 : 56, height: young ? 68 : 56 }]}><Text style={[styles.toolIcon, { fontSize: young ? 38 : 30 }]}>{locked ? '🔒' : item.icon}</Text></View>
                <Text style={[styles.toolLabel, { color: mode.ink }]}>{item.label}</Text>
                {locked ? <Text style={styles.lockHint}>Termina tus tareas 🔑</Text> : null}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: mode.ink }]}>Tu día de aprendizaje</Text>
          <Text style={[styles.subtle, { color: mode.ink }]}>✅ {finished}/{state.tasks.length}</Text>
        </View>
        <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: mode.primary }]} /></View>
        <View style={styles.taskCard}>
          {unfinished.length === 0 ? (
            <Text style={[styles.taskText, { color: mode.ink }]}>{state.tasks.length ? '¡Todo listo! Buen trabajo.' : 'Empieza añadiendo tu primera tarea.'}</Text>
          ) : unfinished.slice(0, 3).map((task, index) => (
            <Pressable key={task.id} onPress={() => router.push('/(child)/tasks')} style={[styles.taskRow, index > 0 && styles.separator]}>
              <View style={[styles.check, { borderColor: mode.primary }]} />
              <Text style={[styles.taskText, { color: mode.ink }]} numberOfLines={2}>{task.title}</Text>
              <Text style={[styles.chevron, { color: mode.primary }]}>›</Text>
            </Pressable>
          ))}
          <Pressable onPress={() => router.push('/(child)/tasks')} style={styles.textAction} accessibilityRole="button"><Text style={[styles.actionText, { color: mode.primary }]}>Ver todas →</Text></Pressable>
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
              <Text style={[styles.actionText, { color: mode.primary }]}>▶ Abrir</Text>
            </Pressable>
          ))}
        </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}

const TILE_GAP = 12;

const styles = StyleSheet.create({
  root: { flex: 1 },
  interests: { fontFamily: fonts.bodySemi, marginTop: 10, fontSize: 13 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 34 },
  brand: { fontSize: 25, fontFamily: fonts.displayBold, color: '#FFFFFF' },
  subtitle: { fontSize: 12, fontFamily: fonts.bodyBold, marginTop: 2, color: '#FFFFFF', opacity: 0.85 },
  stars: { borderRadius: 30, paddingHorizontal: 12, paddingVertical: 5, backgroundColor: 'rgba(255,255,255,0.2)' },
  starLabel: { fontSize: 15, fontFamily: fonts.bodyBold, color: '#FFFFFF' },
  hero: { paddingBottom: 18, zIndex: 2 },
  heroTitle: { color: '#FFFFFF', fontFamily: fonts.displayBold, marginTop: 12, textAlign: 'center' },
  heroDescription: { color: '#FFFFFF', fontFamily: fonts.bodySemi, fontSize: 16, marginTop: 4, marginBottom: 12, textAlign: 'center' },
  greeting: { alignItems: 'center' },
  cheer: { position: 'absolute', zIndex: 3, maxWidth: 240, backgroundColor: '#FFFFFF', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  cheerText: { fontFamily: fonts.bodyBold, fontSize: 15 },
  heroHint: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9 },
  heroHintText: { color: '#FFFFFF', fontFamily: fonts.bodyBold, fontSize: 15 },
  agentTap: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 12, gap: 8 },
  sectionTitle: { fontFamily: fonts.displayBold, fontSize: 22, flexShrink: 1 },
  subtle: { fontFamily: fonts.bodyBold, fontSize: 15 },
  progressTrack: { height: 14, backgroundColor: '#DDE6F0', borderRadius: 7, overflow: 'hidden', marginBottom: 12 },
  progressFill: { height: 14, borderRadius: 7 },
  taskCard: { backgroundColor: '#FFFFFF', borderRadius: 20, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6 },
  taskRow: { flexDirection: 'row', alignItems: 'center', minHeight: 60, paddingVertical: 10, gap: 12 },
  separator: { borderTopWidth: 1, borderTopColor: '#F0F3F7' },
  check: { width: 28, height: 28, borderRadius: 14, borderWidth: 3 },
  chevron: { fontSize: 26, fontFamily: fonts.bodyBold },
  taskText: { fontFamily: fonts.bodySemi, fontSize: 17, flex: 1 },
  textAction: { minHeight: 48, justifyContent: 'center', alignSelf: 'flex-start' },
  actionText: { fontFamily: fonts.bodyBold, fontSize: 15 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: TILE_GAP },
  tool: { minHeight: 136, borderRadius: 22, backgroundColor: '#FFFFFF', padding: 14, justifyContent: 'center', alignItems: 'center' },
  iconCircle: { borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  toolIcon: { textAlign: 'center' },
  toolLabel: { fontFamily: fonts.displayBold, fontSize: 18, textAlign: 'center' },
  lockHint: { fontFamily: fonts.bodySemi, fontSize: 12, color: '#607087', textAlign: 'center', marginTop: 2 },
  courseList: { gap: 12, paddingBottom: 4 },
  courseCard: { backgroundColor: '#FFFFFF', borderRadius: 17, borderTopWidth: 5, width: 175, minHeight: 135, padding: 15, justifyContent: 'space-between' },
  courseTitle: { fontFamily: fonts.displayBold, fontSize: 18 },
  courseDesc: { fontFamily: fonts.body, color: '#607087', fontSize: 14, marginVertical: 8 },
});
