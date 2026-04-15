# Manual Test Procedure: Authentication State Preservation

## Purpose

This document provides step-by-step manual testing procedures to verify that authentication state is preserved correctly across all routes in the multi-page navigation system.

## Prerequisites

- Application running locally (`npm run dev`)
- Browser with developer tools open
- Test user account credentials

## Test Suite 1: Basic Auth State Persistence

### Test 1.1: Navigate While Authenticated

**Steps**:
1. Open application at `http://localhost:5173/`
2. Sign in with test credentials
3. Verify welcome message appears: "Welcome back, [email]"
4. Click "Go to Monitoring" link
5. Verify you're on `/monitor` page
6. Verify "Sign out" button is visible in header
7. Click "Settings" link in navigation
8. Verify you're on `/settings` page
9. Verify "Sign out" button is still visible
10. Click "Home" link in navigation
11. Verify you're back on `/` page
12. Verify welcome message still shows: "Welcome back, [email]"

**Expected Result**: ✅ Auth state persists across all navigation

**Actual Result**: _[To be filled during testing]_

---

### Test 1.2: Navigate While Unauthenticated

**Steps**:
1. Open application at `http://localhost:5173/`
2. Do NOT sign in
3. Verify sign-in form is visible
4. Click "Monitor" link in navigation (visible in header)
5. Verify you're on `/monitor` page
6. Verify monitoring interface is visible (per Requirement 9)
7. Verify "Sign out" button is NOT visible
8. Click "Home" link in navigation
9. Verify you're back on `/` page
10. Verify sign-in form is still visible

**Expected Result**: ✅ Unauthenticated state persists across navigation

**Actual Result**: _[To be filled during testing]_

---

## Test Suite 2: Sign-Out State Updates

### Test 2.1: Sign Out from Landing Page

**Steps**:
1. Sign in at `http://localhost:5173/`
2. Verify welcome message appears
3. Click "Sign out" button
4. Verify sign-in form reappears immediately
5. Verify "Sign out" button disappears
6. Navigate to `/monitor`
7. Verify "Sign out" button is NOT visible
8. Navigate back to `/`
9. Verify sign-in form is still visible

**Expected Result**: ✅ Sign-out updates state across all pages

**Actual Result**: _[To be filled during testing]_

---

### Test 2.2: Sign Out from Monitoring Page

**Steps**:
1. Sign in at `http://localhost:5173/`
2. Navigate to `/monitor`
3. Verify "Sign out" button is visible
4. Click "Sign out" button
5. Verify "Sign out" button disappears immediately
6. Navigate to `/` (home)
7. Verify sign-in form is visible
8. Verify welcome message is NOT visible

**Expected Result**: ✅ Sign-out from any page updates global auth state

**Actual Result**: _[To be filled during testing]_

---

### Test 2.3: Sign Out from Settings Page

**Steps**:
1. Sign in at `http://localhost:5173/`
2. Navigate to `/settings`
3. Verify "Sign out" button is visible in header
4. Click "Sign out" button
5. Verify "Sign out" button disappears
6. Verify password form is still visible (settings password is independent)
7. Navigate to `/`
8. Verify sign-in form is visible

**Expected Result**: ✅ Sign-out works from settings page

**Actual Result**: _[To be filled during testing]_

---

## Test Suite 3: Browser Navigation

### Test 3.1: Browser Back Button

**Steps**:
1. Sign in at `http://localhost:5173/`
2. Navigate to `/monitor`
3. Navigate to `/settings`
4. Click browser back button
5. Verify you're on `/monitor`
6. Verify "Sign out" button is still visible
7. Click browser back button again
8. Verify you're on `/`
9. Verify welcome message is still visible
10. Verify "Sign out" button is still visible

**Expected Result**: ✅ Auth state persists through browser back navigation

**Actual Result**: _[To be filled during testing]_

---

### Test 3.2: Browser Forward Button

**Steps**:
1. Complete Test 3.1 first (to have history)
2. From `/` page, click browser forward button
3. Verify you're on `/monitor`
4. Verify "Sign out" button is visible
5. Click browser forward button again
6. Verify you're on `/settings`
7. Verify "Sign out" button is still visible

**Expected Result**: ✅ Auth state persists through browser forward navigation

**Actual Result**: _[To be filled during testing]_

---

### Test 3.3: Direct URL Entry

**Steps**:
1. Sign in at `http://localhost:5173/`
2. Manually enter `http://localhost:5173/monitor` in address bar
3. Press Enter
4. Verify you're on monitoring page
5. Verify "Sign out" button is visible
6. Manually enter `http://localhost:5173/settings` in address bar
7. Press Enter
8. Verify you're on settings page
9. Verify "Sign out" button is still visible

**Expected Result**: ✅ Auth state loads correctly with direct URL entry

**Actual Result**: _[To be filled during testing]_

---

### Test 3.4: Page Refresh

