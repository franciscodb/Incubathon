"""Endpoints de negocios (businesses).

CRUD con scope al usuario autenticado. Al crear un negocio se ejecuta el motor
de reglas para clasificarlo y generar sus business_procedures.
"""

from __future__ import annotations

import base64
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from .. import rules_engine
from ..config import settings
from ..deps import get_current_user
from ..mock_store import MockStore, get_store
from .billing import account_can_add_business
from ..schemas import (
    Business,
    BusinessCreate,
    BusinessUpdate,
    User,
)
from ..supabase_client import get_supabase

router = APIRouter(prefix="/businesses", tags=["businesses"])


def _require_owned_business_live(supabase, business_id: str, user: User) -> dict:
    """Obtiene un negocio de Supabase validando propiedad."""
    resp = supabase.table("businesses").select("*").eq("id", business_id).limit(1).execute()
    rows = resp.data or []
    if not rows:
        raise HTTPException(status_code=404, detail="Negocio no encontrado.")
    business = rows[0]
    if str(business.get("owner_id")) != str(user.id):
        raise HTTPException(status_code=403, detail="No tienes acceso a este negocio.")
    return business


def _require_owned_business_mock(store: MockStore, business_id: str, user: User) -> dict:
    """Obtiene un negocio del mock store validando propiedad."""
    business = store.get_business(business_id)
    if not business:
        raise HTTPException(status_code=404, detail="Negocio no encontrado.")
    if str(business.get("owner_id")) != str(user.id):
        raise HTTPException(status_code=403, detail="No tienes acceso a este negocio.")
    return business


@router.get("", response_model=list[Business])
def list_businesses(current_user: User = Depends(get_current_user)) -> list[Business]:
    """Lista los negocios del usuario autenticado."""
    if settings.use_mock:
        store = get_store()
        return [Business(**b) for b in store.list_businesses(current_user.id)]

    supabase = get_supabase()
    resp = supabase.table("businesses").select("*").eq("owner_id", current_user.id).execute()
    return [Business(**b) for b in (resp.data or [])]


@router.post("", response_model=Business, status_code=status.HTTP_201_CREATED)
def create_business(
    payload: BusinessCreate, current_user: User = Depends(get_current_user)
) -> Business:
    """Crea un negocio, lo clasifica y genera sus business_procedures.

    Antes de crear valida que la cuenta tenga un asiento disponible en su
    suscripción (tier gratuito: 1 negocio). Si no, responde 402 para que el
    frontend redirija a la página de planes.
    """
    if not account_can_add_business(current_user):
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=(
                "Alcanzaste el límite de negocios de tu plan. "
                "Suscríbete o amplía tu plan para dar de alta más negocios."
            ),
        )

    data = payload.model_dump()

    if settings.use_mock:
        store = get_store()
        business = store.create_business(current_user.id, data)
        return Business(**business)

    # --- Modo live ---
    supabase = get_supabase()
    nivel_impacto = rules_engine.classify(data)
    now = datetime.now(timezone.utc).isoformat()
    insert_data = {
        **data,
        "owner_id": current_user.id,
        "nivel_impacto": nivel_impacto,
        "created_at": now,
        "updated_at": now,
    }
    resp = supabase.table("businesses").insert(insert_data).execute()
    rows = resp.data or []
    if not rows:
        raise HTTPException(status_code=500, detail="No se pudo crear el negocio.")
    business = rows[0]

    # Genera e inserta los business_procedures.
    procs = rules_engine.generate_business_procedures(business)
    proc_rows = [
        {
            "business_id": business["id"],
            "procedure_code": p["procedure_code"],
            "status": p["status"],
            "fecha_vencimiento": p["fecha_vencimiento"],
            "document_id": p["document_id"],
        }
        for p in procs
    ]
    if proc_rows:
        try:
            supabase.table("business_procedures").insert(proc_rows).execute()
        except Exception as exc:  # no romper la creación del negocio
            raise HTTPException(
                status_code=500,
                detail=f"Negocio creado pero fallaron los trámites: {exc}",
            ) from exc

    return Business(**business)


@router.get("/{business_id}", response_model=Business)
def get_business(
    business_id: str, current_user: User = Depends(get_current_user)
) -> Business:
    """Obtiene un negocio del usuario autenticado."""
    if settings.use_mock:
        store = get_store()
        business = _require_owned_business_mock(store, business_id, current_user)
        return Business(**business)

    supabase = get_supabase()
    business = _require_owned_business_live(supabase, business_id, current_user)
    return Business(**business)


