# Design Document: Multi-Page Navigation

## Overview

This design implements a multi-page navigation system for the DriveSafe AI application, separating the current single-page interface into three distinct pages: a landing page with marketing content, a monitoring page with the driver detection interface, and a password-protected settings page for API usage metrics. The design uses React Router for client-side routing and maintains authentication state across page transitions.

The current implementation displays all content on a single page (`App.tsx`), conditionally rendering marketing content and the monitoring interface based on authentication state. This creates a cluttered experience where drivers see landing page content while actively monitoring. The new design separates concerns by creating dedicated pages with distinct URLs, improving focus and usability.

## Architecture

### Routing Strategy

The application will use React Router v6 for client-side routing. This provides:
- Declarative route definitions
- URL-based navigation with browser history support
- Nested routing capabilities
- Route protection mechanisms

### Page Structure

```
/                    → Landing Page (marketing content, sign-in)
/monitor             → Monitoring Page (camera feed, detection results)
/settings            → Settings Page (password-protected usage dashboard)
```

### Component Hierarchy

```
main.tsx
└── RouterProvider
    └── Root Layout (header, navigation)
        ├── Landing Page (/)
        ├── Monitoring Page (/monitor)
        └── Settings Page (/settings)
```

## Components and Interfaces

### 1. Router Configuration

**File**: `src/router.tsx`

The router configuration defines all application routes and their associated components.

```typescript
interface RouteConfig {
  path: string;
  element: ReactElement;
  children?: RouteConfig[];
}
```

Routes:
- `/` - Landing page with marketing content
- `/monitor` - Monitoring interface with camera and detection
- `/settings` - Password-protected settings dashboard

### 2. Root Layout Component

**File**: `src/layouts/RootLayout.tsx`

Provides consistent header and navigation across all pages.

```typescript
interface RootLayoutProps {
  // No props needed - uses Outlet for nested routes
}
```

Responsibilities:
- Render application header with logo and branding
- Provide navigation controls (links to pages)
- Render authentication controls (sign in/out)
- Use React Router's `<Outlet />` to render child routes

### 3. Landing Page Component

**File**: `src/pages/LandingPage.tsx`

Displays marketing content and authentication controls.

```typescript
interface LandingPageProps {
  // No props needed - uses Convex hooks for auth state
}
```

Content:
- Marketing headline: "A calmer interface for driver attention and motion awareness"
- Feature descriptions and benefits
- Sign-in form for unauthenticated users
- Welcome message for authenticated users
- Navigation button to monitoring page

### 4. Monitoring Page Component

**File**: `src/pages/MonitoringPage.tsx`

Contains the driver monitoring interface (currently in `DrunkDetector.tsx`).

```typescript
interface MonitoringPageProps {
  // No props needed - self-contained monitoring logic
}
```

Content:
- Live camera feed or uploaded media display
- Detection results (drunk, sleepy, distracted indicators)
- Speed tracking and limit warnings
- Monitoring controls (start/stop, upload media)
- Analysis results display

### 5. Settings Page Component

**File**: `src/pages/SettingsPage.tsx`

Password-protected page for API usage dashboard.

```typescript
interface SettingsPageProps {
  // No props needed - manages password state internally
}
```

Content:
- Password entry form (if not authenticated)
- Usage dashboard (if password validated):
  - Total request count
  - Success/error counts
  - Provider-specific counts (Groq, Gemini)
  - Token usage metrics
  - Recent usage events

### 6. Navigation Component

**File**: `src/components/Navigation.tsx`

Provides navigation links between pages.

```typescript
interface NavigationProps {
  className?: string;
}
```

Links:
- Home (Landing Page)
- Monitor (Monitoring Page)
- Settings (Settings Page)

Uses React Router's `<Link>` or `<NavLink>` components for navigation.

## Data Models

### Route State

No new database models required. All existing Convex schemas remain unchanged:
- `users` - User authentication (existing)
- `detections` - Detection results (existing)
- `usageEvents` - API usage events (existing)
- `usageSummaries` - Aggregated usage data (existing)

