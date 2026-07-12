"""Modelos Pydantic (v2) de la API.

Contiene enums de dominio, modelos de entrada/salida y modelos de respuesta.
Los nombres de campo del negocio coinciden EXACTAMENTE con `shared/rules.md`.
"""

from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from .pricing import FREE_SEATS as FREE_SEATS_DEFAULT


# ---------------------------------------------------------------------------
# Enums de dominio
# ---------------------------------------------------------------------------
class Giro(str, Enum):
    """Giro del establecimiento de Alimentos y Bebidas."""

    restaurante = "restaurante"
    cafeteria = "cafeteria"
    bar = "bar"
    cantina = "cantina"
    fonda = "fonda"
    food_truck = "food_truck"
    otro = "otro"


class Alcaldia(str, Enum):
    """Las 16 alcaldías de la Ciudad de México."""

    alvaro_obregon = "alvaro_obregon"
    azcapotzalco = "azcapotzalco"
    benito_juarez = "benito_juarez"
    coyoacan = "coyoacan"
    cuajimalpa = "cuajimalpa"
    cuauhtemoc = "cuauhtemoc"
    gustavo_a_madero = "gustavo_a_madero"
    iztacalco = "iztacalco"
    iztapalapa = "iztapalapa"
    magdalena_contreras = "magdalena_contreras"
    miguel_hidalgo = "miguel_hidalgo"
    milpa_alta = "milpa_alta"
    tlahuac = "tlahuac"
    tlalpan = "tlalpan"
    venustiano_carranza = "venustiano_carranza"
    xochimilco = "xochimilco"


class NivelRuido(str, Enum):
    bajo = "bajo"
    medio = "medio"
    alto = "alto"


class Inmueble(str, Enum):
    propio = "propio"
    rentado = "rentado"


class NivelImpacto(str, Enum):
    """Clasificación del negocio derivada del motor de reglas."""

    bajo = "bajo"
    vecinal = "vecinal"
    zonal = "zonal"


class ProcedureStatus(str, Enum):
    """Estatus de un trámite aplicado a un negocio (business_procedure)."""

    pendiente = "pendiente"
    en_tramite = "en_tramite"
    vigente = "vigente"
    vencido = "vencido"
    no_aplica = "no_aplica"


class Semaforo(str, Enum):
    """Colores del semáforo de cumplimiento (derivados, no se almacenan)."""

    verde = "verde"
    amarillo = "amarillo"
    naranja = "naranja"
    rojo = "rojo"


class Criticality(str, Enum):
    alta = "alta"
    media = "media"
    baja = "baja"


class UserRole(str, Enum):
    business_owner = "business_owner"
    professional = "professional"
    admin = "admin"


# ---------------------------------------------------------------------------
# Usuarios / Auth
# ---------------------------------------------------------------------------
class User(BaseModel):
    """Usuario autenticado (perfil). Espeja la tabla profiles."""

    id: str
    email: str
    full_name: Optional[str] = None
    phone: Optional[str] = None
    role: UserRole = UserRole.business_owner

    model_config = ConfigDict(use_enum_values=True)


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, description="Contraseña (mínimo 6 caracteres).")
    full_name: Optional[str] = None
    role: UserRole = UserRole.business_owner


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    """Respuesta de login/registro con token de acceso y usuario."""

    access_token: str
    token_type: str = "bearer"
    user: User


# ---------------------------------------------------------------------------
# Negocios (businesses)
# ---------------------------------------------------------------------------
class BusinessBase(BaseModel):
    """Campos del Formulario de Datos Generales del negocio.

    Los nombres coinciden con `shared/rules.md`.
    """

    # Identidad
    nombre: str = Field(description="Nombre comercial del establecimiento.")
    razon_social: Optional[str] = Field(default=None, description="Razón social.")
    rfc: Optional[str] = Field(default=None, description="RFC del titular.")
    direccion: Optional[str] = Field(default=None, description="Dirección completa.")

    # Variables del motor de reglas
    giro: Giro
    # Texto libre: el frontend usa nombres display ("Cuauhtémoc") y la BD no
    # restringe el valor. El motor de reglas no depende de la alcaldía.
    alcaldia: str = Field(default="", description="Alcaldía de la CDMX.")
    superficie_m2: float = Field(default=0, ge=0, description="Superficie en m².")
    aforo: int = Field(default=0, ge=0, description="Aforo en personas.")
    num_trabajadores: int = Field(default=0, ge=0, description="Número de trabajadores.")
    vende_alcohol: bool = False
    usa_gas: bool = False
    tiene_terraza: bool = False
    tiene_anuncios: bool = False
    genera_residuos_especiales: bool = False
    nivel_ruido: NivelRuido = NivelRuido.bajo
    inmueble: Inmueble = Inmueble.rentado
    realiza_construccion: bool = False

    model_config = ConfigDict(use_enum_values=True)


