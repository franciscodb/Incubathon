# CumplIA API (backend)

Backend FastAPI de **CumplIA** (cumplimiento regulatorio) para negocios de
Alimentos y Bebidas (A&B) de la Ciudad de México. Incluye el **motor de reglas
determinístico** que transforma los datos del negocio en una matriz de trámites
con semáforo de cumplimiento, y un **marketplace de profesionales**.

Corre en dos modos:

- **mock** (por defecto): almacén en memoria sembrado con datos demo. No
  requiere Supabase — ideal para demostrar la app end-to-end.
- **live**: usa Supabase (Postgres + Auth + Storage).

## Requisitos

- Python 3.11+

## Correr en local

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate    |  Linux/Mac: source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env        # opcional; por defecto arranca en modo mock
uvicorn app.main:app --reload --port 8000
```

- Documentación interactiva: <http://localhost:8000/docs>
- Healthcheck: <http://localhost:8000/health> → `{"status":"ok","mode":"mock"}`

En **modo mock** la autenticación devuelve un token ficticio y todos los
endpoints resuelven al usuario demo (`demo@buro.mx`), que ya tiene 2 negocios
sembrados (un restaurante con alcohol y una cafetería) con sus trámites.

## Variables de entorno

| Variable | Descripción | Default |
|---|---|---|
| `SUPABASE_URL` | URL del proyecto Supabase. Vacío ⇒ modo mock. | `""` |
| `SUPABASE_SERVICE_KEY` | Service role key (backend de confianza). | `""` |
| `SUPABASE_ANON_KEY` | Anon key. | `""` |
| `SUPABASE_BUCKET` | Bucket de Storage para documentos. | `documents` |
| `FRONTEND_ORIGIN` | Origen(es) permitido(s) por CORS (coma-separados). | `*` |
| `USE_MOCK` | Fuerza el modo mock aunque haya credenciales. | `true` |

El modo se resuelve así: es **mock** si `SUPABASE_URL` está vacío **o**
`USE_MOCK=true`; de lo contrario es **live**.

## Endpoints principales

- `GET /health`, `GET /` — estado y bienvenida.
- **Auth**: `POST /auth/register`, `POST /auth/login`, `GET /auth/me`.
- **Negocios**: `GET/POST /businesses`, `GET/PATCH/PUT /businesses/{id}`.
- **Trámites**:
  - `GET /procedures/catalog`, `GET /procedures/catalog/{code}`
  - `GET /businesses/{id}/procedures` (matriz con semáforo)
  - `PATCH /businesses/{business_id}/procedures/{code}`
- **Profesionales**: `GET /professionals` (`?especialidad=&procedure_code=&verified=`),
  `GET /professionals/{id}`, `POST /professionals`,
  `POST /professionals/{id}/certifications`.
- **Documentos**: `GET/POST /businesses/{id}/documents`, `POST /storage/sign`.
- **Contacto**: `GET/POST /contact-requests`.

## Motor de reglas

Implementado en `app/rules_engine.py` siguiendo `shared/rules.md`:

- `classify(business)` → `nivel_impacto` (`bajo` | `vecinal` | `zonal`).
- `applicable_procedure_codes(business)` → trámites aplicables.
- `generate_business_procedures(business)` → business_procedures iniciales.
- `semaphore_for(status, criticality, fecha_vencimiento)` → color del semáforo.
- `business_summary(procedures)` → color global + `cumplimiento_pct` + conteos.

El catálogo de trámites vive empaquetado en `app/data/catalog.json` (copia de
`shared/catalog.json`).

## Deploy en Railway

El repo incluye `Dockerfile`, `Procfile` y `railway.json`.

1. Crea un proyecto en Railway y conecta el repositorio (raíz = `backend/`).
2. Railway detecta el `Dockerfile` (configurado en `railway.json`).
3. Define las variables de entorno (para modo live: `SUPABASE_URL`,
   `SUPABASE_SERVICE_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_BUCKET`,
   `FRONTEND_ORIGIN`, `USE_MOCK=false`).
4. El healthcheck apunta a `/health`. Railway inyecta `PORT` automáticamente.

Para una demo rápida sin base de datos, deja `USE_MOCK=true` (o sin
`SUPABASE_URL`).

## Estructura

```
backend/
  app/
    main.py            # FastAPI + CORS + routers
    config.py          # Settings (pydantic-settings) + use_mock
    supabase_client.py # Cliente Supabase o None (mock)
    schemas.py         # Modelos Pydantic v2 + enums
    rules_engine.py    # Motor de reglas determinístico
    deps.py            # get_current_user + get_mock_store
    mock_store.py      # Almacén en memoria sembrado
    data/catalog.json  # Catálogo empaquetado
    routers/           # auth, businesses, procedures, professionals, documents, contact
  requirements.txt
  Dockerfile
  Procfile
  railway.json
  .env.example
```
