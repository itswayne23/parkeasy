from datetime import datetime
from decimal import Decimal
from types import SimpleNamespace

from app.models import BookingUnit
from app.routes import _pricing_breakdown


def test_pricing_breakdown_applies_multipliers() -> None:
    listing = SimpleNamespace(hourly_rate=Decimal("40"), daily_rate=Decimal("300"), busy_area=True)
    result = _pricing_breakdown(listing, datetime(2026, 3, 28, 9, 0), datetime(2026, 3, 28, 11, 0), BookingUnit.HOURLY)
    assert result["subtotal_amount"] == Decimal("80.00")
    assert result["demand_multiplier"] > Decimal("1.00")
