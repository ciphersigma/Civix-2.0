# CIVIX — Waterlogging Alert System

## Complete MVP Documentation

---

## 1. Project Overview

CIVIX is a community-driven waterlogging alert platform for Ahmedabad, India. Citizens report waterlogged areas via a mobile app, and the data is visualized on a real-time map accessible to everyone. An admin dashboard provides oversight and analytics.

### Problem Statement
During monsoon season, sudden waterlogging causes traffic disruptions, vehicle damage, and safety hazards. There is no real-time, crowd-sourced system for citizens to report and view waterlogged areas.

### Solution
A three-part platform:
- **Mobile App** (React Native) — Citizens report waterlogging with GPS location and severity
- **Web Dashboard** (React) — Admin panel for monitoring reports, users, and analytics
- **Landing Site** (React) — Public-facing website with live map, about, and contact pages
- **Backend API** (Node.js/Express) — RESTful API with PostGIS spatial queries

### Live URLs
- **Landing Page**: https://civix-2-0.vercel.app
- **Admin Dashboard**: https://civix-2-0.vercel.app/admin
- **Live Map (Public)**: https://civix-2-0.vercel.app/live-map
- **API Base**: https://civix-2-0.vercel.app/api/v1
- **APK Download**: https://drive.google.com/uc?export=download&id=1KrmduD1MqWU4ke1O0y7WCbBRufps0nVM

---

## 2. Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Mobile App | React Native 0.75.4 | Android app for citizens |
| Web Frontend | React 18 + TypeScript | Admin dashboard & landing site |
| Backend API | Node.js + Express + TypeScript | REST API server |
| Database | PostgreSQL + PostGIS (Neon) | Geospatial data storage |
| Cache | Upstash Redis (REST) | Rate limiting & aggregation cache |
| Maps | Mapbox GL | Map rendering (mobile + web) |
| Auth | Email OTP + JWT | Passwordless authentication |
| Email | Gmail SMTP (Nodemailer) | OTP delivery |
| Hosting | Vercel | Backend API + Web frontend |
| Weather | Open-Meteo API | Rainfall detection (free, no key) |
| Routing | OSRM | Safe route navigation |

---

## 3. Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Mobile App    │     │   Web Dashboard  │     │  Landing Site   │
│  (React Native) │     │    (React SPA)   │     │   (React SPA)   │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         └───────────┬───────────┴───────────────────────┘
                     │ HTTPS
              ┌──────┴──────┐
              │  Vercel API │
              │  (Express)  │
              └──────┬──────┘
                     │
         ┌───────────┼───────────┐
         │           │           │
   ┌─────┴─────┐ ┌──┴──┐ ┌─────┴─────┐
   │  Neon DB  │ │Redis│ │  Gmail    │
   │ PostGIS   │ │Cache│ │  SMTP     │
   └───────────┘ └─────┘ └───────────┘
```

---

## 4. Database Schema

### 4.1 Users Table

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(100),
    email VARCHAR(255),
    phone_number VARCHAR(15),          -- nullable (email-first auth)
    phone_verified BOOLEAN DEFAULT FALSE,
    verification_code VARCHAR(6),
    verification_expires_at TIMESTAMP,
    language VARCHAR(10) DEFAULT 'en',  -- en, hi, gu
    daily_report_count INTEGER DEFAULT 0,
    last_report_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    last_known_location GEOGRAPHY(POINT, 4326),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 4.2 Waterlogging Reports Table
```sql
CREATE TABLE waterlogging_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    location_accuracy NUMERIC(5, 2),
    severity VARCHAR(10) CHECK (severity IN ('Low', 'Medium', 'High')),
    report_type VARCHAR(20) NOT NULL CHECK (report_type IN ('waterlogged', 'clear')),
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,     -- auto-set to created_at + 4 hours
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 4.3 Notifications Table
```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL,         -- rain_detection, navigation_alert, etc.
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB,
    sent_at TIMESTAMP DEFAULT NOW(),
    responded_at TIMESTAMP,
    response JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 4.4 Admin Users Table
```sql
CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 5. API Endpoints

