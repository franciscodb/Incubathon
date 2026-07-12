"""Asesor CumplIA — asistente de cumplimiento con IA (Anthropic Claude).

Principio de diseño: **IA en los bordes, reglas en el núcleo**.
- El motor de reglas determinístico (`rules_engine`) sigue decidiendo qué trámites
  aplican, el semáforo y el puntaje — auditable, sin alucinaciones.
- La IA sólo *conversa y explica* sobre ese resultado: entiende lenguaje natural
  y aterriza las respuestas en el catálogo + el estado real del negocio.

Degradación segura (como el billing sin Stripe): si no hay `ANTHROPIC_API_KEY`,
el endpoint responde con un mensaje amable (`available=false`) en vez de romperse,
para que la demo siga corriendo.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from .. import rules_engine
from ..config import settings
from ..deps import get_current_user
from ..mock_store import get_store
from ..schemas import (
    AssistantChatRequest,
    AssistantChatResponse,
    User,
)
from ..supabase_client import get_supabase
from .businesses import _require_owned_business_live, _require_owned_business_mock

router = APIRouter(prefix="/assistant", tags=["assistant"])

# Cuántos turnos recientes de la conversación se envían al modelo (control de tokens).
_MAX_TURNS = 16

_SEMAFORO_LABEL = {
    "verde": "🟢 en regla",
    "amarillo": "🟡 por vencer",
    "naranja": "🟠 pendiente",
    "rojo": "🔴 crítico",
}


# ---------------------------------------------------------------------------
# Construcción del contexto (fuente de verdad: catálogo + motor de reglas)
# ---------------------------------------------------------------------------
def _catalog_block() -> str:
    """Resumen compacto del catálogo de trámites CDMX A&B."""
    lines: list[str] = []
    for item in rules_engine.load_catalog():
        vig = item.get("vigencia_meses")
        vig_txt = f"{vig} meses" if vig else "permanente"
        lines.append(
            f"- [{item['code']}] {item['name']} — autoridad: {item.get('authority', 'N/D')}"
            f" · criticidad: {item.get('criticality', 'media')} · vigencia: {vig_txt}."
            f" Por qué importa: {item.get('why') or item.get('description') or 'N/D'}"
        )
    return "\n".join(lines)


def _business_block(user: User, business_id: str) -> str | None:
    """Contexto real del negocio: datos + matriz de cumplimiento derivada por las reglas.

    Devuelve None si el negocio no existe o no pertenece al usuario (silencioso:
    el asesor simplemente responde de forma general).
    """
    try:
        if settings.use_mock:
            store = get_store()
            business = _require_owned_business_mock(store, business_id, user)
            bps = store.list_business_procedures(business_id)
        else:
            supabase = get_supabase()
            business = _require_owned_business_live(supabase, business_id, user)
            resp = (
                supabase.table("business_procedures")
                .select("*")
                .eq("business_id", business_id)
                .execute()
            )
            bps = resp.data or []
    except Exception:
        return None

    summary = rules_engine.business_summary(bps)
    counts = summary.get("counts", {})

    proc_lines: list[str] = []
    for bp in bps:
        code = bp.get("procedure_code")
        catalog_item = rules_engine.get_catalog_item(code) or {}
        criticality = catalog_item.get("criticality", "media")
        color = rules_engine.semaphore_for(
            bp.get("status"), criticality, bp.get("fecha_vencimiento")
        )
        venc = bp.get("fecha_vencimiento")
        venc_txt = f", vence {venc}" if venc else ""
        proc_lines.append(
            f"  - {catalog_item.get('name', code)} [{code}]: "
            f"estatus «{bp.get('status', 'pendiente')}» ({_SEMAFORO_LABEL.get(color, color)})"
            f"{venc_txt}"
        )

    header = (
        f"Negocio: «{business.get('nombre', 'N/D')}» "
        f"(giro: {business.get('giro', 'N/D')}, alcaldía: {business.get('alcaldia') or 'N/D'})\n"
        f"Clasificación de impacto: {business.get('nivel_impacto', 'bajo')} · "
        f"vende alcohol: {'sí' if business.get('vende_alcohol') else 'no'} · "
        f"aforo: {business.get('aforo', 0)} · superficie: {business.get('superficie_m2', 0)} m².\n"
        f"Semáforo global: {_SEMAFORO_LABEL.get(summary.get('color'), summary.get('color'))} · "
        f"cumplimiento: {summary.get('cumplimiento_pct', 0)}% · "
        f"({counts.get('rojo', 0)} críticos, {counts.get('naranja', 0)} pendientes, "
        f"{counts.get('amarillo', 0)} por vencer, {counts.get('verde', 0)} en regla).\n"
        f"Trámites aplicables y su estatus:"
    )
    return header + "\n" + "\n".join(proc_lines)


def _build_system_prompt(user: User, business_id: str | None) -> str:
    parts: list[str] = [
        "Eres «Asesor CumplIA», un asistente experto en cumplimiento regulatorio para "
        "negocios de Alimentos y Bebidas (restaurantes, bares, cafés) en la Ciudad de México. "
        "CumplIA es una plataforma tipo «buró de cumplimiento» con un semáforo (🟢🟡🟠🔴).",
        "",
        "REGLAS DE COMPORTAMIENTO:",
        "- Responde SOLO con base en el CATÁLOGO y el CONTEXTO DEL NEGOCIO que se te dan abajo. "
        "No inventes trámites, autoridades, costos ni requisitos que no estén ahí.",
        "- El semáforo, el puntaje y la lista de trámites los calcula un motor de reglas "
        "determinístico; NO los recalcules ni contradigas: interprétalos y explícalos.",
        "- Sé práctico y concreto: prioriza qué hacer primero (lo crítico/rojo y lo próximo a vencer).",
        "- Si te preguntan algo fuera de tu alcance o que requiere criterio profesional, dilo con "
        "honestidad y sugiere contactar a un profesional verificado en el marketplace de CumplIA.",
        "- Escribe en español (México), claro y conciso. Usa listas cortas cuando ayude. "
        "No des asesoría legal definitiva; eres una guía orientativa.",
        "",
        "CATÁLOGO DE TRÁMITES (CDMX, Alimentos y Bebidas):",
        _catalog_block(),
    ]

    if business_id:
        ctx = _business_block(user, business_id)
        if ctx:
            parts += ["", "CONTEXTO DEL NEGOCIO ACTUAL (datos reales del usuario):", ctx]
    else:
        parts += [
            "",
            "El usuario aún no seleccionó un negocio específico; responde de forma general y, "
            "si necesitas su situación, invítalo a revisar su tablero.",
        ]

    return "\n".join(parts)


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------
@router.post("/chat", response_model=AssistantChatResponse)
def chat(
    payload: AssistantChatRequest,
    current_user: User = Depends(get_current_user),
) -> AssistantChatResponse:
    """Conversa con el Asesor CumplIA, aterrizado en el negocio indicado."""
    # --- Degradación segura: sin llave, no rompemos la demo ---
    if not settings.has_anthropic:
        return AssistantChatResponse(
            available=False,
            reply=(
                "El Asesor IA aún no está configurado en este entorno. "
                "Para activarlo, define la variable ANTHROPIC_API_KEY en el backend. "
                "Mientras tanto, puedes revisar tu semáforo y tus trámites en el tablero, "
                "o contactar a un profesional en el marketplace."
            ),
        )

    system_prompt = _build_system_prompt(current_user, payload.business_id)

    # Sólo mandamos los turnos recientes para controlar tokens.
    turns = payload.messages[-_MAX_TURNS:]
    api_messages = [{"role": m.role, "content": m.content} for m in turns]

    try:
        import anthropic

        client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        resp = client.messages.create(
            model=settings.assistant_model,
            max_tokens=1024,
            system=system_prompt,
            messages=api_messages,
        )
        reply = "".join(
            getattr(block, "text", "")
            for block in resp.content
            if getattr(block, "type", None) == "text"
        ).strip()
        if not reply:
            reply = "No pude generar una respuesta. ¿Puedes reformular tu pregunta?"
        return AssistantChatResponse(reply=reply, available=True)
    except Exception:
        # Nunca tiramos la demo por un error de red / API: respondemos amable.
        return AssistantChatResponse(
            available=True,
            reply=(
                "Tuve un problema para responder en este momento. "
                "Vuelve a intentarlo en unos segundos."
            ),
        )
