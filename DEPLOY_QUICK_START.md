# Quick Heroku Deployment

## Prerequisites
- ✅ Heroku CLI installed and logged in: `heroku login`
- ✅ Git repository initialized
- ✅ All code committed

## Quick Deploy Steps

### 1. Test Build Locally
```bash
npm run build
```

### 2. Create Heroku App
```bash
heroku create your-app-name
```

### 3. Set Required Environment Variables
```bash
# Required
heroku config:set SESSION_SECRET=your-session-secret-here
heroku config:set DATABASE_URL=your-supabase-connection-string
heroku config:set NODE_ENV=production

# Optional (if you use these features)
heroku config:set OPENAI_API_KEY=your-key
heroku config:set GOOGLE_CLIENT_ID=your-id
heroku config:set GOOGLE_CLIENT_SECRET=your-secret
```

### 4. Deploy
```bash
git push heroku main
```

### 5. Run Database Migrations
```bash
heroku run npm run db:push
```

### 6. Open Your App
```bash
heroku open
```

## That's It! 🚀

For detailed instructions, see `HEROKU_DEPLOYMENT.md`

