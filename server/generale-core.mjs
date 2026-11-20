// Interruptor de ONESYSTEC GENERALE: pregunta cada 30 s si la app debe estar activa.
// Sin GENERALE_URL y GENERALE_KEY no hace nada, y si GENERALE no responde se mantiene el último estado conocido.
const EVERY_MS = 30_000;
let estado = { activa: true, mensaje: '', motivo: '' };
let comprobado = 0;
let enCurso = null;

async function refrescar(base, key, fetchImpl) {
  try {
    const res = await fetchImpl(base + '/api/estado', { headers: { Authorization: 'Bearer ' + key }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return; // clave mal puesta o portal caído: se mantiene el último estado
    const data = await res.json();
    // motivo: "mantenimiento", "apagada", "pago" o "acceso"
    estado = { activa: data.activa !== false, mensaje: String(data.mensaje || ''), motivo: String(data.motivo || '') };
  } catch {
    // sin conexión: se mantiene el último estado conocido
  } finally {
    comprobado = Date.now();
  }
}

export async function estadoGenerale(env = process.env, fetchImpl = fetch) {
  const base = String(env.GENERALE_URL || '').replace(/\/+$/, '');
  const key = String(env.GENERALE_KEY || '');
  if (!base || !key) return { activa: true, mensaje: '', motivo: '' };
  if (Date.now() - comprobado > EVERY_MS) {
    enCurso ??= refrescar(base, key, fetchImpl).finally(() => { enCurso = null; });
    await enCurso;
  }
  return estado;
}

// Respuesta 503 APP_SUSPENDIDA mientras GENERALE tiene la app apagada; null si está activa.
export async function respuestaSuspendida(request, env = process.env, fetchImpl = fetch) {
  const s = await estadoGenerale(env, fetchImpl);
  if (s.activa) return null;
  const origin = request.headers.get('origin');
  return Response.json({ code: 'APP_SUSPENDIDA', error: s.mensaje, mensaje: s.mensaje, motivo: s.motivo }, {
    status: 503,
    headers: { 'Cache-Control': 'no-store', 'Retry-After': '60', ...(origin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}) },
  });
}
