# Implementation Plan: Waterlogging Alert Platform

## Overview

This implementation plan breaks down the Waterlogging Alert Platform into discrete coding tasks. The platform uses React Native for the mobile frontend, Node.js/Express for the backend API, PostgreSQL with PostGIS for geospatial data storage, and Redis for caching. The implementation follows a bottom-up approach: database schema → backend services → API endpoints → mobile app → integration → testing.

## Tasks

- [ ] 1. Set up project infrastructure and database schema
  - [x] 1.1 Initialize Node.js backend project with TypeScript, Express, and dependencies
    - Create package.json with dependencies: express, pg, redis, jsonwebtoken, bcrypt, ws, axios
    - Configure TypeScript with tsconfig.json
    - Set up project structure: src/services, src/routes, src/models, src/utils
    - _Requirements: All_

  - [x] 1.2 Create PostgreSQL database schema with PostGIS extension
    - Use Docker for local development or Supabase/Neon free tier for hosted
    - Create users table with phone verification fields
    - Create waterlogging_reports table with geography column and indexes
    - Create notifications table for tracking sent notifications
    - Add PostGIS spatial indexes for location queries
    - _Requirements: 2.4, 2.5, 9.1, 9.2_

  - [x] 1.3 Set up Redis connection and caching utilities
    - Create Redis client configuration (Docker for local, Upstash or Redis Cloud free tier for production)
    - Implement cache helper functions for get/set/expire operations
    - _Requirements: 11.1, 11.4_

  - [x] 1.4 Initialize React Native mobile project
    - Create React Native project with TypeScript
    - Install dependencies: react-navigation, react-native-maps (free with OSM), react-native-geolocation, push notification library
    - Configure iOS and Android build settings
    - _Requirements: All_

- [x] 2. Implement authentication service
  - [x] 2.1 Create user registration and phone verification endpoints
    - Implement POST /api/v1/auth/register endpoint
    - Integrate SMS API (Twilio free trial, Vonage, MessageBird, or Termii for India)
    - Implement POST /api/v1/auth/verify endpoint with code validation
    - Add rate limiting for verification attempts
    - _Requirements: 9.1, 9.2, 9.3_

  - [x] 2.2 Write property test for authentication service
    - **Property 31: Phone Number Registration Requirement**
    - **Validates: Requirements 9.1**

  - [x] 2.3 Implement JWT token generation and validation
    - Create generateToken function with user ID payload
    - Create validateToken middleware for protected routes
    - Implement token refresh logic
    - _Requirements: 9.3_

  - [x] 2.4 Write unit tests for authentication service
    - Test user registration with valid phone number
    - Test verification code generation and validation
    - Test JWT token generation and expiration
    - Test rate limiting enforcement
    - _Requirements: 9.1, 9.2, 9.3_


- [ ] 3. Implement report management service
  - [x] 3.1 Create waterlogging report submission endpoint
    - Implement POST /api/v1/reports endpoint
    - Validate user authentication and daily report limit (10 per day)
    - Capture GPS coordinates with accuracy validation
    - Store report with timestamp, location (PostGIS geography), and severity
    - _Requirements: 2.4, 2.5, 9.4_

  - [x] 3.2 Write property tests for report creation
    - **Property 6: Location Capture Accuracy**
    - **Validates: Requirements 2.4**
    - **Property 7: Report Creation Timing**
    - **Validates: Requirements 2.5**
    - **Property 34: Daily Report Limit**
    - **Validates: Requirements 9.4**

  - [x] 3.3 Implement clear report functionality
    - Add report_type field to distinguish waterlogged vs clear reports
    - Implement logic to expire active waterlogged reports when clear report submitted
    - Update area status calculation to reflect cleared areas
    - _Requirements: 2.6, 6.4_

  - [x] 3.4 Write property test for clear report processing
    - **Property 8: Clear Report Processing**
    - **Validates: Requirements 2.6**
    - **Property 21: Clear Report Expiry Effect**
    - **Validates: Requirements 6.4**

  - [x] 3.5 Implement report aggregation logic
    - Create aggregateReports function using PostGIS ST_DWithin for 500m radius
    - Calculate aggregate severity as maximum severity among reports
    - Count contributing reports for each area
    - Cache aggregated results in Redis with 5-minute TTL
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 3.6 Write property tests for report aggregation
    - **Property 15: Report Aggregation**
    - **Validates: Requirements 5.1**
    - **Property 16: Maximum Severity Aggregation**
    - **Validates: Requirements 5.2, 5.3**

  - [x] 3.7 Implement report expiry background job
    - Create scheduled job (cron) running every 5 minutes
    - Mark reports older than 4 hours as inactive
    - Update Redis cache to remove expired areas
    - _Requirements: 6.1, 6.2_

  - [x] 3.8 Write property test for report expiry
    - **Property 18: Report Expiry**
    - **Validates: Requirements 6.1**

  - [x] 3.9 Create GET endpoint for active reports by area
    - Implement GET /api/v1/reports/area with lat, lng, radius parameters
    - Use PostGIS ST_DWithin for spatial query
    - Return aggregated area status with report count and timestamps
    - _Requirements: 4.1, 4.5, 6.3_

  - [x] 3.10 Write unit tests for report management service
    - Test report creation with valid and invalid data
    - Test daily limit enforcement and error message
    - Test clear report expiring waterlogged reports
    - Test aggregation with multiple reports
    - Test expiry job marking old reports inactive
    - _Requirements: 2.4, 2.5, 2.6, 5.1, 5.2, 6.1, 9.4_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.