### Client-Side State

Navigation state is managed by React Router:
- Current route path
- Navigation history
- Route parameters (if needed)

Authentication state continues to be managed by Convex Auth:
- User session
- Authentication status

Settings page password state:
- Password input value
- Validation status
- Dashboard unlock state

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Route-to-Page Mapping Consistency

*For any* valid route path (`/`, `/monitor`, `/settings`), navigating to that path SHALL render the corresponding page component and update the browser URL to match.

**Validates: Requirements 7.1, 7.2, 7.3, 7.4**

### Property 2: Authentication State Preservation

*For any* sequence of page navigations, the user's authentication state SHALL remain consistent across all pages without requiring re-authentication.

**Validates: Requirements 8.1, 8.2, 8.4**

### Property 3: Settings Password Validation

*For any* password input on the Settings Page, the dashboard SHALL be displayed if and only if the password matches the configured `USAGE_DASHBOARD_PASSWORD` environment variable.

**Validates: Requirements 4.3, 4.4, 4.5**

### Property 4: Browser Navigation Compatibility

*For any* use of browser back/forward buttons, the application SHALL navigate to the appropriate page corresponding to the history entry.

**Validates: Requirements 7.5**

### Property 5: Content Separation

*For any* page, the content displayed SHALL be exclusive to that page's purpose: Landing Page SHALL NOT display monitoring interface, Monitoring Page SHALL NOT display marketing content, Settings Page SHALL NOT display either.

**Validates: Requirements 1.6, 2.5**

## Error Handling

### Navigation Errors

**Invalid Routes**
- Scenario: User navigates to undefined route (e.g., `/invalid-path`)
- Handling: Redirect to Landing Page (`/`)
- User feedback: None (silent redirect)

**Route Loading Failures**
- Scenario: Component fails to load due to code splitting error
- Handling: Display error boundary with retry option
- User feedback: "Failed to load page. Please refresh."

### Authentication Errors

**Session Expiration**
- Scenario: User session expires during navigation
- Handling: Maintain current page, update auth UI controls
- User feedback: Sign-in form becomes available

**Auth State Loading**
- Scenario: Auth state is loading during initial render
- Handling: Display loading spinner until auth state resolves
- User feedback: Loading indicator in header

### Settings Page Errors

**Incorrect Password**
- Scenario: User enters wrong password for settings dashboard
- Handling: Display error message, keep password form visible
- User feedback: "Incorrect usage dashboard password"

**Dashboard Loading Failure**
- Scenario: Convex query fails when loading usage data
- Handling: Display error message with retry button
- User feedback: "Unable to load usage dashboard. Please try again."

**Missing Environment Variable**
- Scenario: `USAGE_DASHBOARD_PASSWORD` not configured
- Handling: Display configuration error message
- User feedback: "Usage dashboard password is not configured"

### Media Upload Errors

**File Size Exceeded**
- Scenario: User uploads video >50MB or image >10MB
- Handling: Reject upload, display error toast
- User feedback: "File is too large. Please select a smaller file."

**Unsupported File Type**
- Scenario: User uploads non-video/non-image file
- Handling: Reject upload, display error toast
- User feedback: "Unsupported file type. Please upload a video or image."

## Testing Strategy

### Unit Tests

Unit tests will verify specific behaviors and edge cases:

**Router Configuration**
- Test that all routes are defined correctly
- Test that invalid routes redirect to landing page
- Test that route paths match expected patterns

**Navigation Component**
- Test that navigation links render correctly
- Test that clicking links triggers navigation
- Test that active route is highlighted

**Settings Password Validation**
- Test correct password grants access
- Test incorrect password denies access
- Test empty password is rejected
- Test password form submission

**Content Separation**
- Test Landing Page does not render monitoring components
- Test Monitoring Page does not render marketing content
- Test Settings Page renders only when password validated

