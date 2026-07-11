"""Dependencias compartidas de FastAPI.

- ``get_current_user``: resuelve el usuario autenticado a partir del header
  ``Authorization: Bearer <jwt>``. En modo *live* verifica el token contra
  Supabase Auth; en modo *mock* devuelve un usuario demo fijo.
- ``get_mock_store``: acceso al singleton del almacén en memoria.
"""

from __future__ import annotations

from typing import Optional

from fastapi import Depends, Header, HTTPException, status

from .config import settings
from .mock_store import DEMO_OWNER_EMAIL, DEMO_OWNER_ID, MockStore, get_store
from .schemas import User, UserRole
from .supabase_client import get_supabase


def get_mock_store() -> MockStore:
    """Dependency que devuelve el singleton del almacén en memoria."""
    return get_store()


def _extract_bearer(authorization: Optional[str]) -> Optional[str]:
    """Extrae el token del header 'Authorization: Bearer <token>'."""
    if not authorization:
        return None
    parts = authorization.split(" ", 1)
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1].strip()
    # Permite pasar el token "pelado" también.
    return authorization.strip()


async def get_current_user(
    authorization: Optional[str] = Header(default=None),
) -> User:
    """Devuelve el usuario autenticado.

    Modo mock: usuario demo fijo (business_owner). Modo live: verifica el JWT
    con ``supabase.auth.get_user`` y arma el perfil.
    """
    # --- Modo mock: usuario demo fijo ---
    if settings.use_mock:
        store = get_store()
        demo = store.get_user(DEMO_OWNER_ID) or {
            "id": DEMO_OWNER_ID,
            "email": DEMO_OWNER_EMAIL,
            "role": "business_owner",
        }
        return User(
            id=demo["id"],
            email=demo["email"],
            full_name=demo.get("full_name"),
            role=UserRole(demo.get("role", "business_owner")),
        )

    # --- Modo live: verificar contra Supabase ---
    token = _extract_bearer(authorization)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Falta el token de autenticación (Authorization: Bearer).",
        )

    supabase = get_supabase()
    if supabase is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Cliente de Supabase no disponible.",
        )

    try:
        resp = supabase.auth.get_user(token)
    except Exception as exc:  # token inválido / expirado
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado.",
        ) from exc

    sb_user = getattr(resp, "user", None)
    if sb_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No se pudo resolver el usuario del token.",
        )

    # El rol y el nombre se guardan en user_metadata al registrar.
    metadata = getattr(sb_user, "user_metadata", None) or {}
    role = metadata.get("role", "business_owner")
    try:
        role_enum = UserRole(role)
    except ValueError:
        role_enum = UserRole.business_owner

    return User(
        id=str(sb_user.id),
        email=str(getattr(sb_user, "email", "") or ""),
        full_name=metadata.get("full_name"),
        role=role_enum,
    )


# Alias de conveniencia para inyección en routers.
CurrentUser = Depends(get_current_user)
