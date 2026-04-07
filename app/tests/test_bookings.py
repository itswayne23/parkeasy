"""Tests for booking-related endpoints."""

import pytest
from datetime import datetime, timedelta
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import ParkingListing, Booking, User, UserRole, BookingStatus, HostProfile
from app.security import hash_password


def test_booking_quote(client: TestClient, db: Session) -> None:
    """Test getting a booking quote."""
    # Create a host user and listing
    host_user = User(
        email="host@example.com",
        hashed_password=hash_password("password123"),
        full_name="Host User",
        role=UserRole.host
    )
    db.add(host_user)
    db.commit()
    db.refresh(host_user)
    
    host_profile = HostProfile(
        user_id=host_user.id,
        business_name="Host Business",
        phone="+1234567890",
        approval_status="approved"
    )
    db.add(host_profile)
    db.commit()
    db.refresh(host_profile)
    
    listing = ParkingListing(
        host_profile_id=host_profile.id,
        title="Parking for Quote",
        description="Test parking",
        address="123 Test St",
        latitude=40.7128,
        longitude=-74.0060,
        hourly_rate=Decimal("5.00"),
        daily_rate=Decimal("40.00"),
        monthly_rate=Decimal("300.00"),
        capacity=2,
        parking_type="covered",
        status="published"
    )
    db.add(listing)
    db.commit()
    db.refresh(listing)
    
    # Get a quote
    start_time = datetime.now() + timedelta(hours=1)
    end_time = start_time + timedelta(hours=3)
    
    payload = {
        "listing_id": str(listing.id),
        "start_at": start_time.isoformat(),
        "end_at": end_time.isoformat(),
        "unit": "hour"
    }
    
    response = client.post("/bookings/quote", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    assert "total_amount" in data
    assert "breakdown" in data
    assert "currency" in data
    assert data["currency"] == "INR"
    # 3 hours at 5.00 per hour = 15.00
    assert Decimal(data["total_amount"]) == Decimal("15.00")


def test_create_booking(client: TestClient, auth_headers: dict, db: Session) -> None:
    """Test creating a booking."""
    # Create a host user and listing
    host_user = User(
        email="bookinghost@example.com",
        hashed_password=hash_password("password123"),
        full_name="Booking Host",
        role=UserRole.host
    )
    db.add(host_user)
    db.commit()
    db.refresh(host_user)
    
    host_profile = HostProfile(
        user_id=host_user.id,
        business_name="Booking Business",
        phone="+1234567890",
        approval_status="approved"
    )
    db.add(host_profile)
    db.commit()
    db.refresh(host_profile)
    
    listing = ParkingListing(
        host_profile_id=host_profile.id,
        title="Booking Test Parking",
        description="For booking tests",
        address="456 Booking St",
        latitude=40.7128,
        longitude=-74.0060,
        hourly_rate=Decimal("5.00"),
        daily_rate=Decimal("40.00"),
        monthly_rate=Decimal("300.00"),
        capacity=2,
        parking_type="covered",
        status="published"
    )
    db.add(listing)
    db.commit()
    db.refresh(listing)
    
    # Create booking
    start_time = datetime.now() + timedelta(hours=2)
    end_time = start_time + timedelta(hours=4)
    
    payload = {
        "listing_id": str(listing.id),
        "start_at": start_time.isoformat(),
        "end_at": end_time.isoformat(),
        "unit": "hour",
        "vehicle_plate": "ABC123",
        "vehicle_make": "Toyota",
        "vehicle_model": "Camry"
    }
    
    response = client.post("/bookings", json=payload, headers=auth_headers)
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "pending_payment"
    assert data["listing_id"] == str(listing.id)
    assert data["user_id"] is not None
    assert "total_amount" in data
    assert Decimal(data["total_amount"]) == Decimal("20.00")  # 4 hours * 5.00


def test_get_my_bookings(client: TestClient, auth_headers: dict, db: Session) -> None:
    """Test retrieving user's own bookings."""
    # Create a booking first
    host_user = User(
        email="mybookingshost@example.com",
        hashed_password=hash_password("password123"),
        full_name="My Bookings Host",
        role=UserRole.host
    )
    db.add(host_user)
    db.commit()
    db.refresh(host_user)
    
    host_profile = HostProfile(
        user_id=host_user.id,
        business_name="My Bookings Business",
        phone="+1234567890",
        approval_status="approved"
    )
    db.add(host_profile)
    db.commit()
    db.refresh(host_profile)
    
    listing = ParkingListing(
        host_profile_id=host_profile.id,
        title="My Bookings Parking",
        description="For my bookings test",
        address="789 My St",
        latitude=40.7128,
        longitude=-74.0060,
        hourly_rate=Decimal("5.00"),
        daily_rate=Decimal("40.00"),
        monthly_rate=Decimal("300.00"),
        capacity=2,
        parking_type="covered",
        status="published"
    )
    db.add(listing)
    db.commit()
    db.refresh(listing)
    
    # Get current user from auth headers
    from app.security import decode_token
    token = auth_headers["Authorization"].replace("Bearer ", "")
    token_data = decode_token(token)
    user_id = token_data["sub"]
    
    # Create a booking for current user
    booking = Booking(
        listing_id=listing.id,
        user_id=user_id,
        start_at=datetime.now() + timedelta(hours=1),
        end_at=datetime.now() + timedelta(hours=3),
        unit="hour",
        total_amount=Decimal("10.00"),
        status=BookingStatus.pending_payment,
        vehicle_plate="TEST123",
        vehicle_make="Test",
        vehicle_model="Car"
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)
    
    # Get my bookings
    response = client.get("/bookings/me", headers=auth_headers)
    
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert any(b["id"] == str(booking.id) for b in data)


def test_get_single_booking(client: TestClient, auth_headers: dict, db: Session) -> None:
    """Test retrieving a single booking by ID."""
    # Create a booking
    host_user = User(
        email="singlebookinghost@example.com",
        hashed_password=hash_password("password123"),
        full_name="Single Booking Host",
        role=UserRole.host
    )
    db.add(host_user)
    db.commit()
    db.refresh(host_user)
    
    host_profile = HostProfile(
        user_id=host_user.id,
        business_name="Single Booking Business",
        phone="+1234567890",
        approval_status="approved"
    )
    db.add(host_profile)
    db.commit()
    db.refresh(host_profile)
    
    listing = ParkingListing(
        host_profile_id=host_profile.id,
        title="Single Booking Parking",
        description="For single booking test",
        address="101 Single St",
        latitude=40.7128,
        longitude=-74.0060,
        hourly_rate=Decimal("5.00"),
        daily_rate=Decimal("40.00"),
        monthly_rate=Decimal("300.00"),
        capacity=2,
        parking_type="covered",
        status="published"
    )
    db.add(listing)
    db.commit()
    db.refresh(listing)
    
    # Get current user
    from app.security import decode_token
    token = auth_headers["Authorization"].replace("Bearer ", "")
    token_data = decode_token(token)
    user_id = token_data["sub"]
    
    booking = Booking(
        listing_id=listing.id,
        user_id=user_id,
        start_at=datetime.now() + timedelta(hours=1),
        end_at=datetime.now() + timedelta(hours=3),
        unit="hour",
        total_amount=Decimal("10.00"),
        status=BookingStatus.pending_payment,
        vehicle_plate="SINGLE123",
        vehicle_make="Single",
        vehicle_model="Car"
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)
    
    # Get the booking
    response = client.get(f"/bookings/{booking.id}", headers=auth_headers)
    
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(booking.id)
    assert data["vehicle_plate"] == "SINGLE123"


def test_cancel_booking(client: TestClient, auth_headers: dict, db: Session) -> None:
    """Test canceling a booking."""
    # Create a booking
    host_user = User(
        email="cancelhost@example.com",
        hashed_password=hash_password("password123"),
        full_name="Cancel Host",
        role=UserRole.host
    )
    db.add(host_user)
    db.commit()
    db.refresh(host_user)
    
    host_profile = HostProfile(
        user_id=host_user.id,
        business_name="Cancel Business",
        phone="+1234567890",
        approval_status="approved"
    )
    db.add(host_profile)
    db.commit()
    db.refresh(host_profile)
    
    listing = ParkingListing(
        host_profile_id=host_profile.id,
        title="Cancel Parking",
        description="For cancel test",
        address="202 Cancel St",
        latitude=40.7128,
        longitude=-74.0060,
        hourly_rate=Decimal("5.00"),
        daily_rate=Decimal("40.00"),
        monthly_rate=Decimal("300.00"),
        capacity=2,
        parking_type="covered",
        status="published"
    )
    db.add(listing)
    db.commit()
    db.refresh(listing)
    
    # Get current user
    from app.security import decode_token
    token = auth_headers["Authorization"].replace("Bearer ", "")
    token_data = decode_token(token)
    user_id = token_data["sub"]
    
    booking = Booking(
        listing_id=listing.id,
        user_id=user_id,
        start_at=datetime.now() + timedelta(hours=2),
        end_at=datetime.now() + timedelta(hours=4),
        unit="hour",
        total_amount=Decimal("10.00"),
        status=BookingStatus.confirmed,
        vehicle_plate="CANCEL123",
        vehicle_make="Cancel",
        vehicle_model="Car"
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)
    
    # Cancel the booking
    response = client.post(f"/bookings/{booking.id}/cancel", headers=auth_headers)
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "cancelled"


def test_check_in_check_out_flow(client: TestClient, auth_headers: dict, db: Session) -> None:
    """Test the check-in and check-out flow for a booking."""
    # Create a booking in confirmed status
    host_user = User(
        email="checkinhost@example.com",
        hashed_password=hash_password("password123"),
        full_name="Check-in Host",
        role=UserRole.host
    )
    db.add(host_user)
    db.commit()
    db.refresh(host_user)
    
    host_profile = HostProfile(
        user_id=host_user.id,
        business_name="Check-in Business",
        phone="+1234567890",
        approval_status="approved"
    )
    db.add(host_profile)
    db.commit()
    db.refresh(host_profile)
    
    listing = ParkingListing(
        host_profile_id=host_profile.id,
        title="Check-in Parking",
        description="For check-in test",
        address="303 Check-in St",
        latitude=40.7128,
        longitude=-74.0060,
        hourly_rate=Decimal("5.00"),
        daily_rate=Decimal("40.00"),
        monthly_rate=Decimal("300.00"),
        capacity=2,
        parking_type="covered",
        status="published"
    )
    db.add(listing)
    db.commit()
    db.refresh(listing)
    
    # Get current user
    from app.security import decode_token
    token = auth_headers["Authorization"].replace("Bearer ", "")
    token_data = decode_token(token)
    user_id = token_data["sub"]
    
    booking = Booking(
        listing_id=listing.id,
        user_id=user_id,
        start_at=datetime.now() - timedelta(minutes=30),  # Started 30 minutes ago
        end_at=datetime.now() + timedelta(hours=2),
        unit="hour",
        total_amount=Decimal("10.00"),
        status=BookingStatus.confirmed,
        vehicle_plate="CHECK123",
        vehicle_make="Check",
        vehicle_model="Car"
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)
    
    # Check in
    checkin_response = client.post(f"/bookings/{booking.id}/check-in", headers=auth_headers)
    assert checkin_response.status_code == 200
    checkin_data = checkin_response.json()
    assert checkin_data["message"] == "Checked in successfully"
    
    # Verify booking status updated
    db.refresh(booking)
    assert booking.status == BookingStatus.checked_in
    assert booking.checked_in_at is not None
    
    # Check out
    checkout_response = client.post(f"/bookings/{booking.id}/check-out", headers=auth_headers)
    assert checkout_response.status_code == 200
    checkout_data = checkout_response.json()
    assert checkout_data["message"] == "Checked out successfully"
    
    # Verify booking status updated
    db.refresh(booking)
    assert booking.status == BookingStatus.completed
    assert booking.checked_out_at is not None


def test_booking_qr_endpoint(client: TestClient, auth_headers: dict, db: Session) -> None:
    """Test the booking QR code endpoint."""
    # Create a booking
    host_user = User(
        email="qrhost@example.com",
        hashed_password=hash_password("password123"),
        full_name="QR Host",
        role=UserRole.host
    )
    db.add(host_user)
    db.commit()
    db.refresh(host_user)
    
    host_profile = HostProfile(
        user_id=host_user.id,
        business_name="QR Business",
        phone="+1234567890",
        approval_status="approved"
    )
    db.add(host_profile)
    db.commit()
    db.refresh(host_profile)
    
    listing = ParkingListing(
        host_profile_id=host_profile.id,
        title="QR Parking",
        description="For QR test",
        address="404 QR St",
        latitude=40.7128,
        longitude=-74.0060,
        hourly_rate=Decimal("5.00"),
        daily_rate=Decimal("40.00"),
        monthly_rate=Decimal("300.00"),
        capacity=2,
        parking_type="covered",
        status="published"
    )
    db.add(listing)
    db.commit()
    db.refresh(listing)
    
    # Get current user
    from app.security import decode_token
    token = auth_headers["Authorization"].replace("Bearer ", "")
    token_data = decode_token(token)
    user_id = token_data["sub"]
    
    booking = Booking(
        listing_id=listing.id,
        user_id=user_id,
        start_at=datetime.now() + timedelta(hours=1),
        end_at=datetime.now() + timedelta(hours=3),
        unit="hour",
        total_amount=Decimal("10.00"),
        status=BookingStatus.confirmed,
        vehicle_plate="QR123",
        vehicle_make="QR",
        vehicle_model="Car"
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)
    
    # Get QR code
    response = client.get(f"/bookings/{booking.id}/qr", headers=auth_headers)
    
    # Should return some content (could be SVG data URL)
    assert response.status_code == 200
    # Content type might be application/json or text/plain
    assert response.content is not None


def test_booking_conflict(client: TestClient, auth_headers: dict, db: Session) -> None:
    """Test creating a booking that conflicts with existing booking."""
    # Create a listing with an existing booking
    host_user = User(
        email="conflicthost@example.com",
        hashed_password=hash_password("password123"),
        full_name="Conflict Host",
        role=UserRole.host
    )
    db.add(host_user)
    db.commit()
    db.refresh(host_user)
    
    host_profile = HostProfile(
        user_id=host_user.id,
        business_name="Conflict Business",
        phone="+1234567890",
        approval_status="approved"
    )
    db.add(host_profile)
    db.commit()
    db.refresh(host_profile)
    
    listing = ParkingListing(
        host_profile_id=host_profile.id,
        title="Conflict Parking",
        description="For conflict test",
        address="505 Conflict St",
        latitude=40.7128,
        longitude=-74.0060,
        hourly_rate=Decimal("5.00"),
        daily_rate=Decimal("40.00"),
        monthly_rate=Decimal("300.00"),
        capacity=1,  # Only 1 space
        parking_type="covered",
        status="published"
    )
    db.add(listing)
    db.commit()
    db.refresh(listing)
    
    # Get current user
    from app.security import decode_token
    token = auth_