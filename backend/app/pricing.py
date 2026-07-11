"""Modelo de precios de suscripción — híbrido por volumen.

Fuente de verdad de los precios (espejo de ``frontend/src/lib/pricing.ts``).
Modelo: se paga por cada negocio dado de alta; el precio unitario baja por
volumen y cada negocio que vende alcohol suma un recargo (porque implica más
trámites: Permiso de Alcohol + reclasificación de impacto).

Editar aquí y en ``pricing.ts`` para mantener la paridad.
"""

from __future__ import annotations

from typing import Literal, TypedDict

CURRENCY = "mxn"

# Negocios gratis por cuenta (freemium): permite probar la plataforma sin pagar.
FREE_SEATS = 1

# Bandas de precio base por negocio (MXN/mes), según cuántos negocios en total.
# (min_qty, precio_unitario) — se elige la banda cuya cota inferior sea la mayor
# que no exceda la cantidad.
VOLUME_BANDS: list[tuple[int, int]] = [
    (1, 399),  # 1 negocio
    (2, 320),  # 2–5 negocios
    (6, 260),  # 6+ negocios
]

# Recargo por cada negocio que vende alcohol (MXN/mes).
ALCOHOL_SURCHARGE = 250

# Meses cobrados en el plan anual (2 gratis => 10). El resto es descuento.
ANNUAL_MONTHS = 10

Interval = Literal["monthly", "annual"]


class Quote(TypedDict):
    businesses: int
    alcohol_businesses: int
    interval: Interval
    unit_price: int  # precio base por negocio en la banda elegida (MXN/mes)
    base_subtotal: int  # businesses * unit_price (MXN/mes)
    alcohol_surcharge: int  # recargo total por alcohol (MXN/mes)
    monthly_total: int  # total mensual (MXN/mes)
    billed_total: int  # lo que se cobra en el período (mes o año) en MXN
    monthly_equivalent: int  # costo mensual equivalente (útil en plan anual)
    annual_savings: int  # ahorro anual vs. pagar 12 meses (MXN)
    amount_cents: int  # monto a cobrar por Stripe (centavos)
    currency: str


# Estados de suscripción que otorgan derecho a los asientos pagados.
ACTIVE_STATUSES = ("active", "trialing")


def entitled_seats(status: str, seats: int) -> int:
    """Negocios que la cuenta puede registrar según su suscripción.

    Con plan activo => los asientos pagados; sin plan => el tier gratuito.
    """
    if status in ACTIVE_STATUSES:
        return max(int(seats or 0), FREE_SEATS)
    return FREE_SEATS


def unit_price_for(businesses: int) -> int:
    """Precio unitario por negocio según la banda de volumen."""
    price = VOLUME_BANDS[0][1]
    for min_qty, unit in VOLUME_BANDS:
        if businesses >= min_qty:
            price = unit
    return price


def compute_quote(
    businesses: int, alcohol_businesses: int, interval: Interval = "monthly"
) -> Quote:
    """Calcula la cotización de una suscripción.

    ``businesses`` es el total de negocios; ``alcohol_businesses`` cuántos de
    ellos venden alcohol (0 <= alcohol_businesses <= businesses).
    """
    businesses = max(1, int(businesses))
    alcohol_businesses = max(0, min(int(alcohol_businesses), businesses))
    interval = interval if interval in ("monthly", "annual") else "monthly"

    unit = unit_price_for(businesses)
    base_subtotal = businesses * unit
    alcohol_surcharge = alcohol_businesses * ALCOHOL_SURCHARGE
    monthly_total = base_subtotal + alcohol_surcharge

    if interval == "annual":
        billed_total = monthly_total * ANNUAL_MONTHS
        monthly_equivalent = round(billed_total / 12)
        annual_savings = monthly_total * 12 - billed_total
    else:
        billed_total = monthly_total
        monthly_equivalent = monthly_total
        annual_savings = 0

    return Quote(
        businesses=businesses,
        alcohol_businesses=alcohol_businesses,
        interval=interval,
        unit_price=unit,
        base_subtotal=base_subtotal,
        alcohol_surcharge=alcohol_surcharge,
        monthly_total=monthly_total,
        billed_total=billed_total,
        monthly_equivalent=monthly_equivalent,
        annual_savings=annual_savings,
        amount_cents=billed_total * 100,
        currency=CURRENCY,
    )