class BusinessCreate(BusinessBase):
    """Payload para crear un negocio (nivel_impacto se calcula en el servidor)."""


class BusinessUpdate(BaseModel):
    """Payload para actualizar un negocio (todos los campos opcionales)."""

    nombre: Optional[str] = None
    razon_social: Optional[str] = None
    rfc: Optional[str] = None
    direccion: Optional[str] = None
    giro: Optional[Giro] = None
    alcaldia: Optional[str] = None
    superficie_m2: Optional[float] = Field(default=None, ge=0)
    aforo: Optional[int] = Field(default=None, ge=0)
    num_trabajadores: Optional[int] = Field(default=None, ge=0)
    vende_alcohol: Optional[bool] = None
    usa_gas: Optional[bool] = None
    tiene_terraza: Optional[bool] = None
    tiene_anuncios: Optional[bool] = None
    genera_residuos_especiales: Optional[bool] = None
    nivel_ruido: Optional[NivelRuido] = None
    inmueble: Optional[Inmueble] = None
    realiza_construccion: Optional[bool] = None

    model_config = ConfigDict(use_enum_values=True)


class Business(BusinessBase):
    """Negocio persistido, con id, dueño y clasificación."""

    id: str
    owner_id: str
    nivel_impacto: NivelImpacto = NivelImpacto.bajo
    photo_url: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(use_enum_values=True)


# ---------------------------------------------------------------------------
# Catálogo de trámites
# ---------------------------------------------------------------------------
class ProcedureStep(BaseModel):
    title: str
    detail: str


class ProcedureCatalogItem(BaseModel):
    """Elemento del catálogo de trámites (procedures_catalog)."""

    code: str
    name: str
    authority: str
    category: str
    criticality: Criticality
    vigencia_meses: Optional[int] = None
    estimated_cost: Optional[str] = None
    estimated_time: Optional[str] = None
    official_url: Optional[str] = None
    description: Optional[str] = None
    why: Optional[str] = None
    steps: list[ProcedureStep] = Field(default_factory=list)

    model_config = ConfigDict(use_enum_values=True)


# ---------------------------------------------------------------------------
# Trámites por negocio (business_procedures)
# ---------------------------------------------------------------------------
class BusinessProcedure(BaseModel):
    """Trámite aplicado a un negocio (coincide con la tabla business_procedures)."""

    id: Optional[str] = None
    business_id: str
    procedure_code: str
    status: ProcedureStatus = ProcedureStatus.pendiente
    fecha_inicio: Optional[date] = None
    fecha_emision: Optional[date] = None
    fecha_vencimiento: Optional[date] = None
    document_id: Optional[str] = None
    notas: Optional[str] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(use_enum_values=True)


class BusinessProcedureUpdate(BaseModel):
    """Payload PATCH para un trámite de negocio."""

    status: Optional[ProcedureStatus] = None
    fecha_inicio: Optional[date] = None
    fecha_emision: Optional[date] = None
    fecha_vencimiento: Optional[date] = None
    document_id: Optional[str] = None
    notas: Optional[str] = None

    model_config = ConfigDict(use_enum_values=True)


class BusinessProcedureView(BusinessProcedure):
    """Vista de un trámite de negocio con el color de semáforo derivado y el
    detalle del catálogo unido (para la Matriz de Cumplimiento)."""

    semaforo: Semaforo
    catalog: Optional[ProcedureCatalogItem] = None

    model_config = ConfigDict(use_enum_values=True)


class BusinessSummary(BaseModel):
    """Resumen de cumplimiento por negocio (semáforo global + puntaje)."""

    color: Semaforo
    cumplimiento_pct: int
    counts: dict[str, int]

    model_config = ConfigDict(use_enum_values=True)


class BusinessProceduresMatrix(BaseModel):
    """Respuesta de la matriz de cumplimiento de un negocio."""

    business_id: str
    nivel_impacto: NivelImpacto
    summary: BusinessSummary
    procedures: list[BusinessProcedureView]

    model_config = ConfigDict(use_enum_values=True)


