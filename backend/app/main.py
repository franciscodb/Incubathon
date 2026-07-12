"""Punto de entrada de la API 'CumplIA' (cumplimiento regulatorio).

Configura FastAPI, CORS y monta todos los routers. Funciona en modo mock (sin
Supabase) o live (con Supabase) según la configuración.
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .schemas import HealthResponse
from .routers import (
    assistant,
    auth,
    billing,
    businesses,
    contact,
    documents,
    procedures,
    professionals,
)

app = FastAPI(
    title="CumplIA API",
    version="0.1.0",
    description=(
        "Backend de CumplIA — cumplimiento regulatorio para negocios de "
        "Alimentos y Bebidas de la CDMX. Motor de reglas determinístico + "
        "marketplace de profesionales."
    ),
)

# --- CORS ---
# La sesión viaja en una cookie httpOnly (ver deps.ACCESS_TOKEN_COOKIE), así
# que allow_credentials=True es obligatorio y FRONTEND_ORIGIN NO puede quedar
# en '*' (los navegadores rechazan credentials + wildcard): hay que listar
# el/los orígenes reales del frontend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Routers ---
app.include_router(auth.router)
app.include_router(businesses.router)
app.include_router(procedures.router)
app.include_router(professionals.router)
app.include_router(documents.router)
app.include_router(contact.router)
app.include_router(billing.router)
app.include_router(assistant.router)


# --- Endpoints raíz ---
@app.get("/", tags=["root"])
def root() -> dict:
    """Bienvenida y metadatos básicos de la API."""
    return {
        "name": "CumplIA API",
        "version": app.version,
        "mode": settings.mode,
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health", response_model=HealthResponse, tags=["root"])
def health() -> HealthResponse:
    """Healthcheck usado por Railway. Indica el modo (mock/live)."""
    return HealthResponse(status="ok", mode=settings.mode)