**Steps**:
1. Sign in at `http://localhost:5173/`
2. Navigate to `/monitor`
3. Press F5 or Cmd+R to refresh page
4. Verify you're still on `/monitor`
5. Verify "Sign out" button is visible (auth state restored from session)
6. Navigate to `/settings`
7. Refresh page
8. Verify you're still on `/settings`
9. Verify "Sign out" button is visible

**Expected Result**: ✅ Auth state persists through page refresh

**Actual Result**: _[To be filled during testing]_

---

## Test Suite 4: No Re-Authentication Required

### Test 4.1: Multiple Navigation Cycles

**Steps**:
1. Sign in at `http://localhost:5173/`
2. Navigate: Home → Monitor → Settings → Home → Monitor → Settings → Home
3. Count how many times sign-in form appears: _[Should be 0]_
4. Verify "Sign out" button remains visible throughout
5. Verify welcome message appears when returning to home

**Expected Result**: ✅ No re-authentication prompts during navigation

**Actual Result**: _[To be filled during testing]_

---

### Test 4.2: Rapid Navigation

**Steps**:
1. Sign in at `http://localhost:5173/`
2. Rapidly click: Monitor → Home → Settings → Monitor → Home
3. Verify no loading states or auth checks delay navigation
4. Verify "Sign out" button remains visible
5. Verify no sign-in prompts appear

**Expected Result**: ✅ Auth state is instant, no delays

**Actual Result**: _[To be filled during testing]_

---

## Test Suite 5: Edge Cases

### Test 5.1: Anonymous Sign-In

**Steps**:
1. Open application at `http://localhost:5173/`
2. Click "Continue anonymously" button
3. Verify welcome message appears: "Welcome back." (no email)
4. Navigate to `/monitor`
5. Verify "Sign out" button is visible
6. Navigate to `/settings`
7. Verify "Sign out" button is still visible
8. Navigate back to `/`
9. Verify welcome message still shows

**Expected Result**: ✅ Anonymous auth state persists like regular auth

**Actual Result**: _[To be filled during testing]_

---

### Test 5.2: Session Expiration (if applicable)

**Steps**:
1. Sign in at `http://localhost:5173/`
2. Wait for session to expire (or manually clear Convex session in dev tools)
3. Navigate to a different page
4. Verify sign-in form appears
5. Verify "Sign out" button disappears

**Expected Result**: ✅ Expired session updates state across all pages

**Actual Result**: _[To be filled during testing]_

---

## Test Suite 6: Developer Tools Verification

### Test 6.1: React DevTools Component Tree

**Steps**:
1. Open React DevTools
2. Sign in and navigate to any page
3. Inspect component tree
4. Verify `ConvexAuthProvider` is at the root
5. Verify `RouterProvider` is nested inside
6. Verify current page component is nested inside `RootLayout`
7. Verify `SignOutButton` is rendered in `RootLayout`

**Expected Result**: ✅ Provider hierarchy is correct

**Actual Result**: _[To be filled during testing]_

---

### Test 6.2: Console Errors

**Steps**:
1. Open browser console
2. Sign in
3. Navigate between all pages
4. Sign out
5. Navigate between pages again
6. Check console for errors

**Expected Result**: ✅ No errors related to auth or routing

**Actual Result**: _[To be filled during testing]_

---

## Test Results Summary

| Test ID | Test Name | Status | Notes |
|---------|-----------|--------|-------|
| 1.1 | Navigate While Authenticated | ⬜ | |
| 1.2 | Navigate While Unauthenticated | ⬜ | |
| 2.1 | Sign Out from Landing Page | ⬜ | |
| 2.2 | Sign Out from Monitoring Page | ⬜ | |
| 2.3 | Sign Out from Settings Page | ⬜ | |
| 3.1 | Browser Back Button | ⬜ | |
| 3.2 | Browser Forward Button | ⬜ | |
| 3.3 | Direct URL Entry | ⬜ | |
| 3.4 | Page Refresh | ⬜ | |
| 4.1 | Multiple Navigation Cycles | ⬜ | |
| 4.2 | Rapid Navigation | ⬜ | |
| 5.1 | Anonymous Sign-In | ⬜ | |
| 5.2 | Session Expiration | ⬜ | |
| 6.1 | React DevTools Component Tree | ⬜ | |
| 6.2 | Console Errors | ⬜ | |

**Legend**: ⬜ Not Tested | ✅ Passed | ❌ Failed

---

## Notes

- These tests should be run after any changes to routing or authentication logic
- Tests can be automated with E2E testing tools like Playwright or Cypress
- Document any failures with screenshots and browser console logs
- Retest after fixes are applied

---

## Conclusion

This manual test suite verifies all requirements for Task 7.2:
- **Requirement 8.1**: Auth state persists when navigating between pages
- **Requirement 8.2**: Authenticated users maintain authentication across all pages
- **Requirement 8.3**: Sign-out updates auth state across all pages
- **Requirement 8.4**: No re-authentication required when navigating between pages

All tests should pass to confirm the implementation is correct.
