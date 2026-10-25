# ONE KIDS

App móvil/web (Expo) para niños de 5–13 años:

- **Tutor IA** — foto o texto de la tarea, guía paso a paso
- **Mundos** — números, letras y explorador por edad
- **Modo enfoque** — bloquea juegos hasta completar tareas (PIN parental)

## Demo rápida

1. Abre la app y pulsa **Probar demo ahora**
2. PIN de padres: `1234`
3. Completa tareas → desbloquea mundos · o usa el tutor IA

## Local

```bash
npm install
npx expo start --web
```

## Deploy (Vercel)

```bash
npm run build:web
npx vercel --prod
```

O conecta el repo de GitHub en [vercel.com](https://vercel.com): build `npx expo export -p web`, output `dist`.

## GitHub

```bash
gh repo create one-kids --public --source=. --remote=origin --push
```

## Tutor con OpenAI y Anthropic

La web dispone de `/api/tutor` en Vercel. Añade las claves privadas `OPENAI_API_KEY` y `ANTHROPIC_API_KEY` en las variables de **Production** y vuelve a desplegar. No se incluyen claves en el cliente.

Sin claves, el tutor muestra «Modo práctica» y solo ofrece ejercicios locales limitados; no reconoce fotografías. Con claves, la foto se transcribe primero para que el niño revise el texto antes de recibir ayuda paso a paso.

Cada respuesta permite escucharla, continuar cuando se entiende, pedir una explicación más fácil, otro ejemplo o una pista.

Paso a paso para pegar las claves: [docs/ACTIVAR-IA.md](docs/ACTIVAR-IA.md). Correo, recuperar clave, eliminar cuenta, seguridad del tutor y builds para teléfonos: [docs/SIGUIENTES-PASOS.md](docs/SIGUIENTES-PASOS.md). Consulta también [la guía de activación y pruebas](docs/PRUEBAS-TUTOR.md) para límites, pruebas pendientes y configuración móvil. El backend Supabase es opcional; usa la misma lógica de proveedores y requiere despliegue separado.
