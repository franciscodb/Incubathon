# ✅ CumplIA — Cumplimiento Regulatorio Inteligente

**Un "Buró de Crédito", pero de cumplimiento regulatorio.** Plataforma RegTech que
diagnostica, gestiona y da seguimiento al cumplimiento normativo de restaurantes,
bares y cafés en la **Ciudad de México** — con un **semáforo de cumplimiento**
(🟢🟡🟠🔴) como elemento visual central.

> MVP para el giro de **Alimentos y Bebidas (A&B) en CDMX**. Arquitectura pensada
> para escalar a otros giros, entidades y regulaciones.

---

## 🌐 En vivo

| Componente | URL |
|---|---|
| **Frontend (Vercel)** | https://buro-cumplimiento-frontend.vercel.app |
| **Backend (Railway)** | https://buro-cumplimiento-backend-production.up.railway.app · [`/docs`](https://buro-cumplimiento-backend-production.up.railway.app/docs) · [`/health`](https://buro-cumplimiento-backend-production.up.railway.app/health) |
| **Base de datos (Supabase)** | proyecto `metqqrehvusylxjignvq` — migraciones aplicadas (14 trámites, 6 profesionales, RLS y buckets) |

> **Estado actual:** ambos despliegues corren en **modo demo (mock)** y son 100% navegables.
> Para activar el **modo live** contra Supabase falta cargar 2 llaves (ver
> *"Puesta en producción con Supabase"*):
> - Frontend: variable `VITE_SUPABASE_ANON_KEY` en Vercel → `vercel env add VITE_SUPABASE_ANON_KEY production`
> - Backend: variables `SUPABASE_SERVICE_KEY` + `SUPABASE_ANON_KEY` y `USE_MOCK=false` en Railway
>
> Tras cargarlas, redeploy: `vercel deploy --prod` (frontend) y `railway up` (backend).

---

## 🆕 Novedades (v2)

- **Clasificación crediticia del cumplimiento** (`AAA`…`C`) con puntaje ponderado
  por criticidad — la analogía "Buró de Crédito" hecha visible (badge + sello).
- **Trámites como tarjetas**: vista en cuadrícula o lista (togglable), con iconos por
  categoría y **ordenamiento** (urgencia, vencimiento, nombre, categoría).
- **Suscripciones con Stripe**: página de **planes** (`/precios`) con precio **híbrido por
  volumen** + recargo por alcohol, checkout real con Stripe (o **simulado** en demo sin
  llaves), y **gate** al dar de alta negocios (tier gratuito: 1 negocio). Ver migración
  `0006_subscriptions.sql` y variables `STRIPE_*` en `backend/.env.example`.
- **Evaluación de profesionales**: se habilita solo tras **cerrar** un trabajo con el
  profesional (conexión negocio↔profesional vía `contact_requests`). Ver migración
  `0007_reviews.sql`. Los pagos negocio↔profesional **no pasan por la plataforma**.
- **Documentación**: subida por trámite + **visualización** de documentos con vigencias.
- **Legal**: páginas de **Aviso de Privacidad** (`/privacidad`) y **Términos** (`/terminos`).
- **PWA / mobile-first**: `manifest.webmanifest`, service worker offline, iconos y botón
  "Instalar app".

> ⚠️ Para **modo live**: aplica las migraciones nuevas `0006` y `0007` en Supabase y
> configura `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` (webhook a
> `POST /billing/webhook`). Sin ellas, el billing degrada de forma segura (plan gratuito).

---

## ✨ Qué incluye

**7 pantallas** (todas funcionales):

1. **Landing** — problema en números, propuesta de valor y CTA de registro/login.
2. **Datos Generales del negocio** — cuestionario que clasifica el negocio y, con un
   **motor de reglas determinístico**, genera automáticamente los trámites aplicables.
3. **Dashboard "Trámites por negocio"** — matriz de cumplimiento con semáforo, estatus,
   vigencias y vencimientos, con **selector/tabs por negocio** (un usuario, varios negocios).
4. **Trámite individual** — guía paso a paso (más clara que los portales oficiales), estatus,
   vigencia y **CTA al marketplace** de profesionales de ese trámite.
5. **Marketplace de profesionales** — búsqueda/filtro por especialidad o trámite, con
   distintivo de **verificado**.
6. **Perfil de profesional (registro)** — el profesional se registra, define especialidades
   y sube certificaciones (Supabase Storage).
