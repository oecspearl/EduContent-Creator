# OAuth Authentication Setup Guide

This guide explains how to configure Google and Microsoft authentication for your OECS Content Creator application.

## How Redirect URIs Are Determined

The application automatically determines the correct redirect URI based on the environment:

**Domain Precedence Order:**
1. **Custom Domain** (if `REPLIT_DOMAINS` is set): `https://h5pcreator.org`
2. **Workspace URL** (if deployed on Replit): `https://workspace.username.repl.co`
3. **Production Fallback**: `https://h5pcreator.org`
4. **Development**: `http://localhost:5000`

This means you may need to register multiple redirect URIs in Google/Azure depending on your deployment setup.

## Required Secrets

Add these secrets to your Replit project (Tools → Secrets):

### For Google OAuth:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

### For Microsoft OAuth:
- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`
- `MICROSOFT_TENANT_ID` (use "common" to allow any Microsoft account)

## Setting Up Google OAuth

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API

### 2. Configure OAuth Consent Screen

1. Navigate to **APIs & Services** → **OAuth consent screen**
2. Choose **External** user type
3. Fill in required fields:
   - App name: `OECS Content Creator`
   - User support email: Your email
   - Developer contact: Your email
4. Add scopes: `email`, `profile`
5. Save and continue

### 3. Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Application type: **Web application**
4. Name: `OECS Content Creator`
5. **Authorized JavaScript origins**:
   - Development: `http://localhost:5000`
   - Production: `https://h5pcreator.org`
   - Workspace (if testing): `https://workspace.yourusername.repl.co`
6. **Authorized redirect URIs** (add all that apply):
   - Development: `http://localhost:5000/api/auth/google/callback`
   - Custom domain: `https://h5pcreator.org/api/auth/google/callback`
   - Workspace (optional): `https://workspace.yourusername.repl.co/api/auth/google/callback`
7. Click **Create**
8. Copy the **Client ID** and **Client Secret**

**Note**: Google OAuth automatically uses the request host, so all configured redirect URIs will work. The app will redirect to whichever domain you're currently accessing.

### 4. Add Secrets to Replit

1. Open your Replit project
2. Click **Tools** → **Secrets** (lock icon 🔒)
3. Add:
   - Key: `GOOGLE_CLIENT_ID`, Value: [paste your client ID]
   - Key: `GOOGLE_CLIENT_SECRET`, Value: [paste your client secret]

---

## Setting Up Microsoft OAuth

### 1. Register Application in Azure

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Click **New registration**
4. Fill in details:
   - Name: `OECS Content Creator`
   - Supported account types: **Accounts in any organizational directory and personal Microsoft accounts**
   - Redirect URI: 
     - Platform: **Web**
     - URI: `https://h5pcreator.org/api/auth/microsoft/callback`
5. Click **Register**

### 2. Get Application IDs

1. After registration, you'll see the **Overview** page
2. Copy:
   - **Application (client) ID**
   - **Directory (tenant) ID**

### 3. Create Client Secret

1. Go to **Certificates & secrets**
2. Click **New client secret**
3. Description: `OECS Production`
4. Expires: Choose appropriate duration (e.g., 24 months)
5. Click **Add**
6. **Important**: Copy the secret **Value** immediately (you won't see it again!)

### 4. Configure Platform Settings

1. Go to **Authentication**
2. Under **Platform configurations** → **Web**, add all relevant redirect URIs:
   - Development: `http://localhost:5000/api/auth/microsoft/callback`
   - Custom domain: `https://h5pcreator.org/api/auth/microsoft/callback`
   - Workspace (optional): `https://workspace.yourusername.repl.co/api/auth/microsoft/callback`
3. Under **Implicit grant and hybrid flows**, leave all unchecked (we use authorization code flow)
4. Click **Save**

**Note**: The app will automatically use the correct redirect URI based on the domain precedence order (see top of this guide).

### 5. Add API Permissions

1. Go to **API permissions**
2. Default permissions should include `User.Read`
3. If not present, click **Add a permission** → **Microsoft Graph** → **Delegated permissions**
4. Select `User.Read`
5. Click **Add permissions**

### 6. Add Secrets to Replit

1. Open your Replit project
2. Click **Tools** → **Secrets**
3. Add:
   - Key: `MICROSOFT_CLIENT_ID`, Value: [paste Application (client) ID]
   - Key: `MICROSOFT_CLIENT_SECRET`, Value: [paste the secret value]
   - Key: `MICROSOFT_TENANT_ID`, Value: `common` (or your specific tenant ID)

---

## Testing OAuth

### Development Testing

1. Make sure all secrets are added to Replit
2. Restart your application
3. Go to `/login`
4. Click **Continue with Google** or **Continue with Microsoft**
5. Complete the OAuth flow
6. You should be redirected to `/dashboard`

### Production Testing

1. Ensure all secrets are added in production environment
2. Update redirect URIs to use your production domain (`https://h5pcreator.org`)
3. Test the complete OAuth flow on your live site

---

## Troubleshooting

### "redirect_uri_mismatch" Error

- **Problem**: The callback URL doesn't match registered URIs
- **Solution**: Verify redirect URIs in Google Cloud Console / Azure Portal match exactly:
  - `https://h5pcreator.org/api/auth/google/callback`
  - `https://h5pcreator.org/api/auth/microsoft/callback`

### "invalid_client" Error

- **Problem**: Client ID or secret is incorrect
- **Solution**: Double-check your secrets in Replit match Azure/Google Console

### "unauthorized_client" Error (Microsoft)

- **Problem**: App not properly configured for public access
- **Solution**: Ensure "Accounts in any organizational directory and personal Microsoft accounts" is selected

### Session Not Persisting

- **Problem**: User is logged out immediately after OAuth
- **Solution**: Verify `SESSION_SECRET` is set in production

---

## Security Notes

1. **Never commit secrets** to your git repository
2. **Use strong session secrets** - Generate random 32+ character strings
3. **Enable HTTPS** in production (required for secure cookies)
4. **Rotate secrets periodically** - Update client secrets every 12-24 months
5. **Monitor OAuth usage** - Check Azure/Google Console for suspicious activity

---

## Support

If you encounter issues:
1. Check browser console for detailed error messages
2. Check server logs for backend errors
3. Verify all redirect URIs match exactly
4. Ensure all secrets are properly configured in production

---

**Last Updated**: November 2024
