# Implementation Plan: Multi-Page Navigation

## Overview

This implementation plan converts the single-page DriveSafe AI application into a multi-page application with distinct routes for landing, monitoring, and settings pages. The implementation uses React Router v6 for client-side routing, maintains authentication state across pages, and preserves all existing functionality while improving user experience through content separation.

## Tasks

- [x] 1. Install React Router and create router infrastructure
  - Install `react-router-dom` package (^6.x)
  - Create `src/router.tsx` with route configuration for `/`, `/monitor`, and `/settings` paths
  - Create `src/layouts/RootLayout.tsx` component with header and `<Outlet />` for nested routes
  - Update `src/main.tsx` to wrap the app with `RouterProvider` instead of rendering `App` directly
  - _Requirements: 7.1, 7.2, 7.3, 6.5_

- [x] 2. Create Landing Page component
  - [x] 2.1 Extract marketing content from App.tsx into LandingPage component
    - Create `src/pages/LandingPage.tsx`
    - Move marketing headline, feature descriptions, and stat cards from `App.tsx`
    - Include sign-in form for unauthenticated users
    - Include welcome message for authenticated users
    - Add navigation button/link to monitoring page
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 6.1_
  
  - [x] 2.2 Write unit tests for Landing Page
    - Test that marketing content renders correctly
    - Test that sign-in form displays for unauthenticated users
    - Test that welcome message displays for authenticated users
    - Test that monitoring page navigation link is present
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 3. Create Monitoring Page component
  - [x] 3.1 Move DrunkDetector component to MonitoringPage
    - Create `src/pages/MonitoringPage.tsx`
    - Import and render `DrunkDetector` component
    - Ensure camera feed, detection results, and speed tracking display correctly
    - Verify monitoring controls (start/stop, upload) work as before
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 6.2_
  
  - [x] 3.2 Write unit tests for Monitoring Page
    - Test that DrunkDetector component renders
    - Test that monitoring interface displays without marketing content
    - Test that page is accessible to both authenticated and unauthenticated users
    - _Requirements: 2.5, 9.1, 9.2_

- [x] 4. Create Settings Page with password protection
  - [x] 4.1 Extract settings modal logic into SettingsPage component
    - Create `src/pages/SettingsPage.tsx`
    - Implement password entry form with validation
    - Add password state management (input value, validation status, unlock state)
    - Validate password against `USAGE_DASHBOARD_PASSWORD` environment variable via Convex query
    - Display error message for incorrect password
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  
  - [x] 4.2 Implement usage dashboard display in SettingsPage
    - Query usage data using existing Convex queries
    - Display total request count, success/error counts
    - Display provider-specific counts (Groq, Gemini)
    - Display token usage metrics (prompt, completion, total tokens)
    - Display last request timestamp
    - Display recent usage events with details
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_
  
  - [x] 4.3 Write unit tests for Settings Page
    - Test password form renders correctly
    - Test correct password grants access to dashboard
    - Test incorrect password displays error message
    - Test empty password is rejected
    - Test dashboard displays usage metrics when unlocked
    - _Requirements: 4.2, 4.3, 4.4_

- [x] 5. Checkpoint - Ensure all pages render correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Create Navigation component and update RootLayout
  - [x] 6.1 Create Navigation component with route links
    - Create `src/components/Navigation.tsx`
    - Add navigation links for Home (/), Monitor (/monitor), and Settings (/settings)
    - Use React Router's `<Link>` or `<NavLink>` components
    - Style navigation links to match application design
    - Ensure navigation is keyboard accessible
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  
  - [x] 6.2 Update RootLayout to include header and navigation
    - Move header from `App.tsx` to `RootLayout.tsx`
    - Include logo, branding, and authentication controls in header
    - Add Navigation component to header
    - Ensure header is sticky and consistent across all pages
    - Use `<Outlet />` to render child route components
    - _Requirements: 6.1, 6.2, 6.3_
  
  - [x] 6.3 Write unit tests for Navigation component
    - Test that all navigation links render
    - Test that clicking links triggers navigation
    - Test that navigation is keyboard accessible
    - _Requirements: 6.4_

- [x] 7. Implement route protection and redirects
  - [x] 7.1 Configure error boundary for invalid routes
    - Add catch-all route that redirects to Landing Page for invalid URLs
    - Implement error boundary component for route loading failures
    - Display user-friendly error message with retry option
    - _Requirements: 7.6_
  
  - [x] 7.2 Verify authentication state preservation across routes
    - Test that auth state persists when navigating between pages
    - Ensure Convex provider wraps RouterProvider to maintain auth context
    - Verify that sign-out updates auth state across all pages
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  
  - [x] 7.3 Write integration tests for navigation flows
    - Test navigation from landing to monitoring page
    - Test navigation from monitoring to settings page
    - Test browser back/forward button navigation
    - Test direct URL entry for each route
    - Test authentication state preservation during navigation
    - _Requirements: 7.4, 7.5, 8.1, 8.2_

- [x] 8. Checkpoint - Ensure routing and navigation work correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Remove old App.tsx component and clean up
  - [x] 9.1 Remove unused code from App.tsx
    - Delete conditional rendering logic that has been moved to page components
    - Remove marketing content that is now in LandingPage
    - Remove DrunkDetector import if it's now in MonitoringPage
    - Update any remaining imports or references
    - _Requirements: 1.6, 2.5_
  
  - [x] 9.2 Update DrunkDetector to remove settings modal
    - Remove settings modal state and UI from DrunkDetector component
    - Remove settings button that opened the modal
    - Keep all monitoring functionality intact
    - _Requirements: 4.6_
  
  - [x] 9.3 Write unit tests for cleaned-up components
    - Test that App.tsx no longer renders (if deleted)
    - Test that DrunkDetector no longer has settings modal
    - Test that all functionality still works after cleanup
    - _Requirements: 1.6, 2.5_

- [ ] 10. Implement code splitting for performance
  - [x] 10.1 Add lazy loading for page components
    - Use `React.lazy()` to lazy-load LandingPage, MonitoringPage, and SettingsPage
    - Add `<Suspense>` boundary with loading indicator
    - Test that pages load correctly with code splitting
    - _Requirements: 6.4, 6.5_

- [ ] 11. Add accessibility and mobile optimizations
  - [x] 11.1 Implement focus management for navigation
    - Ensure focus moves to main content when navigating between pages
    - Add skip links for screen readers
    - Test keyboard navigation for all interactive elements
    - _Requirements: 6.4_
  
  - [x] 11.2 Optimize navigation for mobile devices
    - Ensure navigation links have minimum 44x44px touch targets
    - Test responsive layout on mobile screens
    - Verify settings page is full-screen on mobile
    - _Requirements: 6.1, 6.2, 6.3_
  
  - [x] 11.3 Write accessibility tests
    - Test keyboard navigation works for all routes
    - Test screen reader announces page changes
    - Test proper heading hierarchy on each page
    - _Requirements: 6.4_

- [x] 12. Final checkpoint - Comprehensive testing
  - Ensure all tests pass, ask the user if questions arise.
  - Verify all routes render correct pages
  - Test browser back/forward navigation
  - Test direct URL entry for each route
  - Test authentication state across page transitions
  - Test settings password protection
  - Test responsive layout on mobile devices
  - Verify no console errors during navigation

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- The design document uses TypeScript/React, so all implementation will use these technologies
- React Router v6 is the chosen routing library
- All existing Convex queries and authentication logic remain unchanged
- Code splitting is recommended for performance but can be added after core functionality works
