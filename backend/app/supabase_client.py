"""Cliente de Supabase.

Devuelve un ``Client`` de supabase-py configurado con la URL y la
*service key*. En modo mock (sin credenciales) devuelve ``None`` y los routers
usan el almacén en memoria (``mock_store``).
"""

from __future__ import annotations

from functools import lru_cache
from typing import Optional

from .config import settings

try:  # supabase-py v2
    from supabase import Client, create_client
except Exception:  # pragma: no cover - si la lib no está instalada en local
    Client = object  # type: ignore
    create_client = None  # type: ignore


@lru_cache
def get_supabase() -> Optional["Client"]:
    """Devuelve un cliente de Supabase o ``None`` en modo mock.

    Se usa la *service role key* porque el backend actúa como servidor de
    confianza (bypassa RLS). El scoping por usuario se hace en la capa de la
    aplicación (routers/deps).
    """
    if settings.use_mock:
        return None
    if create_client is None:
        # La librería no está disponible: degradamos a modo mock.
        return None
    if not settings.supabase_url or not settings.supabase_service_key:
        return None
    return create_client(settings.supabase_url, settings.supabase_service_key)
