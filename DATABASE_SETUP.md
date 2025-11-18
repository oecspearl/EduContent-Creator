# Database Setup Guide

## Why You Need a Database

The OECS Learning Hub requires a PostgreSQL database to store:
- User accounts and authentication
- Educational content (quizzes, flashcards, videos, etc.)
- Learner progress and analytics
- Chat history
- All application data

## Quick Setup Options

### Option 1: Neon (Free PostgreSQL - Recommended)

1. **Sign up for free**: Go to https://neon.tech
2. **Create a new project**
3. **Copy the connection string** - it looks like:
   ```
   postgresql://username:password@ep-xxx-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require
   ```
4. **Add to your `.env` file**:
   ```env
   DATABASE_URL=postgresql://username:password@ep-xxx-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require
   ```
5. **Run database migrations**:
   ```bash
   npm run db:push
   ```

### Option 2: Supabase (Free PostgreSQL)

1. **Sign up**: Go to https://supabase.com
2. **Create a new project**
3. **Go to Settings → Database**
4. **Copy the connection string** (use the "URI" format)
5. **Add to `.env`**:
   ```env
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres
   ```
6. **Run migrations**: `npm run db:push`

### Option 3: Local PostgreSQL

If you have PostgreSQL installed locally:

1. **Create a database**:
   ```sql
   CREATE DATABASE oecs_content_creator;
   ```

2. **Add to `.env`**:
   ```env
   DATABASE_URL=postgresql://postgres:password@localhost:5432/oecs_content_creator
   ```

3. **Run migrations**: `npm run db:push`

## After Setting Up Database

1. **Restart the server**: Stop (`Ctrl+C`) and run `npm run dev` again
2. **Verify connection**: You should see "✓ PostgreSQL connection verified" in the console
3. **Start using the app**: The database will now store all your data

## Troubleshooting

### Connection String Format

Make sure your connection string includes:
- Protocol: `postgresql://`
- Username and password
- Host and port
- Database name
- SSL mode (for cloud databases): `?sslmode=require`

### Migration Errors

If `npm run db:push` fails:
- Check that your database is accessible
- Verify the connection string is correct
- Make sure you have permission to create tables

### Still Having Issues?

- Check the terminal output for specific error messages
- Verify your `.env` file has the correct `DATABASE_URL`
- Test your connection string with a PostgreSQL client (like pgAdmin)

---

**Note**: The app will show warnings if DATABASE_URL is not set, but it won't function properly without a database. All user data, content, and progress tracking requires database storage.



