// Estado del interruptor de ONESYSTEC GENERALE, para el aviso de pantalla completa. Nunca expone la clave.
import { estadoGenerale } from '../server/generale-core.mjs';

export async function GET(request) {
  const origin = request.headers.get('origin');
  return Response.json(await estadoGenerale(), { headers: { 'Cache-Control': 'no-store', ...(origin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}) } });
}