7. **Perfil de usuario por negocios** — administración de documentación de trámites de varios
   negocios, con carga de documentos y fechas de vigencia.

**Además:** autenticación con roles (`business_owner` / `professional`), motor de reglas,
catálogo realista de **14 trámites CDMX A&B** con guías paso a paso, y migraciones SQL
versionadas con RLS.

---

## 🧱 Arquitectura

| Capa | Stack | Deploy |
|---|---|---|
| **Frontend** | React + Vite + TypeScript + Tailwind CSS | **Vercel** |
| **Backend** | FastAPI (Python 3.11+) + Pydantic v2 | **Railway** |
| **Base de datos / Auth / Storage** | Supabase (PostgreSQL) | **Supabase** |

```
Incubathon/
├── frontend/            # React + Vite + TS + Tailwind (Vercel)
│   ├── src/
│   │   ├── pages/       # Las 7 pantallas + login/registro
│   │   ├── components/  # UI kit, semáforo, layout, iconos
│   │   ├── context/     # Auth y Toasts
│   │   ├── lib/         # db (mock/live), reglas, supabase, tipos, formato
│   │   └── data/        # catálogo + seed de profesionales
│   ├── .env.example
│   └── vercel.json
├── backend/             # FastAPI (Railway)
│   ├── app/
│   │   ├── routers/     # auth, businesses, procedures, professionals, documents, contact
│   │   ├── rules_engine.py
│   │   ├── mock_store.py
│   │   └── data/catalog.json
│   ├── Dockerfile · Procfile · railway.json
│   └── .env.example
├── supabase/
│   ├── migrations/      # 0001 schema · 0002 RLS · 0003 seed catálogo · 0004 profesionales · 0005 storage
│   └── config.toml
├── shared/              # Fuente de verdad: catalog.json + rules.md
└── PROYECTO_BURO_CUMPLIMIENTO.md
```

---

## 🚀 Demo en 60 segundos (SIN llaves de Supabase)

El proyecto funciona **end-to-end en modo demo (mock)** con datos de ejemplo, ideal para
presentar en el hackathon sin configurar nada.

### Frontend (suficiente para la demo completa)

```bash
cd frontend
npm install
npm run dev
```

Abre **http://localhost:5173**. En el login usa **"Entrar como negocio demo"** o:

| Rol | Correo | Contraseña |
|---|---|---|
| Dueño de negocio | `demo@buro.mx` | `demo1234` |
| Profesional | `pro@buro.mx` | `demo1234` |

> En modo demo los datos se guardan en `localStorage` del navegador. El frontend **no
> necesita el backend** para la demo: incluye el mismo motor de reglas y catálogo.

### Backend (opcional para la demo, obligatorio para producción)

```bash
cd backend
python -m venv .venv
# Windows:  .venv\Scripts\activate
# Linux/Mac: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Abre **http://localhost:8000/docs** (Swagger). Sin llaves, arranca en `mode: mock`
(verifícalo en `GET /health`).

---

## 🔑 Puesta en producción con Supabase

### 1) Crea el proyecto y obtén las llaves

En [supabase.com](https://supabase.com) crea un proyecto y copia de **Project Settings → API**:

- `Project URL` → `SUPABASE_URL` / `VITE_SUPABASE_URL`
- `anon public` → `VITE_SUPABASE_ANON_KEY` (frontend)
- `service_role` → `SUPABASE_SERVICE_KEY` (backend, **secreto**, nunca en el frontend)

> En **Authentication → Providers → Email**, desactiva "Confirm email" para poder
> registrar e iniciar sesión de inmediato durante el hackathon.

### 2) Aplica las migraciones

**Opción A — Supabase CLI (recomendada):**

```bash
# instala el CLI: https://supabase.com/docs/guides/cli
supabase link --project-ref <TU_PROJECT_REF>
supabase db push        # aplica supabase/migrations/*.sql en orden
```

**Opción B — SQL Editor (sin CLI):**

En el **SQL Editor** de Supabase, ejecuta en orden el contenido de:

1. `supabase/migrations/0001_schema.sql`  (tablas, tipos, triggers)
2. `supabase/migrations/0002_rls.sql`  (Row Level Security)
3. `supabase/migrations/0003_seed_catalog.sql`  (catálogo de 14 trámites)
4. `supabase/migrations/0004_seed_professionals.sql`  (profesionales demo)
5. `supabase/migrations/0005_storage.sql`  (buckets `documents` y `certifications`)

### 3) Configura las variables de entorno

**Frontend** — copia `frontend/.env.example` → `frontend/.env`:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
VITE_API_URL=http://localhost:8000
VITE_USE_MOCK=false
```