@router.patch("/{business_id}", response_model=Business)
@router.put("/{business_id}", response_model=Business)
def update_business(
    business_id: str,
    payload: BusinessUpdate,
    current_user: User = Depends(get_current_user),
) -> Business:
    """Actualiza un negocio y recalcula su clasificación."""
    changes = payload.model_dump(exclude_none=True)

    if settings.use_mock:
        store = get_store()
        _require_owned_business_mock(store, business_id, current_user)
        business = store.update_business(business_id, changes)
        return Business(**business)

    # --- Modo live ---
    supabase = get_supabase()
    current = _require_owned_business_live(supabase, business_id, current_user)
    merged = {**current, **changes}
    changes["nivel_impacto"] = rules_engine.classify(merged)
    changes["updated_at"] = datetime.now(timezone.utc).isoformat()
    resp = (
        supabase.table("businesses").update(changes).eq("id", business_id).execute()
    )
    rows = resp.data or []
    business = rows[0] if rows else merged
    return Business(**business)


# ---------------------------------------------------------------------
# Foto del negocio
# ---------------------------------------------------------------------
@router.post("/{business_id}/photo", response_model=Business)
async def upload_business_photo(
    business_id: str,
    file: UploadFile = File(..., description="Imagen del negocio (JPG/PNG)."),
    current_user: User = Depends(get_current_user),
) -> Business:
    """Sube (o reemplaza) la foto del negocio y guarda su URL en ``photo_url``.

    Mismo patrón que la subida de documentos: en modo mock registra una URL
    ficticia; en live sube al Storage de Supabase y usa la URL pública.
    """
    if file.content_type and not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="El archivo debe ser una imagen.")

    file_name = file.filename or f"foto-{uuid.uuid4().hex[:8]}"
    content = await file.read()
    if len(content) > 6 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="La imagen no debe superar 5 MB.")

    # --- Modo mock: sin Storage. Se incrusta como data URI para que la foto se
    # vea realmente en la demo (el store es en memoria; no persiste en disco). ---
    if settings.use_mock:
        store = get_store()
        _require_owned_business_mock(store, business_id, current_user)
        mime = file.content_type or "image/jpeg"
        photo_url = f"data:{mime};base64,{base64.b64encode(content).decode('ascii')}"
        business = store.update_business(business_id, {"photo_url": photo_url})
        return Business(**business)

    # --- Modo live: subir a Supabase Storage ---
    supabase = get_supabase()
    current = _require_owned_business_live(supabase, business_id, current_user)

    storage_path = f"business-photos/{business_id}/{uuid.uuid4().hex[:8]}-{file_name}"
    bucket = settings.supabase_bucket

    try:
        supabase.storage.from_(bucket).upload(
            path=storage_path,
            file=content,
            file_options={"content-type": file.content_type or "image/jpeg"},
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error al subir la imagen: {exc}") from exc

    try:
        public_url = supabase.storage.from_(bucket).get_public_url(storage_path)
    except Exception:
        public_url = storage_path

    now = datetime.now(timezone.utc).isoformat()
    resp = (
        supabase.table("businesses")
        .update({"photo_url": public_url, "updated_at": now})
        .eq("id", business_id)
        .execute()
    )
    rows = resp.data or []
    business = rows[0] if rows else {**current, "photo_url": public_url}
    return Business(**business)


@router.delete("/{business_id}/photo", response_model=Business)
def delete_business_photo(
    business_id: str, current_user: User = Depends(get_current_user)
) -> Business:
    """Quita la foto del negocio (deja ``photo_url`` en nulo)."""
    if settings.use_mock:
        store = get_store()
        business = _require_owned_business_mock(store, business_id, current_user)
        # El dict del store es la misma referencia en memoria: lo mutamos directo
        # (update_business ignora valores None).
        business["photo_url"] = None
        return Business(**business)

    supabase = get_supabase()
    _require_owned_business_live(supabase, business_id, current_user)
    now = datetime.now(timezone.utc).isoformat()
    resp = (
        supabase.table("businesses")
        .update({"photo_url": None, "updated_at": now})
        .eq("id", business_id)
        .execute()
    )
    rows = resp.data or []
    business = rows[0] if rows else _require_owned_business_live(supabase, business_id, current_user)
    return Business(**business)
