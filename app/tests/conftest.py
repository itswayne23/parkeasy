"""Pytest configuration and fixtures for ParkEasy tests."""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from fastapi.testclient import TestClient

from app.database import Base, get_db
from app.main import app


# Test database URL (in-memory SQLite for testing)
TEST_DATABASE_URL = "sqlite:///:memory:"

# Create test engine
test_engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="function")
def db() -> Session:
    """Create a fresh database session for each test."""
    # Create all tables
    Base.metadata.create_all(bind=test_engine)
    
    # Create a new session
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        # Drop all tables after test
        Base.metadata.drop_all(bind=test_engine)


@pytest.fixture(scope="function")
def client(db: Session) -> TestClient:
    """Create a test client with overridden database dependency."""
    def override_get_db():
        try:
            yield db
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def auth_headers(client: TestClient, db: Session) -> dict[str, str]:
    """Create authenticated user and return authorization headers."""
    from app.models import User, UserRole
    from app.security import hash_password
    
    # Create test user
    test_user = User(
        email="test@example.com",
        phone="+911234567890",
        full_name="Test User",
        password_hash=hash_password("testpassword123"),
        role=UserRole.RENTER,
        email_verified=True,
        phone_verified=True,
    )
    db.add(test_user)
    db.commit()
    db.refresh(test_user)
    
    # Login to get token
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "test@example.com", "password": "testpassword123"}
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    
    return {"Authorization": f"Bearer {token}"}