- [x] 5. Implement weather detection service
  - [x] 5.1 Create weather API integration with free weather service
    - Implement pollWeatherData function with 5-minute polling interval
    - Use Open-Meteo (completely free, no API key) or OpenWeatherMap free tier (1000 calls/day)
    - Parse precipitation data and identify rainfall events
    - Define Ahmedabad geographic bounds for filtering
    - _Requirements: 1.1_

  - [x] 5.2 Implement affected user query
    - Create getAffectedUsers function using PostGIS to find users in rainfall area
    - Query users table for users with last known location in affected area
    - _Requirements: 1.1_

  - [x] 5.3 Integrate weather service with notification service
    - Trigger notification flow when rainfall detected
    - Pass affected user IDs to notification service
    - _Requirements: 1.1_

  - [x] 5.4 Write property test for rain notification targeting
    - **Property 1: Rain Notification Targeting and Timing**
    - **Validates: Requirements 1.1**

  - [x] 5.5 Write unit tests for weather detection service
    - Test weather API integration with mock responses
    - Test rainfall detection logic
    - Test affected user query with various geographic areas
    - _Requirements: 1.1_

- [ ] 6. Implement notification service
  - [x] 6.1 Create push notification integration
    - Configure FCM (free) or OneSignal (free tier) for push notifications
    - Implement sendPushNotification function with notification payload
    - Handle notification errors and retry logic
    - _Requirements: 1.2, 1.3, 8.2, 8.3, 8.4_

  - [x] 6.2 Implement rain notification flow
    - Create sendRainNotification function with interactive notification payload
    - Include "Is there rain in your area?" question with Yes/No actions
    - Store notification record in database with timestamp
    - _Requirements: 1.2, 1.3_

  - [ ] 6.3 Write property tests for rain notifications
    - **Property 2: Rain Notification Structure**
    - **Validates: Requirements 1.2**
    - **Property 3: Notification Interactivity**
    - **Validates: Requirements 1.3**

  - [ ] 6.4 Implement notification rate limiting
    - Create canSendNotification function checking last notification timestamp
    - Enforce 2-hour minimum interval between rain notifications per user
    - Store rate limit data in Redis for fast lookup
    - _Requirements: 1.4_

  - [ ] 6.5 Write property test for notification rate limiting
    - **Property 4: Notification Rate Limiting**
    - **Validates: Requirements 1.4**

  - [ ] 6.6 Implement notification response handling
    - Create POST /api/v1/notifications/respond endpoint
    - Handle "Yes" response by presenting waterlogging status question
    - Handle waterlogging "Yes" by prompting for severity selection
    - Create waterlogging report from notification response
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ] 6.7 Write property test for notification response workflow
    - **Property 5: Notification Response Workflow**
    - **Validates: Requirements 2.1, 2.2, 2.3**

  - [ ] 6.8 Implement proximity alert notifications
    - Create sendNavigationAlert function for waterlogging proximity
    - Include severity level and distance in alert payload
    - Trigger alerts when user within 500m of waterlogged area
    - _Requirements: 8.2, 8.3_

  - [ ] 6.9 Write property tests for proximity alerts
    - **Property 28: Proximity Alert Triggering**
    - **Validates: Requirements 8.2**
    - **Property 29: Alert Content Completeness**
    - **Validates: Requirements 8.3**

  - [ ] 6.10 Implement multi-language notification support
    - Create notification template system with translations
    - Load user's language preference from database
    - Generate notification text in user's selected language
    - _Requirements: 12.5_

  - [ ] 6.11 Write property test for notification localization
    - **Property 44: Notification Localization**
    - **Validates: Requirements 12.5**

  - [ ] 6.12 Write unit tests for notification service
    - Test push notification integration with mock client
    - Test rain notification payload structure
    - Test rate limiting with various time intervals
    - Test notification response handling for all paths
    - Test proximity alert generation
    - Test multi-language notification generation
    - _Requirements: 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 8.2, 8.3, 12.5_


