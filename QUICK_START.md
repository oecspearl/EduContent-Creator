# Quick Start Guide

## ✅ Platform is Ready!

The platform has been set up and configured for you. Here's what was done:

### Completed Setup Steps

1. ✅ **Dependencies installed** - All npm packages are ready
2. ✅ **Environment variables configured** - `.env` file created with SESSION_SECRET
3. ✅ **Windows compatibility fixed** - Added `cross-env` for cross-platform scripts
4. ✅ **dotenv integration** - Server now loads `.env` file automatically

### How to Start the Application

#### Option 1: Using npm (Recommended)
```bash
npm run dev
```

#### Option 2: Using the setup script (Windows PowerShell)
```powershell
. .\setup-env.ps1
npm run dev
```

The application will start on: **http://localhost:5000**

### What's Working

✅ **Core Features (No Additional Setup Required)**
- User registration and login (email/password)
- Content creation (all 10 content types)
- Content management and sharing
- Progress tracking
- Analytics dashboard
- Public preview links

### Optional Features (Require Additional Configuration)

To enable these features, add the corresponding API keys to your `.env` file:

- **AI Content Generation**: Add `OPENAI_API_KEY`
- **Google Sign-In**: Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- **Microsoft Sign-In**: Add `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_TENANT_ID`
- **Google Slides/Classroom**: Requires Google OAuth setup
- **Persistent Sessions**: Add `DATABASE_URL` (PostgreSQL connection string)

### First Steps

1. **Start the server**: `npm run dev`
2. **Open your browser**: Go to `http://localhost:5000`
3. **Create an account**: Click "Sign Up" on the landing page
4. **Start creating**: Go to Dashboard → Create → Choose a content type

### Troubleshooting

#### Port 5000 Already in Use
Change the port in your `.env` file:
```env
PORT=3000
```

#### Server Won't Start
1. Check that `.env` file exists and has `SESSION_SECRET`
2. Run `node init-env.js` to regenerate if needed
3. Check for error messages in the terminal

#### Database Connection Issues
- The app works without a database (uses memory store)
- For production, set up PostgreSQL and add `DATABASE_URL` to `.env`
- See `SETUP.md` for database setup instructions

### Need More Help?

- **Full Setup Guide**: See `SETUP.md`
- **OAuth Setup**: See `OAUTH_SETUP_GUIDE.md`
- **Azure Setup**: See `AZURE_SETUP_CHECKLIST.md`

---

**You're all set! Run `npm run dev` to start creating educational content! 🎓**



