# OAuth User Data Refresh Fix

## Issue Fixed

**Problem:** After connecting Google account via OAuth, the "Create in Google Slides" button still showed a 403 error saying "Your current account doesn't have Google Slides access."

**Root Cause:** The frontend user object wasn't being refreshed after OAuth authentication, so it still had the old data without Google tokens.

---

## The Problem in Detail

### What Was Happening

1. User clicks "Connect Google Account"
2. OAuth flow completes successfully ✅
3. Server stores `googleAccessToken` and `googleRefreshToken` ✅
4. User redirected back to presentation page ✅
5. Frontend shows success toast ✅
6. **BUT** the `user` object in frontend still has old data (no tokens) ❌
7. User clicks "Create in Google Slides"
8. Frontend sends request without checking if user data is stale
9. Server sees no tokens → Returns 403 error ❌

### Why It Happened

The `useAuth` hook was caching the user data and not invalidating it after OAuth:

```typescript
// Old code
useEffect(() => {
  if (urlParams.get('googleAuthSuccess') === 'true' && user?.googleAccessToken) {
    // This check ALWAYS failed because user?.googleAccessToken was still undefined!
    toast({ title: "Google Account Connected!" });
  }
}, [user, toast]);
```

The condition `user?.googleAccessToken` was checking the **stale cached user**, which didn't have the tokens yet.

---

## The Solution

### 1. Invalidate User Query After OAuth

Force the frontend to refetch user data when returning from OAuth:

```typescript
// New code
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('googleAuthSuccess') === 'true') {
    // Force refetch user data to get updated Google tokens
    queryClient.invalidateQueries({ queryKey: ["/api/user"] });

    // Show success message (wait for query to refresh)
    setTimeout(() => {
      toast({
        title: "Google Account Connected!",
        description: "You can now create presentations.",
      });
    }, 500);

    // Clean up URL
    urlParams.delete('googleAuthSuccess');
    const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
    window.history.replaceState({}, '', newUrl);
  }
}, [toast]);
```

**Key Changes:**
- ✅ Removed dependency on `user` (prevents stale checks)
- ✅ Added `queryClient.invalidateQueries({ queryKey: ["/api/user"] })` to force refetch
- ✅ Added 500ms delay for toast to allow query to complete

### 2. Improved Error Handling

Updated the error handler to include query parameters in return URL:

```typescript
// Build return URL with current location (including query params)
const returnUrl = window.location.pathname + window.location.search;

// Redirect to Google OAuth with return URL
setTimeout(() => {
  window.location.href = `/api/auth/google?returnTo=${encodeURIComponent(returnUrl)}`;
}, 1500);
```

---

## How It Works Now

### Step-by-Step Flow

**1. User Clicks "Connect Google Account"**
```
URL: /api/auth/google?returnTo=%2Fpresentation-creator%2Fabc123
```

**2. OAuth Flow Completes**
```
Server saves:
- googleAccessToken: "ya29.a0..."
- googleRefreshToken: "1//..."
- googleTokenExpiry: Date
```

**3. Redirect Back to App**
```
URL: /presentation-creator/abc123?googleAuthSuccess=true
```

**4. Frontend Detects OAuth Success**
```typescript
if (urlParams.get('googleAuthSuccess') === 'true') {
  // Invalidate cached user data
  queryClient.invalidateQueries({ queryKey: ["/api/user"] });
}
```

**5. React Query Refetches User**
```
GET /api/user
Response: {
  id: "123",
  email: "user@example.com",
  googleAccessToken: "ya29.a0...",  // ✅ NOW PRESENT!
  googleRefreshToken: "1//...",     // ✅ NOW PRESENT!
  googleTokenExpiry: "2025-12-30T..."
}
```

**6. User Object Updates**
```typescript
const { user } = useAuth();
// user.googleAccessToken is now defined! ✅
```

**7. "Create in Google Slides" Button Works**
```typescript
if (user?.googleAccessToken) {
  // ✅ Condition now true!
  return <Button>Create in Google Slides</Button>;
}
```

---

## Testing

