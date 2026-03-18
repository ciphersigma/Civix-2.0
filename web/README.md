# Waterlogging Alert Platform - Web Dashboard

Admin dashboard for managing and monitoring the Waterlogging Alert Platform.

## Features

- **Overview**: Real-time statistics and charts
- **Map**: Interactive map showing waterlogged areas
- **Reports**: Manage and view all waterlogging reports
- **Users**: User management and analytics
- **Analytics**: Insights and trend analysis
- **Settings**: System configuration

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```
REACT_APP_API_URL=http://localhost:3000/api/v1
```

3. Start development server:
```bash
npm start
```

The dashboard will open at `http://localhost:3001`

## Build for Production

```bash
npm run build
```

## Technology Stack

- React 18 with TypeScript
- React Router for navigation
- Axios for API calls
- Recharts for data visualization
- Mapbox GL JS for interactive maps
- CSS for styling

## Project Structure

```
web/
├── public/          # Static files
├── src/
│   ├── components/  # Reusable components
│   ├── contexts/    # React contexts
│   ├── pages/       # Page components
│   ├── services/    # API services
│   ├── App.tsx      # Main app component
│   └── index.tsx    # Entry point
└── package.json
```

## Authentication

The dashboard uses JWT token authentication. Login with your phone number and verification code to access the dashboard.

## Development Status

✅ Task 24.1: Project infrastructure setup complete
- React app initialized with TypeScript
- Project structure created
- Authentication flow implemented
- Dashboard layout created
- Placeholder pages added

Next tasks:
- Implement overview page with statistics
- Add interactive map
- Create reports management
- Build analytics dashboards
