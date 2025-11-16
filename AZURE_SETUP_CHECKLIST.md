# Azure Microsoft OAuth Setup Checklist

Follow this checklist to ensure your Azure app registration is configured correctly for Microsoft OAuth.

## ✅ Step 1: Verify Azure App Registration

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Find your app: **OECS Content Creator**

## ✅ Step 2: Check Redirect URIs

In your app registration, go to **Authentication** section and verify you have BOTH redirect URIs:

- **Development**: `http://localhost:5000/api/auth/microsoft/callback`
- **Production**: `https://h5pcreator.org/api/auth/microsoft/callback`

**Important**: Make sure the platform type is **Web** (not SPA or Mobile).

## ✅ Step 3: Verify Client Secret

1. Go to **Certificates & secrets** section
2. Check that you have an active client secret (not expired)
3. If expired or missing, create a new one and update your Replit secrets

## ✅ Step 4: Verify API Permissions

Go to **API permissions** and ensure you have:

- **Microsoft Graph** > **User.Read** (Delegated)
- Status should show "Granted for [your organization]"

If not granted, click **Grant admin consent**.

## ✅ Step 5: Check Supported Account Types

In **Authentication** > **Supported account types**, verify:

- **Recommended**: "Accounts in any organizational directory (Any Azure AD directory - Multitenant)"
- This allows both work/school AND personal Microsoft accounts

## ✅ Step 6: Verify Replit Secrets

In your Replit project, check that these secrets are set:

- `MICROSOFT_CLIENT_ID` - Your Application (client) ID
- `MICROSOFT_CLIENT_SECRET` - Your client secret value
- `MICROSOFT_TENANT_ID` - Usually `common` for multi-tenant, or your specific tenant ID
- `SESSION_SECRET` - Required for sessions
- `DATABASE_URL` - Required for production

**Where to find these values**:
- Client ID: Overview page
- Tenant ID: Overview page (or use `common` for multi-tenant)
- Client Secret: You copied this when you created it (can't view again)

---

## 🔧 Troubleshooting Common Issues

### "Redirect URI mismatch" error
- Double-check that your redirect URI in Azure **exactly matches** the callback URL
- Remember: `http://localhost:5000` vs `http://localhost:5000/` are different!

### "Invalid client secret" error
- Your secret might be expired
- Create a new secret in Azure and update `MICROSOFT_CLIENT_SECRET` in Replit

### Users can't sign in with personal Microsoft accounts
- Change **Supported account types** to allow multi-tenant + personal accounts
- Use `common` as your `MICROSOFT_TENANT_ID`

### Works in development but not production
- Make sure you've **published** your latest code changes
- Verify the production redirect URI is registered in Azure
- Check that production secrets are set correctly

---

## 📝 Quick Reference

**Your Application (Client) ID**: Found in Azure Portal > App registrations > Overview

**Tenant ID**: 
- For multi-tenant: Use `common`
- For single tenant: Found in Azure Portal > App registrations > Overview

**Redirect URIs**:
- Development: `http://localhost:5000/api/auth/microsoft/callback`
- Production: `https://h5pcreator.org/api/auth/microsoft/callback`