- [ ] 7. Implement routing service
  - [ ] 7.1 Integrate OpenStreetMap routing engine
    - Set up OSRM (Open Source Routing Machine) self-hosted or use public instance
    - Alternative: Use GraphHopper open-source routing engine
    - Implement basic route calculation between origin and destination
    - Parse route response into waypoints and distance
    - _Requirements: 7.1_

  - [ ] 7.2 Implement waterlogging avoidance logic
    - Create applyCostFunction to adjust edge weights based on waterlogging
    - Apply severity multipliers: Low=5x, Medium=20x, High=1000x
    - Query active waterlogged areas along potential route paths
    - _Requirements: 7.1, 7.2, 7.3_

  - [ ] 7.3 Write property tests for route avoidance
    - **Property 22: Route Avoidance**
    - **Validates: Requirements 7.1**
    - **Property 23: Exposure Minimization**
    - **Validates: Requirements 7.2**
    - **Property 24: Severity-Based Route Prioritization**
    - **Validates: Requirements 7.3**

  - [ ] 7.4 Implement proximity warning generation
    - Create checkRouteProximity function to identify waterlogged areas within 200m
    - Generate warning objects with location, distance, and severity
    - Include warnings in route response
    - _Requirements: 7.4_

  - [ ] 7.5 Write property test for proximity warnings
    - **Property 25: Proximity Warnings**
    - **Validates: Requirements 7.4**

  - [ ] 7.6 Implement dynamic route recalculation
    - Create recalculateIfNeeded function triggered by new reports
    - Check if new report intersects with active route
    - Recalculate route and notify user if affected
    - _Requirements: 7.5, 8.4_

  - [ ] 7.7 Write property test for dynamic recalculation
    - **Property 26: Dynamic Route Recalculation**
    - **Validates: Requirements 7.5**
    - **Property 30: Route-Based Notifications**
    - **Validates: Requirements 8.4**

  - [ ] 7.8 Create route calculation API endpoint
    - Implement POST /api/v1/routes/calculate endpoint
    - Accept origin, destination, and user preferences
    - Return route with waypoints, distance, duration, and warnings
    - Cache calculated routes in Redis
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [ ] 7.9 Write unit tests for routing service
    - Test route calculation with no waterlogged areas
    - Test route avoidance with single waterlogged area
    - Test route with multiple waterlogged areas of different severities
    - Test proximity warning generation
    - Test route recalculation when new report affects path
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 9. Implement WebSocket server for real-time updates
  - [ ] 9.1 Create WebSocket server with authentication
    - Set up WebSocket server using ws library
    - Implement JWT token validation for WebSocket connections
    - Maintain client connection registry
    - _Requirements: 4.6_

  - [ ] 9.2 Implement real-time report broadcasting
    - Broadcast new reports to all connected clients within affected area
    - Include report details and updated area status
    - Trigger broadcasts when reports created or expired
    - _Requirements: 4.6_

  - [ ] 9.3 Write property test for real-time updates
    - **Property 14: Real-Time Map Updates**
    - **Validates: Requirements 4.6**

  - [ ] 9.4 Implement route update notifications via WebSocket
    - Send route recalculation notifications to users with active navigation
    - Include new route details and reason for recalculation
    - _Requirements: 7.5, 8.4_

  - [ ] 9.5 Write unit tests for WebSocket server
    - Test WebSocket connection with valid and invalid tokens
    - Test broadcast to multiple connected clients
    - Test targeted notifications to specific users
    - _Requirements: 4.6, 7.5, 8.4_

- [ ] 10. Implement mobile app authentication flow
  - [ ] 10.1 Create registration and verification screens
    - Build phone number input screen with country code selector
    - Build verification code input screen
    - Implement form validation for phone numbers
    - _Requirements: 9.1, 9.2_

  - [ ] 10.2 Integrate authentication API calls
    - Call POST /api/v1/auth/register with phone number
    - Call POST /api/v1/auth/verify with verification code
    - Store JWT token in secure storage (Keychain/Keystore)
    - _Requirements: 9.1, 9.2, 9.3_

  - [ ] 10.3 Write property tests for authentication flow
    - **Property 32: Verification Code Delivery**
    - **Validates: Requirements 9.2**
    - **Property 33: Verification Requirement for Reports**
    - **Validates: Requirements 9.3**

  - [ ] 10.4 Write unit tests for authentication screens
    - Test phone number validation
    - Test verification code submission
    - Test token storage and retrieval
    - _Requirements: 9.1, 9.2, 9.3_

