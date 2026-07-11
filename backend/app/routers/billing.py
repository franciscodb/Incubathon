"""Endpoints de suscripciones (billing) con Stripe.

Modelo de negocio: se paga una suscripción por los negocios dados de alta
(precio híbrido por volumen + recargo por alcohol, ver ``pricing.py``). Los
pagos entre negocios y profesionales NO pasan por la plataforma: aquí sólo se
cobran las suscripciones.

- Con ``STRIPE_SECRET_KEY`` configurada: cobro real vía Stripe Checkout +
  webhook que activa la suscripción.
- Sin credenciales (modo demo): el checkout se *simula* y la suscripción se
  activa de inmediato, para que la demo funcione end-to-end.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status

from .. import pricing
from ..config import settings
from ..deps import get_current_user
from ..mock_store import get_store
from ..schemas import (
    CheckoutRequest,
    CheckoutResponse,
    Quote,
    QuoteRequest,
    Subscription,
    User,
)
from ..supabase_client import get_supabase

try:  # Stripe es opcional: en modo demo no hace falta.
    import stripe  # type: ignore
except Exception:  # pragma: no cover
    stripe = None  # type: ignore

router = APIRouter(prefix="/billing", tags=["billing"])


# ---------------------------------------------------------------------------
# Utilidades
# ---------------------------------------------------------------------------
def _now() -> datetime:
    return datetime.now(timezone.utc)


def _count_businesses(user: User) -> int:
    if settings.use_mock:
        return len(get_store().list_businesses(user.id))
    supabase = get_supabase()
    resp = (
        supabase.table("businesses")
        .select("id", count="exact")
        .eq("owner_id", user.id)
        .execute()
    )
    return resp.count or len(resp.data or [])


def _raw_subscription(user: User) -> dict | None:
    if settings.use_mock:
        return get_store().get_subscription(user.id)
    supabase = get_supabase()
    try:
        resp = (
            supabase.table("subscriptions")
            .select("*")
            .eq("account_id", user.id)
            .limit(1)
            .execute()
        )
    except Exception:
        # La tabla puede no existir aún (migración 0006 sin aplicar): sin
        # suscripción => plan gratuito, no rompemos la app.
        return None
    rows = resp.data or []
    return rows[0] if rows else None


def _save_subscription(user: User, data: dict) -> dict:
    if settings.use_mock:
        return get_store().upsert_subscription(user.id, data)
    supabase = get_supabase()
    existing = (
        supabase.table("subscriptions").select("id").eq("account_id", user.id).limit(1).execute()
    )
    payload = {**data, "account_id": user.id, "updated_at": _now().isoformat()}
    if existing.data:
        resp = (
            supabase.table("subscriptions")
            .update(payload)
            .eq("account_id", user.id)
            .execute()
        )
    else:
        resp = supabase.table("subscriptions").insert(payload).execute()
    rows = resp.data or []
    return rows[0] if rows else payload


def _to_subscription_model(user: User, raw: dict | None) -> Subscription:
    """Construye la respuesta Subscription, con asientos derivados."""
    used = _count_businesses(user)
    if not raw:
        return Subscription(
            account_id=user.id,
            status="free",
            seats=0,
            entitled_seats=pricing.entitled_seats("free", 0),
            used_seats=used,
        )
    status_val = raw.get("status", "free")
    seats = int(raw.get("seats", 0) or 0)
    return Subscription(
        **{k: v for k, v in raw.items() if k in Subscription.model_fields},
        entitled_seats=pricing.entitled_seats(status_val, seats),
        used_seats=used,
    )


def account_can_add_business(user: User) -> bool:
    """True si la cuenta tiene un asiento disponible para otro negocio.

    Fail-open: ante cualquier error de infraestructura de billing NO bloqueamos
    la creación de negocios (preferimos no romper el flujo del usuario).
    """
    try:
        raw = _raw_subscription(user)
        status_val = (raw or {}).get("status", "free")
        seats = int((raw or {}).get("seats", 0) or 0)
        entitled = pricing.entitled_seats(status_val, seats)
        return _count_businesses(user) < entitled
    except Exception:
        return True


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@router.get("/subscription", response_model=Subscription)
def get_subscription(current_user: User = Depends(get_current_user)) -> Subscription:
    """Devuelve la suscripción de la cuenta (o un plan gratuito si no hay)."""
    return _to_subscription_model(current_user, _raw_subscription(current_user))


@router.post("/quote", response_model=Quote)
def quote(payload: QuoteRequest) -> Quote:
    """Calcula la cotización de una suscripción (sin cobrar)."""
    q = pricing.compute_quote(payload.businesses, payload.alcohol_businesses, payload.interval)
    return Quote(**q)


@router.post("/checkout", response_model=CheckoutResponse)
def create_checkout(
    payload: CheckoutRequest, current_user: User = Depends(get_current_user)
) -> CheckoutResponse:
    """Inicia el checkout de la suscripción.

    Recalcula el monto en el servidor (nunca se confía en el cliente). Con
    Stripe configurado devuelve la URL de Checkout; si no, activa la
    suscripción de forma simulada y devuelve la URL de éxito.
    """
    q = pricing.compute_quote(payload.businesses, payload.alcohol_businesses, payload.interval)
    quote_model = Quote(**q)
    base = settings.checkout_base

    # --- Camino simulado (demo, sin credenciales de Stripe) ---
    if not settings.has_stripe or stripe is None:
        _save_subscription(
            current_user,
            {
                "status": "active",
                "seats": q["businesses"],
                "alcohol_businesses": q["alcohol_businesses"],
                "interval": q["interval"],
                "amount_cents": q["amount_cents"],
                "currency": q["currency"],
                "stripe_customer_id": None,
                "stripe_subscription_id": f"sim_{current_user.id[:8]}",
                "current_period_end": (
                    _now() + timedelta(days=365 if q["interval"] == "annual" else 30)
                ).isoformat(),
            },
        )
        return CheckoutResponse(
            url=f"{base}/precios/exito?simulated=1", simulated=True, quote=quote_model
        )

    # --- Camino real con Stripe ---
    stripe.api_key = settings.stripe_secret_key
    recurring_interval = "year" if q["interval"] == "annual" else "month"
    try:
        session = stripe.checkout.Session.create(
            mode="subscription",
            line_items=[
                {
                    "price_data": {
                        "currency": q["currency"],
                        "product_data": {
                            "name": "CumplIA — Suscripción",
                            "description": (
                                f"{q['businesses']} negocio(s), "
                                f"{q['alcohol_businesses']} con alcohol"
                            ),
                        },
                        "unit_amount": q["amount_cents"],
                        "recurring": {"interval": recurring_interval},
                    },
                    "quantity": 1,
                }
            ],
            client_reference_id=current_user.id,
            customer_email=current_user.email or None,
            metadata={
                "account_id": current_user.id,
                "businesses": str(q["businesses"]),
                "alcohol_businesses": str(q["alcohol_businesses"]),
                "interval": q["interval"],
                "amount_cents": str(q["amount_cents"]),
            },
            success_url=f"{base}/precios/exito?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{base}/precios?cancelado=1",
        )
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=502, detail=f"No se pudo iniciar el pago: {exc}") from exc

    # Marca la suscripción como incompleta hasta que el webhook la active.
    _save_subscription(
        current_user,
        {
            "status": "incomplete",
            "seats": q["businesses"],
            "alcohol_businesses": q["alcohol_businesses"],
            "interval": q["interval"],
            "amount_cents": q["amount_cents"],
            "currency": q["currency"],
        },
    )
    return CheckoutResponse(url=session.url, simulated=False, quote=quote_model)


@router.post("/webhook", include_in_schema=False)
async def stripe_webhook(request: Request) -> dict:
    """Recibe eventos de Stripe y actualiza la suscripción de la cuenta."""
    if stripe is None or not settings.has_stripe:
        raise HTTPException(status_code=503, detail="Stripe no está configurado.")

    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")
    try:
        if settings.stripe_webhook_secret:
            event = stripe.Webhook.construct_event(
                payload, sig, settings.stripe_webhook_secret
            )
        else:  # sin secreto de webhook: parseo directo (solo dev)
            event = stripe.Event.construct_from(
                __import__("json").loads(payload), stripe.api_key
            )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Webhook inválido: {exc}") from exc

    etype = event["type"]
    obj = event["data"]["object"]

    if etype == "checkout.session.completed":
        meta = obj.get("metadata", {}) or {}
        account_id = obj.get("client_reference_id") or meta.get("account_id")
        if account_id:
            _upsert_by_account(
                account_id,
                {
                    "status": "active",
                    "seats": int(meta.get("businesses", 1) or 1),
                    "alcohol_businesses": int(meta.get("alcohol_businesses", 0) or 0),
                    "interval": meta.get("interval", "monthly"),
                    "amount_cents": int(meta.get("amount_cents", 0) or 0),
                    "stripe_customer_id": obj.get("customer"),
                    "stripe_subscription_id": obj.get("subscription"),
                },
            )
    elif etype in ("customer.subscription.deleted", "customer.subscription.canceled"):
        sub_id = obj.get("id")
        _cancel_by_stripe_sub(sub_id)

    return {"received": True}


# ---------------------------------------------------------------------------
# Helpers de webhook (por account_id / stripe subscription id, sin auth)
# ---------------------------------------------------------------------------
def _upsert_by_account(account_id: str, data: dict) -> None:
    if settings.use_mock:
        get_store().upsert_subscription(account_id, data)
        return
    supabase = get_supabase()
    existing = (
        supabase.table("subscriptions").select("id").eq("account_id", account_id).limit(1).execute()
    )
    payload = {**data, "account_id": account_id, "updated_at": _now().isoformat()}
    if existing.data:
        supabase.table("subscriptions").update(payload).eq("account_id", account_id).execute()
    else:
        supabase.table("subscriptions").insert(payload).execute()


def _cancel_by_stripe_sub(stripe_subscription_id: str | None) -> None:
    if not stripe_subscription_id:
        return
    if settings.use_mock:
        for sub in get_store().subscriptions.values():
            if sub.get("stripe_subscription_id") == stripe_subscription_id:
                sub["status"] = "canceled"
        return
    supabase = get_supabase()
    supabase.table("subscriptions").update({"status": "canceled"}).eq(
        "stripe_subscription_id", stripe_subscription_id
    ).execute()
