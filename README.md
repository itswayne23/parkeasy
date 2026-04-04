# ParkEasy

ParkEasy is a free-first parking marketplace for India, focused on P2P residential spaces plus commercial inventory.

## Stack

- Backend: FastAPI + SQLAlchemy + PostgreSQL/PostGIS
- Frontend: Next.js
- Payments: Razorpay with sandbox-friendly fallback
- Maps: OpenStreetMap-oriented UX

## Local Setup

1. Copy `.env.example` to `.env`.
2. Start Postgres with `docker compose up db`.
3. Install backend deps with `pip install -r requirements.txt`.
4. Run the API with `uvicorn app.main:app --reload`.
5. In `frontend`, run `npm install` then `npm run dev`.

## Product Surface

- Auth with access and refresh tokens
- Host onboarding
- Listing creation and moderation
- Search and pricing
- Bookings, QR verification, and payment hooks
- Host and admin dashboards

## Notes

- The Razorpay integration falls back to sandbox-style mock order creation when keys are not configured.
- Full PostGIS queries, production migrations, SMS/email providers, and premium monetization can be layered in next.
