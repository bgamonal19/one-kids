import { provisionChild } from '../server/child-access.mjs';
import { AccountError, bearerToken, deleteAccount } from '../server/account-core.mjs';
import { allowedOrigin, json, OriginError, preflight } from '../server/http.mjs';

export function OPTIONS(request) { return preflight(request, 'POST, DELETE, OPTIONS'); }
export async function DELETE(request) {
  let origin;
  try {
    origin = allowedOrigin(request);
    return json(await deleteAccount(bearerToken(request), process.env), 200, origin);
  } catch (error) {
    if (error instanceof AccountError) return json({ error: error.message }, error.status, origin);
    if (error instanceof OriginError) return json({ error: error.message }, 403);
    return json({ error: 'No se pudo eliminar la cuenta.' }, 500, origin);
  }
}

export async function POST(request) {
  let origin;
  try {
    origin = allowedOrigin(request);
    const text = await request.text();
    if (text.length > 2048) throw new AccountError('Solicitud demasiado grande.', 413);
    let body;
    try { body = JSON.parse(text); } catch { throw new AccountError('Solicitud no válida.'); }
    return json(await provisionChild(bearerToken(request), body, process.env), 200, origin);
  } catch (error) {
    if (error instanceof AccountError) return json({ error: error.message }, error.status, origin);
    if (error instanceof OriginError) return json({ error: error.message }, 403);
    return json({ error: 'No se pudo guardar el acceso infantil.' }, 500, origin);
  }
}