### 5.1 Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/auth/register` | No | Register with email, sends OTP |
| POST | `/api/v1/auth/login` | No | Login (existing users only), sends OTP |
| POST | `/api/v1/auth/verify` | No | Verify email OTP, returns JWT |
| GET | `/api/v1/auth/me` | JWT | Get current user profile |
| POST | `/api/v1/auth/refresh` | JWT | Refresh JWT token |
| POST | `/api/v1/auth/admin/login` | No | Admin login with email + password |

### 5.2 Reports

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/reports` | JWT | Submit waterlogging report |
| GET | `/api/v1/reports/area?lat=&lng=&radius=` | No | Get reports in area (aggregated) |
| GET | `/api/v1/reports/public` | No | Get all active reports (live map) |

### 5.3 Admin

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/admin/stats` | Admin | Dashboard statistics |
| GET | `/api/v1/admin/users` | Admin | List users (paginated, searchable) |
| GET | `/api/v1/admin/reports` | Admin | List reports (filterable) |
| GET | `/api/v1/admin/reports/timeline` | Admin | Reports over last 7 days |
| PUT | `/api/v1/admin/users/:id` | Admin | Update user |
| DELETE | `/api/v1/admin/users/:id` | Admin | Delete user + their reports |

---

## 6. Authentication Flow

### 6.1 User Registration (Mobile)
```
User enters email + name → POST /auth/register → OTP sent via Gmail SMTP
User enters 6-digit code → POST /auth/verify → JWT token returned
Token stored in AsyncStorage → All subsequent API calls include Bearer token
```

### 6.2 User Login (Mobile)
```
User enters email → POST /auth/login → OTP sent (only if account exists)
User enters code → POST /auth/verify → JWT token returned
```

### 6.3 Admin Login (Web)
```
Admin enters email + password → POST /auth/admin/login → JWT with isAdmin flag
Token stored in localStorage → Dashboard routes protected by PrivateRoute
```

### 6.4 Security Features
- OTP expires in 10 minutes
- Rate limiting: max 5 verification attempts per email (15-min cooldown)
- JWT tokens expire in 7 days
- Passwords hashed with bcrypt (10 rounds)
- Redis-backed rate limiting via Upstash

---

## 7. Mobile App (React Native)

### 7.1 Screens
| Screen | Description |
|--------|-------------|
| LoginScreen | Email OTP login/signup with tab switcher |
| HomeScreen | Full-screen Mapbox map with report pins, search, severity legend |
| ReportScreen | Submit waterlogging report with severity picker and description |
| ProfileScreen | User profile with avatar, stats, menu items, logout |

### 7.2 Key Features
- **Mapbox GL** map with color-coded severity pins (🔴 High, 🟠 Medium, 🟢 Low)
- **Geocoding search** — search any place via Mapbox Geocoding API
- **GPS auto-center** — map centers on user's current location
- **Offline support** — reports stored locally in AsyncStorage, synced when online
- **Pull-to-refresh** on profile screen
- **Report card** — tap a pin to see severity, date, description

### 7.3 Services
- `AuthService` — register, login, verifyOTP, logout, getAuthData
- `ReportService` — submitReport, getAreaReports, syncPendingReports, getPendingCount
- `api` — Axios instance with JWT interceptor, base URL: `https://civix-2-0.vercel.app/api/v1`

---

## 8. Web Application (React)

### 8.1 Public Pages
| Route | Page | Description |
|-------|------|-------------|
| `/` | LandingPage | Hero, features, timeline, testimonials, download CTA |
| `/about` | AboutPage | Mission, problem/solution, tech stack, open source |
| `/contact` | ContactPage | Email, GitHub, location cards + contact form |
| `/live-map` | PublicMapPage | Full-screen public map showing active reports |

### 8.2 Admin Dashboard
| Route | Page | Description |
|-------|------|-------------|
| `/admin` | LoginPage | Admin email + password login |
| `/dashboard` | OverviewPage | Stats cards, severity breakdown, recent reports |
| `/dashboard/map` | MapPage | Interactive map with all reports |
| `/dashboard/reports` | ReportsPage | Reports table with filters |
| `/dashboard/users` | UsersPage | Users table with search |
| `/dashboard/analytics` | AnalyticsPage | Charts and timeline data |
| `/dashboard/settings` | SettingsPage | Admin settings |

