# Motor de reglas de cumplimiento (determinístico)

Fuente de verdad de la lógica que transforma las respuestas del **Formulario de
Datos Generales** en la lista de `business_procedures` aplicables. Implementado
igual en:

- `backend/app/rules_engine.py` (Python)
- `frontend/src/data/rules.ts` (TypeScript, modo mock)

## Entradas (campos del formulario `businesses`)

| Campo | Tipo | Notas |
|---|---|---|
| `giro` | enum | `restaurante`, `cafeteria`, `bar`, `cantina`, `fonda`, `food_truck`, `otro` |
| `alcaldia` | enum | 16 alcaldías CDMX |
| `superficie_m2` | number | metros cuadrados del local |
| `aforo` | number | personas |
| `num_trabajadores` | number | empleados |
| `vende_alcohol` | bool | |
| `usa_gas` | bool | |
| `tiene_terraza` | bool | enseres en vía pública |
| `tiene_anuncios` | bool | |
| `genera_residuos_especiales` | bool | grasas/aceites |
| `nivel_ruido` | enum | `bajo`, `medio`, `alto` |
| `inmueble` | enum | `propio`, `rentado` |
| `realiza_construccion` | bool | obra/adecuación |

## Reglas de aplicabilidad

Base (SIEMPRE aplican a A&B):
- `RFC_SAT`
- `AVISO_APERTURA`
- `USO_SUELO`
- `AVISO_SANITARIO_COFEPRIS`
- `SACMEX_DESCARGAS`
- `PROTECCION_CIVIL_PIPC`

Condicionales:
- `IMSS_PATRONAL` &rarr; si `num_trabajadores > 0`
- `PERMISO_ALCOHOL` &rarr; si `vende_alcohol`
- `DICTAMEN_GAS` &rarr; si `usa_gas`
- `AUTORIZACION_ENSERES` &rarr; si `tiene_terraza`
- `LICENCIA_ANUNCIOS` &rarr; si `tiene_anuncios`
- `VBSO` &rarr; si `aforo >= 50` OR `superficie_m2 >= 100`
- `PLAN_MANEJO_RESIDUOS` &rarr; si `genera_residuos_especiales` OR `giro in (restaurante, bar, cantina)`
- `ESTUDIO_RUIDO` &rarr; si `nivel_ruido == 'alto'` OR (`vende_alcohol` AND `nivel_ruido == 'medio'`)

## Clasificación (`nivel_impacto`)

- `zonal`  &rarr; `vende_alcohol` AND (`giro in (bar, cantina)` OR `aforo >= 100`)
- `vecinal` &rarr; `vende_alcohol` (y no zonal)
- `bajo`    &rarr; en cualquier otro caso

## Estatus inicial de cada `business_procedure`

Al generarse: `status = 'pendiente'`, `fecha_vencimiento = null`, `document_id = null`.

Enum de status: `pendiente` | `en_tramite` | `vigente` | `vencido` | `no_aplica`.

## Semáforo (derivado, no se almacena)

Por trámite:
- `vencido` &rarr; **rojo**
- `pendiente` con `criticality == 'alta'` &rarr; **rojo**; si no &rarr; **naranja**
- `en_tramite` &rarr; **amarillo**
- `vigente` con `fecha_vencimiento` a &le; 30 días &rarr; **amarillo**
- `vigente` con `fecha_vencimiento` a &le; 60 días &rarr; **amarillo** (aviso preventivo suave)
- `vigente` (sin vencimiento cercano o sin vigencia) &rarr; **verde**

Por negocio: peor color entre sus trámites aplicables + un puntaje
`cumplimiento = round(100 * verdes / total_aplicables)`.
