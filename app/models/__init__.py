from __future__ import annotations

from datetime import datetime, time
from decimal import Decimal
from enum import StrEnum
from uuid import uuid4

from sqlalchemy import Boolean, CheckConstraint, DateTime, Enum, ForeignKey, Integer, JSON, Numeric, String, Text, Time, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class UserRole(StrEnum):
    RENTER = "renter"
    INDIVIDUAL_HOST = "individual_host"
    COMMERCIAL_HOST = "commercial_host"
    ADMIN = "admin"


class HostApprovalStatus(StrEnum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class ListingStatus(StrEnum):
    DRAFT = "draft"
    PUBLISHED = "published"
    SUSPENDED = "suspended"
    ARCHIVED = "archived"


class VerificationState(StrEnum):
    UNVERIFIED = "unverified"
    PENDING = "pending"
    VERIFIED = "verified"


class ParkingType(StrEnum):
    DRIVEWAY = "driveway"
    GARAGE = "garage"
    LOT = "lot"
    BASEMENT = "basement"
    STREET_ADJACENT = "street_adjacent"


class BookingUnit(StrEnum):
    HOURLY = "hourly"
    DAILY = "daily"


class BookingStatus(StrEnum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    COMPLETED = "completed"
    REFUNDED = "refunded"


class PaymentStatus(StrEnum):
    PENDING = "pending"
    AUTHORIZED = "authorized"
    CAPTURED = "captured"
    FAILED = "failed"
    REFUNDED = "refunded"


class ReportStatus(StrEnum):
    OPEN = "open"
    UNDER_REVIEW = "under_review"
    RESOLVED = "resolved"


class PayoutStatus(StrEnum):
    PENDING = "pending"
    SCHEDULED = "scheduled"
    PAID = "paid"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(20), unique=True, nullable=True, index=True)
    full_name: Mapped[str] = mapped_column(String(120))
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.RENTER)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    phone_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    host_profile: Mapped["HostProfile | None"] = relationship(back_populates="user", uselist=False)
    bookings: Mapped[list["Booking"]] = relationship(back_populates="renter")
    reviews_written: Mapped[list["Review"]] = relationship(
        back_populates="author", foreign_keys="Review.author_id"
    )
    reports: Mapped[list["Report"]] = relationship(back_populates="reporter")


class HostProfile(Base):
    __tablename__ = "host_profiles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), unique=True, index=True)
    host_type: Mapped[UserRole] = mapped_column(Enum(UserRole))
    business_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    approval_status: Mapped[HostApprovalStatus] = mapped_column(
        Enum(HostApprovalStatus), default=HostApprovalStatus.PENDING
    )
    is_identity_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    tax_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    photo_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="host_profile")
    listings: Mapped[list["ParkingListing"]] = relationship(back_populates="host")
    payouts: Mapped[list["PayoutRecord"]] = relationship(back_populates="host_profile")


class ParkingListing(Base):
    __tablename__ = "parking_listings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    host_id: Mapped[str] = mapped_column(ForeignKey("host_profiles.id"), index=True)
    title: Mapped[str] = mapped_column(String(160))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    host_type: Mapped[UserRole] = mapped_column(Enum(UserRole))
    display_address: Mapped[str] = mapped_column(String(255))
    city: Mapped[str] = mapped_column(String(120), index=True)
    state: Mapped[str] = mapped_column(String(120))
    country: Mapped[str] = mapped_column(String(120), default="India")
    latitude: Mapped[Decimal] = mapped_column(Numeric(9, 6))
    longitude: Mapped[Decimal] = mapped_column(Numeric(9, 6))
    parking_type: Mapped[ParkingType] = mapped_column(Enum(ParkingType))
    vehicle_types: Mapped[list[str]] = mapped_column(JSON, default=list)
    amenities: Mapped[list[str]] = mapped_column(JSON, default=list)
    photo_urls: Mapped[list[str]] = mapped_column(JSON, default=list)
    access_instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    hourly_rate: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    daily_rate: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    busy_area: Mapped[bool] = mapped_column(Boolean, default=False)
    verification_state: Mapped[VerificationState] = mapped_column(
        Enum(VerificationState), default=VerificationState.PENDING
    )
    status: Mapped[ListingStatus] = mapped_column(Enum(ListingStatus), default=ListingStatus.DRAFT)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    host: Mapped["HostProfile"] = relationship(back_populates="listings")
    spaces: Mapped[list["ParkingSpace"]] = relationship(back_populates="listing", cascade="all, delete-orphan")
    availability_rules: Mapped[list["AvailabilityRule"]] = relationship(
        back_populates="listing", cascade="all, delete-orphan"
    )
    blocked_slots: Mapped[list["BlockedSlot"]] = relationship(
        back_populates="listing", cascade="all, delete-orphan"
    )
    bookings: Mapped[list["Booking"]] = relationship(back_populates="listing")
    reviews: Mapped[list["Review"]] = relationship(back_populates="listing")


class ParkingSpace(Base):
    __tablename__ = "parking_spaces"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    listing_id: Mapped[str] = mapped_column(ForeignKey("parking_listings.id"), index=True)
    label: Mapped[str] = mapped_column(String(120))
    capacity: Mapped[int] = mapped_column(Integer, default=1)
    size_label: Mapped[str | None] = mapped_column(String(50), nullable=True)
    has_ev_charger: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    listing: Mapped["ParkingListing"] = relationship(back_populates="spaces")
    bookings: Mapped[list["Booking"]] = relationship(back_populates="space")