**Backend** — copia `backend/.env.example` → `backend/.env`:

```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOi...      # service_role, SECRETO
SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_BUCKET=documents
FRONTEND_ORIGIN=http://localhost:5173
USE_MOCK=false
```

En cuanto `SUPABASE_URL` tenga valor (y `USE_MOCK=false`), tanto frontend como backend
cambian automáticamente a **modo live** contra Supabase.

---

## ☁️ Despliegue

### Frontend → Vercel

1. Importa el repo en Vercel y selecciona **`frontend/`** como *Root Directory*.
2. Framework: **Vite** (autodetectado; `vercel.json` ya incluye el rewrite SPA).
3. Variables de entorno: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`
   (URL pública del backend en Railway), `VITE_USE_MOCK=false`.
4. Build: `npm run build` · Output: `dist/`.

### Backend → Railway

1. Nuevo proyecto en Railway → *Deploy from repo* → **`backend/`** como raíz.
2. Railway usa el **`Dockerfile`** (ver `railway.json`; healthcheck en `/health`).
   Alternativamente, el `Procfile` (`web: uvicorn app.main:app --host 0.0.0.0 --port $PORT`).
3. Variables: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_ANON_KEY`,
   `FRONTEND_ORIGIN` (dominio de Vercel), `USE_MOCK=false`.

### Base de datos → Supabase

Ya queda lista tras aplicar las migraciones (paso anterior).

---

## 🧠 Motor de reglas (determinístico y extensible)

El corazón del producto. Transforma las respuestas del formulario en la lista de trámites
aplicables. Fuente de verdad en **[`shared/rules.md`](shared/rules.md)**, implementado de
forma idéntica en:

- `backend/app/rules_engine.py` (Python)
- `frontend/src/lib/rules.ts` (TypeScript, modo demo)

Ejemplos de reglas: *vende alcohol → Permiso de alcohol + reclasificación a impacto vecinal*;
*aforo ≥ 50 o superficie ≥ 100 m² → Visto Bueno de Seguridad y Operación*; *usa gas →
Dictamen de gas L.P.*; *terraza → Autorización de enseres*; etc. El **semáforo** se deriva
del estatus, la criticidad del trámite y la fecha de vencimiento.

El **catálogo de trámites** ([`shared/catalog.json`](shared/catalog.json)) incluye 14 trámites
CDMX A&B (Aviso de Apertura, Uso de Suelo, Aviso Sanitario COFEPRIS, Programa Interno de
Protección Civil, Visto Bueno de Seguridad y Operación, Permiso de alcohol, Dictamen de gas,
Autorización de enseres/terraza, Licencia de anuncios, Plan de manejo de residuos, Registro
SACMEX, Constancia de ruido, RFC/SAT, Registro patronal IMSS), cada uno con autoridad,
vigencia, costo/tiempo estimado y **guía paso a paso**.

> Para agregar un trámite: edítalo en `shared/catalog.json`, cópialo a
> `frontend/src/data/catalog.json` y `backend/app/data/catalog.json`, añádelo al seed SQL
> (`0003`) y, si aplica, agrega su regla en `rules.md` + las dos implementaciones.

---

## 🗄️ Modelo de datos

`profiles` (rol) · `businesses` (datos + clasificación) · `procedures_catalog` ·
`business_procedures` (estatus, vigencia, vencimiento) · `documents` · `professionals` ·
`professional_certifications` · `contact_requests`. Con **RLS** por usuario y buckets de
Storage (`documents`, `certifications`).

---

## 🧪 Verificación

- **Backend:** smoke test end-to-end con `TestClient` (health, catálogo, auth demo, negocios,
  profesionales, clasificación, semáforo, documentos, contacto) — ✅.
- **Frontend:** `npm run build` (type-check estricto + build de producción con Vite) — ✅.

## 📄 Scripts útiles

| Comando | Carpeta | Descripción |
|---|---|---|
| `npm run dev` | `frontend` | Servidor de desarrollo (5173) |
| `npm run build` | `frontend` | Type-check + build de producción |
| `uvicorn app.main:app --reload` | `backend` | API local (8000) |

---

Hecho para el hackathon **Incubathon** · MVP CDMX · © 2026