**Error Boundaries**
- Test error boundary catches component errors
- Test error boundary displays fallback UI
- Test error boundary retry functionality

### Integration Tests

Integration tests will verify end-to-end user flows:

**Navigation Flow**
- Navigate from landing to monitoring page
- Navigate from monitoring to settings page
- Navigate back to landing page
- Use browser back/forward buttons

**Authentication Flow**
- Sign in on landing page
- Navigate to monitoring page while authenticated
- Sign out and verify auth state updates
- Navigate between pages while unauthenticated

**Settings Access Flow**
- Navigate to settings page
- Enter incorrect password and verify error
- Enter correct password and verify dashboard displays
- Lock dashboard and verify password form returns

**Media Upload Flow**
- Upload image on monitoring page
- Analyze uploaded image
- Clear uploaded media
- Upload video and analyze

### Property-Based Tests

This feature is primarily focused on UI navigation and routing, which is not well-suited for property-based testing. The routing behavior is deterministic and configuration-based rather than algorithmic. Therefore, property-based testing is not applicable for this feature.

Instead, comprehensive unit and integration tests will provide coverage of:
- Route configuration correctness
- Navigation state management
- Authentication state preservation
- Password validation logic
- Content rendering separation

### Manual Testing Checklist

- [ ] Verify all routes render correct pages
- [ ] Test browser back/forward navigation
- [ ] Test direct URL entry for each route
- [ ] Test authentication state across page transitions
- [ ] Test settings password protection
- [ ] Test responsive layout on mobile devices
- [ ] Test navigation with keyboard (accessibility)
- [ ] Test screen reader compatibility
- [ ] Verify no console errors during navigation

### Testing Tools

- **Vitest**: Unit test runner
- **React Testing Library**: Component testing
- **MSW (Mock Service Worker)**: API mocking for Convex queries
- **Playwright** or **Cypress**: End-to-end testing (optional)

## Implementation Notes

### React Router Installation

Add React Router to project dependencies:

```bash
npm install react-router-dom
```

### Code Migration Strategy

1. **Create router configuration** (`src/router.tsx`)
   - Define routes for landing, monitoring, settings pages
   - Configure error boundary for route errors

2. **Create layout component** (`src/layouts/RootLayout.tsx`)
   - Extract header from `App.tsx`
   - Add navigation controls
   - Use `<Outlet />` for child routes

3. **Create page components**
   - `src/pages/LandingPage.tsx` - Extract marketing content from `App.tsx`
   - `src/pages/MonitoringPage.tsx` - Move `DrunkDetector` component
   - `src/pages/SettingsPage.tsx` - Extract settings modal logic

4. **Update main entry point** (`src/main.tsx`)
   - Wrap app with `RouterProvider`
   - Remove old `App` component rendering

5. **Update navigation**
   - Replace conditional rendering with route-based navigation
   - Add navigation links in header
   - Use `useNavigate` hook for programmatic navigation

### Authentication Integration

Authentication state is managed by Convex Auth and remains unchanged. The `useQuery(api.auth.loggedInUser)` hook will continue to work across all pages since the Convex provider wraps the entire router.

### Settings Modal to Page Migration

The current settings modal in `DrunkDetector.tsx` will be extracted into a dedicated page:

**Current**: Modal overlay with password form and dashboard
**New**: Full page at `/settings` route with same functionality

Benefits:
- Dedicated URL for settings (bookmarkable)
- Better mobile experience (full screen instead of modal)
- Cleaner separation of concerns
- Easier to test in isolation

### Monitoring Page Access

Per Requirement 9, the monitoring page should be accessible to both authenticated and unauthenticated users. No route protection is needed for `/monitor`.

### URL Structure Considerations

The chosen URL structure (`/`, `/monitor`, `/settings`) is:
- Simple and memorable
- RESTful and semantic
- Compatible with static hosting (no server-side routing needed)
- Works with Capacitor for iOS app

### Performance Considerations