- [ ] 11. Implement mobile app map interface
  - [x] 11.1 Create map screen with map integration
    - Use Leaflet with OpenStreetMap tiles (completely free) or Mapbox free tier
    - Initialize map centered on Ahmedabad
    - Implement map controls (zoom, pan, center on user location)
    - Request and handle location permissions
    - _Requirements: 4.1, 10.1_

  - [x] 11.2 Implement waterlogged area visualization
    - Fetch active reports from GET /api/v1/reports/area
    - Render circular markers for each area with 500m radius
    - Apply color coding: yellow (Low), orange (Medium), red (High)
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ] 11.3 Write property tests for map visualization
    - **Property 11: Map Completeness**
    - **Validates: Requirements 4.1**
    - **Property 12: Severity Color Mapping**
    - **Validates: Requirements 4.2, 4.3, 4.4**

  - [ ] 11.4 Implement area detail popup
    - Handle tap events on area markers
    - Display popup with severity, report count, and timestamp
    - Format timestamp as relative time (e.g., "45 minutes ago")
    - _Requirements: 4.5, 6.3_

  - [ ] 11.5 Write property tests for area details
    - **Property 13: Area Detail Display**
    - **Validates: Requirements 4.5**
    - **Property 20: Report Age Display**
    - **Validates: Requirements 6.3**

  - [ ] 11.6 Implement WebSocket connection for real-time updates
    - Establish WebSocket connection on map screen mount
    - Listen for report update events
    - Update map markers when new reports received
    - _Requirements: 4.6_

  - [ ] 11.7 Implement view-only mode for denied permissions
    - Detect location permission status
    - Disable report submission button when permission denied
    - Display informational message about view-only mode
    - _Requirements: 10.2, 10.3_

  - [ ] 11.8 Write property test for permission-based feature gating
    - **Property 36: Permission-Based Feature Gating**
    - **Validates: Requirements 10.2, 10.3**

  - [ ] 11.9 Write unit tests for map interface
    - Test map initialization and centering
    - Test area marker rendering with correct colors
    - Test area detail popup display
    - Test WebSocket update handling
    - Test view-only mode when permissions denied
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 10.2, 10.3_


- [ ] 12. Implement mobile app report submission
  - [x] 12.1 Create manual report submission UI
    - Add "Report Waterlogging" floating action button on map screen
    - Create severity selection modal (Low, Medium, High)
    - Implement seasonal restriction check (June-September only)
    - _Requirements: 3.1, 3.2, 3.4_

  - [ ] 12.2 Write property test for manual report workflow
    - **Property 9: Manual Report Workflow**
    - **Validates: Requirements 3.2, 3.3**
    - **Property 10: Seasonal Report Restrictions**
    - **Validates: Requirements 3.4**

  - [ ] 12.3 Implement report submission API integration
    - Get current GPS location with accuracy check
    - Call POST /api/v1/reports with location and severity
    - Handle success and error responses
    - Display confirmation or error message
    - _Requirements: 2.4, 2.5, 3.3_

  - [ ] 12.4 Implement daily limit handling
    - Handle 403 response for daily limit exceeded
    - Display "Daily report limit reached" message
    - Disable report button when limit reached
    - _Requirements: 9.4, 9.5_

  - [ ] 12.5 Write property test for daily limit message
    - **Property 35: Limit Exceeded Message**
    - **Validates: Requirements 9.5**

  - [ ] 12.6 Implement clear report submission
    - Add "No Waterlogging" option in report flow
    - Submit clear report to API
    - Update local map state to reflect cleared area
    - _Requirements: 2.6_

  - [ ] 12.7 Write unit tests for report submission
    - Test manual report submission with valid location
    - Test seasonal restriction enforcement
    - Test daily limit error handling
    - Test clear report submission
    - Test location accuracy validation
    - _Requirements: 2.4, 2.5, 2.6, 3.2, 3.3, 3.4, 9.4, 9.5_

- [ ] 13. Implement mobile app push notification handling
  - [ ] 13.1 Configure push notifications in mobile app
    - Add FCM configuration (free) or OneSignal SDK (free tier)
    - For FCM: Add google-services.json (Android) and GoogleService-Info.plist (iOS)
    - For OneSignal: Configure app ID in project settings
    - Request notification permissions on app launch
    - Register device token with backend
    - _Requirements: 1.2, 1.3_

  - [ ] 13.2 Implement rain notification handler
    - Handle incoming rain notification
    - Display interactive notification with Yes/No actions
    - Handle user response without opening app
    - _Requirements: 1.2, 1.3_

  - [ ] 13.3 Implement notification response submission
    - Call POST /api/v1/notifications/respond with user response
    - Handle follow-up questions (waterlogging status, severity)
    - Create report from notification response
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ] 13.4 Implement proximity alert handler
    - Handle incoming proximity alert notifications
    - Display alert with severity and distance information
    - Provide option to view on map or recalculate route
    - _Requirements: 8.2, 8.3_

  - [ ] 13.5 Write unit tests for notification handling
    - Test push notification token registration
    - Test rain notification display and response
    - Test notification response submission
    - Test proximity alert display
    - _Requirements: 1.2, 1.3, 2.1, 2.2, 2.3, 8.2, 8.3_

