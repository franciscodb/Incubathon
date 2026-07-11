"""Almacén en memoria (modo mock).

Permite demostrar la API completa SIN credenciales de Supabase. Se siembra con:

- 1 usuario dueño de negocio (business_owner) + 1 usuario profesional.
- 2 negocios (un restaurante con alcohol y una cafetería) con sus
  business_procedures generados por el motor de reglas (algunos marcados como
  ``vigente`` / ``en_tramite`` para dar realismo).
- 5 profesionales de distintas especialidades (algunos verificados) con sus
  certificaciones.

Expone helpers CRUD que consumen los routers cuando ``settings.use_mock``.
"""

from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Any, Optional

from . import rules_engine

# ID fijo del usuario demo (el que devuelve get_current_user en modo mock).
DEMO_OWNER_ID = "user-demo-owner"
DEMO_OWNER_EMAIL = "demo@buro.mx"
DEMO_OWNER_PASSWORD = "demo1234"
DEMO_PRO_ID = "user-demo-pro"
DEMO_PRO_EMAIL = "pro@buro.mx"

# Token ficticio usado en modo mock.
MOCK_TOKEN = "mock-demo-token"


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _new_id(prefix: str = "") -> str:
    return f"{prefix}{uuid.uuid4().hex[:12]}"


class MockStore:
    """Contenedor de datos en memoria con helpers CRUD."""

    def __init__(self) -> None:
        self.users: dict[str, dict] = {}
        self.businesses: dict[str, dict] = {}
        self.business_procedures: dict[str, dict] = {}  # id -> registro
        self.documents: dict[str, dict] = {}
        self.professionals: dict[str, dict] = {}
        self.certifications: dict[str, dict] = {}
        self.contact_requests: dict[str, dict] = {}
        self.subscriptions: dict[str, dict] = {}  # account_id -> suscripción
        self.reviews: dict[str, dict] = {}  # id -> reseña de profesional
        self._seed()

    # ------------------------------------------------------------------
    # Semilla de datos demo
    # ------------------------------------------------------------------
    def _seed(self) -> None:
        today = date.today()

        # --- Usuarios ---
        self.users[DEMO_OWNER_ID] = {
            "id": DEMO_OWNER_ID,
            "email": DEMO_OWNER_EMAIL,
            "password": DEMO_OWNER_PASSWORD,
            "full_name": "Dueño Demo",
            "role": "business_owner",
        }
        self.users[DEMO_PRO_ID] = {
            "id": DEMO_PRO_ID,
            "email": DEMO_PRO_EMAIL,
            "password": "pro1234",
            "full_name": "Profesional Demo",
            "role": "professional",
        }

        # --- Negocio 1: restaurante con alcohol ---
        biz1_id = "biz-restaurante-los-compadres"
        biz1 = {
            "id": biz1_id,
            "owner_id": DEMO_OWNER_ID,
            "nombre": "Restaurante Los Compadres",
            "razon_social": "Los Compadres del Centro S.A. de C.V.",
            "rfc": "LCC240115AB1",
            "direccion": "Av. 5 de Mayo 45, Centro, Cuauhtémoc, CDMX",
            "giro": "restaurante",
            "alcaldia": "cuauhtemoc",
            "superficie_m2": 180,
            "aforo": 80,
            "num_trabajadores": 12,
            "vende_alcohol": True,
            "usa_gas": True,
            "tiene_terraza": True,
            "tiene_anuncios": True,
            "genera_residuos_especiales": True,
            "nivel_ruido": "alto",
            "inmueble": "rentado",
            "realiza_construccion": False,
            "created_at": _now(),
            "updated_at": _now(),
        }
        biz1["nivel_impacto"] = rules_engine.classify(biz1)
        self.businesses[biz1_id] = biz1

        # Procedimientos generados por el motor de reglas.
        procs1 = rules_engine.generate_business_procedures(biz1)
        # Overrides para realismo (por código).
        overrides1 = {
            "RFC_SAT": {"status": "vigente"},
            "AVISO_APERTURA": {"status": "vigente"},
            "USO_SUELO": {"status": "vigente"},
            "AVISO_SANITARIO_COFEPRIS": {"status": "vigente"},
            "IMSS_PATRONAL": {"status": "vigente"},
            "SACMEX_DESCARGAS": {"status": "vigente"},
            "PROTECCION_CIVIL_PIPC": {
                "status": "vigente",
                "fecha_vencimiento": (today + timedelta(days=18)).isoformat(),
            },
            "DICTAMEN_GAS": {"status": "en_tramite"},
            "PERMISO_ALCOHOL": {"status": "pendiente"},  # crítico -> rojo
            "ESTUDIO_RUIDO": {"status": "en_tramite"},
        }
        self._insert_business_procedures(biz1_id, procs1, overrides1)

        # --- Negocio 2: cafetería ---
        biz2_id = "biz-cafe-aroma"
        biz2 = {
            "id": biz2_id,
            "owner_id": DEMO_OWNER_ID,
            "nombre": "Café Aroma",
            "razon_social": None,
            "rfc": "CAAR250320Xy2",
            "direccion": "Calle Ayuntamiento 12, Del Valle, Benito Juárez, CDMX",
            "giro": "cafeteria",
            "alcaldia": "benito_juarez",
            "superficie_m2": 45,
            "aforo": 20,
            "num_trabajadores": 4,
            "vende_alcohol": False,
            "usa_gas": True,
            "tiene_terraza": False,
            "tiene_anuncios": True,
            "genera_residuos_especiales": False,
            "nivel_ruido": "bajo",
            "inmueble": "rentado",
            "realiza_construccion": False,
            "created_at": _now(),
            "updated_at": _now(),
        }
        biz2["nivel_impacto"] = rules_engine.classify(biz2)
        self.businesses[biz2_id] = biz2

        procs2 = rules_engine.generate_business_procedures(biz2)
        overrides2 = {
            "RFC_SAT": {"status": "vigente"},
            "AVISO_APERTURA": {"status": "vigente"},
            "AVISO_SANITARIO_COFEPRIS": {"status": "vigente"},
            "IMSS_PATRONAL": {"status": "vigente"},
            "DICTAMEN_GAS": {
                "status": "vigente",
                "fecha_vencimiento": (today + timedelta(days=45)).isoformat(),
            },
            "LICENCIA_ANUNCIOS": {"status": "en_tramite"},
        }
        self._insert_business_procedures(biz2_id, procs2, overrides2)

        # --- Documento demo (asociado al aviso sanitario del restaurante) ---
        doc_id = _new_id("doc-")
        self.documents[doc_id] = {
            "id": doc_id,
            "business_id": biz1_id,
            "procedure_code": "AVISO_SANITARIO_COFEPRIS",
            "name": "aviso_sanitario_cofepris.pdf",
            "file_url": "https://mock.storage/documents/aviso_sanitario_cofepris.pdf",
            "file_path": f"{biz1_id}/aviso_sanitario_cofepris.pdf",
            "mime_type": "application/pdf",
            "fecha_emision": (today - timedelta(days=200)).isoformat(),
            "fecha_vencimiento": None,
            "uploaded_by": DEMO_OWNER_ID,
            "created_at": _now(),
        }

        # --- Suscripción demo del dueño (plan activo que cubre sus negocios) ---
        self.subscriptions[DEMO_OWNER_ID] = {
            "id": _new_id("sub-"),
            "account_id": DEMO_OWNER_ID,
            "status": "active",
            "seats": 5,
            "alcohol_businesses": 1,
            "interval": "monthly",
            "amount_cents": (5 * 320 + 1 * 250) * 100,
            "currency": "mxn",
            "stripe_customer_id": None,
            "stripe_subscription_id": None,
            "current_period_end": (today + timedelta(days=27)).isoformat(),
            "created_at": _now(),
            "updated_at": _now(),
        }

        # --- Profesionales del marketplace ---
        self._seed_professionals()

        # --- Conexiones y reseñas demo ---
        self._seed_engagements_and_reviews(biz1_id)

    def _insert_business_procedures(
        self, business_id: str, procs: list[dict], overrides: dict[str, dict]
    ) -> None:
        """Inserta business_procedures aplicando overrides por código."""
        for p in procs:
            code = p["procedure_code"]
            record = {
                "id": _new_id("bp-"),
                "business_id": business_id,
                "procedure_code": code,
                "status": p["status"],
                "fecha_vencimiento": p["fecha_vencimiento"],
                "document_id": p["document_id"],
                "updated_at": _now(),
            }
            if code in overrides:
                record.update(overrides[code])
            self.business_procedures[record["id"]] = record

    def _seed_professionals(self) -> None:
        seed: list[dict] = [
            {
                "nombre": "Arq. Laura Méndez",
                "profesion": "Arquitecta / DRO",
                "especialidades": ["DRO", "corresponsable_obra"],
                "procedures_codes": ["VBSO"],
                "bio": "Directora Responsable de Obra con registro vigente. "
                "Dictámenes de seguridad estructural y VBSO.",
                "email": "laura.mendez@dro.mx",
                "telefono": "55-1234-5678",
                "verified": True,
                "rating": 4.8,
                "reviews_count": 24,
                "user_id": None,
                "certs": [
                    {
                        "nombre": "Registro DRO ante SEDUVI",
                        "emisor": "SEDUVI CDMX",
                        "verified": True,
                    }
                ],
            },
            {
                "nombre": "Ing. Roberto Salas (Tercero Acreditado)",
                "profesion": "Ingeniero / Tercero Acreditado",
                "especialidades": ["proteccion_civil", "tercero_acreditado"],
                "procedures_codes": ["PROTECCION_CIVIL_PIPC", "VBSO"],
                "bio": "Tercero Acreditado ante la SGIRPC. Elaboración y "
                "registro de Programas Internos de Protección Civil.",
                "email": "roberto.salas@pc.mx",
                "telefono": "55-2345-6789",
                "verified": True,
                "rating": 4.6,
                "reviews_count": 18,
                "user_id": DEMO_PRO_ID,
                "certs": [
                    {
                        "nombre": "Acreditación de Tercero Acreditado",
                        "emisor": "SGIRPC CDMX",
                        "verified": True,
                    }
                ],
            },
            {
                "nombre": "Verificaciones GasSeguro S.C.",
                "profesion": "Unidad de Verificación de Gas",
                "especialidades": ["unidad_verificacion_gas"],
                "procedures_codes": ["DICTAMEN_GAS"],
                "bio": "Unidad de verificación acreditada ante la EMA para "
                "instalaciones de gas L.P. (NOM-004-SEDG-2004).",
                "email": "contacto@gasseguro.mx",
                "telefono": "55-3456-7890",
                "verified": True,
                "rating": 4.5,
                "reviews_count": 31,
                "user_id": None,
                "certs": [
                    {
                        "nombre": "Acreditación EMA",
                        "emisor": "Entidad Mexicana de Acreditación",
                        "verified": True,
                    }
                ],
            },
            {
                "nombre": "Lic. Fernanda Ortiz",
                "profesion": "Abogada",
                "especialidades": ["abogado", "regulatorio"],
                "procedures_codes": [
                    "PERMISO_ALCOHOL",
                    "USO_SUELO",
                    "LICENCIA_ANUNCIOS",
                    "AUTORIZACION_ENSERES",
                    "AVISO_APERTURA",
                ],
                "bio": "Abogada especialista en derecho administrativo y "
                "permisos de establecimientos mercantiles en CDMX.",
                "email": "fernanda.ortiz@legal.mx",
                "telefono": "55-4567-8901",
                "verified": False,
                "rating": 4.2,
                "reviews_count": 9,
                "user_id": None,
                "certs": [
                    {
                        "nombre": "Cédula profesional",
                        "emisor": "SEP",
                        "verified": False,
                    }
                ],
            },
            {
                "nombre": "Laboratorio Acústico AcustiLab",
                "profesion": "Laboratorio de ensayo acreditado",
                "especialidades": ["laboratorio_acustico", "ambiental"],
                "procedures_codes": ["ESTUDIO_RUIDO"],
                "bio": "Laboratorio acreditado para estudios de ruido "
                "conforme a la NADF-005-AMBT-2013.",
                "email": "hola@acustilab.mx",
                "telefono": "55-5678-9012",
                "verified": True,
                "rating": 4.7,
                "reviews_count": 15,
                "user_id": None,
                "certs": [
                    {
                        "nombre": "Acreditación laboratorio de ensayo",
                        "emisor": "EMA",
                        "verified": True,
                    }
                ],
            },
        ]

        for item in seed:
            pro_id = _new_id("pro-")
            certs_seed = item.pop("certs", [])
            profile = {
                "id": pro_id,
                "user_id": item.get("user_id"),
                "nombre": item["nombre"],
                "profesion": item.get("profesion"),
                "especialidades": item.get("especialidades", []),
                "procedures_codes": item.get("procedures_codes", []),
                "cedula": item.get("cedula"),
                "bio": item.get("bio"),
                "ciudad": "Ciudad de México",
                "alcaldias": item.get("alcaldias", []),
                "telefono": item.get("telefono"),
                "email": item.get("email"),
                "sitio_web": item.get("sitio_web"),
                "verified": item.get("verified", False),
                "rating": item.get("rating", 0),
                "reviews_count": item.get("reviews_count", 0),
                "created_at": _now(),
            }
            self.professionals[pro_id] = profile
            for c in certs_seed:
                cert_id = _new_id("cert-")
                self.certifications[cert_id] = {
                    "id": cert_id,
                    "professional_id": pro_id,
                    "nombre": c["nombre"],
                    "emisor": c.get("emisor"),
                    "file_path": c.get("file_path"),
                    "file_url": c.get("file_url"),
                    "fecha_emision": c.get("fecha_emision"),
                    "fecha_vencimiento": c.get("fecha_vencimiento"),
                    "verified": c.get("verified", False),
                    "created_at": _now(),
                }

    def _seed_engagements_and_reviews(self, biz1_id: str) -> None:
        """Siembra conexiones (contact_requests) y reseñas de ejemplo.

        Deja al dueño demo con una conexión *cerrada* con un profesional para
        que pueda evaluarlo (y así demostrar el flujo de evaluación), más un par
        de reseñas de otros usuarios para que la sección no luzca vacía.
        """
        pros = list(self.professionals.values())
        if not pros:
            return
        pro0 = pros[0]  # Arq. Laura Méndez (verificada)

        # Conexión cerrada del dueño demo con pro0 (habilita su evaluación).
        cr_id = _new_id("cr-")
        self.contact_requests[cr_id] = {
            "id": cr_id,
            "requester_id": DEMO_OWNER_ID,
            "business_id": biz1_id,
            "professional_id": pro0["id"],
            "procedure_code": "VBSO",
            "message": "Necesito apoyo con el Visto Bueno de Seguridad y Operación.",
            "status": "cerrado",
            "created_at": _now(),
        }

        # Reseñas de otros usuarios (solo para mostrar).
        seed_reviews = [
            {
                "professional_id": pro0["id"],
                "rating": 5,
                "comment": "Resolvió el VBSO en tiempo récord y muy clara con los requisitos.",
                "author_name": "María G.",
            },
            {
                "professional_id": pro0["id"],
                "rating": 4,
                "comment": "Buen acompañamiento en el trámite. Recomendada.",
                "author_name": "Jorge L.",
            },
        ]
        for r in seed_reviews:
            rid = _new_id("rev-")
            self.reviews[rid] = {
                "id": rid,
                "professional_id": r["professional_id"],
                "requester_id": None,
                "business_id": None,
                "contact_request_id": None,
                "rating": r["rating"],
                "comment": r["comment"],
                "author_name": r["author_name"],
                "created_at": _now(),
            }

    # ------------------------------------------------------------------
    # Usuarios
    # ------------------------------------------------------------------
    def get_user(self, user_id: str) -> Optional[dict]:
        return self.users.get(user_id)

    def get_user_by_email(self, email: str) -> Optional[dict]:
        for u in self.users.values():
            if u["email"].lower() == email.lower():
                return u
        return None

    def create_user(
        self, email: str, password: str, role: str, full_name: Optional[str] = None
    ) -> dict:
        user = {
            "id": _new_id("user-"),
            "email": email,
            "password": password,
            "full_name": full_name or "",
            "role": role,
        }
        self.users[user["id"]] = user
        return user

    # ------------------------------------------------------------------
    # Negocios
    # ------------------------------------------------------------------
    def list_businesses(self, owner_id: str) -> list[dict]:
        return [b for b in self.businesses.values() if b["owner_id"] == owner_id]

    def get_business(self, business_id: str) -> Optional[dict]:
        return self.businesses.get(business_id)

    def create_business(self, owner_id: str, data: dict) -> dict:
        """Crea un negocio, lo clasifica y genera sus business_procedures."""
        biz_id = _new_id("biz-")
        business = dict(data)
        business.update(
            {
                "id": biz_id,
                "owner_id": owner_id,
                "created_at": _now(),
                "updated_at": _now(),
            }
        )
        business["nivel_impacto"] = rules_engine.classify(business)
        self.businesses[biz_id] = business

        procs = rules_engine.generate_business_procedures(business)
        self._insert_business_procedures(biz_id, procs, overrides={})
        return business

    def update_business(self, business_id: str, data: dict) -> Optional[dict]:
        business = self.businesses.get(business_id)
        if not business:
            return None
        for k, v in data.items():
            if v is not None:
                business[k] = v
        business["nivel_impacto"] = rules_engine.classify(business)
        business["updated_at"] = _now()
        return business

    # ------------------------------------------------------------------
    # Business procedures
    # ------------------------------------------------------------------
    def list_business_procedures(self, business_id: str) -> list[dict]:
        return [
            bp
            for bp in self.business_procedures.values()
            if bp["business_id"] == business_id
        ]

    def get_business_procedure(
        self, business_id: str, procedure_code: str
    ) -> Optional[dict]:
        for bp in self.business_procedures.values():
            if bp["business_id"] == business_id and bp["procedure_code"] == procedure_code:
                return bp
        return None

    def update_business_procedure(
        self, business_id: str, procedure_code: str, data: dict
    ) -> Optional[dict]:
        bp = self.get_business_procedure(business_id, procedure_code)
        if not bp:
            return None
        for k, v in data.items():
            if v is not None:
                bp[k] = v
        bp["updated_at"] = _now()
        return bp

    # ------------------------------------------------------------------
    # Documentos
    # ------------------------------------------------------------------
    def list_documents(self, business_id: str) -> list[dict]:
        return [
            d for d in self.documents.values() if d["business_id"] == business_id
        ]

    def create_document(self, business_id: str, data: dict) -> dict:
        doc_id = _new_id("doc-")
        doc = {
            "id": doc_id,
            "business_id": business_id,
            "procedure_code": data.get("procedure_code"),
            "name": data.get("name"),
            "file_url": data.get("file_url"),
            "file_path": data.get("file_path"),
            "mime_type": data.get("mime_type"),
            "fecha_emision": data.get("fecha_emision"),
            "fecha_vencimiento": data.get("fecha_vencimiento"),
            "uploaded_by": data.get("uploaded_by"),
            "created_at": _now(),
        }
        self.documents[doc_id] = doc
        return doc

    # ------------------------------------------------------------------
    # Profesionales
    # ------------------------------------------------------------------
    def list_professionals(
        self,
        especialidad: Optional[str] = None,
        procedure_code: Optional[str] = None,
        verified: Optional[bool] = None,
    ) -> list[dict]:
        result = []
        for p in self.professionals.values():
            if especialidad:
                esp = especialidad.lower()
                match = esp in [e.lower() for e in p.get("especialidades", [])]
                if not match:
                    continue
            if procedure_code and procedure_code not in p.get("procedures_codes", []):
                continue
            if verified is not None and bool(p.get("verified")) != verified:
                continue
            result.append(self._professional_with_certs(p))
        return result

    def get_professional_by_user(self, user_id: str) -> Optional[dict]:
        for p in self.professionals.values():
            if p.get("user_id") == user_id:
                return self._professional_with_certs(p)
        return None

    def get_professional(self, professional_id: str) -> Optional[dict]:
        p = self.professionals.get(professional_id)
        if not p:
            return None
        return self._professional_with_certs(p)

    def _professional_with_certs(self, p: dict) -> dict:
        certs = [
            c
            for c in self.certifications.values()
            if c["professional_id"] == p["id"]
        ]
        return {**p, "certifications": certs}

    def _build_professional(self, data: dict, user_id: Optional[str], pro_id: str) -> dict:
        return {
            "id": pro_id,
            "user_id": user_id,
            "nombre": data.get("nombre"),
            "profesion": data.get("profesion"),
            "especialidades": data.get("especialidades", []),
            "procedures_codes": data.get("procedures_codes", []),
            "cedula": data.get("cedula"),
            "bio": data.get("bio"),
            "ciudad": data.get("ciudad", "Ciudad de México"),
            "alcaldias": data.get("alcaldias", []),
            "telefono": data.get("telefono"),
            "email": data.get("email"),
            "sitio_web": data.get("sitio_web"),
            "verified": False,
            "rating": 0,
            "reviews_count": 0,
            "created_at": _now(),
        }

    def create_professional(self, data: dict, user_id: Optional[str] = None) -> dict:
        pro_id = _new_id("pro-")
        profile = self._build_professional(data, user_id, pro_id)
        self.professionals[pro_id] = profile
        return self._professional_with_certs(profile)

    def upsert_professional(self, user_id: str, data: dict) -> dict:
        """Crea o actualiza el perfil profesional de un usuario."""
        for p in self.professionals.values():
            if p.get("user_id") == user_id:
                for k, v in data.items():
                    p[k] = v
                return self._professional_with_certs(p)
        return self.create_professional(data, user_id=user_id)

    def add_certification(self, professional_id: str, data: dict) -> Optional[dict]:
        if professional_id not in self.professionals:
            return None
        cert_id = _new_id("cert-")
        cert = {
            "id": cert_id,
            "professional_id": professional_id,
            "nombre": data.get("nombre"),
            "emisor": data.get("emisor"),
            "file_path": data.get("file_path"),
            "file_url": data.get("file_url"),
            "fecha_emision": data.get("fecha_emision"),
            "fecha_vencimiento": data.get("fecha_vencimiento"),
            "verified": False,
            "created_at": _now(),
        }
        self.certifications[cert_id] = cert
        return cert

    # ------------------------------------------------------------------
    # Suscripciones
    # ------------------------------------------------------------------
    def get_subscription(self, account_id: str) -> Optional[dict]:
        return self.subscriptions.get(account_id)

    def upsert_subscription(self, account_id: str, data: dict) -> dict:
        existing = self.subscriptions.get(account_id)
        if existing:
            existing.update(data)
            existing["updated_at"] = _now()
            return existing
        sub = {
            "id": _new_id("sub-"),
            "account_id": account_id,
            "created_at": _now(),
            "updated_at": _now(),
            **data,
        }
        self.subscriptions[account_id] = sub
        return sub

    # ------------------------------------------------------------------
    # Solicitudes de contacto
    # ------------------------------------------------------------------
    def _enrich_contact_request(self, req: dict) -> dict:
        """Agrega nombres del profesional / negocio para el frontend."""
        pro = self.professionals.get(req.get("professional_id") or "")
        biz = self.businesses.get(req.get("business_id") or "")
        return {
            **req,
            "professional_nombre": pro.get("nombre") if pro else None,
            "business_nombre": biz.get("nombre") if biz else None,
        }

    def list_contact_requests(self, requester_id: str) -> list[dict]:
        return [
            self._enrich_contact_request(c)
            for c in self.contact_requests.values()
            if c["requester_id"] == requester_id
        ]

    def get_contact_request(self, req_id: str) -> Optional[dict]:
        return self.contact_requests.get(req_id)

    def create_contact_request(self, requester_id: str, data: dict) -> dict:
        req_id = _new_id("cr-")
        req = {
            "id": req_id,
            "requester_id": requester_id,
            "business_id": data.get("business_id"),
            "professional_id": data.get("professional_id"),
            "procedure_code": data.get("procedure_code"),
            "message": data.get("message"),
            "status": "nuevo",
            "created_at": _now(),
        }
        self.contact_requests[req_id] = req
        return self._enrich_contact_request(req)

    def update_contact_request(self, req_id: str, data: dict) -> Optional[dict]:
        req = self.contact_requests.get(req_id)
        if not req:
            return None
        for k, v in data.items():
            if v is not None:
                req[k] = v
        return self._enrich_contact_request(req)

    # ------------------------------------------------------------------
    # Reseñas / evaluación de profesionales
    # ------------------------------------------------------------------
    def list_reviews(self, professional_id: str) -> list[dict]:
        rows = [
            r for r in self.reviews.values() if r["professional_id"] == professional_id
        ]
        return sorted(rows, key=lambda r: r["created_at"], reverse=True)

    def has_completed_engagement(self, requester_id: str, professional_id: str) -> bool:
        """True si el usuario tuvo una conexión *cerrada* con el profesional."""
        return any(
            c["requester_id"] == requester_id
            and c["professional_id"] == professional_id
            and c.get("status") == "cerrado"
            for c in self.contact_requests.values()
        )

    def get_user_review(self, requester_id: str, professional_id: str) -> Optional[dict]:
        for r in self.reviews.values():
            if r.get("requester_id") == requester_id and r["professional_id"] == professional_id:
                return r
        return None

    def create_review(self, requester_id: str, professional_id: str, data: dict) -> dict:
        rid = _new_id("rev-")
        user = self.users.get(requester_id) or {}
        review = {
            "id": rid,
            "professional_id": professional_id,
            "requester_id": requester_id,
            "business_id": data.get("business_id"),
            "contact_request_id": data.get("contact_request_id"),
            "rating": int(data.get("rating", 5)),
            "comment": data.get("comment"),
            "author_name": user.get("full_name") or "Cliente verificado",
            "created_at": _now(),
        }
        self.reviews[rid] = review
        self._recompute_rating(professional_id, int(review["rating"]))
        return review

    def _recompute_rating(self, professional_id: str, new_rating: int) -> None:
        """Actualiza el agregado rating/reviews_count de forma incremental.

        Mezcla la nueva reseña con el agregado existente (que puede incluir
        historial fuera de la plataforma), sin perder los números previos.
        """
        pro = self.professionals.get(professional_id)
        if not pro:
            return
        prev_count = int(pro.get("reviews_count", 0) or 0)
        prev_rating = float(pro.get("rating", 0) or 0)
        total = prev_rating * prev_count + new_rating
        new_count = prev_count + 1
        pro["reviews_count"] = new_count
        pro["rating"] = round(total / new_count, 1)


# ---------------------------------------------------------------------------
# Singleton del store
# ---------------------------------------------------------------------------
_store: Optional[MockStore] = None


def get_store() -> MockStore:
    """Devuelve el singleton del almacén en memoria (lazy)."""
    global _store
    if _store is None:
        _store = MockStore()
    return _store
