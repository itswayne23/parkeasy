from datetime import datetime, time
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models import (
    BookingStatus,
    BookingUnit,
    HostApprovalStatus,
    ListingStatus,
    ParkingType,
    PaymentStatus,
    ReportStatus,
    UserRole,
    VerificationState,
)


class ORMBaseModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class MessageResponse(BaseModel):
    message: str


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class SignupRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=20)
    password: str = Field(min_length=8, max_length=128)
    role: UserRole = UserRole.RENTER


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)


class UserRead(ORMBaseModel):
    id: str
    full_name: str
    email: EmailStr
    phone: str | None
    role: UserRole
    email_verified: bool
    phone_verified: bool
    is_active: bool
    avatar_url: str | None


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=120)
    phone: str | None = Field(default=None, max_length=20)
    avatar_url: str | None = None


class HostProfileUpsert(BaseModel):
    host_type: UserRole
    business_name: str | None = None
    bio: str | None = None
    tax_id: str | None = None
    photo_url: str | None = None


class HostProfileRead(ORMBaseModel):
    id: str
    host_type: UserRole
    business_name: str | None
    bio: str | None
    approval_status: HostApprovalStatus
    is_identity_verified: bool
    photo_url: str | None


class AvailabilityRulePayload(BaseModel):
    day_of_week: int | None = None
    start_time: time
    end_time: time
    is_available: bool = True
    min_duration_hours: int = 1


class ParkingSpacePayload(BaseModel):
    label: str
    capacity: int = Field(default=1, ge=1)
    size_label: str | None = None
    has_ev_charger: bool = False


class ListingCreate(BaseModel):
    title: str = Field(min_length=5, max_length=160)
    description: str | None = None
    host_type: UserRole
    display_address: str
    city: str
    state: str
    country: str = "India"
    latitude: float
    longitude: float
    parking_type: ParkingType
    vehicle_types: list[str]
    amenities: list[str] = []
    photo_urls: list[str] = []
    access_instructions: str | None = None
    hourly_rate: Decimal = Field(ge=0)
    daily_rate: Decimal = Field(ge=0)
    busy_area: bool = False
    spaces: list[ParkingSpacePayload] = []
    availability_rules: list[AvailabilityRulePayload] = []


class ListingUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    display_address: str | None = None
    city: str | None = None
    state: str | None = None
    country: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    parking_type: ParkingType | None = None
    vehicle_types: list[str] | None = None
    amenities: list[str] | None = None
    photo_urls: list[str] | None = None
    access_instructions: str | None = None
    hourly_rate: Decimal | None = None
    daily_rate: Decimal | None = None
    busy_area: bool | None = None


class ListingRead(ORMBaseModel):
    id: str
    title: str
    description: str | None
    host_type: UserRole
    display_address: str
    city: str
    state: str
    country: str
    latitude: Decimal
    longitude: Decimal
    parking_type: ParkingType
    vehicle_types: list[str]
    amenities: list[str]
    photo_urls: list[str]
    access_instructions: str | None
    hourly_rate: Decimal
    daily_rate: Decimal
    busy_area: bool
    verification_state: VerificationState
    status: ListingStatus


class BookingQuoteRequest(BaseModel):
    listing_id: str
    unit: BookingUnit
    start_at: datetime
    end_at: datetime


class BookingCreate(BaseModel):
    listing_id: str
    space_id: str | None = None
    unit: BookingUnit
    start_at: datetime
    end_at: datetime


class BookingRead(ORMBaseModel):
    id: str
    listing_id: str
    renter_id: str
    space_id: str | None
    unit: BookingUnit
    status: BookingStatus
    start_at: datetime
    end_at: datetime
    subtotal_amount: Decimal
    demand_multiplier: Decimal
    commission_amount: Decimal
    total_amount: Decimal
    qr_token: str | None
    qr_payload: str | None


class BookingQuoteResponse(BaseModel):
    listing_id: str
    unit: BookingUnit
    start_at: datetime
    end_at: datetime
    subtotal_amount: Decimal
    demand_multiplier: Decimal
    commission_amount: Decimal
    total_amount: Decimal


class BookingCancellation(BaseModel):
    reason: str = Field(min_length=4, max_length=300)


class PaymentOrderRequest(BaseModel):
    booking_id: str


class PaymentVerificationRequest(BaseModel):
    booking_id: str
    provider_order_id: str
    provider_payment_id: str
    provider_signature: str | None = None


class PaymentRead(ORMBaseModel):
    id: str
    booking_id: str
    provider: str
    provider_order_id: str | None
    provider_payment_id: str | None
    amount: Decimal
    currency: str
    status: PaymentStatus
    is_sandbox: bool = False


class ModerationDecision(BaseModel):
    notes: str | None = None
    approval_status: HostApprovalStatus | None = None
    listing_status: ListingStatus | None = None


class AdminMetricResponse(BaseModel):
    users: int
    hosts: int
    listings: int
    bookings: int
    pending_hosts: int
    flagged_reports: int


__all__ = [
    "AdminMetricResponse",
    "AvailabilityRulePayload",
    "BookingCancellation",
    "BookingCreate",
    "BookingQuoteRequest",
    "BookingQuoteResponse",
    "BookingRead",
    "ForgotPasswordRequest",
    "HostProfileRead",
    "HostProfileUpsert",
    "ListingCreate",
    "ListingRead",
    "ListingUpdate",
    "LoginRequest",
    "MessageResponse",
    "ModerationDecision",
    "PaymentOrderRequest",
    "PaymentRead",
    "PaymentVerificationRequest",
    "RefreshTokenRequest",
    "ResetPasswordRequest",
    "SignupRequest",
    "TokenPair",
    "UserRead",
    "UserUpdate",
]



