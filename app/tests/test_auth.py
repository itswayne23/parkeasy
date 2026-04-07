"""Tests for authentication endpoints."""
import pytest
from fastapi import status


def test_health_check(client):
    """Test health check endpoint."""
    response = client.get("/health")
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {"status": "ok"}


def test_root_endpoint(client):
    """Test root endpoint."""
    response = client.get("/")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "message" in data
    assert "market" in data


def test_signup(client, db):
    """Test user signup endpoint."""
    signup_data = {
        "full_name": "Test User",
        "email": "newuser@example.com",
        "phone": "+911234567890",
        "password": "SecurePass123!",
        "role": "renter"
    }
    
    response = client.post("/api/v1/auth/signup", json=signup_data)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"
    
    # Verify user was created in database
    from app.models import User
    user = db.query(User).filter(User.email == "newuser@example.com").first()
    assert user is not None
    assert user.full_name == "Test User"
    assert user.role.value == "renter"


def test_login(client, db):
    """Test user login endpoint."""
    from app.models import User, UserRole
    from app.security import hash_password
    
    # Create a test user first
    test_user = User(
        email="login@example.com",
        phone="+911234567891",
        full_name="Login Test User",
        password_hash=hash_password("testpassword123"),
        role=UserRole.RENTER,
        email_verified=True,
        phone_verified=True,
    )
    db.add(test_user)
    db.commit()
    
    # Test login with correct credentials
    login_data = {
        "email": "login@example.com",
        "password": "testpassword123"
    }
    
    response = client.post("/api/v1/auth/login", json=login_data)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    
    # Test login with incorrect password
    wrong_password_data = {
        "email": "login@example.com",
        "password": "wrongpassword"
    }
    
    response = client.post("/api/v1/auth/login", json=wrong_password_data)
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "Invalid credentials" in response.json()["detail"]
    
    # Test login with non-existent user
    nonexistent_data = {
        "email": "nonexistent@example.com",
        "password": "anypassword"
    }
    
    response = client.post("/api/v1/auth/login", json=nonexistent_data)
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "Invalid credentials" in response.json()["detail"]


def test_refresh_token(client, db):
    """Test token refresh endpoint."""
    from app.models import User, UserRole
    from app.security import hash_password, create_refresh_token
    
    # Create a test user
    test_user = User(
        email="refresh@example.com",
        phone="+911234567892",
        full_name="Refresh Test User",
        password_hash=hash_password("testpassword123"),
        role=UserRole.RENTER,
        email_verified=True,
        phone_verified=True,
    )
    db.add(test_user)
    db.commit()
    db.refresh(test_user)
    
    # Create a refresh token
    refresh_token = create_refresh_token(str(test_user.id))
    
    # Test refresh token endpoint
    refresh_data = {
        "refresh_token": refresh_token
    }
    
    response = client.post("/api/v1/auth/refresh", json=refresh_data)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"
    
    # Test with invalid refresh token
    invalid_data = {
        "refresh_token": "invalid.token.here"
    }
    
    response = client.post("/api/v1/auth/refresh", json=invalid_data)
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_forgot_password(client, db):
    """Test forgot password endpoint."""
    from app.models import User, UserRole
    from app.security import hash_password
    
    # Create a test user
    test_user = User(
        email="forgotpass@example.com",
        phone="+911234567893",
        full_name="Forgot Password User",
        password_hash=hash_password("oldpassword123"),
        role=UserRole.RENTER,
        email_verified=True,
        phone_verified=True,
    )
    db.add(test_user)
    db.commit()
    
    # Test forgot password with existing user
    forgot_data = {
        "email": "forgotpass@example.com"
    }
    
    response = client.post("/api/v1/auth/forgot-password", json=forgot_data)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "message" in data
    assert "If an account with that email exists" in data["message"]
    
    # Test forgot password with non-existent user (should still return success for security)
    nonexistent_data = {
        "email": "nonexistent@example.com"
    }
    
    response = client.post("/api/v1/auth/forgot-password", json=nonexistent_data)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "message" in data
    assert "If an account with that email exists" in data["message"]


def test_get_me_authenticated(client, auth_headers):
    """Test getting current user profile with authentication."""
    response = client.get("/api/v1/users/me", headers=auth_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "id" in data
    assert "email" in data
    assert data["email"] == "test@example.com"
    assert "full_name" in data
    assert "role" in data


def test_get_me_unauthenticated(client):
    """Test getting current user profile without authentication."""
    response = client.get("/api/v1/users/me")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED