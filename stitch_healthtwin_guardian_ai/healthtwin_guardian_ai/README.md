# HealthTwin Guardian AI Full-Stack Demo

This directory contains a runnable frontend, backend, and local SQLite database for the patient dashboard.

## Run

```powershell
cd healthtwin_guardian_ai
node server.mjs
```

Open `http://localhost:4173`.

## Demo Login

- Email: `demo.patient@healthtwin.ai`
- Password: `GuardianSecure2026`

The first login enrolls Google Authenticator using a real TOTP secret and `otpauth://` QR code. After scanning, enter the 6-digit code from Google Authenticator to open the dashboard.

## Backend

- `POST /api/auth/login`
- `POST /api/auth/totp/verify`
- `POST /api/auth/logout`
- `GET /api/dashboard?lang=en`
- `POST /api/medications/:id/checkin`
- `POST /api/auth/demo-reset`

The database is created automatically at `healthtwin_guardian_ai/data/healthtwin.db`.
