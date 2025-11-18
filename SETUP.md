# Setup Guide - OECS Learning Hub

This guide will help you get the platform running on your local machine.

## Quick Start

### 1. Install Dependencies

Dependencies are already installed. If you need to reinstall:

```bash
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file in the root directory with the following variables:

#### Required Variables

```env
SESSION_SECRET=your-secret-key-here-minimum-32-characters
```

**Generate a secure SESSION_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Optional Variables

```env
# Database (PostgreSQL) - Optional, will use memory store if not set
# Get a free database from Neon: https://neon.tech
DATABASE_URL=postgresql://user:password@host.neon.tech/dbname?sslmode=require

# OpenAI API - Optional, for AI content generation
# Get your API key from: https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-your-openai-api-key

# Google OAuth - Optional, for Google sign-in and Google Slides/Classroom
# See OAUTH_SETUP_GUIDE.md for detailed setup
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Microsoft OAuth - Optional, for Microsoft sign-in
# See AZURE_SETUP_CHECKLIST.md for detailed setup
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
MICROSOFT_TENANT_ID=common

# Unsplash API - Optional, for stock images in Google Slides
# Get your access key from: https://unsplash.com/developers
UNSPLASH_ACCESS_KEY=your-unsplash-access-key

# Server Port - Optional, defaults to 5000
PORT=5000

# Node Environment
NODE_ENV=development
```

### 3. Minimum Setup (To Get Started)

Create a `.env` file with just the required variable:

```env
SESSION_SECRET=56ada9f9311101af70089751bbb07d1e8a065542f3865b6d6b18fa4e0433b4a4
NODE_ENV=development
PORT=5000
```

**Note:** The SESSION_SECRET above is just an example. Generate your own using the command above.

### 4. Start the Development Server

```bash
npm run dev
```

The application will be available at:
- **Frontend & API**: http://localhost:5000

### 5. Access the Application

1. Open your browser and go to `http://localhost:5000`
2. You'll see the landing page
3. Click "Sign Up" to create an account (email/password)
4. Or use OAuth if you've configured it

## Features Available Without Optional Services

### Works Without Configuration:
- ✅ User registration and login (email/password)
- ✅ Content creation (all 10 content types)
- ✅ Content management and sharing
- ✅ Progress tracking
- ✅ Analytics
- ✅ Public preview links

### Requires Configuration:
- ❌ AI content generation (needs `OPENAI_API_KEY`)
- ❌ Google OAuth sign-in (needs Google OAuth credentials)
- ❌ Microsoft OAuth sign-in (needs Azure credentials)
- ❌ Google Slides integration (needs Google OAuth)
- ❌ Google Classroom sharing (needs Google OAuth)
- ❌ AI image generation (needs `OPENAI_API_KEY`)
- ❌ Unsplash image search (needs `UNSPLASH_ACCESS_KEY`)
- ❌ Persistent sessions (needs `DATABASE_URL`)

## Database Setup (Optional but Recommended)

### Using Neon (Free PostgreSQL)

1. Go to https://neon.tech
2. Sign up for a free account
3. Create a new project
4. Copy the connection string
5. Add it to your `.env` file as `DATABASE_URL`

The connection string looks like:
```
postgresql://username:password@ep-xxx-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require
```

### Using Local PostgreSQL

If you have PostgreSQL installed locally:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/oecs_content_creator
```

Then run the database migrations:

```bash
npm run db:push
```

## Troubleshooting

### Port Already in Use

If port 5000 is already in use, change it in your `.env`:

```env
PORT=3000
```

### Session Secret Error

Make sure your `SESSION_SECRET` is at least 32 characters long.

### Database Connection Issues

If you're using a database:
- Check that your `DATABASE_URL` is correct
- Ensure the database is accessible
- For Neon, make sure SSL is enabled (`?sslmode=require`)

### OAuth Not Working

- Check that redirect URIs are configured correctly
- For local development, use: `http://localhost:5000/api/auth/google/callback`
- See `OAUTH_SETUP_GUIDE.md` for detailed instructions

## Next Steps

1. **Create your first content**: Go to Dashboard → Create → Choose a content type
2. **Explore features**: Try creating quizzes, flashcards, interactive videos, etc.
3. **Set up OAuth** (optional): Follow `OAUTH_SETUP_GUIDE.md` for Google/Microsoft sign-in
4. **Enable AI features** (optional): Add your OpenAI API key for AI content generation

## Production Deployment

For production deployment:
1. Set `NODE_ENV=production`
2. Use a secure, randomly generated `SESSION_SECRET`
3. Set up a PostgreSQL database (required for production)
4. Configure OAuth redirect URIs for your production domain
5. Set up proper SSL/HTTPS

## Need Help?

- Check the documentation files:
  - `OAUTH_SETUP_GUIDE.md` - OAuth configuration
  - `AZURE_SETUP_CHECKLIST.md` - Microsoft OAuth setup
  - `design_guidelines.md` - Design system documentation



