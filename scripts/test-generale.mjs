import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estadoGenerale, respuestaSuspendida } from '../server/generale-core.mjs';

test('sin GENERALE_URL ni GENERALE_KEY la app sigue activa y no se consulta nada', async () => {
  let llamadas = 0;
  const s = await estadoGenerale({}, async () => { llamadas++; return Response.json({}); });
  assert.deepEqual(s, { activa: true, mensaje: '', motivo: '' });
  assert.equal(llamadas, 0);
});

test('apagada en GENERALE: la API responde 503 APP_SUSPENDIDA con el motivo', async () => {
  const vistos = [];
  const fetchImpl = async (url, init) => { vistos.push([url, init.headers.Authorization]); return Response.json({ activa: false, mensaje: '', motivo: 'pago' }); };
  const env = { GENERALE_URL: 'https://generale.test/', GENERALE_KEY: 'clave' };
  const res = await respuestaSuspendida(new Request('https://one-kids.test/api/tutor'), env, fetchImpl);
  assert.equal(res.status, 503);
  assert.deepEqual(await res.json(), { code: 'APP_SUSPENDIDA', error: '', mensaje: '', motivo: 'pago' });
  assert.deepEqual(vistos[0], ['https://generale.test/api/estado', 'Bearer clave']);
  // Dentro de los 30 s no vuelve a preguntar.
  await respuestaSuspendida(new Request('https://one-kids.test/api/tutor'), env, fetchImpl);
  assert.equal(vistos.length, 1);
});
