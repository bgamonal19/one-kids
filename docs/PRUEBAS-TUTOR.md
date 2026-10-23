# Tutor: revisión y pruebas del 23 de octubre de 2026

## Implementado

- Backend web `/api/tutor` en Vercel con OpenAI Responses y Anthropic Messages. Adaptador opcional de Supabase con el mismo contrato.
- Selección automática o explícita de proveedor. El modo automático intenta el otro proveedor configurado si falla el primero; la selección explícita no cambia de proveedor.
- Claves y reglas del tutor únicamente en servidor. El nombre del niño permanece en el dispositivo. Sin almacenamiento de fotos ni conversaciones en nuestra base de datos; los proveedores tienen sus propias políticas de tratamiento. OpenAI se llama con `store: false`.
- Cámara y galería separadas (vista de cámara web y captura nativa del sistema); foto JPEG reducida a un máximo de 1800 px en el lado largo antes de enviar; límite de tamaño. Manejo de permisos, cancelación y errores.
- Lectura multimodal de letra manuscrita: el modelo devuelve una transcripción. Los símbolos dudosos se marcan con `[?]`. El niño corrige y confirma el texto; solo después comienza la explicación. Una foto ilegible pide repetir o completar el texto. No se promete exactitud OCR.
- Historial y enunciado confirmado conservados para las consultas siguientes; la foto no se reenvía en cada paso.
- Escuchar/detener cada explicación en español con la voz del dispositivo. Se detiene al salir de la pantalla; no hay reproducción automática. La voz disponible depende del navegador/sistema.
- Continuar tras «Ya entendí», explicar el mismo paso con palabras más sencillas, otro ejemplo y pista. El botón expresa la decisión del alumno, no verifica aprendizaje.
- Sin claves: estado «Modo práctica», sumas y restas locales limitadas y claramente etiquetadas. Nunca se simula que se leyó una foto. Los errores de red/proveedor se muestran y la consulta puede reintentarse.
- Corregidos los tres errores de lint anteriores: flujo de PIN mediante eventos, hidratación del hook de cliente y apóstrofo del componente de ejemplo.

## Activación privada pendiente

El usuario indicó que tiene ambas cuentas, pero configurará las claves después.
En Vercel → proyecto `gamonal-trasporti/one-kids` → Settings → Environment Variables → **Production**:

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- Opcionales: `OPENAI_MODEL`, `ANTHROPIC_MODEL`, `TUTOR_DEFAULT_PROVIDER`.

Nunca usar `EXPO_PUBLIC_` en claves privadas. Volver a desplegar después de guardarlas. Los modelos predeterminados son `gpt-4.1-mini` y `claude-sonnet-5-5`; se pueden cambiar por modelos de visión disponibles en cada cuenta.
Para aplicaciones nativas, configurar `EXPO_PUBLIC_TUTOR_API_URL=https://one-kids.vercel.app/api/tutor` y generar una nueva build compatible con los módulos Expo instalados. El adaptador Supabase es alternativo y debe desplegarse aparte si se utiliza.

## Comprobación reproducible

```sh
node --test scripts/test-tutor.mjs
npx tsc --noEmit
npx expo lint
npx expo export -p web
node scripts/preview-tutor.mjs
```

18 pruebas automatizadas de contrato/control de errores: formatos de visión de ambos proveedores, transcripción dudosa/ilegible, contexto, reglas fijas de servidor, límites, CORS, credenciales ausentes, fallback y cliente honesto sin IA.

Navegador local: envío de `8 + 3`, continuar, explicación más fácil, otro ejemplo y control de reproducción. El flujo de foto → transcripción `8 + [?]` → corregir → confirmar → explicación se prueba con proveedores simulados en un servidor local aislado:

```sh
PORT=8103 TUTOR_TEST_FIXTURES=1 node scripts/preview-tutor.mjs
```

Ese modo solo existe en el script de pruebas y nunca en la función desplegada. No valida reconocimiento real de escritura ni acceso de la cuenta a los modelos.

## Pruebas pendientes con claves y dispositivos

1. Con cada proveedor: foto nítida de un ejercicio manuscrito, revisión y corrección, confirmación y primer paso. Repetir con foto borrosa y caracteres ambiguos.
2. Pulsar «Ya entendí» varias veces: solo un paso cada vez. «Más fácil» y «Otro ejemplo» deben seguir el mismo concepto.
3. Audio en Chrome/Safari y teléfono: español, volumen, detener y salir de la pantalla durante la reproducción.
4. Captura física de cámara iOS/Android, permisos denegados, cancelación y foto grande.
5. Revisar resultados según edades 4–6, 7–9, 10–12 y 13–16 con supervisión adulta.

La publicación permite pruebas acompañadas de la interfaz. El acceso del tutor web tiene protección básica por origen y ráfagas por instancia, no autenticación familiar ni cuotas duraderas. Antes de abrir pruebas de IA a una audiencia amplia hay que completar esas medidas y establecer presupuestos en los proveedores. El registro y PIN de la demo siguen siendo locales; no equivalen a autenticación del backend.