# ---------------------------------------------------------------------------
# Documentos
# ---------------------------------------------------------------------------
class Document(BaseModel):
    """Documento almacenado (archivo en Storage + metadatos).

    Coincide con la tabla ``documents``: name / file_path / file_url / mime_type.
    """

    id: str
    business_id: str
    procedure_code: Optional[str] = None
    name: str
    file_path: Optional[str] = None
    file_url: Optional[str] = None
    mime_type: Optional[str] = None
    fecha_emision: Optional[date] = None
    fecha_vencimiento: Optional[date] = None
    uploaded_by: Optional[str] = None
    created_at: Optional[datetime] = None


# ---------------------------------------------------------------------------
# Profesionales (marketplace)
# ---------------------------------------------------------------------------
class Certification(BaseModel):
    """Certificación / credencial que avala a un profesional.

    Coincide con la tabla ``professional_certifications``.
    """

    id: str
    professional_id: str
    nombre: str = Field(description="Nombre de la certificación o credencial.")
    emisor: Optional[str] = Field(default=None, description="Entidad que la emite.")
    file_path: Optional[str] = None
    file_url: Optional[str] = None
    fecha_emision: Optional[date] = None
    fecha_vencimiento: Optional[date] = None
    verified: bool = False
    created_at: Optional[datetime] = None


class CertificationCreate(BaseModel):
    nombre: str
    emisor: Optional[str] = None
    file_path: Optional[str] = None
    file_url: Optional[str] = None
    fecha_emision: Optional[date] = None
    fecha_vencimiento: Optional[date] = None


class Professional(BaseModel):
    """Perfil de profesional del marketplace (coincide con la tabla professionals)."""

    id: str
    user_id: Optional[str] = None
    nombre: str
    profesion: Optional[str] = Field(
        default=None, description="Profesión, p.ej. 'Arquitecto', 'DRO', 'Abogado'."
    )
    especialidades: list[str] = Field(
        default_factory=list, description="Lista de especialidades."
    )
    procedures_codes: list[str] = Field(
        default_factory=list,
        description="Códigos de trámites que este profesional puede atender.",
    )
    cedula: Optional[str] = None
    bio: Optional[str] = None
    ciudad: Optional[str] = "Ciudad de México"
    alcaldias: list[str] = Field(default_factory=list)
    telefono: Optional[str] = None
    email: Optional[str] = None
    sitio_web: Optional[str] = None
    verified: bool = False
    rating: Optional[float] = 0
    reviews_count: Optional[int] = 0
    avatar_url: Optional[str] = None
    certifications: list[Certification] = Field(default_factory=list)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class ProfessionalCreate(BaseModel):
    """Payload de registro / actualización de perfil profesional."""

    nombre: str
    profesion: Optional[str] = None
    especialidades: list[str] = Field(default_factory=list)
    procedures_codes: list[str] = Field(default_factory=list)
    cedula: Optional[str] = None
    bio: Optional[str] = None
    ciudad: Optional[str] = "Ciudad de México"
    alcaldias: list[str] = Field(default_factory=list)
    telefono: Optional[str] = None
    email: Optional[EmailStr] = None
    sitio_web: Optional[str] = None


# ---------------------------------------------------------------------------
# Solicitudes de contacto (usuario <-> profesional)
# ---------------------------------------------------------------------------
class ContactRequestStatus(str, Enum):
    nuevo = "nuevo"
    contactado = "contactado"
    cerrado = "cerrado"


class ContactRequestCreate(BaseModel):
    professional_id: str
    business_id: Optional[str] = None
    procedure_code: Optional[str] = None
    message: str = Field(description="Mensaje del empresario al profesional.")


class ContactRequest(BaseModel):
    id: str
    requester_id: Optional[str] = None
    business_id: Optional[str] = None
    professional_id: str
    procedure_code: Optional[str] = None
    message: Optional[str] = None
    status: ContactRequestStatus = ContactRequestStatus.nuevo
    created_at: Optional[datetime] = None
    # Denormalizados para el frontend (nombre del profesional / negocio).
    professional_nombre: Optional[str] = None
    business_nombre: Optional[str] = None

    model_config = ConfigDict(use_enum_values=True)


