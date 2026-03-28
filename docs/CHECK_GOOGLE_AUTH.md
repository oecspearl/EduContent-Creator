# Debugging Google OAuth Connection

## Quick Checks to Run

### 1. Check User Object in Browser Console

Open browser console (F12) and paste this:

```javascript
// Get current user data
fetch('/api/user', { credentials: 'include' })
  .then(r => r.json())
  .then(user => {
    console.log("=== USER DATA ===");
    console.log("User ID:", user.id);
    console.log("Email:", user.email);
    console.log("Auth Provider:", user.authProvider);
    console.log("Google ID:", user.googleId);
    console.log("Has Access Token:", !!user.googleAccessToken);
    console.log("Has Refresh Token:", !!user.googleRefreshToken);
    console.log("Token Expiry:", user.googleTokenExpiry);

    if (user.googleAccessToken) {
      console.log("✅ Google OAuth is connected!");
      console.log("Access Token (first 20 chars):", user.googleAccessToken.substring(0, 20) + "...");
    } else {
      console.log("❌ Google OAuth NOT connected");
      console.log("Full user object:", user);
    }
  })
  .catch(err => {
    console.error("Error fetching user:", err);
  });
```

### Expected Results

**If Connected:**
```
=== USER DATA ===
User ID: abc123
Email: you@example.com
Auth Provider: google
Google ID: 123456789
Has Access Token: true
Has Refresh Token: true
Token Expiry: 2025-12-30T12:00:00.000Z
✅ Google OAuth is connected!
Access Token (first 20 chars): ya29.a0AfB_byC8gH3...
```

**If NOT Connected:**
```
=== USER DATA ===
User ID: abc123
Email: you@example.com
Auth Provider: email
Google ID: null
Has Access Token: false
Has Refresh Token: false
Token Expiry: null
❌ Google OAuth NOT connected
```

---

## 2. Check Session in Server

If the browser check shows tokens, but server says you're not connected, there's a session mismatch.

### Check Server Logs

Look for these messages when you try to create a presentation:

```bash
# Good - User found with tokens
User found: { id: 'abc123', googleAccessToken: 'ya29...', ... }

# Bad - User found without tokens
User found: { id: 'abc123', googleAccessToken: null, ... }

# Bad - Session issue
User not found
Session userId: undefined
```

---

## 3. Force Re-Authentication

If you see tokens in database but not in session:

### Steps:
1. **Log out completely**
   ```javascript
   // In browser console
   fetch('/api/logout', { method: 'POST', credentials: 'include' })
     .then(() => window.location.href = '/login');
   ```

2. **Clear browser cookies**
   - Press F12
   - Go to Application tab
   - Cookies → Select your domain
   - Delete all cookies

3. **Log back in**
   - Use your regular email/password
   - Then connect Google

---

## 4. Check If It's a Different Account

You might be logged in with a different account than you think.

### Check Current Session:
```javascript
// In browser console
fetch('/api/user', { credentials: 'include' })
  .then(r => r.json())
  .then(user => {
    console.log("Logged in as:", user.email);
    console.log("Auth provider:", user.authProvider);
  });
```

### Check If Multiple Accounts:
- Do you have multiple accounts on this app?
- Did you connect Google to a different account?
- Are you using incognito/private mode?

---

## 5. Database Check (If You Have Access)

If you have database access, run this SQL:

```sql
SELECT
  id,
  email,
  "authProvider",
  "googleId",
  CASE
    WHEN "googleAccessToken" IS NOT NULL THEN 'YES'
    ELSE 'NO'
  END as has_access_token,
  CASE
    WHEN "googleRefreshToken" IS NOT NULL THEN 'YES'
    ELSE 'NO'
  END as has_refresh_token,
  "googleTokenExpiry"
FROM profiles
WHERE email = 'your-email@example.com';
```

---

## 6. OAuth Flow Test

Try the OAuth flow from scratch:

