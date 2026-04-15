# Requirements Document

## Introduction

The DriveSafe AI app currently displays all content on a single page, mixing marketing content with the active driver monitoring interface. This creates a problematic user experience where drivers see landing page content while actively using the monitoring features. This specification defines a multi-page navigation system that separates the landing page, driver monitoring interface, and settings dashboard into distinct pages with appropriate routing and access controls.

## Glossary

- **Landing_Page**: The initial page users see when opening the application, containing marketing content and authentication controls
- **Monitoring_Page**: The page containing the live camera feed, detection results, speed tracking, and monitoring controls for active driver monitoring
- **Settings_Page**: A password-protected page displaying API usage dashboard and configuration options
- **Router**: The navigation system that manages page transitions and URL routing
- **Auth_State**: The user's authentication status (authenticated or unauthenticated)
- **Usage_Dashboard**: The API usage statistics and metrics display
- **Password_Gate**: The password validation mechanism protecting the Settings_Page

## Requirements

### Requirement 1: Landing Page Display

**User Story:** As a new user, I want to see marketing content and sign-in options when I first open the app, so that I understand what the app does and can authenticate.

#### Acceptance Criteria

1. WHEN a user navigates to the root URL, THE Landing_Page SHALL display marketing content
2. THE Landing_Page SHALL display the text "Built for practical, low-distraction driver checks"
3. THE Landing_Page SHALL display the text "A calmer interface for driver attention and motion awareness"
4. THE Landing_Page SHALL display welcome message and description text
5. THE Landing_Page SHALL display sign in and sign out controls
6. THE Landing_Page SHALL NOT display the camera feed or monitoring interface

### Requirement 2: Monitoring Page Separation

**User Story:** As a driver, I want the monitoring interface on a separate page from marketing content, so that I can focus on driving without distractions.

#### Acceptance Criteria

1. THE Monitoring_Page SHALL display the live camera feed
2. THE Monitoring_Page SHALL display detection results including drunk, sleepy, and distracted indicators
3. THE Monitoring_Page SHALL display speed tracking and speed limit warnings
4. THE Monitoring_Page SHALL display all monitoring controls
5. THE Monitoring_Page SHALL NOT display landing page marketing content
6. WHEN a user is on the Monitoring_Page, THE Router SHALL display a distinct URL path

### Requirement 3: Authentication-Based Navigation

**User Story:** As a user, I want to navigate to the monitoring page after logging in, so that I can access the driver monitoring features.

#### Acceptance Criteria

1. WHEN a user successfully authenticates, THE Router SHALL navigate to the Monitoring_Page
2. WHEN an unauthenticated user attempts to access the Monitoring_Page, THE Router SHALL redirect to the Landing_Page
3. WHEN an authenticated user navigates to the root URL, THE Router SHALL allow access to the Landing_Page
4. THE Router SHALL preserve Auth_State across page navigation

### Requirement 4: Settings Page Access Control

**User Story:** As an administrator, I want a password-protected settings page for API usage data, so that sensitive usage information is secured separately from user authentication.

#### Acceptance Criteria

1. THE Settings_Page SHALL require password validation before displaying content
2. WHEN a user navigates to the Settings_Page, THE Password_Gate SHALL prompt for password entry
3. WHEN a user enters the correct password, THE Settings_Page SHALL display the Usage_Dashboard
4. WHEN a user enters an incorrect password, THE Password_Gate SHALL display an error message and prevent access
5. THE Password_Gate SHALL validate passwords against the USAGE_DASHBOARD_PASSWORD environment variable
6. THE Settings_Page SHALL be accessible via a settings button or navigation control

### Requirement 5: Settings Page Content Display

**User Story:** As an administrator, I want to view API usage statistics on the settings page, so that I can monitor system usage and costs.

#### Acceptance Criteria

1. WHEN the Settings_Page is accessed with valid password, THE Usage_Dashboard SHALL display total request count
2. THE Usage_Dashboard SHALL display success count and error count
3. THE Usage_Dashboard SHALL display provider-specific request counts for Groq and Gemini
4. THE Usage_Dashboard SHALL display token usage metrics including prompt tokens, completion tokens, and total tokens
5. THE Usage_Dashboard SHALL display the timestamp of the last request
6. THE Usage_Dashboard SHALL display recent usage events with details

### Requirement 6: Navigation Controls

**User Story:** As a user, I want clear navigation controls to move between pages, so that I can easily access different parts of the application.

#### Acceptance Criteria

1. THE Landing_Page SHALL provide a navigation control to access the Monitoring_Page
2. THE Router SHALL provide a navigation control to access the Settings_Page
3. THE Router SHALL provide a navigation control to return to the Landing_Page from other pages
4. WHEN a user clicks a navigation control, THE Router SHALL transition to the target page
5. THE Router SHALL update the browser URL to reflect the current page

### Requirement 7: URL Routing

**User Story:** As a user, I want distinct URLs for each page, so that I can bookmark pages and use browser navigation controls.

#### Acceptance Criteria

1. THE Router SHALL map the root path "/" to the Landing_Page
2. THE Router SHALL map a distinct path to the Monitoring_Page
3. THE Router SHALL map a distinct path to the Settings_Page
4. WHEN a user enters a URL directly, THE Router SHALL navigate to the corresponding page
5. WHEN a user uses browser back/forward buttons, THE Router SHALL navigate to the appropriate page
6. THE Router SHALL handle invalid URLs by redirecting to the Landing_Page

### Requirement 8: State Preservation During Navigation

**User Story:** As a user, I want my authentication state preserved when navigating between pages, so that I don't need to re-authenticate unnecessarily.

#### Acceptance Criteria

1. WHEN a user navigates between pages, THE Router SHALL preserve Auth_State
2. WHEN an authenticated user navigates to any page, THE Router SHALL maintain authentication
3. WHEN a user signs out, THE Router SHALL update Auth_State across all pages
4. THE Router SHALL NOT require re-authentication when navigating between pages

### Requirement 9: Monitoring Page Access for Anonymous Users

**User Story:** As an anonymous user, I want to access the monitoring features without authentication, so that I can test the app before signing in.

#### Acceptance Criteria

1. WHEN an unauthenticated user navigates to the Monitoring_Page, THE Router SHALL allow access
2. THE Monitoring_Page SHALL display full functionality for unauthenticated users
3. THE Monitoring_Page SHALL indicate anonymous session status when user is not authenticated
