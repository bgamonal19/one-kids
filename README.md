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

## Backend opcional (Supabase + OpenAI)

Sin claves, todo corre en local (tutor simulado).

1. Ejecuta [`supabase/schema.sql`](supabase/schema.sql)
2. Copia [`.env.example`](.env.example) → `.env`
3. `supabase functions deploy tutor-help` + `supabase secrets set OPENAI_API_KEY=...`
