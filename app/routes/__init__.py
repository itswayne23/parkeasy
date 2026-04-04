from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP
from io import BytesIO
from math import asin, cos, radians, sin, sqrt
from secrets import token_hex, token_urlsafe
import base64
import hashlib
import hmac as hmac_module

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import (
    AdminActionLog,
    AvailabilityRule,
    Booking,
    BookingStatus,
    BookingUnit,
    HostApprovalStatus,
    HostProfile,
    ListingStatus,
    ParkingListing,
    ParkingSpace,
    Payment,
    PaymentStatus,
    Report,
    User,
    UserRole,
)
from app.schemas import (
    AdminMetricResponse,
    BookingCancellation,
    BookingCreate,
    BookingQuoteRequest,
    BookingQuoteResponse,
    BookingRead,
    HostProfileRead,
    HostProfileUpsert,
    ListingCreate,
    ListingRead,
    ListingUpdate,
    LoginRequest,
    MessageResponse,
    ModerationDecision,
    PaymentOrderRequest,
    PaymentRead,
    PaymentVerificationRequest,
    RefreshTokenRequest,
    SignupRequest,
    TokenPair,
    UserRead,
    UserUpdate,
)
from app.security import create_access_token, create_refresh_token, decode_token, hash_password, verify_password

try:  # pragma: no cover
    import qrcode
    import qrcode.image.svg
except Exception:  # pragma: no cover
    qrcode = None

try:  # pragma: no cover
    import razorpay
except Exception:  # pragma: no cover
    razorpay = None

router = APIRouter()


def _decimal(value: Decimal | float | str) -> Decimal:
    return Decimal(str(value))


