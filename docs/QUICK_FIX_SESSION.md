# Quick Session Fix

## The Error You're Seeing

```
Uncaught (in promise) SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

**What This Means:**
- The `/api/user` endpoint returned HTML (a login page) instead of JSON
- This means **you're not logged in** or your **session expired**

---

## Quick Fix

### Step 1: Check If You're Logged In

Look at the top right of your app. Do you see:
- ✅ Your name/email and a profile menu? → You're logged in
- ❌ "Login" or "Sign Up" buttons? → You're NOT logged in

### Step 2: If NOT Logged In

1. **Click "Login"**
2. **Enter your credentials**
3. **Go back to Presentation Creator**
4. **Try again**

### Step 3: If You ARE Logged In (But Session Expired)

The session might have expired. Try this:

```javascript
// In browser console (F12)
// Logout and refresh
fetch('/api/logout', {
  method: 'POST',
  credentials: 'include'
}).then(() => {
  window.location.href = '/login';
});
```

Then:
1. **Log back in**
2. **Go to Presentation Creator**
3. **Click "Connect Google Account"**
4. **Try creating presentation**

---

## Why This Happens

### Scenario 1: Session Cookie Expired
- Sessions expire after inactivity
- Default: 24 hours or less
- Solution: Log in again

### Scenario 2: Cookie Not Being Sent
- Browser security settings blocking cookies
- Third-party cookie restrictions
- Solution: Check browser settings

### Scenario 3: Server Restart
- Session store cleared on restart (if using memory)
- Solution: Log in again

---

## Better Test (When Logged In)

Once you're logged in, use this safer test:

```javascript
// Check authentication status
fetch('/api/user', { credentials: 'include' })
  .then(r => {
    console.log("Response status:", r.status);
    console.log("Response content-type:", r.headers.get('content-type'));

    if (r.status === 401) {
      console.log("❌ Not authenticated - session expired");
      return null;
    }

    if (r.headers.get('content-type')?.includes('application/json')) {
      return r.json();
    } else {
      console.log("❌ Got HTML instead of JSON - likely redirected to login");
      return null;
    }
  })
  .then(user => {
    if (user) {
      console.log("✅ Logged in as:", user.email);
      console.log("Google connected:", !!user.googleAccessToken);
    }
  })
  .catch(err => {
    console.error("Error:", err);
  });
```

---

## Complete Reset Procedure

If you keep having session issues:

### 1. Clear Everything
```javascript
// In console
localStorage.clear();
sessionStorage.clear();
```

### 2. Clear Cookies
- F12 → Application tab
- Storage → Cookies
- Right-click your domain → Clear

### 3. Close ALL Tabs
- Close every tab with your app open

### 4. Open Fresh Tab
- Navigate to app URL
- Should see login page

### 5. Login Fresh
- Use email/password
- Should redirect to dashboard

### 6. Connect Google
- Go to Presentation Creator
- Click "Connect Google Account"
- Authenticate with Google
- Should redirect back with success toast

### 7. Test Immediately
- Wait 1-2 seconds for user data to refresh
- Click "Create in Google Slides"
- Should work!

---

## Check Session Cookie

To verify your session cookie is set:

```javascript
// In console
console.log("Cookies:", document.cookie);
```

You should see something like:
```
connect.sid=s%3A...; Path=/; HttpOnly
```

If you don't see `connect.sid`, your session isn't persisted.

---

## Most Likely Issue

Based on the error, I think what's happening is:

1. ✅ You were logged in
2. ✅ You connected Google OAuth
3. ✅ OAuth completed successfully
4. ❌ **Session expired during OAuth flow**
5. ❌ You got redirected back without valid session
6. ❌ `/api/user` returns login page (HTML)
7. ❌ JavaScript tries to parse HTML as JSON → Error!

**Solution:** Log in again, then immediately connect Google and test.

---

## Quick Start Guide

**Right now, do this:**

1. **Refresh the page** (F5)
2. **Are you logged in?**
   - Yes → Go to step 3
   - No → Log in, then go to step 3
3. **Go to Presentation Creator**
4. **Generate some slides** (test this works)
5. **Click "Connect Google Account"**
6. **Complete Google OAuth**
7. **Wait 2 seconds** after redirect
8. **Click "Create in Google Slides"**

If it still shows "Redirecting to Google sign-in", that means the Google tokens weren't saved during OAuth.

If it works, great! 🎉

---

## Debug Mode

To see exactly what's happening, add this to your console:

```javascript
// Monitor all fetch requests
const originalFetch = window.fetch;
window.fetch = function(...args) {
  console.log('FETCH:', args[0]);
  return originalFetch.apply(this, args).then(response => {
    console.log('RESPONSE:', args[0], response.status);
    return response;
  });
};
```

Then try the flow again and watch the console.