**Code Splitting**
- Use React.lazy() for page components to reduce initial bundle size
- Load monitoring page code only when navigating to `/monitor`
- Load settings page code only when navigating to `/settings`

**Route Preloading**
- Consider preloading monitoring page when user hovers over navigation link
- Preload settings page when user is authenticated

### Accessibility

**Keyboard Navigation**
- All navigation links must be keyboard accessible
- Focus management when navigating between pages
- Skip links for screen readers

**Screen Reader Support**
- Announce page changes to screen readers
- Proper heading hierarchy on each page
- ARIA labels for navigation controls

**Focus Management**
- Focus should move to main content when navigating
- Focus should return to trigger element when closing modals (if any remain)

### Mobile Considerations

**Touch Targets**
- Navigation links should be at least 44x44px for touch
- Settings button should be easily accessible on mobile

**Responsive Layout**
- Header should collapse navigation on small screens
- Consider hamburger menu for mobile navigation
- Settings page should be full-screen on mobile

### iOS App Compatibility

The routing implementation must work with Capacitor for iOS:
- Use hash-based routing if needed (`createHashRouter`)
- Test deep linking on iOS
- Ensure back button works correctly in iOS app

## Dependencies

### New Dependencies

- `react-router-dom` (^6.x) - Client-side routing

### Existing Dependencies

- `react` (^19.0.0) - UI framework
- `convex` (^1.24.2) - Backend and auth
- `@convex-dev/auth` (^0.0.80) - Authentication
- `sonner` (^2.0.3) - Toast notifications

## Migration Path

### Phase 1: Setup Router Infrastructure
1. Install React Router
2. Create router configuration
3. Create root layout component
4. Update main.tsx to use RouterProvider

### Phase 2: Create Page Components
1. Create LandingPage component (extract from App.tsx)
2. Create MonitoringPage component (move DrunkDetector)
3. Create SettingsPage component (extract from DrunkDetector modal)

### Phase 3: Update Navigation
1. Add navigation component with links
2. Update header to include navigation
3. Remove conditional rendering from old App.tsx

### Phase 4: Testing and Refinement
1. Write unit tests for each page
2. Write integration tests for navigation flows
3. Test on mobile devices
4. Test iOS app compatibility
5. Fix any issues discovered

### Phase 5: Cleanup
1. Remove old App.tsx component
2. Remove unused code from DrunkDetector
3. Update documentation
4. Deploy to production

## Security Considerations

### Settings Page Password

The settings page password is validated client-side by the Convex query, which checks against the server-side environment variable. This is secure because:
- Password is never sent to the client
- Validation happens on the server
- Dashboard data is only returned if password matches

### Authentication State

Authentication state is managed by Convex Auth and is secure:
- Session tokens are HTTP-only cookies
- Auth state is validated on the server
- No sensitive data is stored in client-side state

### Route Protection

The monitoring page is intentionally accessible without authentication (Requirement 9). This is acceptable because:
- No user-specific data is displayed without auth
- Camera access requires user permission
- Usage dashboard remains password-protected

## Future Enhancements

### Potential Improvements

1. **Route Guards**
   - Add optional authentication requirement for monitoring page
   - Implement role-based access control

2. **Nested Routes**
   - Add sub-routes for different monitoring modes
   - Create settings sub-pages for different configuration areas

3. **Route Transitions**
   - Add page transition animations
   - Implement loading states between routes

4. **Deep Linking**
   - Support deep links for specific monitoring states
   - Allow sharing links to specific settings sections

5. **Route Persistence**
   - Remember last visited page
   - Restore monitoring state when returning to page

6. **Analytics**
   - Track page views
   - Monitor navigation patterns
   - Identify drop-off points

## Conclusion

This design provides a clean separation of concerns by splitting the single-page application into three distinct pages with proper routing. The implementation uses React Router for client-side navigation, maintains authentication state across pages, and protects sensitive usage data with password validation. The design is testable, accessible, and compatible with both web and iOS app deployments.
