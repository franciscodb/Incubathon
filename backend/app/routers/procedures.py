"""Endpoints de trámites.

- Catálogo de trámites CDMX A&B (procedures_catalog).
- Matriz de cumplimiento por negocio (business_procedures) con semáforo
  derivado y detalle del catálogo unido.
- Actualización del estatus de un trámite de un negocio.
"""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from .. import rules_engine
from ..config import settings
from ..deps import get_current_user
from ..mock_store import get_store
from ..schemas import (
    BusinessProcedureUpdate,
    BusinessProcedureView,
    BusinessProceduresMatrix,
    BusinessSummary,
    NivelImpacto,
    ProcedureCatalogItem,
    User,
)
from ..supabase_client import get_supabase
from .businesses import _require_owned_business_live, _require_owned_business_mock

router = APIRouter(tags=["procedures"])


# ---------------------------------------------------------------------------
# Catálogo (público, no requiere negocio)
# ---------------------------------------------------------------------------
@router.get("/procedures/catalog", response_model=list[ProcedureCatalogItem])
def get_catalog() -> list[ProcedureCatalogItem]:
    """Devuelve el catálogo completo de trámites."""
    return [ProcedureCatalogItem(**item) for item in rules_engine.load_catalog()]


@router.get("/procedures/catalog/{code}", response_model=ProcedureCatalogItem)
def get_catalog_item(code: str) -> ProcedureCatalogItem:
    """Devuelve un trámite del catálogo por su código."""
    item = rules_engine.get_catalog_item(code)
    if not item:
        raise HTTPException(status_code=404, detail="Trámite no encontrado en el catálogo.")
    return ProcedureCatalogItem(**item)


# ---------------------------------------------------------------------------
# Matriz de cumplimiento por negocio
# ---------------------------------------------------------------------------
def _build_view(bp: dict) -> BusinessProcedureView:
    """Construye la vista de un trámite con semáforo + catálogo."""
    code = bp["procedure_code"]
    catalog_item = rules_engine.get_catalog_item(code)
    criticality = (catalog_item or {}).get("criticality", "media")
    color = rules_engine.semaphore_for(
        bp.get("status"), criticality, bp.get("fecha_vencimiento")
    )
    return BusinessProcedureView(
        id=bp.get("id"),
        business_id=bp["business_id"],
        procedure_code=code,
        status=bp.get("status", "pendiente"),
        fecha_inicio=bp.get("fecha_inicio"),
        fecha_emision=bp.get("fecha_emision"),
        fecha_vencimiento=bp.get("fecha_vencimiento"),
        document_id=bp.get("document_id"),
        notas=bp.get("notas"),
        updated_at=bp.get("updated_at"),
        semaforo=color,
        catalog=ProcedureCatalogItem(**catalog_item) if catalog_item else None,
    )


@router.get("/businesses/{business_id}/procedures", response_model=BusinessProceduresMatrix)
def get_business_procedures(
    business_id: str, current_user: User = Depends(get_current_user)
) -> BusinessProceduresMatrix:
    """Devuelve la matriz de cumplimiento de un negocio."""
    if settings.use_mock:
        store = get_store()
        business = _require_owned_business_mock(store, business_id, current_user)
        bps = store.list_business_procedures(business_id)
    else:
        supabase = get_supabase()
        business = _require_owned_business_live(supabase, business_id, current_user)
        resp = (
            supabase.table("business_procedures")
            .select("*")
            .eq("business_id", business_id)
            .execute()
        )
        bps = resp.data or []

    views = [_build_view(bp) for bp in bps]
    summary = rules_engine.business_summary(bps)

    return BusinessProceduresMatrix(
        business_id=business_id,
        nivel_impacto=NivelImpacto(business.get("nivel_impacto", "bajo")),
        summary=BusinessSummary(**summary),
        procedures=views,
    )


@router.patch(
    "/businesses/{business_id}/procedures/{code}",
    response_model=BusinessProcedureView,
)
def update_business_procedure(
    business_id: str,
    code: str,
    payload: BusinessProcedureUpdate,
    current_user: User = Depends(get_current_user),
) -> BusinessProcedureView:
    """Actualiza el estatus/vencimiento/documento de un trámite de un negocio."""
    changes = payload.model_dump(exclude_none=True, mode="json")
    if not changes:
        raise HTTPException(status_code=400, detail="No hay cambios que aplicar.")

    if settings.use_mock:
        store = get_store()
        _require_owned_business_mock(store, business_id, current_user)
        bp = store.update_business_procedure(business_id, code, changes)
        if not bp:
            raise HTTPException(status_code=404, detail="Trámite no encontrado en el negocio.")
        return _build_view(bp)

    # --- Modo live ---
    supabase = get_supabase()
    _require_owned_business_live(supabase, business_id, current_user)
    changes["updated_at"] = datetime.now(timezone.utc).isoformat()
    resp = (
        supabase.table("business_procedures")
        .update(changes)
        .eq("business_id", business_id)
        .eq("procedure_code", code)
        .execute()
    )
    rows = resp.data or []
    if not rows:
        raise HTTPException(status_code=404, detail="Trámite no encontrado en el negocio.")
    return _build_view(rows[0])
