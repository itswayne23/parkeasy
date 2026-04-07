#!/usr/bin/env python3
"""Create test users for ParkEasy application."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from database import SessionLocal, Base, engine
from models import User, UserRole, HostProfile, HostApprovalStatus
from security import hash_password

# Create database tables
print("Creating database tables...")
Base.metadata.create_all(bind=engine)

db = SessionLocal()

try:
    # Check if test user exists
    from sqlalchemy import select
    
    # Create test renter user
    renter_email = 'renter@example.com'
    renter_password = 'renter123'
    
    existing_renter = db.execute(select(User).where(User.email == renter_email)).scalar_one_or_none()
    
    if not existing_renter:
        renter = User(
            email=renter_email,
            password_hash=hash_password(renter_password),
            full_name='Test Renter',
            role=UserRole.RENTER,
            email_verified=True,
            phone='+1234567890'
        )
        db.add(renter)
        db.commit()
        db.refresh(renter)
        print(f"[OK] Renter user created: {renter_email} / {renter_password}")
    else:
        print(f"[INFO] Renter user already exists: {renter_email}")
    
    # Create test host user
    host_email = 'host@example.com'
    host_password = 'host123'
    
    existing_host = db.execute(select(User).where(User.email == host_email)).scalar_one_or_none()
    
    if not existing_host:
        host = User(
            email=host_email,
            password_hash=hash_password(host_password),
            full_name='Test Host',
            role=UserRole.INDIVIDUAL_HOST,
            email_verified=True,
            phone='+0987654321'
        )
        db.add(host)
        db.commit()
        db.refresh(host)
        
        # Create host profile with correct fields
        host_profile = HostProfile(
            user_id=host.id,
            host_type=UserRole.INDIVIDUAL_HOST,
            business_name='Test Host Business',
            bio='Professional parking host with verified identity',
            approval_status=HostApprovalStatus.APPROVED,
            is_identity_verified=True,
            tax_id='TAX123456'
        )
        db.add(host_profile)
        db.commit()
        
        print(f"[OK] Host user created: {host_email} / {host_password}")
        print(f"[OK] Host profile created for: {host_email}")
    else:
        print(f"[INFO] Host user already exists: {host_email}")
    
    # Create admin user
    admin_email = 'admin@example.com'
    admin_password = 'admin123'
    
    existing_admin = db.execute(select(User).where(User.email == admin_email)).scalar_one_or_none()
    
    if not existing_admin:
        admin = User(
            email=admin_email,
            password_hash=hash_password(admin_password),
            full_name='Test Admin',
            role=UserRole.ADMIN,
            email_verified=True,
            phone='+1111111111'
        )
        db.add(admin)
        db.commit()
        print(f"[OK] Admin user created: {admin_email} / {admin_password}")
    else:
        print(f"[INFO] Admin user already exists: {admin_email}")
    
    print("\n" + "="*50)
    print("TEST CREDENTIALS SUMMARY:")
    print("="*50)
    print(f"Renter: {renter_email} / {renter_password}")
    print(f"Host: {host_email} / {host_password}")
    print(f"Admin: {admin_email} / {admin_password}")
    print("="*50)
    print("\nYou can now log in to the application using these credentials.")
    print("Backend: http://localhost:8001")
    print("Frontend: http://localhost:3000")
    
except Exception as e:
    print(f"[ERROR] {e}")
    db.rollback()
    raise
finally:
    db.close()