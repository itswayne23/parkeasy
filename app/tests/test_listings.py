"""Tests for listing-related endpoints."""

import pytest
from datetime import datetime, timedelta
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import ParkingListing, ParkingSpace, AvailabilityRule, User, UserRole, ListingStatus
from app.schemas import ListingCreate, ListingUpdate


def test_create_listing_success(client: TestClient, auth_headers: dict) -> None:
    """Test creating a new parking listing."""
    payload = {
        "title": "Secure Parking Downtown",
        "description": "Covered parking with 24/7 security",
        "address": "123 Main St, Downtown",
        "latitude": 40.7128,
        "longitude": -74.0060,
        "hourly_rate": Decimal("5.00"),
        "daily_rate": Decimal("40.00"),
        "monthly_rate": Decimal("300.00"),
        "capacity": 1,
        "parking_type": "covered",
        "amenities": ["security", "cctv", "lighting"],
        "spaces": [
            {
                "space_number": "A1",
                "vehicle_type": "car",
                "width": 2.5,
                "length": 5.0,
                "height": 2.2
            }
        ],
        "availability_rules": [
            {
                "day_of_week": 1,  # Monday
                "start_time": "09:00",
                "end_time": "18:00"
            }
        ]
    }
    
    response = client.post("/listings", json=payload, headers=auth_headers)
    
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == payload["title"]
    assert data["description"] == payload["description"]
    assert data["status"] == "draft"
    assert "id" in data
    assert "created_at" in data
    assert "host_profile" in data


def test_create_listing_missing_required_fields(client: TestClient, auth_headers: dict) -> None:
    """Test creating a listing with missing required fields."""
    payload = {
        "title": "Incomplete Listing",
        # Missing description, address, coordinates, etc.
    }
    
    response = client.post("/listings", json=payload, headers=auth_headers)
    
    assert response.status_code == 422  # Validation error


def test_get_my_listings(client: TestClient, auth_headers: dict, db: Session) -> None:
    """Test retrieving user's own listings."""
    # First create a listing
    create_payload = {
        "title": "Test Listing",
        "description": "Test description",
        "address": "Test Address",
        "latitude": 40.7128,
        "longitude": -74.0060,
        "hourly_rate": "5.00",
        "daily_rate": "40.00",
        "monthly_rate": "300.00",
        "capacity": 1,
        "parking_type": "open"
    }
    
    create_response = client.post("/listings", json=create_payload, headers=auth_headers)
    assert create_response.status_code == 200
    
    # Get my listings
    response = client.get("/listings", headers=auth_headers)
    
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert any(listing["title"] == "Test Listing" for listing in data)


def test_get_single_listing(client: TestClient, auth_headers: dict, db: Session) -> None:
    """Test retrieving a single listing by ID."""
    # Create a listing first
    create_payload = {
        "title": "Single Listing Test",
        "description": "Description",
        "address": "Address",
        "latitude": 40.7128,
        "longitude": -74.0060,
        "hourly_rate": "5.00",
        "daily_rate": "40.00",
        "monthly_rate": "300.00",
        "capacity": 1,
        "parking_type": "covered"
    }
    
    create_response = client.post("/listings", json=create_payload, headers=auth_headers)
    listing_id = create_response.json()["id"]
    
    # Get the listing
    response = client.get(f"/listings/{listing_id}", headers=auth_headers)
    
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == listing_id
    assert data["title"] == "Single Listing Test"


def test_update_listing(client: TestClient, auth_headers: dict, db: Session) -> None:
    """Test updating a listing."""
    # Create a listing first
    create_payload = {
        "title": "Original Title",
        "description": "Original Description",
        "address": "Original Address",
        "latitude": 40.7128,
        "longitude": -74.0060,
        "hourly_rate": "5.00",
        "daily_rate": "40.00",
        "monthly_rate": "300.00",
        "capacity": 1,
        "parking_type": "covered"
    }
    
    create_response = client.post("/listings", json=create_payload, headers=auth_headers)
    listing_id = create_response.json()["id"]
    
    # Update the listing
    update_payload = {
        "title": "Updated Title",
        "description": "Updated Description",
        "address": "Updated Address",
        "hourly_rate": "6.00",
        "daily_rate": "45.00"
    }
    
    response = client.put(f"/listings/{listing_id}", json=update_payload, headers=auth_headers)
    
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Updated Title"
    assert data["description"] == "Updated Description"
    assert data["address"] == "Updated Address"
    assert data["hourly_rate"] == "6.00"
    assert data["daily_rate"] == "45.00"


