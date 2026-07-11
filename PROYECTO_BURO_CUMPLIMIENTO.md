# CumplIA — Cumplimiento Regulatorio de los Negocios en México (RegTech)

## 1. Contexto y visión
Plataforma RegTech que funciona como el "sistema operativo del cumplimiento
normativo" de los negocios en México. Diagnostica obligaciones, genera una
matriz personalizada de cumplimiento, administra documentos, alerta sobre
vencimientos, identifica riesgos y conecta al empresario con profesionales
verificados. Analogía central: **"un Buró de Crédito, pero de cumplimiento
regulatorio"**.

**MVP (primera iteración):** restaurantes, cafeterías, bares y establecimientos
de alimentos y bebidas de la **Ciudad de México**. Arquitectura pensada para
escalar a nuevos giros, regulaciones y entidades federativas.

**Principio de producto:** el activo central es el *motor de reglas
regulatorias* que transforma las características de cada negocio en obligaciones
concretas, trazables, actualizables y verificables. La interfaz es la capa que
lo hace usable — más clara que los portales oficiales de CDMX (ej. Llave CDMX).

## 2. Problema (datos para el pitch)
- +6 millones de establecimientos en México (DENUE / Censos Económicos 2024).
- Sector de alimentos y bebidas creciendo ~3.3% anual (INEGI).
- +2,500 establecimientos regularizados por el INVEA en CDMX durante 2025.
- ~10,000 quejas ciudadanas recibidas por el INVEA en 2025.
- Alerta pública del INVEA (junio 2025) por operar sin documentación.
- Casos documentados de clausuras/suspensiones por falta de permisos y de
  Programa Interno de Protección Civil.

Los requisitos varían según: ubicación, giro, superficie, aforo, número de
trabajadores, venta de alcohol, uso de gas, instalaciones, residuos, ruido,
anuncios, terrazas y características del inmueble.

## 3. Las 5 preguntas que el sistema debe responder por negocio
1. ¿Qué obligaciones debe cumplir este negocio?
2. ¿Qué documentos tiene actualmente?
3. ¿Qué documentos le faltan o están próximos a vencer?
4. ¿Cuál es su nivel de riesgo regulatorio?
5. ¿Qué debe hacer para alcanzar y mantener el cumplimiento?

## 4. Semáforo de cumplimiento
- 🟢 Verde: cumplimiento adecuado.
- 🟡 Amarillo: documentos próximos a vencer / acciones preventivas.
- 🟠 Naranja: trámites pendientes o riesgos relevantes.
- 🔴 Rojo: incumplimientos graves o alto riesgo.

## 5. Pantallas requeridas (alcance de esta iteración)
1. **Formulario de Datos Generales del negocio** — cuestionario inteligente que
   captura las variables (giro, ubicación, superficie, aforo, alcohol, gas,
   trabajadores, terraza, anuncios, etc.) y clasifica el negocio.
2. **Trámites por negocio (Dashboard/Matriz de cumplimiento)** — lista de
   trámites requeridos según la clasificación, con estatus (semáforo),
   seguimiento, vigencias y fechas de vencimiento, **organizado por negocio**.
3. **Trámite individual** — explica cómo realizar el trámite paso a paso, mucho
   más claro que las páginas oficiales de CDMX (Llave), con enlace/CTA al
   marketplace de profesionales.
4. **Marketplace de profesionales (listado)** — buscar y contactar profesionales
   verificados (abogados, arquitectos, DRO, ingenieros, protección civil,
   unidades de inspección, laboratorios) por especialidad/trámite.
5. **Perfil de profesional (registro)** — el profesional se registra y sube sus
   certificaciones y documentos que lo avalan.
6. **Perfil de usuario seccionado por negocios** — un usuario administra la
   documentación de trámites de varios negocios, todo organizado por negocio.
7. **Landing page** — captación de clientes potenciales (problema en números,
   propuesta de valor, CTA de registro).

## 6. Arquitectura técnica (obligatoria)
- **Frontend:** React (Vite + TypeScript). Deploy en **Vercel**.
- **Backend:** **FastAPI** (Python). Deploy en **Railway**.
- **Base de datos:** **Supabase** (PostgreSQL + Auth + Storage).
- Auth con Supabase Auth. Storage de Supabase para documentos/certificaciones.
- Migraciones SQL versionadas en `/supabase/migrations` listas para ejecutar.

## 7. Modelo de datos (mínimo sugerido)
- `users` (dueños de negocio y profesionales; rol).
- `businesses` (datos generales + clasificación; pertenece a un user).
- `procedures_catalog` (catálogo de trámites CDMX A&B, con guía de pasos).
- `business_procedures` (trámite aplicado a un negocio: estatus, vigencia,
  fecha de vencimiento, documento asociado).
- `documents` (archivos en Storage, con fecha de emisión/vencimiento).
- `professionals` (perfil, especialidades, verificado sí/no).
- `professional_certifications` (archivos/credenciales del profesional).
- `contact_requests` (usuario ↔ profesional).

## 8. Fuera de alcance de esta iteración (roadmap)
- IA para análisis documental (OCR de vigencias, inconsistencias) y motor de
  reglas complejo — dejar interfaces/campos preparados pero con reglas
  determinísticas simples por ahora.
- Pagos in-app / expansión a otros giros y estados.