class AvailabilityRule(Base):
    __tablename__ = "availability_rules"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    listing_id: Mapped[str] = mapped_column(ForeignKey("parking_listings.id"), index=True)
    day_of_week: Mapped[int | None] = mapped_column(Integer, nullable=True)
    start_time: Mapped[time] = mapped_column(Time)
    end_time: Mapped[time] = mapped_column(Time)
    is_available: Mapped[bool] = mapped_column(Boolean, default=True)
    min_duration_hours: Mapped[int] = mapped_column(Integer, default=1)

    listing: Mapped["ParkingListing"] = relationship(back_populates="availability_rules")


class BlockedSlot(Base):
    __tablename__ = "blocked_slots"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    listing_id: Mapped[str] = mapped_column(ForeignKey("parking_listings.id"), index=True)
    start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    end_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    listing: Mapped["ParkingListing"] = relationship(back_populates="blocked_slots")


class Booking(Base):
    __tablename__ = "bookings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    listing_id: Mapped[str] = mapped_column(ForeignKey("parking_listings.id"), index=True)
    renter_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    space_id: Mapped[str | None] = mapped_column(ForeignKey("parking_spaces.id"), nullable=True)
    unit: Mapped[BookingUnit] = mapped_column(Enum(BookingUnit))
    status: Mapped[BookingStatus] = mapped_column(Enum(BookingStatus), default=BookingStatus.PENDING)
    start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    end_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    subtotal_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    demand_multiplier: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=1)
    commission_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    total_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    qr_token: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    qr_payload: Mapped[str | None] = mapped_column(Text, nullable=True)
    qr_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    check_in_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    check_out_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancellation_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    listing: Mapped["ParkingListing"] = relationship(back_populates="bookings")
    renter: Mapped["User"] = relationship(back_populates="bookings")
    space: Mapped["ParkingSpace | None"] = relationship(back_populates="bookings")
    payment: Mapped["Payment | None"] = relationship(back_populates="booking", uselist=False)
    reviews: Mapped[list["Review"]] = relationship(back_populates="booking")


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    booking_id: Mapped[str] = mapped_column(ForeignKey("bookings.id"), unique=True, index=True)
    provider: Mapped[str] = mapped_column(String(50), default="razorpay")
    provider_order_id: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    provider_payment_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    currency: Mapped[str] = mapped_column(String(10), default="INR")
    status: Mapped[PaymentStatus] = mapped_column(Enum(PaymentStatus), default=PaymentStatus.PENDING)
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    booking: Mapped["Booking"] = relationship(back_populates="payment")

    @property
    def is_sandbox(self) -> bool:
        return bool(self.metadata_json.get('sandbox')) if self.metadata_json else False


class PayoutRecord(Base):
    __tablename__ = "payout_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    host_profile_id: Mapped[str] = mapped_column(ForeignKey("host_profiles.id"), index=True)
    booking_id: Mapped[str] = mapped_column(ForeignKey("bookings.id"), unique=True)
    gross_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    platform_fee: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    net_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    status: Mapped[PayoutStatus] = mapped_column(Enum(PayoutStatus), default=PayoutStatus.PENDING)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    host_profile: Mapped["HostProfile"] = relationship(back_populates="payouts")


class Review(Base):
    __tablename__ = "reviews"
    __table_args__ = (
        CheckConstraint("rating >= 1 AND rating <= 5", name="check_rating_range"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    booking_id: Mapped[str] = mapped_column(ForeignKey("bookings.id"), index=True)
    listing_id: Mapped[str] = mapped_column(ForeignKey("parking_listings.id"), index=True)
    author_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    target_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    rating: Mapped[int] = mapped_column(Integer)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    booking: Mapped["Booking"] = relationship(back_populates="reviews")
    listing: Mapped["ParkingListing"] = relationship(back_populates="reviews")
    author: Mapped["User"] = relationship(back_populates="reviews_written", foreign_keys=[author_id])


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    reporter_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    listing_id: Mapped[str | None] = mapped_column(ForeignKey("parking_listings.id"), nullable=True)
    booking_id: Mapped[str | None] = mapped_column(ForeignKey("bookings.id"), nullable=True)
    category: Mapped[str] = mapped_column(String(80))
    description: Mapped[str] = mapped_column(Text)
    status: Mapped[ReportStatus] = mapped_column(Enum(ReportStatus), default=ReportStatus.OPEN)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    reporter: Mapped["User"] = relationship(back_populates="reports")


class SavedPlace(Base):
    __tablename__ = "saved_places"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    label: Mapped[str] = mapped_column(String(80))
    address: Mapped[str] = mapped_column(String(255))
    latitude: Mapped[Decimal] = mapped_column(Numeric(9, 6))
    longitude: Mapped[Decimal] = mapped_column(Numeric(9, 6))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AdminActionLog(Base):
    __tablename__ = "admin_action_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    admin_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    action_type: Mapped[str] = mapped_column(String(120))
    target_type: Mapped[str] = mapped_column(String(80))
    target_id: Mapped[str] = mapped_column(String(36), index=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


__all__ = [
    "AdminActionLog",
    "AvailabilityRule",
    "BlockedSlot",
    "Booking",
    "BookingStatus",
    "BookingUnit",
    "HostApprovalStatus",
    "HostProfile",
    "ListingStatus",
    "ParkingListing",
    "ParkingSpace",
    "ParkingType",
    "Payment",
    "PaymentStatus",
    "PayoutRecord",
    "PayoutStatus",
    "Report",
    "ReportStatus",
    "Review",
    "SavedPlace",
    "User",
    "UserRole",
    "VerificationState",
]
