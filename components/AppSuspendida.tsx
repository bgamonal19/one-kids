import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { APP_URL } from '@/lib/app-url';
import { fonts } from '@/constants/theme';

/**
 * Aviso de pantalla completa cuando ONESYSTEC GENERALE apaga la app.
 * - Mantenimiento ("mantenimiento" o "apagada"): símbolo de carga y comprobación cada 30 s; se cierra solo al volver.
 * - Servicio suspendido ("pago" o "acceso"): aviso serio con la indicación de contactar al proveedor.
 * La nota opcional escrita en GENERALE aparece debajo, tal cual.
 */
const EVERY = 30_000;
type Estado = { activa: boolean; mensaje: string; motivo: string };

export function AppSuspendida() {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [comprobando, setComprobando] = useState(false);

  const leer = useCallback(async (): Promise<Estado | null> => {
    try {
      const r = await fetch(`${APP_URL}/api/generale?t=${Date.now()}`, { cache: 'no-store' });
      return r.ok ? ((await r.json()) as Estado) : null;
    } catch {
      return null; // sin conexión: se mira luego
    }
  }, []);

  const comprobar = useCallback(async () => {
    setComprobando(true);
    const s = await leer();
    if (s) setEstado(s);
    setComprobando(false);
  }, [leer]);

  useEffect(() => {
    let parado = false;
    const tick = () => void leer().then((s) => { if (s && !parado) setEstado(s); });
    tick();
    const t = setInterval(tick, EVERY);
    return () => { parado = true; clearInterval(t); };
  }, [leer]);

  if (!estado || estado.activa) return null;
  const suspendido = estado.motivo === 'pago' || estado.motivo === 'acceso';

  return (
    <View
      accessibilityRole="alert"
      accessibilityViewIsModal
      style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 9999, elevation: 9999, backgroundColor: '#070b19', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 20 }}
    >
      {suspendido ? (
        <View style={{ width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(248,113,113,0.5)', backgroundColor: 'rgba(127,29,29,0.6)' }}>
          <Text style={{ fontSize: 28 }} accessibilityElementsHidden importantForAccessibility="no">🔒</Text>
        </View>
      ) : (
        <ActivityIndicator size="large" color="#22d3ee" accessibilityLabel="Cargando" />
      )}
      <Text style={{ maxWidth: 440, color: '#fff', fontSize: 24, fontFamily: fonts.display, textAlign: 'center' }} accessibilityRole="header">
        {suspendido ? 'Servicio suspendido' : 'ONE KIDS está en mantenimiento'}
      </Text>
      <Text style={{ maxWidth: 440, color: '#d1d5db', fontSize: 16, lineHeight: 24, fontFamily: fonts.body, textAlign: 'center' }}>
        {suspendido
          ? 'El servicio está suspendido. Para reactivarlo, ponte en contacto con tu proveedor del servicio.'
          : 'Estamos haciendo mantenimiento. Vuelve a estar disponible en breve.'}
      </Text>
      {!!estado.mensaje && (
        <Text style={{ maxWidth: 440, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', backgroundColor: 'rgba(255,255,255,0.06)', color: '#f3f4f6', fontSize: 15, lineHeight: 22, fontFamily: fonts.body, textAlign: 'center', overflow: 'hidden' }}>
          {estado.mensaje}
        </Text>
      )}
      {suspendido ? (
        <Text style={{ maxWidth: 440, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(248,113,113,0.4)', backgroundColor: 'rgba(127,29,29,0.35)', color: '#fecaca', fontSize: 14, lineHeight: 21, fontFamily: fonts.body, textAlign: 'center', overflow: 'hidden' }}>
          Para cualquier información, contacta con tu proveedor del servicio.
        </Text>
      ) : (
        <Text style={{ maxWidth: 440, color: '#9ca3af', fontSize: 14, fontFamily: fonts.body, textAlign: 'center' }}>
          Lo comprobamos solos cada 30 segundos: la app se abre en cuanto vuelva.
        </Text>
      )}
      <Pressable
        accessibilityRole="button"
        onPress={() => void comprobar()}
        disabled={comprobando}
        style={{ minHeight: 48, paddingHorizontal: 28, borderRadius: 12, backgroundColor: '#06b6d4', alignItems: 'center', justifyContent: 'center', opacity: comprobando ? 0.6 : 1 }}
      >
        <Text style={{ color: '#04111a', fontSize: 14, fontFamily: fonts.bodySemi, letterSpacing: 1, textTransform: 'uppercase' }}>{comprobando ? '…' : 'Reintentar'}</Text>
      </Pressable>
      <Text style={{ paddingTop: 24, color: '#9ca3af', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', fontFamily: fonts.body }}>Gestionado por ONE SYSTEC</Text>
    </View>
  );
}
