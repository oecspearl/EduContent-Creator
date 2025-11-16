# How to Publish and Test Microsoft OAuth

This guide walks you through publishing your changes and testing Microsoft OAuth on your live site.

## 🚀 Step 1: Publish Your Changes

1. In Replit, look for the **"Publish"** or **"Deploy"** button (top right)
2. Click it and follow the prompts
3. Wait for the deployment to complete (usually 1-2 minutes)
4. Your changes are now live at: **https://h5pcreator.org**

**Important**: The development server (preview pane) and your published site are **completely separate**. OAuth changes must be published to work on h5pcreator.org.

---

## ✅ Step 2: Test Microsoft OAuth

### Quick Test Checklist

1. **Open your published site**: https://h5pcreator.org
2. **Click "Login"** or navigate to the login page
3. **Click "Sign in with Microsoft"**
4. **What should happen**:
   - You're redirected to Microsoft login page
   - After signing in, you're redirected back to your dashboard
   - You're logged in successfully

### If it works ✅
Congratulations! Microsoft OAuth is working correctly.

### If it doesn't work ❌
Check these common issues:

#### Error: "Redirect URI mismatch"
**Fix**: Go to [Azure Portal](https://portal.azure.com) and add `https://h5pcreator.org/api/auth/microsoft/callback` to your redirect URIs.

#### Error: "Invalid client secret"
**Fix**: 
1. Generate a new client secret in Azure Portal
2. Copy the secret value
3. Update `MICROSOFT_CLIENT_SECRET` in Replit secrets
4. Republish your app

#### Stuck at Microsoft login or blank page
**Fix**: 
1. Check browser console for errors (press F12)
2. Make sure all secrets are set in Replit (not just locally)
3. Verify your `MICROSOFT_TENANT_ID` is correct (try `common` if using personal accounts)

#### Error: "Microsoft authentication is not configured"
**Fix**: Make sure these secrets are set in Replit:
- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`
- `MICROSOFT_TENANT_ID`

---

## 🔍 Step 3: Monitor Logs (Advanced)

If you need to debug, you can check your production logs:

1. In Replit, go to the **"Deployments"** or **"Logs"** tab
2. Look for any errors related to Microsoft OAuth
3. Common log messages:
   - `Microsoft OAuth initiation error` - Problem starting OAuth flow
   - `Microsoft OAuth callback error` - Problem after user signs in

---

## 📋 Complete Testing Workflow

1. ✅ Verify Azure configuration (see AZURE_SETUP_CHECKLIST.md)
2. ✅ Ensure all Replit secrets are set
3. ✅ Click "Publish" in Replit
4. ✅ Wait for deployment to complete
5. ✅ Go to https://h5pcreator.org
6. ✅ Test Microsoft login
7. ✅ If it works, you're done! If not, check troubleshooting section above

---

## 💡 Pro Tips

- **Always publish after making changes** - The preview pane doesn't reflect what users see
- **Test with a real Microsoft account** - Use your personal or work account
- **Check both work and personal accounts** - If you support multi-tenant
- **Clear cookies if stuck** - Sometimes old sessions cause issues
- **Use incognito mode** - Helps avoid cached credentials interfering

---

## Need Help?

If you're still stuck:

1. Double-check AZURE_SETUP_CHECKLIST.md - Make sure everything is configured
2. Check that all secrets are set in Replit (not just environment variables)
3. Try the troubleshooting steps above
4. Check browser console for specific error messages (F12)
