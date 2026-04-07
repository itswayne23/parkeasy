"""Tests for database models."""

import pytest
from datetime import datetime, timedelta
from decimal import Decimal
from sqlalchemy.orm import Session

from app.models import (
    User, UserRole, HostProfile, HostApprovalStatus,
    ParkingListing, ListingStatus, ParkingType,
    ParkingSpace, AvailabilityRule, BlockedSlot,
    Booking, BookingStatus, BookingUnit,
    Payment, PaymentStatus,
    PayoutRecord, PayoutStatus,
    Review, Report, ReportStatus,
    SavedPlace, AdminActionLog
)
from app.security import hash_password


def test_user_model(db: Session) -> None:
    """Test User model creation and relationships."""
    user = User(
        email="test@example.com",
        hashed_password=hash_password("password123"),
        full_name="Test User",
        role=UserRole.renter,
        phone="+1234567890",
        email_verified=True,
        phone_verified=False
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    assert user.id is not None
    assert user.email == "test@example.com"
    assert user.full_name == "Test User"
    assert user.role == UserRole.renter
    assert user.email_verified is True
    assert user.phone_verified is False
    assert user.created_at is not None
    assert user.updated_at is not None
    assert isinstance(user.created_at, datetime)
    assert isinstance(user.updated_at, datetime)
    
    # Test string representation
    assert str(user) == f"<User {user.email}>"


def test_host_profile_model(db: Session) -> None:
    """Test HostProfile model creation and relationships."""
    # Create user first
    user = User(
        email="host@example.com",
        hashed_password=hash_password("password123"),
        full_name="Host User",
        role=UserRole.host
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Create host profile
    host_profile = HostProfile(
        user_id=user.id,
        business_name="Test Business",
        phone="+1234567890",
        tax_id="TAX123456",
        approval_status=HostApprovalStatus.pending,
        verification_state="pending",
        bank_account_number="1234567890",
        bank_ifsc="IFSC123456",
        average_rating=Decimal("4.5"),
        total_reviews=10
    )
    
    db.add(host_profile)
    db.commit()
    db.refresh(host_profile)
    
    assert host_profile.id is not None
    assert host_profile.user_id == user.id
    assert host_profile.business_name == "Test Business"
    assert host_profile.approval_status == HostApprovalStatus.pending
    assert host_profile.average_rating == Decimal("4.5")
    assert host_profile.total_reviews == 10
    
    # Test relationship
    assert host_profile.user == user
    assert user.host_profile == host_profile
    
    # Test string representation
    assert str(host_profile) == f"<HostProfile {host_profile.business_name}>"


def test_parking_listing_model(db: Session) -> None:
    """Test ParkingListing model creation and relationships."""
    # Create user and host profile first
    user = User(
        email="listinghost@example.com",
        hashed_password=hash_password("password123"),
        full_name="Listing Host",
        role=UserRole.host
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    host_profile = HostProfile(
        user_id=user.id,
        business_name="Listing Business",
        phone="+1234567890",
        approval_status=HostApprovalStatus.approved
    )
    db.add(host_profile)
    db.commit()
    db.refresh(host_profile)
    
    # Create parking listing
    listing = ParkingListing(
        host_profile_id=host_profile.id,
        title="Secure Downtown Parking",
        description="Covered parking with 24/7 security",
        address="123 Main St, Downtown",
        latitude=Decimal("40.7128"),
        longitude=Decimal("-74.0060"),
        hourly_rate=Decimal("5.00"),
        daily_rate=Decimal("40.00"),
        monthly_rate=Decimal("300.00"),
        capacity=2,
        parking_type=ParkingType.covered,
        amenities=["security", "cctv", "lighting"],
        status=ListingStatus.published,
        is_instant_book=True,
        cancellation_policy="flexible"
    )
    
    db.add(listing)
    db.commit()
    db.refresh(listing)
    
    assert listing.id is not None
    assert listing.host_profile_id == host_profile.id
    assert listing.title == "Secure Downtown Parking"
    assert listing.hourly_rate == Decimal("5.00")
    assert listing.daily_rate == Decimal("40.00")
    assert listing.parking_type == ParkingType.covered
    assert listing.status == ListingStatus.published
    assert listing.is_instant_book is True
    assert "security" in listing.amenities
    
    # Test relationships
    assert listing.host_profile == host_profile
    assert listing in host_profile.listings
    
    # Test string representation
    assert str(listing) == f"<ParkingListing {listing.title}>"


def test_parking_space_model(db: Session) -> None:
    """Test ParkingSpace model creation and relationships."""
    # Create listing first
    user = User(
        email="spacehost@example.com",
        hashed_password=hash_password("password123"),
        full_name="Space Host",
        role=UserRole.host
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    host_profile = HostProfile(
        user_id=user.id,
        business_name="Space Business",
        phone="+1234567890",
        approval_status=HostApprovalStatus.approved
    )
    db.add(host_profile)
    db.commit()
    db.refresh(host_profile)
    
    listing = ParkingListing(
        host_profile_id=host_profile.id,
        title="Space Test Parking",
        description="For space testing",
        address="456 Space St",
        latitude=Decimal("40.7128"),
        longitude=Decimal("-74.0060"),
        hourly_rate=Decimal("5.00"),
        daily_rate=Decimal("40.00"),
        monthly_rate=Decimal("300.00"),
        capacity=2,
        parking_type=ParkingType.covered,
        status=ListingStatus.published
    )
    db.add(listing)
    db.commit()
    db.refresh(listing)
    
    # Create parking space
    space = ParkingSpace(
        listing_id=listing.id,
        space_number="A1",
        vehicle_type="car",
        width=Decimal("2.5"),
        length=Decimal("5.0"),
        height=Decimal("2.2"),
        is_available=True
    )
    
    db.add(space)
    db.commit()
    db.refresh(space)
    
    assert space.id is not None
    assert space.listing_id == listing.id
    assert space.space_number == "A1"
    assert space.vehicle_type == "car"
    assert space.width == Decimal("2.5")
    assert space.is_available is True
    
    # Test relationship
    assert space.listing == listing
    assert space in listing.spaces


def test_availability_rule_model(db: Session) -> None:
    """Test AvailabilityRule model creation."""
    # Create listing first
    user = User(
        email="rulehost@example.com",
        hashed_password=hash_password("password123"),
        full_name="Rule Host",
        role=UserRole.host
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    host_profile = HostProfile(
        user_id=user.id,
        business_name="Rule Business",
        phone="+1234567890",
        approval_status=HostApprovalStatus.approved
    )
    db.add(host_profile)
    db.commit()
    db.refresh(host_profile)
    
    listing = ParkingListing(
        host_profile_id=host_profile.id,
        title="Rule Test Parking",
        description="For rule testing",
        address="789 Rule St",
        latitude=Decimal("40.7128"),
        longitude=Decimal("-74.0060"),
        hourly_rate=Decimal("5.00"),
        daily_rate=Decimal("40.00"),
        monthly_rate=Decimal("300.00"),
        capacity=2,
        parking_type=ParkingType.covered,
        status=ListingStatus.published
    )
    db.add(listing)
    db.commit()
    db.refresh(listing)
    
    # Create availability rule
    rule = AvailabilityRule(
        listing_id=listing.id,
        day_of_week=1,  # Monday
        start_time="09:00",
        end_time="18:00",
        is_recurring=True
    )
    
    db.add(rule)
    db.commit()
    db.refresh(rule)
    
    assert rule.id is not None
    assert rule.listing_id == listing.id
    assert rule.day_of_week == 1
    assert rule.start_time == "09:00"
    assert rule.end_time == "18:00"
    assert rule.is_recurring is True
    
    # Test relationship
    assert rule.listing == listing
    assert rule in listing.availability_rules


def test_booking_model(db: Session) -> None:
    """Test Booking model creation and relationships."""
    # Create host and listing
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
        approval_status=HostApprovalStatus.approved
    )
    db.add(host_profile)
    db.commit()
    db.refresh(host_profile)
    
    listing = ParkingListing(
        host_profile_id=host_profile.id,
        title="Booking Test Parking",
        description="For booking testing",
        address="101 Booking St",
        latitude=Decimal("40.7128"),
        longitude=Decimal("-74.0060"),
        hourly_rate=Decimal("5.00"),
        daily_rate=Decimal("40.00"),
        monthly_rate=Decimal("300.00"),
        capacity=2,
        parking_type=ParkingType.covered,
        status=ListingStatus.published
    )
    db.add(listing)
    db.commit()
    db.refresh(listing)
    
    # Create renter user
    renter_user = User(
        email="renter@example.com",
        hashed_password=hash_password("password123"),
        full_name="Renter User",
        role=UserRole.renter
    )
    db.add(renter_user)
    db.commit()
    db.refresh(renter_user)
    
    # Create booking
    start_time = datetime.now() + timedelta(hours=1)
    end_time = start_time + timedelta(hours=3)
    
    booking = Booking(
        listing_id=listing.id,
        user_id=renter_user.id,
        start_at=start_time,
        end_at=end_time,
        unit=BookingUnit.hour,
        total_amount=Decimal("15.00"),
        status=BookingStatus.confirmed,
        vehicle_plate="ABC123",
        vehicle_make="Toyota",
        vehicle_model="Camry",
        checked_in_at=None,
        checked_out_at=None
    )
    
    db.add(booking)
    db.commit()
    db.refresh(booking)
    
    assert booking.id is not None
    assert booking.listing_id == listing.id
    assert booking.user_id == renter_user.id
    assert booking.total_amount == Decimal("15.00")
    assert booking.status == BookingStatus.confirmed
    assert booking.vehicle_plate == "ABC123"
    assert booking.unit == BookingUnit.hour
    
    # Test relationships
    assert booking.listing == listing
    assert booking.user == renter_user
    assert booking in listing.bookings
    assert booking in renter_user.bookings
    
    # Test string representation
    assert str(booking) == f"<Booking {booking.id}>"


def test_payment_model(db: Session) -> None:
    """Test Payment model creation."""
    # Create booking first
    host_user = User(
        email="paymenthost@example.com",
        hashed_password=hash_password("password123"),
        full_name="Payment Host",
        role=UserRole.host
    )
    db.add(host_user)
    db.commit()
    db.refresh(host_user)
    
    host_profile = HostProfile(
        user_id=host_user.id,
        business_name="Payment Business",
        phone="+1234567890",
        approval_status=HostApprovalStatus.approved
    )
    db.add(host_profile)
    db.commit()
    db.refresh(host_profile)
    
    listing = ParkingListing(
        host_profile_id=host_profile.id,
        title="Payment Test Parking",
        description="For payment testing",
        address="202 Payment St",
        latitude=Decimal("40.7128"),
        longitude=Decimal("-74.0060"),
        hourly_rate=Decimal("5.00"),
        daily_rate=Decimal("40.00"),
        monthly_rate=Decimal("300.00"),
        capacity=2,
        parking_type=ParkingType.covered,
        status=ListingStatus.published
    )
    db.add(listing)
    db.commit()
    db.refresh(listing)
    
    renter_user = User(
        email="paymentrenter@example.com",
        hashed_password=hash_password("password123"),
        full_name="Payment Renter",
        role=UserRole.renter
    )
    db.add(renter_user)
    db.commit()
    db.refresh(renter_user)
    
    booking = Booking(
        listing_id=listing.id,
        user_id=renter_user.id,
        start_at=datetime.now() + timedelta(hours=1),
        end_at=datetime.now() + timedelta(hours=3),
        unit=BookingUnit.hour,
        total_amount=Decimal("15.00"),
        status=BookingStatus.pending_payment,
        vehicle_plate="PAY123"
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)
    
    # Create payment
    payment = Payment(
        booking_id=booking.id,
        amount=Decimal("15.00"),
        currency="INR",
        status=PaymentStatus.pending,
        gateway="razorpay",
        gateway_order_id="order_123456",
        gateway_payment_id=None,
        gateway_signature=None
    )
    
    db.add(payment)
    db.commit()
    db.refresh(payment)
    
    assert payment.id is not None
    assert payment.booking_id == booking.id
    assert payment.amount == Decimal("15.00")
    assert payment.currency == "INR"
    assert payment.status == PaymentStatus.pending
    assert payment.gateway == "razorpay"
    
    # Test relationship
    assert payment.booking == booking
    assert booking.payment == payment


def test_review_model(db: Session) -> None:
    """Test Review model creation."""
    # Create booking first
    host_user = User(
        email="reviewhost@example.com",
        hashed_password=hash_password("password123"),
        full_name="Review Host",
        role=UserRole.host
    )
    db.add(host_user)
    db.commit()
    db.refresh(host_user)
    
    host_profile = HostProfile(
        user_id=host_user.id,
        business_name="Review Business",
        phone="+1234567890",
        approval_status=HostApprovalStatus.approved
    )
    db.add(host_profile)
    db.commit()
    db.refresh(host_profile)
    
    listing = ParkingListing(
        host_profile_id=host_profile.id,
        title="Review Test Parking",
        description="For review testing",
        address="303 Review St",
        latitude=Decimal("40.7128"),
        longitude=Decimal("-74.0060"),
        hourly_rate=Decimal("5.00"),
        daily_rate=Decimal("40.00"),
        monthly_rate=Decimal("300.00"),
        capacity=2,
        parking_type=ParkingType.covered,
        status=ListingStatus.published
    )
    db.add(listing)
    db.commit()
    db.refresh(listing)
    
    renter_user = User(
        email="reviewrenter@example.com",
        hashed_password=hash_password("password123"),
        full_name="Review Renter",
        role=UserRole.renter
    )
    db.add(renter_user)
    db.commit()
    db.refresh(renter_user)
    
    booking = Booking(
        listing_id=listing.id,
        user_id=renter_user.id,
        start_at=datetime.now() - timedelta(days=2),
        end_at=datetime.now() - timedelta(days=1),
        unit=BookingUnit.day,
        total_amount=Decimal("40.00"),
        status=BookingStatus.completed,
        vehicle_plate="REV123"
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)
    
    # Create review
    review = Review(
        booking_id=booking.id,
        reviewer_id=renter_user.id,
        reviewee_id=host_user.id,
        rating=5,
        comment="Great parking spot!",
        is_anonymous=False
    )
    
    db.add(review)
    db.commit()
    db.refresh(review)
    
    assert review.id is not None
    assert review.booking_id == booking.id
    assert review.reviewer_id == renter_user.id
    assert review.reviewee_id == host_user.id
    assert review.rating == 5
    assert review.comment == "Great parking spot!"
    
    # Test relationships
    assert review.booking == booking
    assert review.reviewer == renter_user
    assert review.reviewee == host_user


def test_enum_values() -> None:
    """Test that enum values are correctly defined."""
    # UserRole
    assert UserRole.admin == "admin"
    assert UserRole.host == "host"
    assert UserRole.renter == "renter"
    
    # HostApprovalStatus
    assert HostApprovalStatus.pending == "pending"
    assert HostApprovalStatus.approved == "approved"
    assert HostApprovalStatus.rejected == "rejected"
