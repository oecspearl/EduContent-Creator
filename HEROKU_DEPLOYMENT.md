# Heroku Deployment Guide

This guide will help you deploy the OECS Learning Hub to Heroku.

## Prerequisites

1. ✅ Heroku CLI installed ([Download here](https://devcenter.heroku.com/articles/heroku-cli))
2. ✅ Git installed
3. ✅ Heroku account (sign up at [heroku.com](https://www.heroku.com))
4. ✅ Logged into Heroku CLI: `heroku login`

## Step 1: Prepare Your Application

### 1.1 Build the Application Locally (Optional but Recommended)

Test the build process:
```bash
npm run build
```

This should create:
- `dist/public/` - Frontend build
- `dist/index.js` - Server build

### 1.2 Verify Your Code is Ready

Make sure:
- ✅ All changes are committed to git
- ✅ `.env` file is NOT committed (it's in `.gitignore`)
- ✅ Your code works locally

## Step 2: Create Heroku App

### Option A: Using Heroku CLI

```bash
# Create a new Heroku app
heroku create your-app-name

# Or create with a random name
heroku create
```

### Option B: Using Heroku Dashboard

1. Go to [dashboard.heroku.com](https://dashboard.heroku.com)
2. Click "New" → "Create new app"
3. Enter app name and region
4. Click "Create app"

## Step 3: Set Environment Variables

You need to set all your environment variables in Heroku. **Do NOT commit your `.env` file!**

### Required Variables

```bash
# Session Secret (REQUIRED)
heroku config:set SESSION_SECRET=your-session-secret-here

# Database URL (REQUIRED for Supabase)
heroku config:set DATABASE_URL=postgres://postgres.xsbhyajeipluvigkxnak:password@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require

# Node Environment
heroku config:set NODE_ENV=production
```

### Optional Variables (if you use these features)

```bash
# OpenAI API Key (for AI features)
heroku config:set OPENAI_API_KEY=your-openai-key

# Google OAuth
heroku config:set GOOGLE_CLIENT_ID=your-google-client-id
heroku config:set GOOGLE_CLIENT_SECRET=your-google-client-secret

# Microsoft OAuth
heroku config:set MICROSOFT_CLIENT_ID=your-microsoft-client-id
heroku config:set MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
heroku config:set MICROSOFT_TENANT_ID=your-tenant-id

# Media Services
heroku config:set UNSPLASH_ACCESS_KEY=your-unsplash-key
heroku config:set YOUTUBE_API_KEY=your-youtube-key
```

### View All Config Variables

```bash
heroku config
```

## Step 4: Deploy to Heroku

### 4.1 Add Heroku Remote (if not already added)

```bash
# If you created the app via CLI, this is already done
# Otherwise, add the remote:
heroku git:remote -a your-app-name
```

### 4.2 Deploy

```bash
# Push to Heroku (this will trigger a build)
git push heroku main

# Or if your default branch is master:
git push heroku master
```

### 4.3 Watch the Build

You'll see the build process in your terminal. Wait for:
- ✅ Dependencies installation
- ✅ Build process (`npm run build`)
- ✅ Deployment complete

## Step 5: Run Database Migrations

After deployment, run database migrations:

```bash
heroku run npm run db:push
```

Or if you prefer to run the SQL schema manually:
1. Go to your Supabase dashboard
2. Open SQL Editor
3. Copy and paste `new_database_schema.sql`
4. Run it

## Step 6: Verify Deployment

### 6.1 Open Your App

```bash
heroku open
```

Or visit: `https://your-app-name.herokuapp.com`

### 6.2 Check Logs

```bash
# View recent logs
heroku logs --tail

# View last 100 lines
heroku logs -n 100
```

### 6.3 Test the Application

1. ✅ Visit the homepage
2. ✅ Try to sign up/login
3. ✅ Test creating content
4. ✅ Verify database connection

## Step 7: Post-Deployment

### 7.1 Update OAuth Redirect URLs

If you're using Google/Microsoft OAuth, update the redirect URLs:

**Google OAuth:**
- Go to [Google Cloud Console](https://console.cloud.google.com)
- Update authorized redirect URIs:
  - `https://your-app-name.herokuapp.com/api/auth/google/callback`

**Microsoft OAuth:**
- Go to [Azure Portal](https://portal.azure.com)
- Update redirect URIs:
  - `https://your-app-name.herokuapp.com/api/auth/microsoft/callback`

### 7.2 Set Up Custom Domain (Optional)

```bash
heroku domains:add www.yourdomain.com
```

Then configure DNS with your domain provider.

## Troubleshooting

### Build Fails

**Error: "Module not found"**
- Check that all dependencies are in `dependencies`, not `devDependencies`
- Some packages needed for production might be in devDependencies

**Error: "Build script failed"**
- Run `npm run build` locally to see the error
- Check that `vite.config.ts` doesn't have Replit-specific plugins in production

### App Crashes on Startup

**Check logs:**
```bash
heroku logs --tail
```

**Common issues:**
- Missing environment variables (check `heroku config`)
- Database connection issues (verify `DATABASE_URL`)
- Port binding issues (should use `process.env.PORT`)

### Database Connection Issues

**Verify DATABASE_URL:**
```bash
heroku config:get DATABASE_URL
```

**Test connection:**
```bash
heroku run node -e "console.log(process.env.DATABASE_URL)"
```

### Static Files Not Loading

**Check build output:**
```bash
heroku run ls -la dist/public
```

**Verify build process:**
- Make sure `npm run build` completes successfully
- Check that `dist/public/index.html` exists

## Useful Heroku Commands

```bash
# View app info
heroku info

# Restart the app
heroku restart

# Scale dynos (if needed)
heroku ps:scale web=1

# Run a one-off command
heroku run npm run db:push

# Open a console
heroku run bash

# View config
heroku config

# Set config
heroku config:set KEY=value

# Remove config
heroku config:unset KEY
```

## Continuous Deployment (Optional)

### GitHub Integration

1. Go to Heroku Dashboard → Your App → Deploy
2. Connect to GitHub
3. Enable automatic deploys
4. Choose branch (usually `main` or `master`)

Now every push to that branch will automatically deploy!

## Monitoring

### View Metrics

```bash
heroku ps
```

Or visit: Dashboard → Your App → Metrics

### Set Up Alerts

1. Go to Dashboard → Your App → Settings
2. Scroll to "Alert Conditions"
3. Set up alerts for:
   - Response time
   - Error rate
   - Dyno memory usage

## Cost Considerations

- **Free Tier**: Limited hours per month (550 free dyno hours)
- **Hobby Tier**: $7/month - Always on, no sleep
- **Standard Tier**: $25/month - Better performance

For production, consider upgrading from free tier to avoid cold starts.

## Security Checklist

- ✅ All secrets in Heroku config vars (not in code)
- ✅ `SESSION_SECRET` is strong and unique
- ✅ Database uses SSL (`sslmode=require`)
- ✅ OAuth redirect URLs updated
- ✅ `.env` file is in `.gitignore`

## Support

- **Heroku Docs**: [devcenter.heroku.com](https://devcenter.heroku.com)
- **Heroku Support**: [help.heroku.com](https://help.heroku.com)
- **Status**: [status.heroku.com](https://status.heroku.com)

---

## Quick Deploy Checklist

- [ ] Heroku CLI installed and logged in
- [ ] Code committed to git
- [ ] Heroku app created
- [ ] Environment variables set
- [ ] Deployed (`git push heroku main`)
- [ ] Database migrations run
- [ ] OAuth redirect URLs updated
- [ ] App tested and working

**You're all set! 🚀**