- [ ] 14. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 15. Implement mobile app navigation and routing
  - [ ] 15.1 Create route planning screen
    - Build destination search input with autocomplete
    - Implement origin selection (current location or custom)
    - Add "Calculate Route" button
    - _Requirements: 7.1_

  - [ ] 15.2 Integrate routing API
    - Call POST /api/v1/routes/calculate with origin and destination
    - Parse route response with waypoints and warnings
    - Display route on map with polyline
    - _Requirements: 7.1, 7.4_

  - [ ] 15.3 Implement route warnings display
    - Show warning badges for waterlogged areas within 200m of route
    - Display warning details (severity, distance)
    - Provide option to recalculate avoiding specific areas
    - _Requirements: 7.4_

  - [ ] 15.4 Implement turn-by-turn navigation
    - Start navigation mode with route following
    - Track user location every 30 seconds
    - Display current position on route
    - Show next turn instructions
    - _Requirements: 8.1_

  - [ ] 15.5 Write property test for location tracking frequency
    - **Property 27: Location Tracking Frequency**
    - **Validates: Requirements 8.1**

  - [ ] 15.6 Implement proximity alert detection during navigation
    - Check distance to waterlogged areas every location update
    - Trigger alert when within 500m of waterlogged area
    - Display in-app alert with severity and distance
    - _Requirements: 8.2, 8.3_

  - [ ] 15.7 Implement dynamic route recalculation in navigation
    - Listen for WebSocket route update notifications
    - Automatically recalculate route when new reports affect path
    - Display notification explaining recalculation reason
    - _Requirements: 7.5, 8.4_

  - [ ] 15.8 Write unit tests for navigation features
    - Test route calculation and display
    - Test warning display for routes near waterlogged areas
    - Test location tracking during navigation
    - Test proximity alert triggering
    - Test dynamic route recalculation
    - _Requirements: 7.1, 7.4, 7.5, 8.1, 8.2, 8.3, 8.4_

- [ ] 16. Implement offline functionality
  - [ ] 16.1 Set up local data caching with AsyncStorage
    - Create cache manager for storing map data
    - Implement cache expiration logic
    - Store last sync timestamp
    - _Requirements: 11.1, 11.3_

  - [ ] 16.2 Implement offline map data display
    - Load cached map data when network unavailable
    - Display cache indicator on map interface
    - Show last sync timestamp
    - _Requirements: 11.1, 11.2, 11.3_

  - [ ] 16.3 Write property tests for offline functionality
    - **Property 38: Offline Cache Display**
    - **Validates: Requirements 11.1**
    - **Property 39: Offline Status Indicators**
    - **Validates: Requirements 11.2, 11.3**

  - [ ] 16.4 Implement report queuing for offline submissions
    - Queue reports in AsyncStorage when offline
    - Display queued status to user
    - Automatically sync queued reports when connectivity restored
    - _Requirements: 11.5_

  - [ ] 16.5 Write property test for offline report queuing
    - **Property 41: Offline Report Queuing**
    - **Validates: Requirements 11.5**

  - [ ] 16.6 Implement network connectivity monitoring
    - Detect network state changes
    - Trigger sync when connectivity restored
    - Complete sync within 10 seconds of reconnection
    - _Requirements: 11.4_

  - [ ] 16.7 Write property test for reconnection sync timing
    - **Property 40: Reconnection Sync Timing**
    - **Validates: Requirements 11.4**

  - [ ] 16.8 Write unit tests for offline functionality
    - Test cache storage and retrieval
    - Test offline indicator display
    - Test report queuing when offline
    - Test sync on reconnection
    - Test last sync timestamp display
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_


- [ ] 17. Implement multi-language support
  - [ ] 17.1 Set up i18n framework in mobile app
    - Install react-i18next library
    - Create translation files for English, Hindi, and Gujarati
    - Configure language detection and fallback
    - _Requirements: 12.1, 12.2_

  - [ ] 17.2 Implement language detection and default setting
    - Detect device language on first launch
    - Set detected language as default if supported
    - Fall back to English if device language not supported
    - _Requirements: 12.2_

  - [ ] 17.3 Write property test for language detection
    - **Property 42: Language Detection**
    - **Validates: Requirements 12.2**

  - [ ] 17.4 Create language selection settings screen
    - Build settings screen with language picker
    - Display available languages (English, Hindi, Gujarati)
    - Save language preference to AsyncStorage
    - _Requirements: 12.3_

  - [ ] 17.5 Implement language switching
    - Update i18n language when user changes setting
    - Re-render all screens with new language
    - Complete language switch within 2 seconds
    - _Requirements: 12.4_

  - [ ] 17.6 Write property test for language switch timing
    - **Property 43: Language Switch Timing**
    - **Validates: Requirements 12.4**

  - [ ] 17.7 Translate all UI text and notifications
    - Add translation keys for all interface text
    - Translate notification templates
    - Translate error messages and alerts
    - _Requirements: 12.1, 12.5_

  - [ ] 17.8 Update user settings API endpoint
    - Implement PUT /api/v1/users/settings endpoint
    - Store user language preference in database
    - Use preference for notification localization
    - _Requirements: 12.3, 12.5_

  - [ ] 17.9 Write unit tests for multi-language support
    - Test language detection on first launch
    - Test language switching updates all text
    - Test language preference persistence
    - Test notification localization for each language
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ] 18. Implement data privacy and security features
  - [ ] 18.1 Implement report anonymization
    - Remove user identifiers from public report data
    - Store user_id separately with restricted access
    - Ensure map interface doesn't expose user information
    - _Requirements: 10.5_

  - [ ] 18.2 Write property test for report anonymization
    - **Property 37: Report Anonymization**
    - **Validates: Requirements 10.5**

  - [ ] 18.3 Implement location data privacy controls
    - Store location data only for report creation
    - Implement data retention policy (delete after report expiry)
    - Add user data export and deletion endpoints for GDPR compliance
    - _Requirements: 10.4_

  - [ ] 18.4 Implement API rate limiting
    - Add rate limiting middleware to all endpoints
    - Configure limits: 100 requests per 15 minutes per user
    - Return 429 status with retry-after header when exceeded
    - _Requirements: 9.4_

  - [ ] 18.5 Implement input validation and sanitization
    - Validate all API inputs against expected types and ranges
    - Sanitize user inputs to prevent SQL injection and XSS
    - Validate coordinates within Ahmedabad bounds
    - _Requirements: All_

  - [ ] 18.6 Write unit tests for security features
    - Test report anonymization
    - Test location data retention policy
    - Test rate limiting enforcement
    - Test input validation and sanitization
    - _Requirements: 9.4, 10.4, 10.5_

