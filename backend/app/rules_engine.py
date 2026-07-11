"""Motor de reglas de cumplimiento (determinístico).

Implementa EXACTAMENTE la lógica descrita en `shared/rules.md`:

- ``classify``: clasifica el negocio (nivel_impacto).
- ``applicable_procedure_codes``: qué trámites aplican.
- ``generate_business_procedures``: genera los business_procedures iniciales.
- ``semaphore_for``: color del semáforo por trámite (derivado).
- ``business_summary``: semáforo global + puntaje de cumplimiento.

El catálogo se carga desde ``app/data/catalog.json`` (empaquetado con la app).
"""

from __future__ import annotations

import json
from datetime import date, datetime
from enum import Enum
from functools import lru_cache
from pathlib import Path
from typing import Any, Optional

# Ruta al catálogo empaquetado junto a la aplicación.
_CATALOG_PATH = Path(__file__).parent / "data" / "catalog.json"

# ---------------------------------------------------------------------------
# Constantes de las reglas (fuente: shared/rules.md)
# ---------------------------------------------------------------------------
# Trámites base que SIEMPRE aplican a Alimentos y Bebidas.
BASE_PROCEDURES: list[str] = [
    "RFC_SAT",
    "AVISO_APERTURA",
    "USO_SUELO",
    "AVISO_SANITARIO_COFEPRIS",
    "SACMEX_DESCARGAS",
    "PROTECCION_CIVIL_PIPC",
]

# Orden de severidad de colores del semáforo (de mejor a peor).
_COLOR_SEVERITY: dict[str, int] = {
    "verde": 0,
    "amarillo": 1,
    "naranja": 2,
    "rojo": 3,
}


# ---------------------------------------------------------------------------
# Utilidades internas
# ---------------------------------------------------------------------------
def _val(x: Any) -> Any:
    """Normaliza un valor que podría ser un Enum a su valor plano."""
    return x.value if isinstance(x, Enum) else x


def _as_date(value: Any) -> Optional[date]:
    """Convierte str/date/datetime a ``date`` (o None)."""
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if isinstance(value, str):
        try:
            return date.fromisoformat(value[:10])
        except ValueError:
            return None
    return None


def _b(business: dict, key: str, default: Any = None) -> Any:
    """Lee un campo del negocio normalizando enums."""
    return _val(business.get(key, default))


# ---------------------------------------------------------------------------
# Carga del catálogo
# ---------------------------------------------------------------------------
@lru_cache
def load_catalog() -> list[dict]:
    """Carga y devuelve la lista de trámites del catálogo.

    El archivo tiene forma ``{"_comment": ..., "procedures": [...]}``.
    """
    with _CATALOG_PATH.open("r", encoding="utf-8") as f:
        data = json.load(f)
    return list(data.get("procedures", []))


@lru_cache
def _catalog_index() -> dict[str, dict]:
    """Índice ``code -> item`` del catálogo."""
    return {item["code"]: item for item in load_catalog()}


def get_catalog_item(code: str) -> Optional[dict]:
    """Devuelve el trámite del catálogo por su código (o None)."""
    return _catalog_index().get(code)


def criticality_for(code: str) -> str:
    """Devuelve la criticidad ('alta'|'media'|'baja') de un trámite."""
    item = get_catalog_item(code)
    return (item or {}).get("criticality", "media")


# ---------------------------------------------------------------------------
# Clasificación (nivel_impacto)
# ---------------------------------------------------------------------------
def classify(business: dict) -> str:
    """Clasifica el negocio en 'zonal' | 'vecinal' | 'bajo'.

    Reglas (rules.md):
      - zonal   -> vende_alcohol AND (giro in {bar, cantina} OR aforo >= 100)
      - vecinal -> vende_alcohol (y no zonal)
      - bajo    -> en cualquier otro caso
    """
    vende_alcohol = bool(_b(business, "vende_alcohol", False))
    giro = _b(business, "giro")
    aforo = int(_b(business, "aforo", 0) or 0)

    if vende_alcohol and (giro in ("bar", "cantina") or aforo >= 100):
        return "zonal"
    if vende_alcohol:
        return "vecinal"
    return "bajo"


