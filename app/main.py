from pathlib import Path
from datetime import time
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, SessionLocal, engine
from app.models import *  # noqa: F401,F403
from app.models import (
    AvailabilityRule,
    HostProfile,
    HostApprovalStatus,
    ListingStatus,
    ParkingListing,
    ParkingSpace,
    ParkingType,
    User,
    UserRole,
    VerificationState,
)
from app.routes import router
from app.security import hash_password

Path(settings.uploads_dir).mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title="ParkEasy API",
    version="0.1.0",
    description="Free-first marketplace backend for P2P and commercial parking in India.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)


def seed_demo_data() -> None:
    db = SessionLocal()
    try:
        if db.query(ParkingListing).first():
            return

        host_user = User(
            email="host@parkeasyapp.com",
            phone="+919876543210",
            full_name="Aarav Host",
            password_hash=hash_password("parkeasy123"),
            role=UserRole.INDIVIDUAL_HOST,
            email_verified=True,
            phone_verified=True,
        )
        commercial_user = User(
            email="operator@parkeasyapp.com",
            phone="+919876543211",
            full_name="CityLot Operator",
            password_hash=hash_password("parkeasy123"),
            role=UserRole.COMMERCIAL_HOST,
            email_verified=True,
            phone_verified=True,
        )
        renter_user = User(
            email="renter@parkeasyapp.com",
            phone="+919876543212",
            full_name="Riya Driver",
            password_hash=hash_password("parkeasy123"),
            role=UserRole.RENTER,
            email_verified=True,
            phone_verified=True,
        )
        admin_user = User(
            email="admin@parkeasyapp.com",
            phone="+919876543213",
            full_name="Ops Admin",
            password_hash=hash_password("parkeasy123"),
            role=UserRole.ADMIN,
            email_verified=True,
            phone_verified=True,
        )
        db.add_all([host_user, commercial_user, renter_user, admin_user])
        db.flush()

        host_profile = HostProfile(
            user_id=host_user.id,
            host_type=UserRole.INDIVIDUAL_HOST,
            business_name="ParkEasy Homes",
            bio="Secure premium residential parking near GS Road.",
            approval_status=HostApprovalStatus.APPROVED,
            is_identity_verified=True,
        )
        commercial_profile = HostProfile(
            user_id=commercial_user.id,
            host_type=UserRole.COMMERCIAL_HOST,
            business_name="CityLot Mobility",
            bio="Commercial inventory for dense commuter corridors.",
            approval_status=HostApprovalStatus.APPROVED,
            is_identity_verified=True,
        )
        db.add_all([host_profile, commercial_profile])
        db.flush()

        listings = [
            ParkingListing(
                host_id=host_profile.id,
                title="Glass canopy driveway near GS Road",
                description="Premium residential driveway with quick QR check-in and CCTV coverage.",
                host_type=UserRole.INDIVIDUAL_HOST,
                display_address="Christian Basti, Guwahati",
                city="Guwahati",
                state="Assam",
                latitude=26.1815,
                longitude=91.7530,
                parking_type=ParkingType.DRIVEWAY,
                vehicle_types=["Sedan", "Hatchback"],
                amenities=["CCTV", "Covered", "QR access"],
                photo_urls=[],
                access_instructions="Scan the QR near the blue gate.",
                hourly_rate=60,
                daily_rate=420,
                busy_area=True,
                verification_state=VerificationState.VERIFIED,
                status=ListingStatus.PUBLISHED,
            ),
            ParkingListing(
                host_id=commercial_profile.id,
                title="High-turnover lot by Paltan Bazar",
                description="Commercial lot optimized for station-side turnover and safe exits.",
                host_type=UserRole.COMMERCIAL_HOST,
                display_address="Paltan Bazar, Guwahati",
                city="Guwahati",
                state="Assam",
                latitude=26.1800,
                longitude=91.7477,
                parking_type=ParkingType.LOT,
                vehicle_types=["SUV", "Sedan", "Hatchback"],
                amenities=["Guarded", "Transit zone", "Night access"],
                photo_urls=[],
                access_instructions="Entry from the east gate after staff confirmation.",
                hourly_rate=80,
                daily_rate=560,
                busy_area=True,
                verification_state=VerificationState.VERIFIED,
                status=ListingStatus.PUBLISHED,
            ),
            ParkingListing(
                host_id=host_profile.id,
                title="Private garage with EV socket",
                description="Quiet enclosed garage with plug-in charging support.",
                host_type=UserRole.INDIVIDUAL_HOST,
                display_address="Zoo Road, Guwahati",
                city="Guwahati",
                state="Assam",
                latitude=26.1542,
                longitude=91.7803,
                parking_type=ParkingType.GARAGE,
                vehicle_types=["Hatchback", "Sedan"],
                amenities=["EV ready", "Night access", "Sheltered"],
                photo_urls=[],
                access_instructions="Host shares access pin after booking confirmation.",
                hourly_rate=75,
                daily_rate=500,
                busy_area=False,
                verification_state=VerificationState.VERIFIED,
                status=ListingStatus.PUBLISHED,
            ),
        ]
        db.add_all(listings)
        db.flush()

        for listing in listings:
            db.add(
                ParkingSpace(
                    listing_id=listing.id,
                    label=f"{listing.title} - Spot A",
                    capacity=1,
                    size_label="Standard",
                    has_ev_charger="EV ready" in listing.amenities,
                )
            )
            db.add(
                AvailabilityRule(
                    listing_id=listing.id,
                    day_of_week=None,
                    start_time=time(hour=0, minute=0),
                    end_time=time(hour=23, minute=59),
                    is_available=True,
                    min_duration_hours=1,
                )
            )

        db.commit()
    finally:
        db.close()


if os.environ.get("SEED_DEMO_DATA"):
    seed_demo_data()
app.include_router(router, prefix=settings.api_prefix)


@app.get("/", tags=["system"])
def root() -> dict[str, str]:
    return {"message": "ParkEasy backend is alive", "market": settings.default_launch_city}


@app.get("/health", tags=["system"])
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}