def _distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius = 6371
    d_lat = radians(lat2 - lat1)
    d_lon = radians(lon2 - lon1)
    a = sin(d_lat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(d_lon / 2) ** 2
    return 2 * radius * asin(sqrt(a))


def _build_qr_payload(booking_id: str, qr_token: str, expires_at: datetime) -> str:
    return f"parkeasy://booking/{booking_id}?token={qr_token}&expires={expires_at.isoformat()}"


def _render_qr_svg_data_url(payload: str | None) -> str | None:
    if not payload or not qrcode:
        return None
    factory = qrcode.image.svg.SvgImage
    image = qrcode.make(payload, image_factory=factory)
    output = BytesIO()
    image.save(output)
    encoded = base64.b64encode(output.getvalue()).decode("utf-8")
    return f"data:image/svg+xml;base64,{encoded}"


def _verify_razorpay_signature(order_id: str, payment_id: str, signature: str) -> bool:
    """Verify Razorpay payment signature using HMAC-SHA256."""
    body = f"{order_id}|{payment_id}"
    expected = hmac_module.new(
        settings.razorpay_key_secret.encode("utf-8"),
        body.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return hmac_module.compare_digest(expected, signature)


def _pricing_breakdown(listing: ParkingListing, start_at: datetime, end_at: datetime, unit: BookingUnit) -> dict:
    duration_hours = max((end_at - start_at).total_seconds() / 3600, 1)
    duration_days = max(duration_hours / 24, 1)
    subtotal = _decimal(listing.hourly_rate) * _decimal(duration_hours)
    if unit == BookingUnit.DAILY:
        subtotal = _decimal(listing.daily_rate) * _decimal(duration_days)

    multiplier = Decimal("1.00")
    if start_at.weekday() >= 5:
        multiplier *= _decimal(settings.weekend_multiplier)
    if 8 <= start_at.hour <= 11 or 17 <= start_at.hour <= 21:
        multiplier *= _decimal(settings.peak_hour_multiplier)
    if listing.busy_area:
        multiplier *= _decimal(settings.busy_area_multiplier)

    subtotal = subtotal.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    multiplier = multiplier.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    total = (subtotal * multiplier).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    commission = (total * _decimal(settings.commission_rate)).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )
    return {
        "subtotal_amount": subtotal,
        "demand_multiplier": multiplier,
        "commission_amount": commission,
        "total_amount": total,
    }


def _ensure_listing_available(db: Session, listing: ParkingListing, start_at: datetime, end_at: datetime) -> None:
    overlapping_booking = (
        db.query(Booking)
        .filter(
            Booking.listing_id == listing.id,
            Booking.status.in_([BookingStatus.PENDING, BookingStatus.CONFIRMED]),
            Booking.start_at < end_at,
            Booking.end_at > start_at,
        )
        .first()
    )
    if overlapping_booking:
        raise HTTPException(status_code=400, detail="Listing is already booked for the selected window")


def _assign_qr_details(booking: Booking) -> Booking:
    booking.qr_token = token_urlsafe(18)
    booking.qr_expires_at = booking.end_at + timedelta(hours=2)
    booking.qr_payload = _build_qr_payload(booking.id, booking.qr_token, booking.qr_expires_at)
    return booking


def _get_current_user(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")

    token = authorization.split(" ", 1)[1]
    try:
        payload = decode_token(token)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc

    if payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")

    user = db.get(User, payload.get("sub"))
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not available")
    return user


def _require_roles(*roles: UserRole):
    allowed = set(roles)

    def dependency(current_user: User = Depends(_get_current_user)) -> User:
        if current_user.role not in allowed:
            raise HTTPException(status_code=403, detail="Not enough permissions")
        return current_user

    return dependency


def _get_host_profile_or_raise(db: Session, user: User) -> HostProfile:
    profile = db.query(HostProfile).filter(HostProfile.user_id == user.id).first()
    if not profile:
        raise HTTPException(status_code=400, detail="Create a host profile first")
    return profile


@router.post("/auth/signup", response_model=TokenPair)
def signup(payload: SignupRequest, db: Session = Depends(get_db)) -> TokenPair:
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=payload.email,
        phone=payload.phone,
        full_name=payload.full_name,
        password_hash=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return TokenPair(
        access_token=create_access_token(user.id, {"role": user.role.value}),
        refresh_token=create_refresh_token(user.id),
    )


@router.post("/auth/login", response_model=TokenPair)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenPair:
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Invalid credentials")
    return TokenPair(
        access_token=create_access_token(user.id, {"role": user.role.value}),
        refresh_token=create_refresh_token(user.id),
    )


@router.post("/auth/refresh", response_model=TokenPair)
def refresh_token(payload: RefreshTokenRequest, db: Session = Depends(get_db)) -> TokenPair:
    try:
        data = decode_token(payload.refresh_token)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail="Invalid refresh token") from exc
    if data.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    user = db.get(User, data.get("sub"))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return TokenPair(
        access_token=create_access_token(user.id, {"role": user.role.value}),
        refresh_token=create_refresh_token(user.id),
    )


@router.post("/auth/verify-email", response_model=MessageResponse)
def verify_email() -> MessageResponse:
    return MessageResponse(message="Email verification hook is ready for provider integration.")


@router.post("/auth/verify-phone", response_model=MessageResponse)
def verify_phone() -> MessageResponse:
    return MessageResponse(message="Phone verification hook is ready for provider integration.")


@router.post("/auth/forgot-password", response_model=MessageResponse)
def forgot_password() -> MessageResponse:
    return MessageResponse(message="Password reset flow placeholder created.")


@router.post("/auth/reset-password", response_model=MessageResponse)
def reset_password() -> MessageResponse:
    return MessageResponse(message="Reset password endpoint placeholder created.")


@router.get("/users/me", response_model=UserRead)
def get_me(current_user: User = Depends(_get_current_user)) -> User:
    return current_user


@router.put("/users/me", response_model=UserRead)
def update_me(
    payload: UserUpdate,
    current_user: User = Depends(_get_current_user),
    db: Session = Depends(get_db),
) -> User:
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(current_user, field, value)
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.put("/users/host-profile", response_model=HostProfileRead)
def upsert_host_profile(
    payload: HostProfileUpsert,
    current_user: User = Depends(_get_current_user),
    db: Session = Depends(get_db),
) -> HostProfile:
    profile = db.query(HostProfile).filter(HostProfile.user_id == current_user.id).first()
    if profile is None:
        profile = HostProfile(user_id=current_user.id, host_type=payload.host_type)
        db.add(profile)
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(profile, field, value)
    current_user.role = payload.host_type
    db.add_all([current_user, profile])
    db.commit()
    db.refresh(profile)
    return profile


@router.get("/users/host-profile", response_model=HostProfileRead)
def get_host_profile(
    current_user: User = Depends(_get_current_user),
    db: Session = Depends(get_db),
) -> HostProfile:
    profile = db.query(HostProfile).filter(HostProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Host profile not found")
    return profile


@router.post("/listings", response_model=ListingRead)
def create_listing(
    payload: ListingCreate,
    current_user: User = Depends(_get_current_user),
    db: Session = Depends(get_db),
) -> ParkingListing:
    if current_user.role not in {UserRole.INDIVIDUAL_HOST, UserRole.COMMERCIAL_HOST, UserRole.ADMIN}:
        raise HTTPException(status_code=403, detail="Only hosts can create listings")
    profile = _get_host_profile_or_raise(db, current_user)
    listing = ParkingListing(
        host_id=profile.id,
        title=payload.title,
        description=payload.description,
        host_type=payload.host_type,
        display_address=payload.display_address,
        city=payload.city,
        state=payload.state,
        country=payload.country,
        latitude=payload.latitude,
        longitude=payload.longitude,
        parking_type=payload.parking_type,
        vehicle_types=payload.vehicle_types,
        amenities=payload.amenities,
        photo_urls=payload.photo_urls,
        access_instructions=payload.access_instructions,
        hourly_rate=payload.hourly_rate,
        daily_rate=payload.daily_rate,
        busy_area=payload.busy_area,
    )
    db.add(listing)
    db.flush()
    for space in payload.spaces:
        db.add(ParkingSpace(listing_id=listing.id, **space.model_dump()))
    for rule in payload.availability_rules:
        db.add(AvailabilityRule(listing_id=listing.id, **rule.model_dump()))
    db.commit()
    db.refresh(listing)
    return listing


@router.get("/listings", response_model=list[ListingRead])
def my_listings(
    current_user: User = Depends(_get_current_user),
    db: Session = Depends(get_db),
) -> list[ParkingListing]:
    if current_user.role == UserRole.ADMIN:
        return db.query(ParkingListing).order_by(ParkingListing.created_at.desc()).all()
    profile = db.query(HostProfile).filter(HostProfile.user_id == current_user.id).first()
    if not profile:
        return []
    return db.query(ParkingListing).filter(ParkingListing.host_id == profile.id).all()


@router.get("/listings/{listing_id}", response_model=ListingRead)
def get_listing(listing_id: str, db: Session = Depends(get_db)) -> ParkingListing:
    listing = db.get(ParkingListing, listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    return listing


@router.put("/listings/{listing_id}", response_model=ListingRead)
def update_listing(
    listing_id: str,
    payload: ListingUpdate,
    current_user: User = Depends(_get_current_user),
    db: Session = Depends(get_db),
) -> ParkingListing:
    listing = db.get(ParkingListing, listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if current_user.role != UserRole.ADMIN:
        profile = _get_host_profile_or_raise(db, current_user)
        if listing.host_id != profile.id:
            raise HTTPException(status_code=403, detail="Not allowed to edit this listing")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(listing, field, value)
    db.add(listing)
    db.commit()
    db.refresh(listing)
    return listing


@router.post("/listings/{listing_id}/publish", response_model=ListingRead)
def publish_listing(
    listing_id: str,
    current_user: User = Depends(_get_current_user),
    db: Session = Depends(get_db),
) -> ParkingListing:
    listing = db.get(ParkingListing, listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if current_user.role != UserRole.ADMIN:
        profile = _get_host_profile_or_raise(db, current_user)
        if listing.host_id != profile.id:
            raise HTTPException(status_code=403, detail="Not allowed to publish this listing")
    listing.status = ListingStatus.PUBLISHED
    db.add(listing)
    db.commit()
    db.refresh(listing)
    return listing


@router.post("/listings/{listing_id}/unpublish", response_model=ListingRead)
def unpublish_listing(
    listing_id: str,
    current_user: User = Depends(_get_current_user),
    db: Session = Depends(get_db),
) -> ParkingListing:
    listing = db.get(ParkingListing, listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if current_user.role != UserRole.ADMIN:
        profile = _get_host_profile_or_raise(db, current_user)
        if listing.host_id != profile.id:
            raise HTTPException(status_code=403, detail="Not allowed to unpublish this listing")
    listing.status = ListingStatus.DRAFT
    db.add(listing)
    db.commit()
    db.refresh(listing)
    return listing


@router.get("/search", response_model=list[ListingRead])
def search_listings(
    latitude: float = Query(...),
    longitude: float = Query(...),
    radius_km: float = Query(5, ge=0.5, le=50),
    start_at: datetime | None = Query(default=None),
    end_at: datetime | None = Query(default=None),
    vehicle_type: str | None = Query(default=None),
    host_type: UserRole | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[ParkingListing]:
    listings = (
        db.query(ParkingListing)
        .filter(ParkingListing.status == ListingStatus.PUBLISHED, ParkingListing.is_active.is_(True))
        .all()
    )
    filtered: list[ParkingListing] = []
    for listing in listings:
        if host_type and listing.host_type != host_type:
            continue
        if vehicle_type and vehicle_type not in listing.vehicle_types:
            continue
        distance = _distance_km(latitude, longitude, float(listing.latitude), float(listing.longitude))
        if distance > radius_km:
            continue
        if start_at and end_at:
            try:
                _ensure_listing_available(db, listing, start_at, end_at)
            except HTTPException:
                continue
        filtered.append(listing)
    return filtered


@router.post("/bookings/quote", response_model=BookingQuoteResponse)
def quote_booking(payload: BookingQuoteRequest, db: Session = Depends(get_db)) -> BookingQuoteResponse:
    listing = db.get(ParkingListing, payload.listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    pricing = _pricing_breakdown(listing, payload.start_at, payload.end_at, payload.unit)
    return BookingQuoteResponse(
        **pricing,
        listing_id=listing.id,
        unit=payload.unit,
        start_at=payload.start_at,
        end_at=payload.end_at,
    )


@router.post("/bookings", response_model=BookingRead)
def create_booking(
    payload: BookingCreate,
    current_user: User = Depends(_get_current_user),
    db: Session = Depends(get_db),
) -> Booking:
    listing = db.get(ParkingListing, payload.listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    _ensure_listing_available(db, listing, payload.start_at, payload.end_at)
    pricing = _pricing_breakdown(listing, payload.start_at, payload.end_at, payload.unit)
    booking = Booking(
        listing_id=listing.id,
        renter_id=current_user.id,
        space_id=payload.space_id,
        unit=payload.unit,
        start_at=payload.start_at,
        end_at=payload.end_at,
        status=BookingStatus.PENDING,
        **pricing,
    )
    _assign_qr_details(booking)
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return booking


@router.get("/bookings/me", response_model=list[BookingRead])
def my_bookings(
    current_user: User = Depends(_get_current_user),
    db: Session = Depends(get_db),
) -> list[Booking]:
    return db.query(Booking).filter(Booking.renter_id == current_user.id).order_by(Booking.created_at.desc()).all()


@router.get("/bookings/{booking_id}", response_model=BookingRead)
def get_booking(
    booking_id: str,
    current_user: User = Depends(_get_current_user),
    db: Session = Depends(get_db),
) -> Booking:
    booking = db.get(Booking, booking_id)
    if not booking or booking.renter_id != current_user.id:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking


@router.post("/bookings/{booking_id}/cancel", response_model=BookingRead)
def cancel_booking(
    booking_id: str,
    payload: BookingCancellation,
    current_user: User = Depends(_get_current_user),
    db: Session = Depends(get_db),
) -> Booking:
    booking = db.get(Booking, booking_id)
    if not booking or booking.renter_id != current_user.id:
        raise HTTPException(status_code=404, detail="Booking not found")
    booking.status = BookingStatus.CANCELLED
    booking.cancellation_reason = payload.reason
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return booking


@router.post("/bookings/{booking_id}/check-in", response_model=MessageResponse)
def check_in(
    booking_id: str,
    qr_token: str,
    current_user: User = Depends(_get_current_user),
    db: Session = Depends(get_db),
) -> MessageResponse:
    booking = db.get(Booking, booking_id)
    if not booking or booking.qr_token != qr_token:
        raise HTTPException(status_code=404, detail="Booking not found")
    # Verify user owns this booking or is the listing host
    is_host = False
    if current_user.role in {UserRole.INDIVIDUAL_HOST, UserRole.COMMERCIAL_HOST}:
        profile = db.query(HostProfile).filter(HostProfile.user_id == current_user.id).first()
        if profile:
            listing = db.get(ParkingListing, booking.listing_id)
            is_host = listing and listing.host_id == profile.id
    if booking.renter_id != current_user.id and not is_host:
        raise HTTPException(status_code=403, detail="Not authorized for this booking")
    booking.status = BookingStatus.CONFIRMED
    booking.check_in_at = datetime.now(timezone.utc)
    db.add(booking)
    db.commit()
    return MessageResponse(message="Check-in complete")


@router.post("/bookings/{booking_id}/check-out", response_model=MessageResponse)
def check_out(
    booking_id: str,
    current_user: User = Depends(_get_current_user),
    db: Session = Depends(get_db),
) -> MessageResponse:
    booking = db.get(Booking, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    is_host = False
    if current_user.role in {UserRole.INDIVIDUAL_HOST, UserRole.COMMERCIAL_HOST}:
        profile = db.query(HostProfile).filter(HostProfile.user_id == current_user.id).first()
        if profile:
            listing = db.get(ParkingListing, booking.listing_id)
            is_host = listing and listing.host_id == profile.id
    if booking.renter_id != current_user.id and not is_host:
        raise HTTPException(status_code=403, detail="Not authorized for this booking")
    booking.status = BookingStatus.COMPLETED
    booking.check_out_at = datetime.now(timezone.utc)
    db.add(booking)
    db.commit()
    return MessageResponse(message="Check-out complete")


@router.get("/bookings/{booking_id}/qr")
def booking_qr(
    booking_id: str,
    current_user: User = Depends(_get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, str | None]:
    booking = db.get(Booking, booking_id)
    if not booking or booking.renter_id != current_user.id:
        raise HTTPException(status_code=404, detail="Booking not found")
    return {"payload": booking.qr_payload, "svg_data_url": _render_qr_svg_data_url(booking.qr_payload)}


def _create_razorpay_order(amount: Decimal, receipt: str) -> dict:
    paise = int(amount * 100)
    if not razorpay or not settings.razorpay_key_id or not settings.razorpay_key_secret:
        return {
            "id": f"order_sandbox_{token_hex(8)}",
            "amount": paise,
            "currency": settings.currency,
            "receipt": receipt,
            "sandbox": True,
        }
    client = razorpay.Client(auth=(settings.razorpay_key_id, settings.razorpay_key_secret))
    return client.order.create({"amount": paise, "currency": settings.currency, "receipt": receipt})


@router.post("/payments/order", response_model=PaymentRead)
def create_order(
    payload: PaymentOrderRequest,
    current_user: User = Depends(_get_current_user),
    db: Session = Depends(get_db),
) -> Payment:
    booking = db.get(Booking, payload.booking_id)
    if not booking or booking.renter_id != current_user.id:
        raise HTTPException(status_code=404, detail="Booking not found")
    order = _create_razorpay_order(booking.total_amount, booking.id)
    payment = db.query(Payment).filter(Payment.booking_id == booking.id).first()
    if not payment:
        payment = Payment(booking_id=booking.id, amount=booking.total_amount, currency=settings.currency)
    payment.provider_order_id = order["id"]
    payment.metadata_json = order
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment


@router.post("/payments/verify", response_model=PaymentRead)
def verify_payment(
    payload: PaymentVerificationRequest,
    current_user: User = Depends(_get_current_user),
    db: Session = Depends(get_db),
) -> Payment:
    booking = db.get(Booking, payload.booking_id)
    if not booking or booking.renter_id != current_user.id:
        raise HTTPException(status_code=404, detail="Booking not found")
    payment = db.query(Payment).filter(Payment.booking_id == booking.id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment order not found")

    # Verify Razorpay signature when provided and signing is configured
    if payload.provider_signature:
        if not settings.razorpay_key_secret:
            raise HTTPException(status_code=500, detail="Razorpay secret key not configured")
        if not _verify_razorpay_signature(
            payload.provider_order_id, payload.provider_payment_id, payload.provider_signature
        ):
            raise HTTPException(status_code=400, detail="Invalid payment signature")

    payment.provider_payment_id = payload.provider_payment_id
    payment.status = PaymentStatus.CAPTURED
    booking.status = BookingStatus.CONFIRMED
    db.add_all([payment, booking])
    db.commit()
    db.refresh(payment)
    return payment


@router.get("/payments/{booking_id}", response_model=PaymentRead)
def get_payment(
    booking_id: str,
    current_user: User = Depends(_get_current_user),
    db: Session = Depends(get_db),
) -> Payment:
    booking = db.get(Booking, booking_id)
    if not booking or booking.renter_id != current_user.id:
        raise HTTPException(status_code=404, detail="Booking not found")
    payment = db.query(Payment).filter(Payment.booking_id == booking.id).first()
    if not payment:
        raise HTTPException(status_code=404, detail='Payment not found')
    setattr(payment, 'is_sandbox', bool((payment.metadata_json or {}).get('sandbox')))
    return payment


@router.get("/host/dashboard")
def host_dashboard(
    current_user: User = Depends(_get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    profile = db.query(HostProfile).filter(HostProfile.user_id == current_user.id).first()
    if not profile:
        return {"listings": 0, "bookings": 0, "gross_earnings": Decimal("0.00")}
    listings = db.query(ParkingListing).filter(ParkingListing.host_id == profile.id).all()
    listing_ids = [listing.id for listing in listings]
    bookings = db.query(Booking).filter(Booking.listing_id.in_(listing_ids)).all() if listing_ids else []
    gross = sum((booking.total_amount for booking in bookings), Decimal("0.00"))
    return {
        "listings": len(listings),
        "bookings": len(bookings),
        "gross_earnings": gross,
        "approval_status": profile.approval_status,
    }


@router.get("/admin/metrics", response_model=AdminMetricResponse)
def admin_metrics(
    current_user: User = Depends(_require_roles(UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> AdminMetricResponse:
    return AdminMetricResponse(
        users=db.query(func.count(User.id)).scalar() or 0,
        hosts=db.query(func.count(HostProfile.id)).scalar() or 0,
        listings=db.query(func.count(ParkingListing.id)).scalar() or 0,
        bookings=db.query(func.count(Booking.id)).scalar() or 0,
        pending_hosts=db.query(func.count(HostProfile.id))
        .filter(HostProfile.approval_status == HostApprovalStatus.PENDING)
        .scalar()
        or 0,
        flagged_reports=db.query(func.count(Report.id)).scalar() or 0,
    )


@router.get("/admin/hosts/pending", response_model=list[HostProfileRead])
def pending_hosts(
    current_user: User = Depends(_require_roles(UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> list[HostProfile]:
    return db.query(HostProfile).filter(HostProfile.approval_status == HostApprovalStatus.PENDING).all()


@router.post("/admin/hosts/{host_profile_id}/moderate", response_model=MessageResponse)
def moderate_host(
    host_profile_id: str,
    payload: ModerationDecision,
    current_user: User = Depends(_require_roles(UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> MessageResponse:
    profile = db.get(HostProfile, host_profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Host profile not found")
    if payload.approval_status:
        profile.approval_status = payload.approval_status
    db.add(profile)
    db.add(
        AdminActionLog(
            admin_id=current_user.id,
            action_type="moderate_host",
            target_type="host_profile",
            target_id=profile.id,
            notes=payload.notes,
        )
    )
    db.commit()
    return MessageResponse(message="Host moderation updated")


@router.post("/admin/listings/{listing_id}/moderate", response_model=MessageResponse)
def moderate_listing(
    listing_id: str,
    payload: ModerationDecision,
    current_user: User = Depends(_require_roles(UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> MessageResponse:
    listing = db.get(ParkingListing, listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if payload.listing_status:
        listing.status = payload.listing_status
    db.add(listing)
    db.add(
        AdminActionLog(
            admin_id=current_user.id,
            action_type="moderate_listing",
            target_type="listing",
            target_id=listing.id,
            notes=payload.notes,
        )
    )
    db.commit()
    return MessageResponse(message="Listing moderation updated")

