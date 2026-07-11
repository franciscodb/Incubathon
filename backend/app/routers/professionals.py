"""Endpoints del marketplace de profesionales.

Listado con filtros, detalle, registro de perfil y alta de certificaciones.
"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from ..config import settings
from ..deps import get_current_user
from ..mock_store import get_store
from ..schemas import (
    Certification,
    CertificationCreate,
    Professional,
    ProfessionalCreate,
    Review,
    ReviewCreate,
    User,
)
from ..supabase_client import get_supabase

router = APIRouter(prefix="/professionals", tags=["professionals"])


@router.get("", response_model=list[Professional])
def list_professionals(
    especialidad: Optional[str] = Query(default=None, description="Filtra por especialidad."),
    procedure_code: Optional[str] = Query(
        default=None, description="Filtra por trámite que puede atender."
    ),
    verified: Optional[bool] = Query(default=None, description="Filtra por verificados."),
) -> list[Professional]:
    """Lista profesionales del marketplace con filtros opcionales."""
    if settings.use_mock:
        store = get_store()
        rows = store.list_professionals(
            especialidad=especialidad, procedure_code=procedure_code, verified=verified
        )
        return [Professional(**p) for p in rows]

    # --- Modo live ---
    supabase = get_supabase()
    query = supabase.table("professionals").select("*, professional_certifications(*)")
    if especialidad:
        query = query.contains("especialidades", [especialidad])
    if verified is not None:
        query = query.eq("verified", verified)
    if procedure_code:
        query = query.contains("procedures_codes", [procedure_code])
    resp = query.execute()
    rows = resp.data or []
    return [_map_live_professional(p) for p in rows]


@router.get("/me", response_model=Optional[Professional])
def get_my_professional(
    current_user: User = Depends(get_current_user),
) -> Optional[Professional]:
    """Devuelve el perfil profesional del usuario autenticado (o null)."""
    if settings.use_mock:
        store = get_store()
        p = store.get_professional_by_user(current_user.id)
        return Professional(**p) if p else None

    supabase = get_supabase()
    resp = (
        supabase.table("professionals")
        .select("*, professional_certifications(*)")
        .eq("user_id", current_user.id)
        .limit(1)
        .execute()
    )
    rows = resp.data or []
    return _map_live_professional(rows[0]) if rows else None


@router.put("/me", response_model=Professional)
def upsert_my_professional(
    payload: ProfessionalCreate, current_user: User = Depends(get_current_user)
) -> Professional:
    """Crea o actualiza el perfil profesional del usuario autenticado."""
    data = payload.model_dump(mode="json")

    if settings.use_mock:
        store = get_store()
        p = store.upsert_professional(current_user.id, data)
        return Professional(**p)

    supabase = get_supabase()
    existing = (
        supabase.table("professionals")
        .select("id")
        .eq("user_id", current_user.id)
        .limit(1)
        .execute()
    )
    if existing.data:
        pro_id = existing.data[0]["id"]
        resp = (
            supabase.table("professionals")
            .update(data)
            .eq("id", pro_id)
            .execute()
        )
    else:
        resp = (
            supabase.table("professionals")
            .insert({**data, "user_id": current_user.id, "verified": False})
            .execute()
        )
    rows = resp.data or []
    if not rows:
        raise HTTPException(status_code=500, detail="No se pudo guardar el perfil profesional.")
    # Recarga con certificaciones anidadas.
    full = (
        supabase.table("professionals")
        .select("*, professional_certifications(*)")
        .eq("id", rows[0]["id"])
        .limit(1)
        .execute()
    )
    return _map_live_professional((full.data or [rows[0]])[0])


@router.get("/{professional_id}", response_model=Professional)
def get_professional(professional_id: str) -> Professional:
    """Devuelve el perfil de un profesional."""
    if settings.use_mock:
        store = get_store()
        p = store.get_professional(professional_id)
        if not p:
            raise HTTPException(status_code=404, detail="Profesional no encontrado.")
        return Professional(**p)

    supabase = get_supabase()
    resp = (
        supabase.table("professionals")
        .select("*, professional_certifications(*)")
        .eq("id", professional_id)
        .limit(1)
        .execute()
    )
    rows = resp.data or []
    if not rows:
        raise HTTPException(status_code=404, detail="Profesional no encontrado.")
    return _map_live_professional(rows[0])


@router.post("", response_model=Professional, status_code=status.HTTP_201_CREATED)
def create_professional(
    payload: ProfessionalCreate, current_user: User = Depends(get_current_user)
) -> Professional:
    """Registra el perfil de un profesional (vinculado al usuario actual)."""
    data = payload.model_dump(mode="json")

    if settings.use_mock:
        store = get_store()
        p = store.create_professional(data, user_id=current_user.id)
        return Professional(**p)

    supabase = get_supabase()
    insert_data = {**data, "user_id": current_user.id, "verified": False}
    resp = supabase.table("professionals").insert(insert_data).execute()
    rows = resp.data or []
    if not rows:
        raise HTTPException(status_code=500, detail="No se pudo crear el perfil profesional.")
    return _map_live_professional(rows[0])


@router.post(
    "/{professional_id}/certifications",
    response_model=Certification,
    status_code=status.HTTP_201_CREATED,
)
def add_certification(
    professional_id: str,
    payload: CertificationCreate,
    current_user: User = Depends(get_current_user),
) -> Certification:
    """Agrega una certificación (metadatos) a un profesional.

    El archivo puede subirse por el router de documentos/Storage; aquí se
    registran los metadatos y la URL resultante.
    """
    data = payload.model_dump(mode="json")

    if settings.use_mock:
        store = get_store()
        cert = store.add_certification(professional_id, data)
        if not cert:
            raise HTTPException(status_code=404, detail="Profesional no encontrado.")
        return Certification(**cert)

    supabase = get_supabase()
    insert_data = {**data, "professional_id": professional_id, "verified": False}
    resp = supabase.table("professional_certifications").insert(insert_data).execute()
    rows = resp.data or []
    if not rows:
        raise HTTPException(status_code=500, detail="No se pudo registrar la certificación.")
    return Certification(**rows[0])


# ---------------------------------------------------------------------------
# Reseñas / evaluación
# ---------------------------------------------------------------------------
@router.get("/{professional_id}/reviews", response_model=list[Review])
def list_reviews(professional_id: str) -> list[Review]:
    """Lista las evaluaciones de un profesional (público)."""
    if settings.use_mock:
        return [Review(**r) for r in get_store().list_reviews(professional_id)]

    supabase = get_supabase()
    resp = (
        supabase.table("reviews")
        .select("*")
        .eq("professional_id", professional_id)
        .order("created_at", desc=True)
        .execute()
    )
    return [Review(**r) for r in (resp.data or [])]


@router.post(
    "/{professional_id}/reviews",
    response_model=Review,
    status_code=status.HTTP_201_CREATED,
)
def create_review(
    professional_id: str,
    payload: ReviewCreate,
    current_user: User = Depends(get_current_user),
) -> Review:
    """Crea una evaluación de un profesional.

    Solo puede evaluar quien tuvo una conexión *cerrada* (hizo negocio) con el
    profesional, y una única vez por profesional.
    """
    data = payload.model_dump(mode="json")

    if settings.use_mock:
        store = get_store()
        if not store.get_professional(professional_id):
            raise HTTPException(status_code=404, detail="Profesional no encontrado.")
        if not store.has_completed_engagement(current_user.id, professional_id):
            raise HTTPException(
                status_code=403,
                detail="Solo puedes evaluar profesionales con los que cerraste un trabajo.",
            )
        if store.get_user_review(current_user.id, professional_id):
            raise HTTPException(status_code=409, detail="Ya evaluaste a este profesional.")
        review = store.create_review(current_user.id, professional_id, data)
        return Review(**review)

    # --- Modo live ---
    supabase = get_supabase()
    engagement = (
        supabase.table("contact_requests")
        .select("id")
        .eq("requester_id", current_user.id)
        .eq("professional_id", professional_id)
        .eq("status", "cerrado")
        .limit(1)
        .execute()
    )
    if not (engagement.data or []):
        raise HTTPException(
            status_code=403,
            detail="Solo puedes evaluar profesionales con los que cerraste un trabajo.",
        )
    existing = (
        supabase.table("reviews")
        .select("id")
        .eq("requester_id", current_user.id)
        .eq("professional_id", professional_id)
        .limit(1)
        .execute()
    )
    if existing.data:
        raise HTTPException(status_code=409, detail="Ya evaluaste a este profesional.")

    insert_data = {
        **data,
        "professional_id": professional_id,
        "requester_id": current_user.id,
        "author_name": current_user.full_name or "Cliente verificado",
    }
    resp = supabase.table("reviews").insert(insert_data).execute()
    rows = resp.data or []
    if not rows:
        raise HTTPException(status_code=500, detail="No se pudo guardar la evaluación.")

    # Recalcula el agregado rating/reviews_count del profesional.
    _recompute_professional_rating(supabase, professional_id, int(data.get("rating", 5)))
    return Review(**rows[0])


def _recompute_professional_rating(supabase, professional_id: str, new_rating: int) -> None:
    """Actualiza incrementalmente rating/reviews_count del profesional (live)."""
    try:
        cur = (
            supabase.table("professionals")
            .select("rating, reviews_count")
            .eq("id", professional_id)
            .limit(1)
            .execute()
        )
        row = (cur.data or [{}])[0]
        prev_count = int(row.get("reviews_count", 0) or 0)
        prev_rating = float(row.get("rating", 0) or 0)
        new_count = prev_count + 1
        avg = round((prev_rating * prev_count + new_rating) / new_count, 1)
        supabase.table("professionals").update(
            {"rating": avg, "reviews_count": new_count}
        ).eq("id", professional_id).execute()
    except Exception:
        # No romper la creación de la reseña por un fallo de agregación.
        pass


# ---------------------------------------------------------------------------
# Utilidades
# ---------------------------------------------------------------------------
def _map_live_professional(row: dict) -> Professional:
    """Normaliza una fila de Supabase (con certificaciones anidadas)."""
    certs = row.get("professional_certifications") or row.get("certifications") or []
    data = {k: v for k, v in row.items() if k != "professional_certifications"}
    data["certifications"] = certs
    return Professional(**data)
