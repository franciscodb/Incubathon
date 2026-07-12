"""Configuración de la aplicación.

Lee las variables de entorno mediante pydantic-settings. Expone un singleton
``settings`` y una propiedad ``use_mock`` que determina si la API corre contra
Supabase (modo *live*) o contra el almacén en memoria (modo *mock*).
"""

from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# Orígenes de dev y de producción conocidos. NUNCA usamos '*' porque la sesión
# viaja en cookie y CORS con credenciales (allow_credentials=True) prohíbe el
# comodín en los navegadores.
_DEV_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"]
_DEFAULT_PROD_ORIGINS = [
    "https://cumplia-mx.vercel.app",
    "https://buro-cumplimiento-frontend.vercel.app",
]
# Cualquier subdominio de vercel.app (cubre los preview deploys) con credenciales.
FRONTEND_ORIGIN_REGEX = r"https://[a-z0-9-]+\.vercel\.app"


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
    # Vacío = usar dev + prod conocidos (nunca '*', ver cors_origins).
    frontend_origin: str = Field(default="", validation_alias="FRONTEND_ORIGIN")
    # URL pública del frontend, usada para las redirecciones de Stripe Checkout.
    frontend_url: str = Field(default="http://localhost:5173", validation_alias="FRONTEND_URL")

    # --- Stripe (suscripciones) ---
    stripe_secret_key: str = Field(default="", validation_alias="STRIPE_SECRET_KEY")
    stripe_webhook_secret: str = Field(default="", validation_alias="STRIPE_WEBHOOK_SECRET")

    # --- IA (Asesor CumplIA, Anthropic) ---
    anthropic_api_key: str = Field(default="", validation_alias="ANTHROPIC_API_KEY")
    # Modelo por defecto: Claude Haiku 4.5 (rápido y económico para el chat).
    assistant_model: str = Field(default="claude-haiku-4-5", validation_alias="ASSISTANT_MODEL")

    # --- Flags ---
    # Mapea la variable de entorno USE_MOCK -> este campo.
    use_mock_flag: bool = Field(default=True, validation_alias="USE_MOCK")

    @property
    def has_stripe(self) -> bool:
        """True si hay credenciales de Stripe (cobro real habilitado)."""
        return bool(self.stripe_secret_key.strip())

    @property
    def has_anthropic(self) -> bool:
        """True si hay llave de Anthropic (Asesor IA habilitado)."""
        return bool(self.anthropic_api_key.strip())

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
        """Lista explícita de orígenes permitidos por CORS.

        Con cookies de sesión (allow_credentials=True) los navegadores prohíben
        '*'. Por eso NUNCA devolvemos comodín: si no hay FRONTEND_ORIGIN caemos
        a dev + prod conocidos. Los preview de Vercel los cubre
        ``cors_origin_regex`` en el middleware. Acepta múltiples orígenes
        separados por coma.
        """
        raw = self.frontend_origin.strip()
        if raw and raw != "*":
            origins = [o.strip() for o in raw.split(",") if o.strip()]
        else:
            origins = [*_DEV_ORIGINS, *_DEFAULT_PROD_ORIGINS]

        # Asegura que el frontend_url (si es real) esté permitido.
        fu = self.frontend_url.strip().rstrip("/")
        if fu and fu not in origins:
            origins.append(fu)

        # Elimina duplicados preservando el orden.
        seen: set[str] = set()
        ordered: list[str] = []
        for o in origins:
            if o not in seen:
                seen.add(o)
                ordered.append(o)
        return ordered

    @property
    def cors_origin_regex(self) -> str:
        """Regex de orígenes permitidos (cualquier deploy de Vercel)."""
        return FRONTEND_ORIGIN_REGEX

    @property
    def cookie_secure(self) -> bool:
        """Fallback: True si el frontend se sirve por HTTPS (cross-site prod).

        La decisión real se toma por request en ``auth.py`` (X-Forwarded-Proto),
        robusta detrás del proxy de Railway. Esto es solo el valor por defecto.
        """
        if self.frontend_url.strip().lower().startswith("https://"):
            return True
        return "https://" in self.frontend_origin.strip().lower()

    @property
    def cookie_samesite(self) -> str:
        """'none' en producción (dominios distintos), 'lax' en local (mismo site)."""
        return "none" if self.cookie_secure else "lax"


@lru_cache
def get_settings() -> Settings:
    """Devuelve un singleton de Settings (cacheado)."""
    return Settings()


# Instancia global reutilizable en toda la app.
settings = get_settings()
