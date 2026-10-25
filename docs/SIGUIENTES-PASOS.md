# Siguientes pasos: correo, cuentas, seguridad y teléfonos

Todo el código está listo. Esta guía reúne lo que solo puede hacer el dueño de las cuentas (Supabase, Vercel, Expo). Las claves secretas nunca se suben a GitHub ni se comparten por chat.

## 1. Correo de confirmación y recuperación (SMTP)

El correo predeterminado de Supabase solo llega a miembros del proyecto y tiene un límite muy bajo. Para familias reales hace falta un proveedor propio.

1. Crea una cuenta en un proveedor de correo transaccional (por ejemplo Resend, Brevo o Postmark) y verifica tu dominio. Si no tienes dominio, muchos permiten empezar con uno de prueba, pero solo envían a tu propio correo.
2. En el proveedor, copia los datos SMTP: host, puerto (465 o 587), usuario y contraseña o clave API.
3. Supabase → proyecto **one-kids** → *Authentication* → *Emails* → *SMTP Settings* → **Enable custom SMTP**:
   - Sender email: `no-responder@tu-dominio.com`
   - Sender name: `ONE KIDS`
   - Host, Port, Username y Password del proveedor
4. *Authentication* → *Rate Limits*: sube «emails per hour» (por ejemplo a 30) una vez activado el SMTP.
5. Opcional: *Authentication* → *Emails* → *Templates*. Traduce al español «Confirm signup» y «Reset password».

## 2. Permitir el enlace de recuperar clave

Supabase → *Authentication* → *URL Configuration* → *Redirect URLs* → añade:

```
https://one-kids.vercel.app/reset-password
```

Sin esto, el enlace del correo no vuelve a la app. El enlace se abre en la web, también si la cuenta se usa en el teléfono.

## 3. Activar «Eliminar mi cuenta»

1. Supabase → *Project Settings* → *API Keys* → **Secret keys** → crea o copia una (empieza por `sb_secret_`).
2. Vercel → proyecto **one-kids** → *Settings* → *Environment Variables* → Production, marcada como *Sensitive*:
   - `SUPABASE_SECRET_KEY` = esa clave
3. Vuelve a desplegar.

Sin esta variable, el botón muestra que la eliminación todavía no está activada y no borra nada. Al eliminar la cuenta, Supabase borra también los perfiles, tareas y agenda de la familia.

## 4. Proteger el tutor IA (recomendado antes de invitar familias)

En Vercel (Production):

| Variable | Valor | Efecto |
|---|---|---|
| `TUTOR_REQUIRE_ACCOUNT` | `true` | Solo las cuentas con sesión iniciada usan la IA. La demo sigue con el «Modo práctica». |
| `TUTOR_REQUESTS_PER_MINUTE` | `15` (por defecto) | Límite de consultas por minuto de cada familia. |

Mantén también el tope de gasto mensual en OpenAI y Anthropic, porque el límite por minuto se aplica por instancia y no es una cuota diaria.

Comprueba en `https://one-kids.vercel.app/api/tutor` que aparece `"accountRequired":true`.

## 5. Builds para teléfonos (EAS)

`eas.json` ya tiene dos perfiles:

- `preview`: APK de Android para instalar directamente y builds internas de iOS.
- `production`: builds para las tiendas.

Los identificadores son `com.bgamonal19.onekids` en Android y en iOS. Puedes cambiarlos en `app.json` antes de la primera publicación en las tiendas; después ya no se pueden cambiar.

Desde tu computadora, en la carpeta del proyecto:

```sh
npm install
npx eas-cli@latest login
npx eas-cli@latest init          # crea el proyecto en expo.dev y guarda su ID en app.json
npx eas-cli@latest env:create --name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY --value sb_publishable_... --environment preview --environment production --visibility plaintext
npx eas-cli@latest build -p android --profile preview
```

Cuando termine, EAS te da un enlace y un código QR para instalar el APK en Android. Para iOS (`-p ios`) hace falta una cuenta de Apple Developer.

La URL de Supabase y la del tutor ya están en `eas.json`. La clave publicable de Supabase no es secreta, pero se configura en EAS para no repetirla en el repositorio.

## Comprobación

```sh
npm run check            # typecheck, lint y pruebas
npx expo export -p web   # build web
```
