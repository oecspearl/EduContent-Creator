# OAuth Redirect Fix

## Issue Fixed

**Problem:** When clicking "Connect Google Account" in the Presentation Creator, users were redirected to the dashboard after OAuth authentication instead of returning to the presentation they were working on.

**Root Cause:** The OAuth link wasn't passing the `returnTo` parameter, so the server didn't know where to send users back to after authentication.

---

## Solution

### Before
```tsx
<a href="/api/auth/google">
  Connect Google Account
</a>
```

### After
```tsx
<a href={`/api/auth/google?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`}>
  Connect Google Account
</a>
```

---

## How It Works

### 1. **User Clicks "Connect Google Account"**
```
Current URL: /presentation-creator/abc123
Link: /api/auth/google?returnTo=%2Fpresentation-creator%2Fabc123
```

### 2. **Server Stores Return URL**
```typescript
// server/routes.ts
app.get("/api/auth/google", (req, res, next) => {
  const returnTo = req.query.returnTo as string;
  if (returnTo && returnTo.startsWith('/')) {
    req.session.oauthReturnTo = returnTo; // Store in session
  }
  // ... redirect to Google OAuth
});
```

### 3. **Google Redirects Back**
```
User authenticates with Google
Google redirects to: /api/auth/google/callback
```

### 4. **Server Retrieves Return URL and Redirects**
```typescript
app.get("/api/auth/google/callback", (req, res) => {
  // ... authenticate user ...

  const returnTo = req.session.oauthReturnTo;
  delete req.session.oauthReturnTo;

  if (returnTo && returnTo.startsWith('/') && !returnTo.includes('//')) {
    res.redirect(returnTo + '?googleAuthSuccess=true');
  } else {
    res.redirect("/dashboard?googleAuthSuccess=true");
  }
});
```

### 5. **User Returns to Original Page**
```
Final URL: /presentation-creator/abc123?googleAuthSuccess=true
Toast: "Google Account Connected! You can now create presentations."
```

---

## Testing

### Test Case 1: New Presentation
1. Go to `/presentation-creator`
2. Fill in form details
3. Click "Connect Google Account"
4. Authenticate with Google
5. ✅ Should return to `/presentation-creator?googleAuthSuccess=true`
6. ✅ Form data should still be there
7. ✅ Success toast should appear

### Test Case 2: Editing Existing Presentation
1. Go to `/presentation-creator/abc123` (editing existing)
2. Click "Connect Google Account"
3. Authenticate with Google
4. ✅ Should return to `/presentation-creator/abc123?googleAuthSuccess=true`
5. ✅ Presentation data should still be loaded
6. ✅ Success toast should appear

### Test Case 3: Dashboard Default
1. Manually go to `/api/auth/google` (no returnTo)
2. Authenticate with Google
3. ✅ Should redirect to `/dashboard?googleAuthSuccess=true`
4. ✅ Success toast should appear

---

## Security Considerations

### URL Validation
The server validates the `returnTo` parameter:

```typescript
if (returnTo && returnTo.startsWith('/') && !returnTo.includes('//')) {
  res.redirect(returnTo + '?googleAuthSuccess=true');
}
```

**Checks:**
1. ✅ Must start with `/` (relative path)
2. ✅ Cannot contain `//` (prevents open redirect)
3. ✅ If invalid, defaults to `/dashboard`

**Example Attack Prevention:**
```
❌ /api/auth/google?returnTo=http://evil.com
   → Blocked: doesn't start with '/'

❌ /api/auth/google?returnTo=//evil.com
   → Blocked: contains '//'

✅ /api/auth/google?returnTo=/presentation-creator
   → Allowed: safe relative path
```

---

## Benefits

1. **Better UX**: Users stay on the page they were working on
2. **No Data Loss**: Form data preserved (due to browser history)
3. **Clear Feedback**: Success toast confirms connection
4. **Secure**: Validates redirect URLs to prevent attacks
5. **Flexible**: Works for any page in the app

---

## Other OAuth Flows

The same pattern is used for Microsoft OAuth:

```typescript
// Microsoft auth also supports returnTo
app.get("/api/auth/microsoft", async (req, res) => {
  const returnTo = req.query.returnTo as string;
  if (returnTo && returnTo.startsWith('/')) {
    req.session.oauthReturnTo = returnTo;
  }
  // ... redirect to Microsoft OAuth
});
```

If you need to add "Connect with Microsoft" buttons elsewhere, use the same pattern:

```tsx
<a href={`/api/auth/microsoft?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`}>
  Connect Microsoft Account
</a>
```

---

## URL Encoding

### Why `encodeURIComponent()`?

```typescript
// Without encoding
returnTo = /presentation-creator/abc123?tab=settings
URL: /api/auth/google?returnTo=/presentation-creator/abc123?tab=settings
      ^                           ^
      Query string starts here    | Ambiguous: is this part of returnTo or a separate parameter?

// With encoding
returnTo = /presentation-creator/abc123?tab=settings
URL: /api/auth/google?returnTo=%2Fpresentation-creator%2Fabc123%3Ftab%3Dsettings
                                ^
                                Clear: this is all the returnTo value
```

**Encoded characters:**
- `/` → `%2F`
- `?` → `%3F`
- `=` → `%3D`
- `&` → `%26`

---

## Related Files

- **[client/src/pages/PresentationCreator.tsx](client/src/pages/PresentationCreator.tsx)** - OAuth link with returnTo
- **[server/routes.ts](server/routes.ts)** - OAuth callback handling
- **[server/passport-config.ts](server/passport-config.ts)** - Google OAuth strategy

---

**Last Updated:** 2025-12-30
**Status:** ✅ Fixed - Users now return to original page after OAuth
