# Activar el tutor IA (paso 1)

El código ya está listo. Solo hay que crear las claves y pegarlas en Vercel. Las claves nunca se suben a GitHub ni se comparten por chat.

## 1. Crear las claves y poner un límite de gasto

| Proveedor | Dónde | Límite de gasto |
|---|---|---|
| OpenAI | platform.openai.com/api-keys → *Create new secret key* | *Settings → Limits*: añade saldo y un tope mensual |
| Anthropic | console.anthropic.com → *API Keys* → *Create Key* | *Settings → Limits*: añade saldo y un tope mensual |

Basta con una. Con las dos, el modo automático usa la segunda si la primera falla.

El endpoint `/api/tutor` todavía no exige sesión de usuario. El tope de gasto del proveedor es la protección real contra abusos.

## 2. Pegarlas en Vercel

Proyecto **one-kids** → *Settings* → *Environment Variables*. Entorno **Production** y opción *Sensitive*:

| Nombre | Valor | ¿Obligatoria? |
|---|---|---|
| `OPENAI_API_KEY` | `sk-...` | Una de las dos |
| `ANTHROPIC_API_KEY` | `sk-ant-...` | Una de las dos |
| `TUTOR_DEFAULT_PROVIDER` | `openai` o `anthropic` | No |
| `OPENAI_MODEL` | por defecto `gpt-4.1-mini` | No |
| `ANTHROPIC_MODEL` | por defecto `claude-sonnet-5-5` | No |
| `TUTOR_DISABLED` | `true` para apagar la IA sin borrar las claves | No |

No uses el prefijo `EXPO_PUBLIC_` en ninguna clave. Los espacios o saltos de línea que se cuelen al pegar se eliminan solos.

Comprueba también que existan `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Supabase → *Project Settings → API Keys*). Sin ellas, la web solo permite la demo local.

## 3. Volver a desplegar

*Deployments* → último despliegue → **⋯** → *Redeploy*. Las variables solo se aplican en un despliegue nuevo.

## 4. Comprobar

Abre `https://one-kids.vercel.app/api/tutor`. Debe mostrar:

```json
{"configured":true,"providers":["openai","anthropic"],"vision":true}
```

- `"configured":false`: la variable no está en Production, tiene otro nombre o falta el redeploy.
- Aparece un solo proveedor: la otra clave falta o está vacía.

Después, en la app: Tutor → foto de un ejercicio escrito a mano → revisar la transcripción → confirmar → primer paso. Si responde «El tutor no pudo responder», revisa en el panel del proveedor que la clave tenga saldo y acceso al modelo configurado.

## Apagar la IA en una emergencia

Pon `TUTOR_DISABLED=true` y vuelve a desplegar. El tutor pasa a «Modo práctica» sin borrar las claves.