- [ ] 19. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 20. Integration and end-to-end testing
  - [ ] 20.1 Set up integration test environment
    - Create test database with sample data (use Docker for PostgreSQL+PostGIS)
    - Configure test Redis instance (use Docker or Upstash free tier)
    - Set up mock external services (push notifications, SMS, weather API)
    - _Requirements: All_

  - [ ] 20.2 Write integration tests for complete report flow
    - Test rain detection → notification → response → report creation → map update
    - Test manual report submission → database storage → WebSocket broadcast → map update
    - Test clear report → expiry of waterlogged reports → map update
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.5, 2.6, 4.6_

  - [ ] 20.3 Write integration tests for routing flow
    - Test route calculation with active waterlogged areas
    - Test proximity warning generation
    - Test dynamic route recalculation when new report affects route
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ] 20.4 Write integration tests for navigation flow
    - Test navigation start → location tracking → proximity alerts
    - Test route update notification during active navigation
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [ ] 20.5 Write integration tests for offline functionality
    - Test offline report queuing and sync on reconnection
    - Test cached data display when offline
    - _Requirements: 11.1, 11.4, 11.5_

  - [ ] 20.6 Set up end-to-end test environment with Detox
    - Configure Detox for React Native testing
    - Set up test backend and database
    - Create test user accounts and sample data
    - _Requirements: All_

  - [ ] 20.7 Write E2E tests for critical user flows
    - Test user registration and phone verification flow
    - Test receiving rain notification and submitting report
    - Test manual report submission from map
    - Test viewing waterlogged areas on map
    - Test route planning avoiding waterlogged areas
    - Test navigation with proximity alerts
    - Test offline report submission and sync
    - Test language switching
    - _Requirements: All_

- [ ] 21. Performance optimization and monitoring
  - [ ] 21.1 Implement database query optimization
    - Add indexes for frequently queried fields
    - Optimize PostGIS spatial queries with appropriate indexes
    - Implement connection pooling for database
    - _Requirements: All_

  - [ ] 21.2 Implement Redis caching strategy
    - Cache aggregated area status with 5-minute TTL
    - Cache calculated routes with 10-minute TTL
    - Cache user notification rate limits
    - _Requirements: 4.6, 7.1, 1.4_

  - [ ] 21.3 Implement API response time monitoring
    - Add logging for all API endpoint response times
    - Set up alerts for response times > 2 seconds
    - Monitor database query performance
    - _Requirements: All_

  - [ ] 21.4 Implement error tracking and logging
    - Set up centralized logging (e.g., Winston, Sentry)
    - Log all errors with context and stack traces
    - Set up alerts for error rate > 5%
    - _Requirements: All_

  - [ ] 21.5 Optimize mobile app performance
    - Implement map marker clustering for dense areas
    - Optimize WebSocket reconnection logic
    - Reduce bundle size with code splitting
    - _Requirements: 4.1, 4.6_

- [ ] 22. Final integration and deployment preparation
  - [ ] 22.1 Create deployment configuration
    - Create Dockerfile for backend services
    - Configure environment variables for production
    - Set up database migration scripts
    - Consider free hosting: Railway, Render, Fly.io (free tiers), or self-hosted VPS
    - _Requirements: All_

  - [ ] 22.2 Create API documentation
    - Document all API endpoints with request/response examples
    - Create Postman collection for API testing
    - Document WebSocket events and payloads
    - _Requirements: All_

  - [ ] 22.3 Perform final integration testing
    - Test complete system with all components running
    - Verify all 44 correctness properties pass
    - Test with realistic data volumes
    - _Requirements: All_

  - [ ] 22.4 Create deployment checklist
    - Database setup and migration steps (PostgreSQL+PostGIS via Docker or Supabase/Neon free tier)
    - Environment variable configuration
    - External service configuration (FCM/OneSignal, SMS gateway, weather API)
    - Mobile app build and submission steps
    - Free hosting options: Railway, Render, Fly.io, or self-hosted
    - _Requirements: All_