class ContactRequestUpdate(BaseModel):
    """PATCH de una solicitud de contacto (avanzar el seguimiento)."""

    status: ContactRequestStatus


# ---------------------------------------------------------------------------
# Reseñas / evaluación de profesionales
# ---------------------------------------------------------------------------
class ReviewCreate(BaseModel):
    rating: int = Field(ge=1, le=5, description="Calificación de 1 a 5 estrellas.")
    comment: Optional[str] = Field(default=None, description="Comentario de la evaluación.")
    business_id: Optional[str] = None
    contact_request_id: Optional[str] = None


class Review(BaseModel):
    id: str
    professional_id: str
    requester_id: Optional[str] = None
    business_id: Optional[str] = None
    contact_request_id: Optional[str] = None
    rating: int
    comment: Optional[str] = None
    author_name: Optional[str] = None
    created_at: Optional[datetime] = None


# ---------------------------------------------------------------------------
# Suscripciones / Billing
# ---------------------------------------------------------------------------
class BillingInterval(str, Enum):
    monthly = "monthly"
    annual = "annual"


class SubscriptionStatus(str, Enum):
    free = "free"  # plan gratuito (freemium), sin pago
    active = "active"
    trialing = "trialing"
    past_due = "past_due"
    canceled = "canceled"
    incomplete = "incomplete"


class QuoteRequest(BaseModel):
    businesses: int = Field(default=1, ge=1, description="Total de negocios.")
    alcohol_businesses: int = Field(default=0, ge=0, description="Negocios con alcohol.")
    interval: BillingInterval = BillingInterval.monthly


class Quote(BaseModel):
    businesses: int
    alcohol_businesses: int
    interval: BillingInterval
    unit_price: int
    base_subtotal: int
    alcohol_surcharge: int
    monthly_total: int
    billed_total: int
    monthly_equivalent: int
    annual_savings: int
    amount_cents: int
    currency: str

    model_config = ConfigDict(use_enum_values=True)


class Subscription(BaseModel):
    id: Optional[str] = None
    account_id: str
    status: SubscriptionStatus = SubscriptionStatus.free
    seats: int = Field(default=0, description="Negocios que cubre el plan pagado.")
    alcohol_businesses: int = 0
    interval: BillingInterval = BillingInterval.monthly
    amount_cents: int = 0
    currency: str = "mxn"
    stripe_customer_id: Optional[str] = None
    stripe_subscription_id: Optional[str] = None
    current_period_end: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    # Derivados útiles para el frontend (cuántos negocios puede registrar).
    entitled_seats: int = Field(default=FREE_SEATS_DEFAULT, description="Negocios permitidos.")
    used_seats: int = 0

    model_config = ConfigDict(use_enum_values=True)


class CheckoutRequest(QuoteRequest):
    """Igual que QuoteRequest; el backend recalcula el monto por seguridad."""


class CheckoutResponse(BaseModel):
    url: str = Field(description="URL de Stripe Checkout o de éxito simulado.")
    simulated: bool = Field(default=False, description="True si no hay Stripe (demo).")
    quote: Quote


# ---------------------------------------------------------------------------
# Asesor IA (Asistente de cumplimiento)
# ---------------------------------------------------------------------------
class AssistantRole(str, Enum):
    user = "user"
    assistant = "assistant"


class AssistantMessage(BaseModel):
    """Un turno de la conversación con el Asesor CumplIA."""

    role: AssistantRole
    content: str = Field(min_length=1, max_length=4000)

    model_config = ConfigDict(use_enum_values=True)


class AssistantChatRequest(BaseModel):
    """Petición de chat al asesor. `business_id` aterriza la respuesta en un negocio."""

    messages: list[AssistantMessage] = Field(min_length=1)
    business_id: Optional[str] = Field(
        default=None, description="Negocio sobre el que se contextualiza la respuesta."
    )


class AssistantChatResponse(BaseModel):
    """Respuesta del asesor."""

    reply: str
    available: bool = Field(
        default=True, description="False si la IA no está configurada (sin ANTHROPIC_API_KEY)."
    )


# ---------------------------------------------------------------------------
# Respuestas utilitarias
# ---------------------------------------------------------------------------
class HealthResponse(BaseModel):
    status: str = "ok"
    mode: str  # 'mock' | 'live'


class MessageResponse(BaseModel):
    """Respuesta genérica con un mensaje."""

    message: str
    data: Optional[Any] = None