# ---------------------------------------------------------------------------
# Aplicabilidad de trámites
# ---------------------------------------------------------------------------
def applicable_procedure_codes(business: dict) -> list[str]:
    """Devuelve la lista de códigos de trámites aplicables al negocio.

    Combina los trámites base con los condicionales de rules.md, preservando
    un orden estable (base primero, luego condicionales en orden de la regla).
    """
    giro = _b(business, "giro")
    superficie = float(_b(business, "superficie_m2", 0) or 0)
    aforo = int(_b(business, "aforo", 0) or 0)
    num_trabajadores = int(_b(business, "num_trabajadores", 0) or 0)
    vende_alcohol = bool(_b(business, "vende_alcohol", False))
    usa_gas = bool(_b(business, "usa_gas", False))
    tiene_terraza = bool(_b(business, "tiene_terraza", False))
    tiene_anuncios = bool(_b(business, "tiene_anuncios", False))
    genera_residuos = bool(_b(business, "genera_residuos_especiales", False))
    nivel_ruido = _b(business, "nivel_ruido", "bajo")

    codes: list[str] = list(BASE_PROCEDURES)

    # Condicionales (respetando el orden de rules.md)
    if num_trabajadores > 0:
        codes.append("IMSS_PATRONAL")
    if vende_alcohol:
        codes.append("PERMISO_ALCOHOL")
    if usa_gas:
        codes.append("DICTAMEN_GAS")
    if tiene_terraza:
        codes.append("AUTORIZACION_ENSERES")
    if tiene_anuncios:
        codes.append("LICENCIA_ANUNCIOS")
    if aforo >= 50 or superficie >= 100:
        codes.append("VBSO")
    if genera_residuos or giro in ("restaurante", "bar", "cantina"):
        codes.append("PLAN_MANEJO_RESIDUOS")
    if nivel_ruido == "alto" or (vende_alcohol and nivel_ruido == "medio"):
        codes.append("ESTUDIO_RUIDO")

    # Elimina duplicados preservando orden.
    seen: set[str] = set()
    ordered: list[str] = []
    for c in codes:
        if c not in seen:
            seen.add(c)
            ordered.append(c)
    return ordered


def generate_business_procedures(business: dict) -> list[dict]:
    """Genera los business_procedures iniciales para un negocio.

    Cada registro: ``{procedure_code, status='pendiente',
    fecha_vencimiento=None, document_id=None}`` (rules.md).
    """
    return [
        {
            "procedure_code": code,
            "status": "pendiente",
            "fecha_vencimiento": None,
            "document_id": None,
        }
        for code in applicable_procedure_codes(business)
    ]


# ---------------------------------------------------------------------------
# Semáforo (derivado, no se almacena)
# ---------------------------------------------------------------------------
def semaphore_for(
    status: Any,
    criticality: Any,
    fecha_vencimiento: Any = None,
    today: Optional[date] = None,
) -> str:
    """Devuelve el color del semáforo de un trámite.

    Lógica exacta de rules.md:
      - vencido                                   -> rojo
      - pendiente (criticality == 'alta')         -> rojo
      - pendiente (otra criticidad)               -> naranja
      - en_tramite                                -> amarillo
      - vigente con vencimiento <= 30 días        -> amarillo
      - vigente con vencimiento <= 60 días        -> amarillo (aviso suave)
      - vigente (sin vencimiento cercano / null)  -> verde
      - no_aplica                                 -> verde (neutral)
    """
    status = _val(status)
    criticality = _val(criticality)
    today = today or date.today()

    if status == "vencido":
        return "rojo"
    if status == "pendiente":
        return "rojo" if criticality == "alta" else "naranja"
    if status == "en_tramite":
        return "amarillo"
    if status == "vigente":
        fv = _as_date(fecha_vencimiento)
        if fv is not None:
            days = (fv - today).days
            if days <= 30:
                return "amarillo"
            if days <= 60:
                return "amarillo"
        return "verde"
    # no_aplica u otro estado no reconocido -> neutral
    return "verde"


# ---------------------------------------------------------------------------
# Resumen por negocio
# ---------------------------------------------------------------------------
def business_summary(procedures: list[dict]) -> dict:
    """Calcula el semáforo global y el puntaje de cumplimiento de un negocio.

    - ``color``: peor color entre los trámites aplicables.
    - ``cumplimiento_pct``: round(100 * verdes / total_aplicables).
    - ``counts``: conteo por color + total (los 'no_aplica' se excluyen del
      total y del peor color).

    ``procedures`` es una lista de dicts con al menos ``status``,
    ``procedure_code`` y opcionalmente ``fecha_vencimiento``.
    """
    counts = {"verde": 0, "amarillo": 0, "naranja": 0, "rojo": 0, "no_aplica": 0}
    colors: list[str] = []

    for p in procedures:
        status = _val(p.get("status"))
        if status == "no_aplica":
            counts["no_aplica"] += 1
            continue
        code = p.get("procedure_code")
        crit = criticality_for(code) if code else "media"
        color = semaphore_for(status, crit, p.get("fecha_vencimiento"))
        counts[color] = counts.get(color, 0) + 1
        colors.append(color)

    total = len(colors)  # total aplicables (excluye no_aplica)
    counts["total"] = total

    if total == 0:
        return {"color": "verde", "cumplimiento_pct": 100, "counts": counts}

    # Peor color = mayor severidad.
    worst = max(colors, key=lambda c: _COLOR_SEVERITY.get(c, 0))
    cumplimiento_pct = round(100 * counts["verde"] / total)

    return {"color": worst, "cumplimiento_pct": cumplimiento_pct, "counts": counts}
