# MiMargen — Guía de puesta en marcha (paso a paso)

El proyecto ya viene **compilado y verificado**: motor de cálculo validado 1:1 contra el
Excel v7 (44 checks), typecheck limpio y build de producción exitoso. Si seguís estos
pasos en orden, en ~40 minutos tenés el sistema online.

**Importante**: la app funciona en 3 niveles y cada paso agrega uno sin romper el anterior.

1. Solo Vercel → la app anda en **modo demo** (sin login, datos en el navegador). Ya podés mostrarla.
2. - Supabase → login con email/contraseña + **trial de 3 días** + datos guardados en la nube.
3. - Lemon Squeezy → **cobro de la suscripción** (USD 14,99/mes) al vencer el trial.

---

## PASO 1 · Subir a GitHub (5 min)

En GitHub creá el repo nuevo (ej.: `mimargen-v2`), abrilo en **Codespaces** y:

1. Arrastrá/pegá todos los archivos de este ZIP respetando las carpetas
   (`app/`, `components/`, `lib/`, `package.json`, etc.). En Codespaces:
   click derecho en el explorador → **Upload...** y elegí el ZIP, después click
   derecho sobre el ZIP → Extract (o subí las carpetas directamente).
2. En la terminal de Codespaces:
   ```bash
   npm install
   npm run test    # debe decir: 🟢 TODOS LOS CHECKS PASARON
   npm run dev     # abrí el puerto 3000 → ves la landing y /app en modo demo
   ```
3. Commit + push:
   ```bash
   git add -A && git commit -m "MiMargen v1 — Excel v7 en la web" && git push
   ```

**NO subas nunca un archivo `.env.local` al repo.** El `.env.example` es solo la plantilla.

---

## PASO 2 · Deploy en Vercel (5 min)

1. [vercel.com](https://vercel.com) → **Add New → Project** → importá el repo `mimargen-v2`.
2. Framework: Next.js (lo detecta solo). **No cargues ninguna variable todavía.** Deploy.
3. Abrí la URL que te da (`mimargen-xxx.vercel.app`): landing OK y `/app` en modo demo.

✅ Checkpoint: ya tenés el producto navegable para mostrar. Lo que sigue es login y cobro.

---

## PASO 3 · Supabase: auth + base (15 min)

### 3.1 Proyecto y esquema
1. [supabase.com](https://supabase.com) → New project (región South America - São Paulo).
2. Menú **SQL Editor → New query** → pegá TODO el contenido de `supabase_schema.sql` → **Run**.
   Crea: `profiles` (con `trial_ends_at` = registro + 3 días), `subscriptions`, `escenarios`,
   el trigger de alta automática de perfil y las políticas RLS.

### 3.2 Las claves (acá estuvo el error de la vez pasada)
Menú **Settings → API**. Vas a ver DOS claves con el mismo aspecto (`eyJ...`):

| Clave | Dónde va | Dónde NO va |
|---|---|---|
| **anon / public** | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | — |
| **service_role / secret** | `SUPABASE_SERVICE_ROLE_KEY` (solo webhook) | ⚠ JAMÁS en una variable `NEXT_PUBLIC_*` |

El error "invalid api key" de tu intento anterior es el síntoma clásico de haber pegado
la clave equivocada, con espacios/saltos de línea, o la de otro proyecto. Copiala con el
botón de copiar del panel, no a mano.

### 3.3 Configurar el login
- **Authentication → Providers → Email**: dejá habilitado Email.
- **Confirm email**: si lo dejás ON, el usuario recibe un mail antes de poder entrar (la app
  ya contempla ese flujo). Para arrancar más simple podés ponerlo OFF: registro → entra directo.
- **Authentication → URL Configuration**: en *Site URL* poné tu dominio de Vercel
  (ej. `https://mimargen-xxx.vercel.app`), y sumalo a *Redirect URLs*.

### 3.4 Variables en Vercel
Vercel → tu proyecto → **Settings → Environment Variables** (entorno Production):

```
NEXT_PUBLIC_SUPABASE_URL      = https://TUPROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = (la anon public)
```

Guardá → **Deployments → Redeploy** (las `NEXT_PUBLIC_*` se inyectan al compilar, así que
un cambio de variable SIEMPRE necesita redeploy).

✅ Checkpoint: registrate con un email tuyo → elegís país → entrás → cargás datos → cerrás
sesión → volvés a entrar → los datos siguen ahí (tabla `escenarios`). En la barra ves
"Prueba gratis: 3 días restantes".

---

## PASO 4 · Lemon Squeezy: la suscripción (15 min)

1. En tu store de Lemon Squeezy: **Products → New product** → "MiMargen — Suscripción
   mensual" → Pricing: **Subscription, USD 14.99/mes**. (Opcional: no configures trial en
   Lemon; el trial de 3 días ya lo maneja la app antes del checkout.)
2. Copiá el **checkout link** del producto (Share → Copy link).
3. **Settings → Webhooks → Add webhook**:
   - URL: `https://TU-DOMINIO.vercel.app/api/lemon/webhook`
   - Signing secret: inventá uno largo (guardalo)
   - Eventos: `subscription_created`, `subscription_updated`, `subscription_cancelled`,
     `subscription_expired`, `subscription_resumed`
4. Variables en Vercel (Production) + Redeploy:
```
NEXT_PUBLIC_LEMON_CHECKOUT_URL = https://TUSTORE.lemonsqueezy.com/buy/XXXX
LEMONSQUEEZY_WEBHOOK_SECRET    = el secret del paso 3
SUPABASE_SERVICE_ROLE_KEY      = (la service_role de Supabase — solo acá)
```

### Cómo funciona el circuito de cobro
El botón "Suscribirme" arma la URL de checkout agregando `checkout[custom][user_id]` con el
ID del usuario logueado. Cuando paga, Lemon dispara el webhook → la app verifica la firma
HMAC → guarda/actualiza la fila en `subscriptions` → el usuario pasa a acceso `activo`.
Si cancela, el webhook actualiza el estado y al vencer vuelve al paywall.

✅ Checkpoint final: creá un usuario nuevo, esperá o editá su `trial_ends_at` en la tabla
`profiles` (desde el panel de Supabase, vos como admin sí podés) para simular el
vencimiento → recargá `/app` → aparece el paywall → pagá con el
[modo test de Lemon](tarjeta 4242 4242 4242 4242) → recargá → acceso completo.

---

## Dominio propio (opcional, 10 min)
Vercel → Settings → Domains → agregá `mimargen.app` y seguí las instrucciones de DNS.
Después actualizá la Site URL en Supabase y la URL del webhook en Lemon.

---

## Qué revisar cada vez que toques código
```bash
npm run test    # el motor sigue dando idéntico al Excel
npm run build   # compila como en Vercel
git push        # Vercel redeploya solo
```

## Problemas típicos y solución
- **"invalid api key"** → clave equivocada o con espacios. Rehacé 3.2 y redeploy.
- **Registro no crea perfil** → no corriste `supabase_schema.sql` completo (falta el trigger).
- **Pago no activa la cuenta** → mirá Lemon → Webhooks → el intento: si dio 401 el secret no
  coincide; si dio 500, falta `SUPABASE_SERVICE_ROLE_KEY` en Vercel.
- **Cambiaste una variable y no pasa nada** → redeploy (las NEXT_PUBLIC se hornean al build).
