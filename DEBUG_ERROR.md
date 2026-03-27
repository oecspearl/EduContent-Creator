# Debugging the 500 Error

## What's Happening

You're getting a 500 Internal Server Error when trying to access `/api/content`. This means the server is encountering an error when trying to query the database.

## How to Debug

### Step 1: Check Server Terminal Output

Look at the terminal where you ran `npm run dev`. You should see an error message like:

```
Get content error: [error message here]
Error stack: [stack trace here]
```

**Please share the exact error message** from your server terminal. This will tell us what's wrong.

### Step 2: Common Issues

#### Issue 1: Database Connection Problem
- **Symptom**: Error mentions "connection" or "timeout"
- **Solution**: Check your `DATABASE_URL` in `.env` is correct

#### Issue 2: Table Schema Mismatch
- **Symptom**: Error mentions "column" or "relation"
- **Solution**: Run `npm run db:push` to sync schema

#### Issue 3: Authentication/Session Issue
- **Symptom**: Error mentions "userId" or "session"
- **Solution**: Make sure you're logged in

#### Issue 4: Database Query Error
- **Symptom**: SQL error or query syntax error
- **Solution**: Check database logs or connection

### Step 3: Quick Fixes to Try

1. **Restart the server**:
   ```bash
   # Stop the server (Ctrl+C)
   npm run dev
   ```

2. **Verify database connection**:
   ```bash
   node check-db.js
   ```

3. **Check your .env file**:
   - Make sure `DATABASE_URL` is set correctly
   - Make sure `SESSION_SECRET` is set

4. **Clear browser cache and cookies**:
   - Sometimes session issues can cause problems

### Step 4: Share the Error

Once you see the error in your server terminal, please share:
1. The exact error message
2. The stack trace (if shown)
3. What you were trying to do when it happened

This will help identify the exact issue!



