# Setting Up a New Database

This guide helps you set up a fresh database for the OECS Learning Hub.

## Option 1: Using the SQL Schema File (Recommended)

### Step 1: Create New Database

1. **Neon** (https://neon.tech):
   - Create a new project
   - Copy the connection string

2. **Supabase** (https://supabase.com):
   - Create a new project
   - Go to SQL Editor
   - Run the schema file

3. **Local PostgreSQL**:
   ```sql
   CREATE DATABASE oecs_content_creator_new;
   ```

### Step 2: Run the Schema

**Option A: Using psql (command line)**
```bash
psql "your-connection-string" < new_database_schema.sql
```

**Option B: Using a database client**
- Open pgAdmin, DBeaver, or your preferred client
- Connect to your new database
- Open `new_database_schema.sql`
- Execute the script

**Option C: Using Neon/Supabase SQL Editor**
- Copy the contents of `new_database_schema.sql`
- Paste into the SQL Editor
- Run the query

### Step 3: Verify Tables

Run this query to verify all tables exist:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

You should see:
- chat_messages
- content_shares
- h5p_content
- interaction_events
- learner_progress
- profiles
- quiz_attempts
- session

## Option 2: Using Drizzle Migrations

If you prefer using the migration tool:

1. **Update `.env`** with your new `DATABASE_URL`
2. **Run migrations**:
   ```bash
   npm run db:push
   ```

This will automatically create all tables based on the schema in `shared/schema.ts`.

## Option 3: Manual Setup with Drizzle

1. Set `DATABASE_URL` in `.env` to your new database
2. Run: `npm run db:push`

## After Setup

1. **Update `.env`**:
   ```env
   DATABASE_URL=postgresql://user:password@new-host:port/database?sslmode=require
   ```

2. **Import your data** (if you exported it):
   ```bash
   npx tsx import-database.js
   ```

3. **Restart your server**:
   ```bash
   npm run dev
   ```

## Schema Overview

### Core Tables

- **profiles**: User accounts (teachers, admins)
- **h5p_content**: All educational content (quizzes, flashcards, videos, etc.)
- **content_shares**: Sharing metadata
- **learner_progress**: Student progress tracking
- **quiz_attempts**: Quiz scores and answers
- **interaction_events**: Detailed interaction tracking
- **chat_messages**: AI assistant conversation history
- **session**: Session storage (for authentication)

### Key Features

- All tables use UUIDs for primary keys
- Foreign keys with CASCADE delete (deleting a user deletes their content)
- JSONB fields for flexible data storage
- Indexes on frequently queried columns
- Timestamps for created/updated tracking

## Troubleshooting

### "relation does not exist"
- Make sure you ran the schema script
- Check that you're connected to the correct database

### "permission denied"
- Make sure your database user has CREATE TABLE permissions
- For cloud databases, you usually have full permissions

### "extension uuid-ossp does not exist"
- Most cloud databases have this enabled by default
- If not, ask your database provider to enable it
- Or use `gen_random_uuid()` which is available in PostgreSQL 13+

---

**Once the schema is created, you can import your exported data!**

