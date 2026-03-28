# Troubleshooting Guide

## Issue: 'tsx' is not recognized

**Solution:** Dependencies were not fully installed. This has been fixed by running `npm install`.

If you encounter this again:
```bash
npm install
```

## Verifying the Server is Running

After running `npm run dev`, you should see output like:
```
serving on port 5000
```

Then open your browser to: **http://localhost:5000**

## Common Issues

### Port 5000 Already in Use

If you get an error about port 5000 being in use:

1. Change the port in `.env`:
   ```env
   PORT=3000
   ```

2. Or find and stop the process using port 5000:
   ```powershell
   netstat -ano | findstr :5000
   # Note the PID, then:
   taskkill /PID <PID> /F
   ```

### Missing Environment Variables

If you get errors about missing `SESSION_SECRET`:

1. Run the initialization script:
   ```bash
   node init-env.js
   ```

2. Or manually add to `.env`:
   ```env
   SESSION_SECRET=your-secret-here-min-32-chars
   ```

### Database Connection Errors

The app works without a database (uses memory store for sessions).

If you want persistent sessions:
1. Set up a PostgreSQL database (Neon, Supabase, or local)
2. Add `DATABASE_URL` to `.env`
3. Run migrations: `npm run db:push`

### Module Not Found Errors

If you see "Cannot find module" errors:

```bash
# Delete node_modules and reinstall
rm -r node_modules
npm install
```

On Windows PowerShell:
```powershell
Remove-Item -Recurse -Force node_modules
npm install
```

## Getting Help

Check the logs in your terminal for specific error messages. The server will show detailed error information when it fails to start.



