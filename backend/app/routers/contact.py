"""Endpoints de solicitudes de contacto (empresario <-> profesional)."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from ..config import settings
from ..deps import get_current_user
from ..mock_store import get_store
from ..schemas import (
    ContactRequest,
    ContactRequestCreate,
    ContactRequestUpdate,
    User,
)
from ..supabase_client import get_supabase

router = APIRouter(prefix="/contact-requests", tags=["contact"])


@router.get("", response_model=list[ContactRequest])
def list_contact_requests(
    current_user: User = Depends(get_current_user),
) -> list[ContactRequest]:
    """Lista las solicitudes de contacto creadas por el usuario actual."""
    if settings.use_mock:
        store = get_store()
        return [ContactRequest(**c) for c in store.list_contact_requests(current_user.id)]

    supabase = get_supabase()
    resp = (
        supabase.table("contact_requests")
        .select("*")
        .eq("requester_id", current_user.id)
        .execute()
    )
    return [ContactRequest(**c) for c in (resp.data or [])]


@router.post("", response_model=ContactRequest, status_code=status.HTTP_201_CREATED)
def create_contact_request(
    payload: ContactRequestCreate, current_user: User = Depends(get_current_user)
) -> ContactRequest:
    """Crea una solicitud de contacto hacia un profesional."""
    data = payload.model_dump()

    if settings.use_mock:
        store = get_store()
        req = store.create_contact_request(current_user.id, data)
        return ContactRequest(**req)

    supabase = get_supabase()
    insert_data = {
        **data,
        "requester_id": current_user.id,
        "status": "nuevo",
    }
    resp = supabase.table("contact_requests").insert(insert_data).execute()
    rows = resp.data or []
    if not rows:
        raise HTTPException(status_code=500, detail="No se pudo crear la solicitud.")
    return ContactRequest(**rows[0])


@router.patch("/{request_id}", response_model=ContactRequest)
def update_contact_request(
    request_id: str,
    payload: ContactRequestUpdate,
    current_user: User = Depends(get_current_user),
) -> ContactRequest:
    """Actualiza el estatus de una solicitud (avanzar el seguimiento).

    Ej.: marcar como 'cerrado' cuando el trabajo con el profesional concluyó,
    lo que habilita al dueño a dejar una evaluación.
    """
    changes = payload.model_dump()

    if settings.use_mock:
        store = get_store()
        req = store.get_contact_request(request_id)
        if not req:
            raise HTTPException(status_code=404, detail="Solicitud no encontrada.")
        if str(req.get("requester_id")) != str(current_user.id):
            raise HTTPException(status_code=403, detail="No puedes modificar esta solicitud.")
        updated = store.update_contact_request(request_id, changes)
        return ContactRequest(**updated)

    supabase = get_supabase()
    existing = (
        supabase.table("contact_requests").select("*").eq("id", request_id).limit(1).execute()
    )
    rows = existing.data or []
    if not rows:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada.")
    if str(rows[0].get("requester_id")) != str(current_user.id):
        raise HTTPException(status_code=403, detail="No puedes modificar esta solicitud.")
    resp = (
        supabase.table("contact_requests").update(changes).eq("id", request_id).execute()
    )
    updated = (resp.data or [rows[0]])[0]
    return ContactRequest(**updated)
