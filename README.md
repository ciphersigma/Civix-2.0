# Waterlogging Alert Platform

Real-time crowdsourced waterlogging mapping system for Ahmedabad, Gujarat.

## Project Structure

```
├── src/                  # Backend API (Node.js + Express + TypeScript)
│   ├── config/           # Database & Redis configuration
│   ├── jobs/             # Background jobs (report expiry)
│   ├── middleware/        # Auth middleware
│   ├── routes/           # API route handlers
│   ├── services/         # Business logic
│   ├── utils/            # Cache utilities
│   └── index.ts          # Server entry point
├── database/             # Database schema & migrations
│   ├── schema/           # SQL migration files
│   ├── migrate.js        # Migration runner
│   └── test-connection.js # Connection test
├── web/                  # Admin Dashboard (React)
│   └── src/
│       ├── components/   # Layout components
│       ├── contexts/     # Auth context
│       ├── pages/        # Dashboard pages
│       └── services/     # API client
├── mobile/               # Mobile App (React Native)
│   └── src/
│       ├── screens/      # App screens
│       ├── services/     # API & offline services
│       ├── navigation/   # Navigation config
│       └── types/        # TypeScript types
└── .kiro/specs/          # Feature specifications
```

## Quick Start

### Backend
```bash
npm install
cp .env.example .env    # Configure your environment
npm run db:migrate      # Run database migrations
npm run dev             # Start dev server on :3000
```

### Web Dashboard
```bash
cd web
npm install
npm start               # Opens on :3001
```

### Mobile App
```bash
cd mobile
npm install
npm run android         # Run on Android device/emulator
```

## API Endpoints

- `POST /api/v1/auth/register` - Register user
- `POST /api/v1/auth/verify` - Verify phone
- `POST /api/v1/auth/admin/login` - Admin login
- `POST /api/v1/reports` - Submit report (auth required)
- `GET /api/v1/reports/area` - Get area reports
- `GET /api/v1/admin/stats` - Dashboard stats
- `GET /api/v1/admin/users` - List users
- `GET /api/v1/admin/reports` - List reports

## Scripts

- `npm run dev` - Dev server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run db:migrate` - Run migrations
- `npm run db:test` - Test database connection