### Steps:
1. Open **new incognito window**
2. Go to your app
3. Log in with email/password
4. Go to Presentation Creator
5. Click "Connect Google Account"
6. **Watch the URL carefully:**
   ```
   Step 1: /api/auth/google?returnTo=/presentation-creator
   Step 2: (Google OAuth screen)
   Step 3: /api/auth/google/callback?code=...
   Step 4: /presentation-creator?googleAuthSuccess=true
   ```
7. **Check console logs:**
   - Should see: "Google Account Connected!" toast
   - Wait 1 second
   - Run user check from #1 above

---

## 7. Common Issues & Fixes

### Issue: Tokens Not Saving

**Symptoms:**
- OAuth completes successfully
- Redirected back to app
- But user check shows no tokens

**Possible Causes:**
1. Database write failed (check server logs)
2. Session expired during OAuth
3. User object not refetched after save

**Fix:**
```javascript
// Force clear all auth state and retry
localStorage.clear();
sessionStorage.clear();
// Then logout and login again
```

### Issue: Session Mismatch

**Symptoms:**
- Browser shows tokens in user object
- Server says no tokens
- Different user IDs in browser vs server

**Possible Causes:**
1. Multiple tabs with different sessions
2. Cookie not being sent with requests
3. Session expired but browser cached old data

**Fix:**
```javascript
// Check if cookies are being sent
fetch('/api/user', { credentials: 'include' })
  .then(r => {
    console.log("Request headers:", r.headers);
    return r.json();
  });
```

### Issue: Token Expired

**Symptoms:**
- Tokens exist but expired
- Server tries to refresh but fails

**Possible Causes:**
1. Refresh token invalid or revoked
2. Google account disconnected

**Fix:**
- Re-authenticate with Google (disconnect and reconnect)

---

## 8. Nuclear Option: Complete Reset

If nothing works, try this complete reset:

```javascript
// 1. Logout
fetch('/api/logout', { method: 'POST', credentials: 'include' });

// 2. Clear everything
localStorage.clear();
sessionStorage.clear();
document.cookie.split(";").forEach(c => {
  document.cookie = c.trim().split("=")[0] + "=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/";
});

// 3. Close all tabs of this app

// 4. Open new tab and login fresh

// 5. Connect Google OAuth

// 6. Test presentation creation
```

---

## Expected Working Flow

### What Should Happen:

1. **Click "Connect Google Account"**
   - URL: `/api/auth/google?returnTo=/presentation-creator/abc123`
   - Toast: None yet

2. **Google OAuth Screen**
   - Login with Google
   - Grant permissions

3. **Redirect Back**
   - URL: `/presentation-creator/abc123?googleAuthSuccess=true`
   - Server saves: `googleAccessToken`, `googleRefreshToken`
   - Session updated

4. **Frontend Detects Success**
   - `queryClient.invalidateQueries({ queryKey: ["/api/user"] })`
   - Refetch user from `/api/user`
   - Toast: "Google Account Connected!"

5. **User Object Updated**
   - `user.googleAccessToken` now exists
   - "Create in Google Slides" button enabled

6. **Click "Create in Google Slides"**
   - POST to `/api/presentation/create-presentation`
   - Server checks: `user.googleAccessToken` ✅ Exists
   - Creates presentation successfully

### What's Happening If It Fails:

**If redirects to dashboard:**
- `returnTo` parameter not preserved
- Check: `/api/auth/google?returnTo=...` has correct value

**If shows 403 error:**
- Tokens not in database OR
- Tokens in database but not in session OR
- User object in frontend not refreshed

**If auto-redirects back to OAuth:**
- Frontend thinks tokens don't exist
- Triggers error handler
- Redirects to OAuth again (loop)

---

## Debug Output Template

Please run the check from #1 and share this output:

```
Browser Check:
- Has Access Token: [YES/NO]
- Has Refresh Token: [YES/NO]
- Auth Provider: [google/email]
- Google ID: [number or null]

Network Tab:
- POST /api/presentation/create-presentation
- Status: [200/403/500]
- Error Message: [paste error]

Console Errors:
[paste any errors from console]
```

This will help identify exactly where the issue is!
