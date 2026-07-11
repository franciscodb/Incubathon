"""Endpoints de documentos.

Sube archivos al Storage de Supabase (modo live) o registra sólo metadatos con
una URL ficticia (modo mock). Lista los documentos de un negocio.
"""

from __future__ import annotations

import uuid
from typing import Optional

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)

from ..config import settings
from ..deps import get_current_user
from ..mock_store import get_store
from ..schemas import Document, User
from ..supabase_client import get_supabase
from .businesses import _require_owned_business_live, _require_owned_business_mock

router = APIRouter(tags=["documents"])


@router.get("/businesses/{business_id}/documents", response_model=list[Document])
def list_documents(
    business_id: str, current_user: User = Depends(get_current_user)
) -> list[Document]:
    """Lista los documentos de un negocio."""
    if settings.use_mock:
        store = get_store()
        _require_owned_business_mock(store, business_id, current_user)
        return [Document(**d) for d in store.list_documents(business_id)]

    supabase = get_supabase()
    _require_owned_business_live(supabase, business_id, current_user)
    resp = (
        supabase.table("documents").select("*").eq("business_id", business_id).execute()
    )
    return [Document(**d) for d in (resp.data or [])]


@router.post(
    "/businesses/{business_id}/documents",
    response_model=Document,
    status_code=status.HTTP_201_CREATED,
)
async def upload_document(
    business_id: str,
    file: UploadFile = File(..., description="Archivo del documento."),
    procedure_code: Optional[str] = Form(default=None),
    fecha_emision: Optional[str] = Form(default=None),
    fecha_vencimiento: Optional[str] = Form(default=None),
    current_user: User = Depends(get_current_user),
) -> Document:
    """Sube un documento y registra sus metadatos.

    Si se envía ``procedure_code``, se puede asociar el documento al trámite
    correspondiente del negocio desde el frontend (o vía PATCH del trámite).
    """
    file_name = file.filename or f"documento-{uuid.uuid4().hex[:8]}"

    # --- Modo mock: no hay Storage; se guarda metadata + URL ficticia ---
    if settings.use_mock:
        store = get_store()
        _require_owned_business_mock(store, business_id, current_user)
        fake_path = f"{business_id}/{uuid.uuid4().hex[:8]}-{file_name}"
        doc = store.create_document(
            business_id,
            {
                "procedure_code": procedure_code,
                "name": file_name,
                "file_url": f"https://mock.storage/{settings.supabase_bucket}/{fake_path}",
                "file_path": fake_path,
                "mime_type": file.content_type,
                "fecha_emision": fecha_emision,
                "fecha_vencimiento": fecha_vencimiento,
                "uploaded_by": current_user.id,
            },
        )
        return Document(**doc)

    # --- Modo live: subir a Supabase Storage ---
    supabase = get_supabase()
    _require_owned_business_live(supabase, business_id, current_user)

    content = await file.read()
    storage_path = f"{business_id}/{uuid.uuid4().hex[:8]}-{file_name}"
    bucket = settings.supabase_bucket

    try:
        supabase.storage.from_(bucket).upload(
            path=storage_path,
            file=content,
            file_options={"content-type": file.content_type or "application/octet-stream"},
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error al subir el archivo: {exc}") from exc

    # URL pública (si el bucket es público) — sirve como referencia.
    try:
        public_url = supabase.storage.from_(bucket).get_public_url(storage_path)
    except Exception:
        public_url = storage_path

    insert_data = {
        "business_id": business_id,
        "procedure_code": procedure_code,
        "name": file_name,
        "file_url": public_url,
        "file_path": storage_path,
        "mime_type": file.content_type,
        "fecha_emision": fecha_emision or None,
        "fecha_vencimiento": fecha_vencimiento or None,
        "uploaded_by": current_user.id,
    }
    resp = supabase.table("documents").insert(insert_data).execute()
    rows = resp.data or []
    if not rows:
        raise HTTPException(status_code=500, detail="No se pudo registrar el documento.")
    return Document(**rows[0])


@router.post("/storage/sign", tags=["documents"])
def sign_upload(
    path: str = Form(...),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Genera una URL firmada para subida directa desde el frontend (opcional).

    En modo mock devuelve una URL ficticia; en live usa el Storage de Supabase.
    """
    bucket = settings.supabase_bucket
    if settings.use_mock:
        return {
            "signed_url": f"https://mock.storage/{bucket}/{path}?token=mock",
            "path": path,
            "bucket": bucket,
        }

    supabase = get_supabase()
    try:
        result = supabase.storage.from_(bucket).create_signed_upload_url(path)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error al firmar la URL: {exc}") from exc
    return {"signed": result, "path": path, "bucket": bucket}
