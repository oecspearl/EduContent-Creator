# Database Migration Instructions

## Problem
The application now requires three new columns in the `h5p_content` table:
- `subject` (TEXT)
- `grade_level` (TEXT)
- `age_range` (TEXT)

If you're seeing a 500 error when trying to fetch content, it means your database doesn't have these columns yet.

## Solution: Run the Migration

### Option 1: Using SQL Editor (Recommended)

1. **Open your database SQL editor**:
   - **Supabase**: Go to SQL Editor in the dashboard
   - **Neon**: Go to SQL Editor in the dashboard
   - **Local PostgreSQL**: Use psql or pgAdmin

2. **Copy and run the migration SQL**:
   Open the file `migrations/add_metadata_fields.sql` and copy its contents, then paste and execute it in your SQL editor.

   Or run this SQL directly:
   ```sql
   -- Add subject column
   ALTER TABLE h5p_content 
   ADD COLUMN IF NOT EXISTS subject TEXT;

   -- Add grade_level column
   ALTER TABLE h5p_content 
   ADD COLUMN IF NOT EXISTS grade_level TEXT;

   -- Add age_range column
   ALTER TABLE h5p_content 
   ADD COLUMN IF NOT EXISTS age_range TEXT;
   ```

3. **Verify the migration**:
   Run this query to confirm the columns were added:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'h5p_content' 
   AND column_name IN ('subject', 'grade_level', 'age_range');
   ```

   You should see all three columns listed.

### Option 2: Using Command Line (psql)

If you have command-line access to your database:

```bash
psql "your-database-connection-string" -f migrations/add_metadata_fields.sql
```

### Option 3: Using Drizzle (Alternative)

If you prefer using Drizzle migrations:

```bash
npm run db:push
```

**Note**: This will push all schema changes, not just the new columns. Make sure your `shared/schema.ts` matches your database structure.

## After Migration

1. **Restart your server**:
   ```bash
   npm run dev
   ```

2. **Test the application**:
   - Try to fetch content - the 500 error should be resolved
   - Create new content - you should see the Subject, Grade Level, and Age Range fields

## Troubleshooting

### Error: "column already exists"
This means the migration was already run. You can safely ignore this error or skip the migration.

### Error: "relation h5p_content does not exist"
This means your database hasn't been set up yet. Run the full schema from `new_database_schema.sql` first.

### Still seeing 500 errors
1. Check server logs for the exact error message
2. Verify the columns exist using the verification query above
3. Make sure you restarted the server after running the migration