### 8.3 Design System
- Primary: Indigo (#6366F1)
- Accent: Green (#10B981)
- Background: Dark (#050510) for landing, Light (#F8FAFC) for dashboard
- Font: System fonts (Inter-like)
- Cards with rounded corners (14-20px), subtle shadows

---

## 9. Backend Services

### 9.1 AuthService
- Email-based OTP registration and login
- JWT token generation and validation
- Admin login with bcrypt password verification
- Rate-limited verification attempts (Redis)

### 9.2 ReportService
- Create waterlogging reports with PostGIS geography points
- GPS accuracy validation (max 200m)
- Daily report limit (10 per user per day)
- Area aggregation with ST_DWithin spatial queries
- Clear reports expire nearby waterlogged reports (500m radius)
- Report expiry job: marks reports older than 4 hours as inactive
- Redis caching for aggregation results (5-min TTL)

### 9.3 WeatherService
- Polls Open-Meteo API for Ahmedabad rainfall data
- Detects precipitation using amount threshold + WMO weather codes
- Finds affected users via PostGIS proximity query (5km radius)
- Configurable polling interval (default: 5 minutes)

### 9.4 NotificationService
- Stores notification records in database
- Interactive rain notifications with Yes/No actions
- Push delivery via pluggable provider (MockFCM stub)
- Retry logic with exponential backoff (3 retries)

### 9.5 EmailService
- Gmail SMTP via Nodemailer
- Branded HTML email template for OTP codes
- Fallback to console logging in dev mode

---

## 10. Deployment

### 10.1 Vercel (Backend + Web)
- Backend deployed as serverless function via `api/index.ts`
- Web frontend built with `react-scripts build`
- Auto-deploys on `git push` to main branch
- Environment variables configured in Vercel dashboard

### 10.2 Neon (Database)
- Serverless PostgreSQL with PostGIS extension
- Connection pooling enabled
- SSL required

### 10.3 Upstash (Redis)
- REST-based Redis (no TCP connection needed)
- Used for rate limiting and aggregation caching

### 10.4 Mobile APK
- Built with React Native CLI (`npx react-native bundle` + `gradlew assembleDebug`)
- Distributed via Google Drive download link
- Installed via ADB for development

---

## 11. Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis auth token |
| `JWT_SECRET` | Secret key for JWT signing |
| `JWT_EXPIRES_IN` | JWT expiration (default: 7d) |
| `SMTP_EMAIL` | Gmail address for sending OTPs |
| `SMTP_PASSWORD` | Gmail app password |
| `MAPBOX_ACCESS_TOKEN` | Mapbox public token |
| `WEATHER_API_URL` | Open-Meteo API URL |
| `FIREBASE_PROJECT_ID` | Firebase project ID (for future push) |

---

## 12. Project Structure

```
civix/
├── api/
│   └── index.ts                 # Vercel serverless entry point
├── src/
│   ├── config/
│   │   ├── database.ts          # PostgreSQL pool
│   │   └── redis.ts             # Upstash Redis client
│   ├── routes/
│   │   ├── auth.routes.ts       # Auth endpoints
│   │   ├── report.routes.ts     # Report endpoints
│   │   └── admin.routes.ts      # Admin endpoints
│   ├── services/
│   │   ├── auth.service.ts      # Auth logic
│   │   ├── report.service.ts    # Report logic + PostGIS
│   │   ├── email.service.ts     # Gmail SMTP OTP
│   │   ├── weather.service.ts   # Open-Meteo polling
│   │   └── notification.service.ts  # Push notifications
│   ├── middleware/
│   │   └── auth.middleware.ts   # JWT verification
│   ├── jobs/
│   │   └── report-expiry.job.ts # Background expiry job
│   ├── utils/
│   │   └── cache.ts             # Redis cache helpers
│   └── index.ts                 # Express server entry
├── database/
│   ├── schema/
│   │   ├── 00_init.sql          # PostGIS + UUID extensions
│   │   ├── 01_users.sql         # Users table
│   │   ├── 02_waterlogging_reports.sql  # Reports table
│   │   ├── 03_notifications.sql # Notifications table
│   │   ├── 04_admin_users.sql   # Admin users table
│   │   └── 05_firebase_uid.sql  # Firebase UID column
│   └── migrate.js               # Migration runner
├── web/
│   └── src/
│       ├── pages/               # All web pages
│       ├── components/          # Dashboard layout
│       ├── contexts/            # Auth + Theme contexts
│       ├── services/            # API client
│       └── App.tsx              # Router
├── mobile/
│   └── src/
│       ├── screens/             # LoginScreen, HomeScreen, ReportScreen, ProfileScreen
│       ├── navigation/          # Stack navigator
│       └── services/            # AuthService, ReportService, API client
├── package.json                 # Backend dependencies
└── .env                         # Environment variables
```

---

## 13. MVP Features Checklist

### Completed ✅
- [x] Email OTP authentication (register + login + verify)
- [x] JWT-based session management
- [x] Submit waterlogging reports with GPS location
- [x] Severity levels: Low, Medium, High
- [x] Real-time map with color-coded pins (Mapbox)
- [x] Geocoding search on map
- [x] GPS auto-centering
- [x] Offline report storage + sync
- [x] Report expiry (4 hours auto-expire)
- [x] Clear reports expire nearby waterlogged reports
- [x] Daily report limit (10/user/day)
- [x] Admin dashboard with stats, users, reports, analytics
- [x] Admin login with email + password
- [x] Public live map page (no auth required)
- [x] Landing page with hero, features, timeline, download
- [x] About Us and Contact Us pages
- [x] User profile screen (mobile)
- [x] Weather detection service (Open-Meteo)
- [x] Notification service (database + mock push)
- [x] Redis caching for report aggregation
- [x] PostGIS spatial queries (ST_DWithin, ST_MakePoint)
- [x] APK distribution via Google Drive
- [x] Vercel deployment (auto-deploy on push)

### Future Enhancements 🔮
- [ ] Push notifications via Firebase Cloud Messaging
- [ ] Photo attachments on reports
- [ ] My Reports history in profile
- [ ] Weather forecast overlay on map
- [ ] Safe route navigation (OSRM integration)
- [ ] Multi-language support (Hindi, Gujarati)
- [ ] Report upvote/confirm system
- [ ] iOS app build
- [ ] PWA support for web

---

## 14. How to Run Locally

### Backend
```bash
npm install
cp .env.example .env   # Fill in your credentials
npm run dev             # Starts on http://localhost:3000
```

### Web Dashboard
```bash
cd web
npm install
npm start               # Starts on http://localhost:3001
```

### Mobile App
```bash
cd mobile
npm install
npx react-native start  # Start Metro bundler
npx react-native run-android  # Build and install on device
```

### Database Migration
```bash
npm run db:migrate      # Runs all SQL schema files in order
```

---

## 15. API Request/Response Examples

### Register
```bash
POST /api/v1/auth/register
Body: { "email": "user@example.com", "fullName": "John Doe" }
Response: { "success": true, "userId": "uuid", "message": "Verification code sent" }
```

### Verify OTP
```bash
POST /api/v1/auth/verify
Body: { "email": "user@example.com", "code": "123456" }
Response: { "success": true, "token": "jwt...", "userId": "uuid" }
```

### Submit Report
```bash
POST /api/v1/reports
Headers: Authorization: Bearer <jwt>
Body: {
  "location": { "latitude": 23.0225, "longitude": 72.5714, "accuracy": 10 },
  "severity": "High",
  "reportType": "waterlogged"
}
Response: { "success": true, "report": { "id": "uuid", ... } }
```

### Get Area Reports
```bash
GET /api/v1/reports/area?lat=23.0225&lng=72.5714&radius=5000
Response: {
  "success": true,
  "areaStatus": {
    "aggregateSeverity": "High",
    "reportCount": 5,
    "reportAge": "Updated 15 minutes ago",
    "reports": [...]
  }
}
```

---

*Document generated for CIVIX v1.0.0 — Waterlogging Alert System*
*Author: Prashant Chettiyar*
*Last Updated: March 2026*
