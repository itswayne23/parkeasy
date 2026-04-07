"""Tests for pricing calculations."""
from datetime import datetime, time
from decimal import Decimal
from types import SimpleNamespace

import pytest

from app.models import BookingUnit
from app.routes import _pricing_breakdown, _distance_km


def test_pricing_breakdown_applies_multipliers() -> None:
    """Test that pricing breakdown correctly applies demand multipliers."""
    listing = SimpleNamespace(
        hourly_rate=Decimal("40"),
        daily_rate=Decimal("300"),
        busy_area=True
    )
    result = _pricing_breakdown(
        listing,
        datetime(2026, 3, 28, 9, 0),
        datetime(2026, 3, 28, 11, 0),
        BookingUnit.HOURLY
    )
    assert result["subtotal_amount"] == Decimal("80.00")
    assert result["demand_multiplier"] > Decimal("1.00")
    assert "commission_amount" in result
    assert "total_amount" in result


def test_pricing_breakdown_daily_rate() -> None:
    """Test pricing breakdown with daily rate."""
    listing = SimpleNamespace(
        hourly_rate=Decimal("50"),
        daily_rate=Decimal("350"),
        busy_area=False
    )
    result = _pricing_breakdown(
        listing,
        datetime(2026, 3, 28, 9, 0),
        datetime(2026, 3, 29, 9, 0),  # 24 hours = 1 day
        BookingUnit.DAILY
    )
    # Should use daily rate for full day
    assert result["subtotal_amount"] == Decimal("350.00")
    assert "commission_amount" in result
    assert "total_amount" in result


def test_pricing_breakdown_weekend_multiplier() -> None:
    """Test that weekend bookings apply weekend multiplier."""
    # March 29, 2026 is a Sunday
    listing = SimpleNamespace(
        hourly_rate=Decimal("40"),
        daily_rate=Decimal("300"),
        busy_area=False
    )
    result = _pricing_breakdown(
        listing,
        datetime(2026, 3, 29, 10, 0),  # Sunday
        datetime(2026, 3, 29, 12, 0),  # Sunday
        BookingUnit.HOURLY
    )
    assert result["subtotal_amount"] == Decimal("80.00")
    # Weekend multiplier should be applied
    assert result["demand_multiplier"] >= Decimal("1.10")


def test_distance_calculation() -> None:
    """Test distance calculation between coordinates."""
    # Test distance between two points in Guwahati
    distance = _distance_km(26.1824, 91.7510, 26.1860, 91.7550)
    assert isinstance(distance, float)
    assert distance > 0
    assert distance < 10  # Should be less than 10 km
    
    # Test same point distance is zero
    distance_same = _distance_km(26.1824, 91.7510, 26.1824, 91.7510)
    assert distance_same == 0.0


def test_pricing_breakdown_edge_cases() -> None:
    """Test edge cases for pricing breakdown."""
    listing = SimpleNamespace(
        hourly_rate=Decimal("0"),
        daily_rate=Decimal("0"),
        busy_area=False
    )
    
    # Free listing
    result = _pricing_breakdown(
        listing,
        datetime(2026, 3, 28, 9, 0),
        datetime(2026, 3, 28, 11, 0),
        BookingUnit.HOURLY
    )
    assert result["subtotal_amount"] == Decimal("0.00")
    assert result["commission_amount"] == Decimal("0.00")
    assert result["total_amount"] == Decimal("0.00")
    
    # Very high rate
    listing_high = SimpleNamespace(
        hourly_rate=Decimal("1000"),
        daily_rate=Decimal("7000"),
        busy_area=True
    )
    result_high = _pricing_breakdown(
        listing_high,
        datetime(2026, 3, 28, 9, 0),
        datetime(2026, 3, 28, 11, 0),
        BookingUnit.HOURLY
    )
    assert result_high["subtotal_amount"] == Decimal("2000.00")
    assert result_high["commission_amount"] > Decimal("0.00")


@pytest.mark.parametrize("hours,expected", [
    (1, Decimal("40.00")),
    (2, Decimal("80.00")),
    (3, Decimal("120.00")),
    (6, Decimal("240.00")),
])
def test_pricing_hourly_variations(hours: int, expected: Decimal) -> None:
    """Test pricing for different hourly durations."""
    listing = SimpleNamespace(
        hourly_rate=Decimal("40"),
        daily_rate=Decimal("300"),
        busy_area=False
    )
    
    result = _pricing_breakdown(
        listing,
        datetime(2026, 3, 28, 9, 0),
        datetime(2026, 3, 28, 9 + hours, 0),
        BookingUnit.HOURLY
    )
    assert result["subtotal_amount"] == expected
