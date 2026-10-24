# Cuentas familiares de ONE KIDS

Proyecto Supabase: `one-kids` (`ontnagfkouolwtkqomsi`), organización bgamonal19's Org.

- Registro de adulto con nombre, correo y clave de 6–12 dígitos (se conservan ceros iniciales).
- Supabase Auth gestiona contraseña y sesión. No se guarda la contraseña en el perfil familiar.
- Confirmación por correo antes de entrar cuando el proveedor la exige.
- PIN parental de cuatro dígitos independiente de la contraseña.
- Varios perfiles infantiles por familia, cada uno con tareas, cursos, agenda, enfoque, compañero y estrellas independientes. «Mis hijos» en Padres permite agregar y cambiar el perfil activo. El perfil único anterior se conserva automáticamente.
- «Cerrar sesión» permanece visible en la franja superior y en Padres.
- Perfiles infantiles, tareas, cursos, agenda y estrellas en `public.family_states`, con permisos por UID autenticado.
- Demo separada y explícitamente local. Los datos del prototipo anterior se conservan como demo, eliminando la contraseña antigua; no se convierten en cuentas reales automáticamente.
- Los cambios se guardan al editar. En otro dispositivo: iniciar sesión y usar «Actualizar desde mi cuenta» en Padres o volver a entrar. No hay sincronización en tiempo real; si dos dispositivos editan a la vez prevalece el último guardado del perfil completo.
- Un fallo muestra guardado pendiente y ofrece reintentar. Se conserva una copia por usuario en ese equipo.

## Configuración del proyecto

1. Configurado y verificado en Authentication → URL Configuration: Site URL `https://one-kids.vercel.app` y redirect permitido `https://one-kids.vercel.app/login`.
2. Authentication → Email/SMTP: configurar proveedor propio para enviar confirmaciones a usuarios externos. El correo predeterminado de Supabase suele limitarse a miembros del proyecto.
3. Verificado en el panel: confirmación de correo activada; contraseña mínima de seis caracteres, sin exigencia de letras/símbolos. No se redujeron protecciones existentes.
4. Registrar un correo controlado, confirmar y probar en dos navegadores/dispositivos. La validación del correo no se sustituye por una cuenta ficticia.

## Validación

`node --test scripts/test-account-validation.mjs scripts/test-cloud-accounts.mjs scripts/test-tutor.mjs`

También ejecutar `npx tsc --noEmit`, `npx expo lint` y `npx expo export -p web`.

Se probaron políticas reales de base de datos con usuarios transaccionales descartados: una familia lee y modifica su fila, no ve la otra ni puede reasignar su propietario. El asesor de seguridad de Supabase no devolvió incidencias tras la migración.

Pendiente: recorrido completo con correo real, recepción de confirmación y dos dispositivos, además de recuperación de contraseña y eliminación de cuenta antes de un lanzamiento general.
