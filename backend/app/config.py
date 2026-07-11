"""Configuración de la aplicación.

Lee las variables de entorno mediante pydantic-settings. Expone un singleton
``settings`` y una propiedad ``use_mock`` que determina si la API corre contra
Supabase (modo *live*) o contra el almacén en memoria (modo *mock*).
"""

from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Variables de entorno de la aplicación.

    En modo demo basta con ``USE_MOCK=true`` (o dejar ``SUPABASE_URL`` vacío)
    para que todo funcione sin credenciales de Supabase.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
        populate_by_name=True,
    )

    # --- Supabase ---
    supabase_url: str = Field(default="", validation_alias="SUPABASE_URL")
    supabase_service_key: str = Field(default="", validation_alias="SUPABASE_SERVICE_KEY")
    supabase_anon_key: str = Field(default="", validation_alias="SUPABASE_ANON_KEY")
    supabase_bucket: str = Field(default="documents", validation_alias="SUPABASE_BUCKET")

    # --- CORS / Frontend ---
    frontend_origin: str = Field(default="*", validation_alias="FRONTEND_ORIGIN")
    # URL pública del frontend, usada para las redirecciones de Stripe Checkout.
    frontend_url: str = Field(default="http://localhost:5173", validation_alias="FRONTEND_URL")

    # --- Stripe (suscripciones) ---
    stripe_secret_key: str = Field(default="", validation_alias="STRIPE_SECRET_KEY")
    stripe_webhook_secret: str = Field(default="", validation_alias="STRIPE_WEBHOOK_SECRET")

    # --- Flags ---
    # Mapea la variable de entorno USE_MOCK -> este campo.
    use_mock_flag: bool = Field(default=True, validation_alias="USE_MOCK")

    @property
    def has_stripe(self) -> bool:
        """True si hay credenciales de Stripe (cobro real habilitado)."""
        return bool(self.stripe_secret_key.strip())

    @property
    def checkout_base(self) -> str:
        """URL base del frontend para redirecciones (sin barra final)."""
        raw = self.frontend_url.strip() or "http://localhost:5173"
        return raw.rstrip("/")

    @property
    def use_mock(self) -> bool:
        """True cuando NO hay URL de Supabase o cuando USE_MOCK está activo."""
        if not self.supabase_url.strip():
            return True
        return self.use_mock_flag

    @property
    def mode(self) -> str:
        """Devuelve 'mock' o 'live' para exponerlo en /health."""
        return "mock" if self.use_mock else "live"

    @property
    def cors_origins(self) -> list[str]:
        """Lista de orígenes permitidos por CORS.

        Acepta múltiples orígenes separados por coma en FRONTEND_ORIGIN.
        """
        raw = self.frontend_origin.strip()
        if not raw or raw == "*":
            return ["*"]
        return [o.strip() for o in raw.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    """Devuelve un singleton de Settings (cacheado)."""
    return Settings()


# Instancia global reutilizable en toda la app.
settings = get_settings()
