"""Endpoints de autenticación.

Modo live: usa Supabase Auth (sign_up / sign_in). Modo mock: devuelve un token
y usuario demo para poder navegar toda la app sin base de datos.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from ..config import settings
from ..deps import ACCESS_TOKEN_COOKIE, get_current_user
from ..mock_store import MOCK_TOKEN, MockStore, get_store
from ..schemas import (
    AuthResponse,
    LoginRequest,
    RegisterRequest,
    User,
    UserRole,
)
from ..supabase_client import get_supabase

router = APIRouter(prefix="/auth", tags=["auth"])


def _is_https_request(request: Request) -> bool:
    """Detecta HTTPS de forma robusta detrás de un proxy (Railway, Vercel, etc.).

    Railway termina el TLS y reenvía con ``X-Forwarded-Proto: https``. Nos
    basamos en esa cabecera (y en el esquema real) en vez de en una variable de
    entorno, para que la cookie salga Secure/SameSite=None sin depender de que
    FRONTEND_URL esté bien configurado.
    """
    proto = (request.headers.get("x-forwarded-proto") or request.url.scheme or "").strip()
    proto = proto.split(",")[0].strip().lower()  # puede venir "https,http"
    if proto:
        return proto == "https"
    return settings.cookie_secure  # sin señal: usa el default de config


def _set_session_cookie(request: Request, response: Response, token: str) -> None:
    """Guarda el JWT en una cookie httpOnly (no accesible desde JS).

    Cross-site (frontend y backend en dominios distintos) requiere
    ``SameSite=None; Secure`` — que solo es válido sobre HTTPS. El esquema se
    detecta por request para que funcione en prod sin configuración extra.
    """
    secure = _is_https_request(request)
    response.set_cookie(
        key=ACCESS_TOKEN_COOKIE,
        value=token,
        httponly=True,
        secure=secure,
        samesite="none" if secure else "lax",
        path="/",
    )


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, request: Request, response: Response) -> AuthResponse:
    """Registra un usuario (dueño de negocio o profesional)."""
    role_value = payload.role.value if isinstance(payload.role, UserRole) else str(payload.role)

    # --- Modo mock ---
    if settings.use_mock:
        store: MockStore = get_store()
        if store.get_user_by_email(payload.email):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="El correo ya está registrado (mock).",
            )
        user = store.create_user(
            payload.email, payload.password, role_value, full_name=payload.full_name
        )
        _set_session_cookie(request, response, MOCK_TOKEN)
        return AuthResponse(
            access_token=MOCK_TOKEN,
            user=User(
                id=user["id"],
                email=user["email"],
                full_name=user.get("full_name"),
                role=UserRole(user["role"]),
            ),
        )

    # --- Modo live (Supabase) ---
    supabase = get_supabase()
    if supabase is None:
        raise HTTPException(status_code=503, detail="Supabase no disponible.")

    # Creamos el usuario YA confirmado con la API admin (service_role). Así
    # register -> login funciona de inmediato, sin depender de la confirmación
    # por correo que pueda tener activada el proyecto.
    try:
        result = supabase.auth.admin.create_user(
            {
                "email": payload.email,
                "password": payload.password,
                "email_confirm": True,
                "user_metadata": {"role": role_value, "full_name": payload.full_name or ""},
            }
        )
    except Exception as exc:
        msg = str(exc).lower()
        if any(k in msg for k in ("already", "registered", "exists", "duplicate")):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="El correo ya está registrado.",
            ) from exc
        raise HTTPException(status_code=400, detail=f"Error al registrar: {exc}") from exc

    sb_user = getattr(result, "user", None)
    if sb_user is None:
        raise HTTPException(status_code=400, detail="No se pudo crear el usuario.")

    # El trigger handle_new_user() crea el perfil en 'profiles'; reforzamos
    # full_name/role de forma best-effort.
    try:
        supabase.table("profiles").update(
            {"full_name": payload.full_name or "", "role": role_value}
        ).eq("id", str(sb_user.id)).execute()
    except Exception:
        pass

    # Iniciamos sesión para devolver un token utilizable de inmediato.
    access_token = ""
    try:
        signin = supabase.auth.sign_in_with_password(
            {"email": payload.email, "password": payload.password}
        )
        access_token = getattr(getattr(signin, "session", None), "access_token", "") or ""
    except Exception:
        access_token = ""

    if access_token:
        _set_session_cookie(request, response, access_token)

    return AuthResponse(
        access_token=access_token or "",
        user=User(
            id=str(sb_user.id),
            email=payload.email,
            full_name=payload.full_name,
            role=UserRole(role_value),
        ),
    )


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, request: Request, response: Response) -> AuthResponse:
    """Inicia sesión y devuelve un token de acceso."""
    # --- Modo mock ---
    if settings.use_mock:
        store: MockStore = get_store()
        user = store.get_user_by_email(payload.email)
        # En demo aceptamos el usuario demo aunque no exista previamente.
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales inválidas (mock).",
            )
        if user.get("password") and user["password"] != payload.password:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales inválidas (mock).",
            )
        _set_session_cookie(request, response, MOCK_TOKEN)
        return AuthResponse(
            access_token=MOCK_TOKEN,
            user=User(
                id=user["id"],
                email=user["email"],
                full_name=user.get("full_name"),
                role=UserRole(user["role"]),
            ),
        )

    # --- Modo live (Supabase) ---
    supabase = get_supabase()
    if supabase is None:
        raise HTTPException(status_code=503, detail="Supabase no disponible.")

    try:
        result = supabase.auth.sign_in_with_password(
            {"email": payload.email, "password": payload.password}
        )
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Credenciales inválidas.") from exc

    sb_user = getattr(result, "user", None)
    session = getattr(result, "session", None)
    if sb_user is None or session is None:
        raise HTTPException(status_code=401, detail="Credenciales inválidas.")

    metadata = getattr(sb_user, "user_metadata", None) or {}
    role = metadata.get("role", "business_owner")
    try:
        role_enum = UserRole(role)
    except ValueError:
        role_enum = UserRole.business_owner

    _set_session_cookie(request, response, session.access_token)

    return AuthResponse(
        access_token=session.access_token,
        user=User(
            id=str(sb_user.id),
            email=str(sb_user.email or payload.email),
            full_name=metadata.get("full_name"),
            role=role_enum,
        ),
    )


@router.get("/me", response_model=User)
def me(current_user: User = Depends(get_current_user)) -> User:
    """Devuelve el usuario autenticado actual."""
    return current_user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
def logout(request: Request, response: Response) -> None:
    """Borra la cookie de sesión (mismos atributos con que se creó)."""
    secure = _is_https_request(request)
    response.delete_cookie(
        key=ACCESS_TOKEN_COOKIE,
        path="/",
        secure=secure,
        samesite="none" if secure else "lax",
    )