### Test Case 1: Fresh OAuth Connection
1. **Initial state**: User not connected to Google
2. **Click**: "Connect Google Account"
3. **Authenticate**: With Google
4. **Return**: To presentation page with `?googleAuthSuccess=true`
5. **Wait**: 500ms for user data to refresh
6. **Verify**:
   - ✅ Success toast appears
   - ✅ "Create in Google Slides" button is enabled
   - ✅ Clicking button works (no 403 error)

### Test Case 2: Token Already Exists
1. **Initial state**: User already connected
2. **Action**: Click "Create in Google Slides"
3. **Verify**:
   - ✅ Works immediately (no OAuth redirect)
   - ✅ Presentation created successfully

### Test Case 3: Token Expired
1. **Initial state**: User connected but token expired
2. **Action**: Click "Create in Google Slides"
3. **Verify**:
   - ✅ Server attempts token refresh
   - ✅ If refresh works: Presentation created
   - ✅ If refresh fails: Redirected to OAuth
   - ✅ After OAuth: Returns to same page
   - ✅ User data refreshed automatically

### Test Case 4: Error Auto-Redirect
1. **Initial state**: User not connected (simulated)
2. **Action**: Click "Create in Google Slides"
3. **Verify**:
   - ✅ Toast: "Google Authentication Required"
   - ✅ Auto-redirect after 1.5 seconds
   - ✅ OAuth flow starts with correct returnTo
   - ✅ After OAuth: Back to presentation page
   - ✅ User data refreshed

---

## Related Fixes

### Also Fixed: Connect Button Return URL

The "Connect Google Account" button also needed the same fix:

```typescript
// Before
<a href="/api/auth/google">Connect Google Account</a>

// After
<a href={`/api/auth/google?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`}>
  Connect Google Account
</a>
```

This ensures you return to the exact page (including any query parameters).

---

## Why `queryClient.invalidateQueries`?

### What It Does

```typescript
queryClient.invalidateQueries({ queryKey: ["/api/user"] });
```

**Effect:**
1. Marks the `/api/user` query as "stale"
2. Triggers an immediate refetch (if component is mounted)
3. Updates all components using `useAuth()` hook
4. New user data propagates throughout app

### Alternative (Worse) Solutions

❌ **Manual Fetch:**
```typescript
const newUser = await fetch('/api/user');
// Now what? How do you update all components?
```

❌ **Page Reload:**
```typescript
window.location.reload();
// Works but loses all state, form data, etc.
```

❌ **Wait for Next Mount:**
```typescript
// Just hope the user data refreshes eventually
// Unreliable and confusing UX
```

✅ **Query Invalidation (Best):**
```typescript
queryClient.invalidateQueries({ queryKey: ["/api/user"] });
// Automatic, instant, preserves state, updates all components
```

---

## Files Modified

1. **[client/src/pages/PresentationCreator.tsx](client/src/pages/PresentationCreator.tsx)**
   - OAuth success handler: Invalidate user query
   - Error handler: Include search params in return URL
   - Connect button: Include search params in OAuth link

---

## Impact

### Before
- ❌ OAuth completed but user data not refreshed
- ❌ 403 error when trying to create presentation
- ❌ User had to refresh page manually
- ❌ Confusing UX (success toast but feature doesn't work)

### After
- ✅ OAuth completion triggers automatic user data refresh
- ✅ Presentation creation works immediately
- ✅ No manual page refresh needed
- ✅ Clear UX (success toast = feature ready)

---

## Debug Tips

If you still see 403 errors after OAuth:

**1. Check Network Tab**
```
Request: POST /api/presentation/create-presentation
Headers: Check if Cookie is sent
Response: 403 Forbidden
```

**2. Check User Object**
```javascript
// In browser console
console.log(user);
// Should show:
{
  googleAccessToken: "ya29.a0...",
  googleRefreshToken: "1//...",
  googleTokenExpiry: "2025-12-30T..."
}
```

**3. Check Query Cache**
```javascript
// In browser console
queryClient.getQueryData(["/api/user"]);
// Should show updated user with tokens
```

**4. Check Server Logs**
```
User not found                    → Session issue
No Google access token available  → Token not saved
Token refresh failed              → Refresh token invalid
```

---

**Last Updated:** 2025-12-30
**Status:** ✅ Fixed - User data now refreshes after OAuth