- [ ] 23. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples, edge cases, and error conditions
- Integration and E2E tests validate complete user flows
- The implementation uses TypeScript/JavaScript for both frontend (React Native) and backend (Node.js/Express)
- Database uses PostgreSQL with PostGIS extension for geospatial queries (Docker, Supabase, or Neon free tier)
- Real-time updates handled via WebSocket connections
- Push notifications via FCM (free) or OneSignal (free tier)
- SMS verification via Twilio free trial, Vonage, MessageBird, or Termii (India-focused)
- Weather data from Open-Meteo (completely free) or OpenWeatherMap free tier
- Routing powered by OSRM or GraphHopper (open-source)
- Hosting options: Railway, Render, Fly.io (free tiers), or self-hosted VPS
- All services use open-source, free alternatives instead of paid cloud services



## Web Dashboard Tasks

- [ ] 24. Set up web dashboard infrastructure
  - [x] 24.1 Initialize React web application
    - Create React app with TypeScript
    - Install dependencies: react-router-dom, axios, recharts, mapbox-gl
    - Set up project structure: components, pages, services, utils
    - Configure build and development scripts
    - _Requirements: Web Dashboard_

  - [x] 24.2 Create authentication pages
    - Build login page with phone number input
    - Build verification code input page
    - Implement JWT token storage in localStorage
    - Add protected route wrapper for authenticated pages
    - _Requirements: Web Dashboard Authentication_

  - [ ] 24.3 Create dashboard layout
    - Build navigation sidebar with menu items
    - Create header with user info and logout button
    - Implement responsive layout for mobile and desktop
    - Add loading states and error boundaries
    - _Requirements: Web Dashboard UI_

- [ ] 25. Implement dashboard overview page
  - [ ] 25.1 Create statistics cards
    - Display total active reports count
    - Display reports by severity (Low, Medium, High)
    - Display total users count
    - Display reports today count
    - Fetch data from backend API
    - _Requirements: Web Dashboard Analytics_

  - [ ] 25.2 Create reports timeline chart
    - Implement line chart showing reports over last 7 days
    - Group by date and severity
    - Use recharts library for visualization
    - Add date range selector
    - _Requirements: Web Dashboard Analytics_

  - [ ] 25.3 Create severity distribution pie chart
    - Show percentage of reports by severity
    - Use color coding: yellow (Low), orange (Medium), red (High)
    - Display count and percentage for each severity
    - _Requirements: Web Dashboard Analytics_

  - [ ] 25.4 Create recent reports list
    - Display last 10 reports with timestamp, location, severity
    - Add pagination for viewing more reports
    - Implement real-time updates via WebSocket
    - Add click to view on map functionality
    - _Requirements: Web Dashboard Reports_

- [ ] 26. Implement interactive map page
  - [ ] 26.1 Create full-screen map view
    - Integrate Mapbox GL JS with OpenStreetMap tiles
    - Center map on Ahmedabad
    - Add zoom and pan controls
    - Implement map style switcher (streets, satellite)
    - _Requirements: Web Dashboard Map_

  - [ ] 26.2 Display waterlogged areas on map
    - Fetch active reports from API
    - Render circular markers with 500m radius
    - Apply severity-based color coding
    - Add clustering for dense areas
    - _Requirements: Web Dashboard Map_

  - [ ] 26.3 Implement area detail popup
    - Show popup on marker click with report details
    - Display severity, report count, timestamp
    - Add "View All Reports" button to see contributing reports
    - Show reporter count and average severity
    - _Requirements: Web Dashboard Map_

  - [ ] 26.4 Add map filters
    - Filter by severity (Low, Medium, High)
    - Filter by time range (Last hour, Today, Last 7 days)
    - Filter by status (Active, Expired)
    - Update map markers based on filters
    - _Requirements: Web Dashboard Map_

  - [ ] 26.5 Implement real-time map updates
    - Connect to WebSocket for live report updates
    - Add new markers when reports created
    - Remove markers when reports expire
    - Show notification badge for new reports
    - _Requirements: Web Dashboard Real-time_

