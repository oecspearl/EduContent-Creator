# Fix: Missing Google Refresh Token

## The Problem

You found it! The console shows:
```
🔑 Has Access Token: true
🔑 Has Refresh Token: false  ← Missing!
```

The server requires **BOTH** tokens but Google didn't provide a refresh token during OAuth.

---

## Why This Happened

Google **only provides a refresh token**:
1. On the **first authorization** for an app
2. OR when you use `accessType: 'offline'` and `prompt: 'consent'`

Since you already authorized the app once (without these settings), Google didn't give you a refresh token on subsequent logins.

---

## The Fix

### ✅ I Just Added the Required Settings

I updated `server/passport-config.ts` to include:
```typescript
accessType: 'offline',  // Request offline access
prompt: 'consent',      // Force consent screen
```

### ✅ Now You Need to Revoke and Re-Authorize

**Step 1: Revoke App Access in Google**

Go to: https://myaccount.google.com/permissions

1. Find "OECS Content Maker" or your app name
2. Click **"Remove Access"**
3. Confirm removal

**Step 2: Restart the Server**

The server needs to reload the passport config:
```bash
# If using npm run dev, press Ctrl+C and restart
npm run dev
```

Or just refresh the deployment if you're on Heroku/production.

**Step 3: Re-Authorize in the App**

1. **Go to Presentation Creator**
2. **Click "Connect Google Account"**
3. **You'll see the consent screen again** (Google will ask for permissions)
4. **Click "Allow"**
5. **Redirect back to app**

**Step 4: Verify Refresh Token**

Open console and check:
```javascript
fetch('/api/user', { credentials: 'include' })
  .then(r => r.json())
  .then(user => {
    console.log("Access Token:", !!user.googleAccessToken);
    console.log("Refresh Token:", !!user.googleRefreshToken);
  });
```

You should see:
```
Access Token: true
Refresh Token: true  ← This should now be true!
```

**Step 5: Test Presentation Creation**

1. **Generate slides**
2. **Click "Create in Google Slides"**
3. **Should work!** ✅

---

## Alternative: Force Re-Auth Without Revoking

If you don't want to go to Google's website, you can force re-auth with the consent prompt:

```
https://your-app.com/api/auth/google?prompt=consent&returnTo=/presentation-creator
```

This will show the consent screen again and provide a refresh token.

---

## Why Server Requires Refresh Token

The server needs **both** tokens because:

1. **Access Token**: Used to make API calls
   - Expires in 1 hour
   - Can't be refreshed without refresh token

2. **Refresh Token**: Used to get new access tokens
   - Doesn't expire (until revoked)
   - Allows long-term access without re-authentication

Without the refresh token, after 1 hour your presentations would stop working!

---

## Updated Server Code

The passport config now includes:

```typescript
{
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/api/auth/google/callback',
  scope: [
    'profile',
    'email',
    'https://www.googleapis.com/auth/presentations',
    'https://www.googleapis.com/auth/classroom.courses.readonly',
    'https://www.googleapis.com/auth/classroom.coursework.students',
    'https://www.googleapis.com/auth/classroom.announcements',
  ],
  accessType: 'offline',    // ← NEW: Request offline access
  prompt: 'consent',        // ← NEW: Force consent screen
}
```

---

## Testing After Fix

**After you revoke and re-authorize:**

1. **Check tokens in console:**
   ```
   🔑 Has Access Token: true
   🔑 Has Refresh Token: true  ← Should be true now!
   ```

2. **Create presentation:**
   - Should succeed without 403 error
   - Should create in Google Slides
   - Should return presentation URL

3. **Future logins:**
   - Once you have a refresh token, it persists
   - You won't need to re-authorize
   - Token will auto-refresh when access token expires

---

## Common Questions

**Q: Why didn't the first OAuth give me a refresh token?**
A: The app wasn't requesting `accessType: 'offline'`, so Google assumed you only needed temporary access.

**Q: Do I need to do this every time?**
A: No! Once you get the refresh token, it's saved to the database and persists across sessions.

**Q: What if I forget to revoke access?**
A: The `prompt: 'consent'` parameter will force the consent screen anyway, which should provide a refresh token.

**Q: Will this affect existing users?**
A: Only users who connected before this fix. They'll need to disconnect and reconnect Google to get a refresh token.

---

## Quick Checklist

- [ ] Server updated with `accessType: 'offline'` and `prompt: 'consent'`
- [ ] Server restarted
- [ ] Revoked app access at https://myaccount.google.com/permissions
- [ ] Re-connected Google in app
- [ ] Verified refresh token exists in console
- [ ] Tested creating presentation
- [ ] Success! ✅

---

**Status:** Server code fixed, now you need to revoke and re-authorize to get refresh token!