def test_publish_listing(client: TestClient, auth_headers: dict, db: Session) -> None:
    """Test publishing a draft listing."""
    # Create a draft listing
    create_payload = {
        "title": "Draft Listing",
        "description": "Draft description",
        "address": "Draft address",
        "latitude": 40.7128,
        "longitude": -74.0060,
        "hourly_rate": "5.00",
        "daily_rate": "40.00",
        "monthly_rate": "300.00",
        "capacity": 1,
        "parking_type": "covered"
    }
    
    create_response = client.post("/listings", json=create_payload, headers=auth_headers)
    listing_id = create_response.json()["id"]
    
    # Verify it's draft
    assert create_response.json()["status"] == "draft"
    
    # Publish the listing
    response = client.post(f"/listings/{listing_id}/publish", headers=auth_headers)
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "published"


def test_unpublish_listing(client: TestClient, auth_headers: dict, db: Session) -> None:
    """Test unpublishing a published listing."""
    # Create and publish a listing
    create_payload = {
        "title": "Published Listing",
        "description": "Published description",
        "address": "Published address",
        "latitude": 40.7128,
        "longitude": -74.0060,
        "hourly_rate": "5.00",
        "daily_rate": "40.00",
        "monthly_rate": "300.00",
        "capacity": 1,
        "parking_type": "covered"
    }
    
    create_response = client.post("/listings", json=create_payload, headers=auth_headers)
    listing_id = create_response.json()["id"]
    
    # Publish it
    client.post(f"/listings/{listing_id}/publish", headers=auth_headers)
    
    # Unpublish it
    response = client.post(f"/listings/{listing_id}/unpublish", headers=auth_headers)
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "unpublished"


def test_search_listings(client: TestClient, db: Session) -> None:
    """Test searching for published listings."""
    # Create a user and listing for testing
    from app.security import hash_password
    
    user = User(
        email="searchtest@example.com",
        hashed_password=hash_password("password123"),
        full_name="Search Test User",
        role=UserRole.host
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Create a host profile
    from app.models import HostProfile
    host_profile = HostProfile(
        user_id=user.id,
        business_name="Search Test Business",
        phone="+1234567890",
        approval_status="approved"
    )
    db.add(host_profile)
    db.commit()
    db.refresh(host_profile)
    
    # Create a published listing
    listing = ParkingListing(
        host_profile_id=host_profile.id,
        title="Searchable Parking",
        description="Great parking spot",
        address="123 Search St, Test City",
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
    
    # Search for listings
    response = client.get("/search", params={
        "lat": 40.7128,
        "lng": -74.0060,
        "radius": 10
    })
    
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert any(l["title"] == "Searchable Parking" for l in data)


def test_search_listings_with_filters(client: TestClient, db: Session) -> None:
    """Test searching with various filters."""
    response = client.get("/search", params={
        "lat": 40.7128,
        "lng": -74.0060,
        "radius": 5,
        "parking_type": "covered",
        "min_price": 0,
        "max_price": 10
    })
    
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_listing_not_found(client: TestClient, auth_headers: dict) -> None:
    """Test getting a non-existent listing."""
    response = client.get("/listings/nonexistent-id", headers=auth_headers)
    
    assert response.status_code == 404


def test_update_listing_unauthorized(client: TestClient, auth_headers: dict, db: Session) -> None:
    """Test updating a listing that doesn't belong to the user."""
    # Create a second user and listing
    from app.security import hash_password
    from app.models import User, HostProfile
    
    other_user = User(
        email="other@example.com",
        hashed_password=hash_password("password123"),
        full_name="Other User",
        role=UserRole.host
    )
    db.add(other_user)
    db.commit()
    db.refresh(other_user)
    
    other_host = HostProfile(
        user_id=other_user.id,
        business_name="Other Business",
        phone="+0987654321",
        approval_status="approved"
    )
    db.add(other_host)
    db.commit()
    db.refresh(other_host)
    
    other_listing = ParkingListing(
        host_profile_id=other_host.id,
        title="Other User's Listing",
        description="Not yours",
        address="Other address",
        latitude=40.7128,
        longitude=-74.0060,
        hourly_rate=Decimal("5.00"),
        daily_rate=Decimal("40.00"),
        monthly_rate=Decimal("300.00"),
        capacity=1,
        parking_type="open",
        status="draft"
    )
    db.add(other_listing)
    db.commit()
    db.refresh(other_listing)
    
    # Try to update it with current user's auth headers
    update_payload = {"title": "Hacked Title"}
    response = client.put(f"/listings/{other_listing.id}", json=update_payload, headers=auth_headers)
    
    # Should return 403 or 404
    assert response.status_code in [403, 404]