- [ ] 27. Implement reports management page
  - [ ] 27.1 Create reports data table
    - Display all reports with columns: ID, Location, Severity, Status, Timestamp
    - Implement sorting by any column
    - Add pagination (20 reports per page)
    - Implement search by location or ID
    - _Requirements: Web Dashboard Reports_

  - [ ] 27.2 Add report filters
    - Filter by severity
    - Filter by status (Active, Expired)
    - Filter by date range
    - Filter by report type (Waterlogged, Clear)
    - _Requirements: Web Dashboard Reports_

  - [ ] 27.3 Implement report detail view
    - Show full report details in modal or side panel
    - Display location on mini map
    - Show reporter information (anonymized)
    - Display creation and expiry timestamps
    - Add export report data button
    - _Requirements: Web Dashboard Reports_

  - [ ] 27.4 Add bulk actions
    - Select multiple reports with checkboxes
    - Bulk expire reports
    - Bulk export to CSV
    - Show confirmation dialog for bulk actions
    - _Requirements: Web Dashboard Reports_

- [ ] 28. Implement users management page
  - [ ] 28.1 Create users data table
    - Display all users with columns: ID, Phone, Verified, Reports Count, Last Active
    - Implement sorting and pagination
    - Add search by phone number
    - _Requirements: Web Dashboard Users_

  - [ ] 28.2 Implement user detail view
    - Show user profile information
    - Display user's report history
    - Show user's activity timeline
    - Display user's language preference
    - _Requirements: Web Dashboard Users_

  - [ ] 28.3 Add user statistics
    - Show total reports submitted by user
    - Display reports by severity breakdown
    - Show user's most active areas
    - Display user's contribution score
    - _Requirements: Web Dashboard Users_

- [ ] 29. Implement analytics and insights page
  - [ ] 29.1 Create hotspot analysis
    - Identify areas with most frequent reports
    - Display heatmap of waterlogging incidents
    - Show top 10 affected locations
    - Add time-based analysis (peak hours, days)
    - _Requirements: Web Dashboard Analytics_

  - [ ] 29.2 Create trend analysis
    - Show reports trend over time (daily, weekly, monthly)
    - Compare current period with previous period
    - Display growth/decline percentages
    - Add seasonal analysis for rainy season
    - _Requirements: Web Dashboard Analytics_

  - [ ] 29.3 Create user engagement metrics
    - Display active users count (daily, weekly, monthly)
    - Show user retention rate
    - Display average reports per user
    - Show notification response rate
    - _Requirements: Web Dashboard Analytics_

  - [ ] 29.4 Add export functionality
    - Export analytics data to CSV
    - Export charts as PNG images
    - Generate PDF reports
    - Schedule automated reports (optional)
    - _Requirements: Web Dashboard Analytics_

- [ ] 30. Implement settings and configuration page
  - [ ] 30.1 Create system settings panel
    - Configure report expiry time (default 4 hours)
    - Set notification rate limit (default 2 hours)
    - Configure daily report limit per user (default 10)
    - Set GPS accuracy threshold (default 200 meters)
    - _Requirements: Web Dashboard Settings_

  - [ ] 30.2 Create notification templates editor
    - Edit rain notification template
    - Edit proximity alert template
    - Edit route update template
    - Support multi-language templates
    - _Requirements: Web Dashboard Settings_

  - [ ] 30.3 Implement admin user management
    - Add/remove admin users
    - Set admin permissions
    - View admin activity log
    - _Requirements: Web Dashboard Settings_

- [ ] 31. Testing and optimization
  - [ ] 31.1 Write unit tests for dashboard components
    - Test statistics cards rendering
    - Test charts with mock data
    - Test table sorting and filtering
    - Test map marker rendering
    - _Requirements: Web Dashboard Testing_

  - [ ] 31.2 Write integration tests
    - Test authentication flow
    - Test API integration
    - Test WebSocket connection
    - Test data fetching and caching
    - _Requirements: Web Dashboard Testing_

  - [ ] 31.3 Optimize dashboard performance
    - Implement data caching with React Query
    - Add lazy loading for routes
    - Optimize map rendering with clustering
    - Minimize bundle size with code splitting
    - _Requirements: Web Dashboard Performance_

  - [ ] 31.4 Implement error handling
    - Add error boundaries for components
    - Display user-friendly error messages
    - Implement retry logic for failed API calls
    - Add offline detection and messaging
    - _Requirements: Web Dashboard Error Handling_

- [ ] 32. Deployment and documentation
  - [ ] 32.1 Create production build configuration
    - Configure environment variables
    - Set up build optimization
    - Configure CDN for static assets
    - Set up hosting (Vercel, Netlify, or self-hosted)
    - _Requirements: Web Dashboard Deployment_

  - [ ] 32.2 Create dashboard user documentation
    - Write user guide for dashboard features
    - Create video tutorials for key workflows
    - Document API endpoints used by dashboard
    - Create troubleshooting guide
    - _Requirements: Web Dashboard Documentation_

  - [ ] 32.3 Perform final testing
    - Test all dashboard features end-to-end
    - Verify responsive design on all devices
    - Test with realistic data volumes
    - Perform security audit
    - _Requirements: Web Dashboard Testing_
