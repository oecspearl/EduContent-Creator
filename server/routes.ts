import type { Express } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { Pool } from "pg";
import crypto from "crypto";
import { storage } from "./storage";
import { 
  aiGenerationSchema, 
  videoFinderPedagogySchema,
  presentationGenerationSchema,
  insertLearnerProgressSchema, 
  insertQuizAttemptSchema, 
  insertInteractionEventSchema 
} from "@shared/schema";
import bcrypt from "bcryptjs";
import { 
  generateQuizQuestions, 
  generateFlashcards, 
  generateVideoHotspots, 
  generateImageHotspots,
  generateDragDropItems,
  generateFillBlanksBlanks,
  generateMemoryGameCards,
  generateInteractiveBookPages,
  generateVideoFinderPedagogy,
  generatePresentation,
  getOpenAIClient
} from "./openai";
import { searchEducationalVideos } from "./youtube";
import passportConfig from "./passport-config";
import { getMsalClient, getRedirectUri } from "./msal-config";

// Type augmentation for session
declare module "express-session" {
  interface SessionData {
    userId: string;
    oauthReturnTo?: string;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Trust Heroku's proxy (required for secure cookies and correct IP addresses)
  app.set('trust proxy', 1);

  // Import rate limiting middleware
  const { aiGenerationRateLimit, presentationCreationRateLimit, imageSearchRateLimit } = await import('./middleware/rate-limit');

  // Validate required environment variables
  if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET environment variable is required");
  }

  // Configure session store (PostgreSQL or memory fallback)
  let sessionStore: session.Store | undefined;
  
  if (process.env.DATABASE_URL) {
    // Use PostgreSQL session store (recommended for production)
    const PgSession = connectPgSimple(session);
    // Parse connection string to handle SSL properly
    const isSupabase = process.env.DATABASE_URL?.includes("supabase");
    const isNeon = process.env.DATABASE_URL?.includes("neon");
    
    // Remove sslmode from connection string - we'll handle SSL in Pool config
    let connectionString = process.env.DATABASE_URL.replace(/[?&]sslmode=[^&]*/g, '');
    
    const pgPool = new Pool({
      connectionString: connectionString,
      ssl: (isSupabase || isNeon) ? {
        rejectUnauthorized: false,
      } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000, // Increased timeout for Neon cold starts
    });
    
    // Handle pool errors
    pgPool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client', err);
    });
    
    // Test database connection at startup
    try {
      await pgPool.query('SELECT NOW()');
      console.log('✓ PostgreSQL connection verified');
      
      sessionStore = new PgSession({
        pool: pgPool,
        createTableIfMissing: true,
        tableName: "session",
        pruneSessionInterval: 900, // Clean up old sessions every 15 minutes
        errorLog: (error) => {
          console.error('Session store error:', error);
        },
      });
      console.log('✓ Using PostgreSQL session store');
    } catch (error) {
      console.error('⚠ Failed to connect to PostgreSQL:', error);
      console.warn('⚠ Falling back to memory session store (not recommended for production)');
      sessionStore = undefined; // Will use default memory store
    }
  } else {
    console.warn('⚠ DATABASE_URL not set. Using memory session store.');
    console.warn('⚠ For production, set DATABASE_URL to use persistent session storage.');
    sessionStore = undefined; // Will use default memory store
  }
  
  // Check OAuth provider availability
  const isGoogleOAuthAvailable = !!(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  );
  // Microsoft OAuth is available if CLIENT_ID and CLIENT_SECRET are set
  // TENANT_ID is optional - defaults to "common" for multi-tenant support
  const isMicrosoftOAuthAvailable = !!(
    process.env.MICROSOFT_CLIENT_ID && 
    process.env.MICROSOFT_CLIENT_SECRET
  );
  
  console.log('OAuth providers:', {
    google: isGoogleOAuthAvailable,
    microsoft: isMicrosoftOAuthAvailable,
  });

  // Session middleware
  const sessionConfig: session.SessionOptions = {
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax", // Use 'lax' since frontend and backend are same-origin
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    },
  };
  
  // Add PostgreSQL store if available
  if (sessionStore) {
    sessionConfig.store = sessionStore;
  }
  
  app.use(session(sessionConfig));

  // Initialize Passport
  app.use(passportConfig.initialize());
  app.use(passportConfig.session());

  // Auth middleware
  const requireAuth = (req: any, res: any, next: any) => {
    console.log("requireAuth check:", {
      hasSession: !!req.session,
      userId: req.session?.userId,
      sessionId: req.sessionID,
      cookies: req.headers.cookie
    });
    
    if (!req.session.userId) {
      console.log("requireAuth: No userId in session, returning 401");
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, fullName, role, institution } = req.body;

      if (!email || !password || !fullName) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const existing = await storage.getProfileByEmail(email);
      if (existing) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const profile = await storage.createProfile({
        email,
        password,
        fullName,
        role: role || "teacher",
        institution: institution || null,
      });

      req.session.userId = profile.id;

      // Don't send password back
      const { password: _, ...profileWithoutPassword } = profile;
      res.json(profileWithoutPassword);
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Missing email or password" });
      }

      const profile = await storage.getProfileByEmail(email);
      if (!profile) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // OAuth users have sentinel passwords and should not use password login
      if (!profile.password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValid = await bcrypt.compare(password, profile.password);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      req.session.userId = profile.id;

      const { password: _, ...profileWithoutPassword } = profile;
      res.json(profileWithoutPassword);
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const profile = await storage.getProfileById(req.session.userId!);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      const { password: _, ...profileWithoutPassword } = profile;
      res.json(profileWithoutPassword);
    } catch (error: any) {
      console.error("Get profile error:", error);
      res.status(500).json({ message: "Failed to get profile" });
    }
  });

  app.get("/api/auth/providers", (req, res) => {
    res.json({
      google: isGoogleOAuthAvailable,
      microsoft: isMicrosoftOAuthAvailable,
    });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  // Forgot password - request password reset
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email || typeof email !== 'string') {
        return res.status(400).json({ message: "Email is required" });
      }

      const profile = await storage.getProfileByEmail(email.trim().toLowerCase());

      // Always return success to prevent email enumeration attacks
      if (!profile) {
        return res.json({ message: "If an account exists with that email, a password reset link will be sent." });
      }

      // Generate reset token
      const crypto = await import('crypto');
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await storage.setPasswordResetToken(email.trim().toLowerCase(), resetToken, expiresAt);

      // Send password reset email
      const { sendPasswordResetEmail } = await import('./email');
      await sendPasswordResetEmail(profile.email, profile.fullName, resetToken);

      res.json({ message: "If an account exists with that email, a password reset link will be sent." });
    } catch (error: any) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Failed to process request" });
    }
  });

  // Reset password - set new password using token
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, password } = req.body;

      if (!token || typeof token !== 'string') {
        return res.status(400).json({ message: "Reset token is required" });
      }

      if (!password || typeof password !== 'string' || password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      const profile = await storage.getProfileByResetToken(token);

      if (!profile) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      // Check if token is expired
      if (!profile.passwordResetExpiry || new Date() > new Date(profile.passwordResetExpiry)) {
        return res.status(400).json({ message: "Reset token has expired. Please request a new one." });
      }

      // Update password and clear reset token
      await storage.updateProfile(profile.id, { password });
      await storage.clearPasswordResetToken(profile.id);

      res.json({ message: "Password has been reset successfully. You can now log in with your new password." });
    } catch (error: any) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Validate reset token (for checking before showing reset form)
  app.get("/api/auth/validate-reset-token", async (req, res) => {
    try {
      const token = req.query.token as string;

      if (!token) {
        return res.status(400).json({ valid: false, message: "Token is required" });
      }

      const profile = await storage.getProfileByResetToken(token);

      if (!profile) {
        return res.json({ valid: false, message: "Invalid reset token" });
      }

      if (!profile.passwordResetExpiry || new Date() > new Date(profile.passwordResetExpiry)) {
        return res.json({ valid: false, message: "Reset token has expired" });
      }

      res.json({ valid: true, email: profile.email });
    } catch (error: any) {
      console.error("Validate reset token error:", error);
      res.status(500).json({ valid: false, message: "Failed to validate token" });
    }
  });

  // Google OAuth routes
  app.get("/api/auth/google", (req, res, next) => {
    if (!isGoogleOAuthAvailable) {
      return res.status(503).json({ 
        message: "Google authentication is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET." 
      });
    }
    
    // Store return URL in session if provided
    const returnTo = req.query.returnTo as string;
    if (returnTo && returnTo.startsWith('/')) {
      req.session.oauthReturnTo = returnTo;
    }
    
    // Request all required Google API scopes for Slides and Classroom integration
    passportConfig.authenticate("google", {
      scope: [
        'profile',
        'email',
        'https://www.googleapis.com/auth/presentations', // Google Slides API
        'https://www.googleapis.com/auth/classroom.courses.readonly', // List Classroom courses
        'https://www.googleapis.com/auth/classroom.coursework.students', // Create assignments
        'https://www.googleapis.com/auth/classroom.announcements', // Create announcements
      ]
    })(req, res, next);
  });

  app.get("/api/auth/google/callback", (req, res, next) => {
    if (!isGoogleOAuthAvailable) {
      return res.redirect("/login?error=google_not_configured");
    }
    passportConfig.authenticate("google", { failureRedirect: "/login" })(req, res, next);
  }, (req: any, res) => {
    // Set session userId
    req.session.userId = req.user.id;
    
    // Get return URL from session (validate it's a safe relative path)
    const returnTo = req.session.oauthReturnTo;
    delete req.session.oauthReturnTo;
    
    req.session.save(() => {
      // Redirect to stored return URL or dashboard
      if (returnTo && returnTo.startsWith('/') && !returnTo.includes('//')) {
        res.redirect(returnTo + '?googleAuthSuccess=true');
      } else {
        res.redirect("/dashboard?googleAuthSuccess=true");
      }
    });
  });

  // Microsoft OAuth routes (using MSAL)
  app.get("/api/auth/microsoft", async (req, res) => {
    if (!isMicrosoftOAuthAvailable) {
      return res.status(503).json({ 
        message: "Microsoft authentication is not configured. Please set MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET. MICROSOFT_TENANT_ID is optional (defaults to 'common' for multi-tenant)." 
      });
    }
    
    // Store return URL in session if provided
    const returnTo = req.query.returnTo as string;
    if (returnTo && returnTo.startsWith('/')) {
      req.session.oauthReturnTo = returnTo;
    }

    try {
      const msalClient = getMsalClient();
      if (!msalClient) {
        return res.status(503).json({ message: "Microsoft OAuth client not configured" });
      }

      const redirectUri = getRedirectUri(req);
      const authCodeUrlParameters = {
        scopes: ["user.read"],
        redirectUri,
      };

      const authUrl = await msalClient.getAuthCodeUrl(authCodeUrlParameters);
      res.redirect(authUrl);
    } catch (error) {
      console.error("Microsoft OAuth initiation error:", error);
      res.status(500).json({ message: "Failed to initiate Microsoft authentication" });
    }
  });

  app.get("/api/auth/microsoft/callback", async (req, res) => {
    console.log("Microsoft OAuth callback: Request received", {
      query: req.query,
      hasCode: !!req.query.code,
      hasError: !!req.query.error
    });

    if (!isMicrosoftOAuthAvailable) {
      console.error("Microsoft OAuth: Not configured");
      return res.redirect("/login?error=microsoft_not_configured");
    }

    if (req.query.error) {
      console.error("Microsoft OAuth: Error in callback", req.query.error, req.query.error_description);
      return res.redirect(`/login?error=${req.query.error}`);
    }

    if (!req.query.code) {
      console.error("Microsoft OAuth: No authorization code in callback");
      return res.redirect("/login?error=no_code");
    }

    try {
      const msalClient = getMsalClient();
      if (!msalClient) {
        console.error("Microsoft OAuth: MSAL client not available");
        return res.redirect("/login?error=microsoft_not_configured");
      }

      const redirectUri = getRedirectUri(req);
      console.log("Microsoft OAuth: Redirect URI:", redirectUri);
      
      const tokenRequest = {
        code: req.query.code as string,
        scopes: ["user.read"],
        redirectUri,
      };

      console.log("Microsoft OAuth: Starting token acquisition...");
      const response = await msalClient.acquireTokenByCode(tokenRequest);
      
      if (!response || !response.account) {
        console.error("Microsoft OAuth: No account in response", response);
        return res.redirect("/login?error=microsoft_no_account");
      }

      console.log("Microsoft OAuth: Token acquired, fetching user info from Graph API...");
      
      // Fetch user info from Microsoft Graph API
      // The account object may not have email/name directly, so we use the access token
      const accessToken = response.accessToken;
      let email: string | null = null;
      let name: string | null = null;
      
      try {
        const graphResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        
        if (graphResponse.ok) {
          const userInfo = await graphResponse.json();
          email = userInfo.mail || userInfo.userPrincipalName || userInfo.email;
          name = userInfo.displayName || userInfo.givenName || userInfo.name;
          console.log("Microsoft OAuth: Graph API response:", { email, name, userInfo });
        } else {
          console.error("Microsoft OAuth: Graph API error", await graphResponse.text());
        }
      } catch (graphError) {
        console.error("Microsoft OAuth: Graph API fetch error", graphError);
      }
      
      // Fallback to account object if Graph API didn't provide email
      if (!email) {
        const account = response.account;
        email = account.username || account.localAccountId;
        name = name || account.name || account.username?.split('@')[0] || 'User';
        console.log("Microsoft OAuth: Using account object fallback:", { email, name });
      }
      
      const microsoftId = response.account.homeAccountId;

      console.log("Microsoft OAuth callback - Final account info:", {
        email,
        name,
        microsoftId,
        accountId: response.account.localAccountId,
        tenantId: response.account.tenantId
      });

      if (!email) {
        console.error("Microsoft OAuth: No email found in account or Graph API", response.account);
        return res.redirect("/login?error=microsoft_no_email");
      }

      let user = await storage.getProfileByEmail(email);

      if (!user) {
        const sentinelPassword = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
        
        user = await storage.createProfile({
          email,
          password: sentinelPassword,
          fullName: name || email,
          role: 'teacher',
          institution: null,
          authProvider: 'microsoft',
          googleId: null,
          microsoftId,
        });
      } else if (!user.microsoftId) {
        await storage.updateProfile(user.id, {
          microsoftId,
        });
      }

      console.log("Microsoft OAuth: Setting session userId:", user.id);
      console.log("Microsoft OAuth: Current session ID:", req.sessionID);
      console.log("Microsoft OAuth: Session before setting userId:", {
        userId: req.session.userId,
        cookie: req.session.cookie
      });
      
      req.session.userId = user.id;
      
      // Get return URL from session (validate it's a safe relative path)
      const returnTo = req.session.oauthReturnTo;
      delete req.session.oauthReturnTo;
      
      // Force cookie to be set
      req.session.cookie.secure = true;
      req.session.cookie.sameSite = 'lax';
      req.session.cookie.httpOnly = true;
      
      console.log("Microsoft OAuth: Session cookie config:", req.session.cookie);
      
      // Save session before redirecting
      req.session.save((err) => {
        if (err) {
          console.error("Microsoft OAuth: Session save error:", err);
          return res.redirect("/login?error=session_failed");
        }
        
        console.log("Microsoft OAuth: Session saved successfully");
        console.log("Microsoft OAuth: Session ID after save:", req.sessionID);
        console.log("Microsoft OAuth: userId in session:", req.session.userId);
        console.log("Microsoft OAuth: Cookie will be sent:", res.getHeader('Set-Cookie'));
        console.log("Microsoft OAuth: Redirecting to dashboard");
        
        // Redirect to stored return URL or dashboard
        if (returnTo && returnTo.startsWith('/') && !returnTo.includes('//')) {
          res.redirect(returnTo + '?microsoftAuthSuccess=true');
        } else {
          res.redirect("/dashboard?microsoftAuthSuccess=true");
        }
      });
    } catch (error) {
      console.error("Microsoft OAuth callback error:", error);
      res.redirect("/login?error=microsoft_auth_failed");
    }
  });

  // Test endpoint to check database (no auth required for debugging)
  app.get("/api/test-db", async (req, res) => {
    try {
      const userId = req.session.userId || "test-user";
      console.log("[TEST] User ID:", userId);
      console.log("[TEST] Testing database query...");
      
      // Test basic query - use a test user ID if not logged in
      const testResult = await storage.getContentByUserId(userId);
      console.log("[TEST] Query successful, found", testResult.length, "items");
      
      res.json({ 
        success: true, 
        userId,
        count: testResult.length,
        message: "Database query works!",
        authenticated: !!req.session.userId
      });
    } catch (error: any) {
      console.error("[TEST] Database test failed:", error);
      console.error("[TEST] Error name:", error.name);
      console.error("[TEST] Error message:", error.message);
      console.error("[TEST] Error stack:", error.stack);
      res.status(500).json({ 
        success: false,
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
        name: error.name,
        code: error.code
      });
    }
  });

  // Helper function to extract subject and grade from content data
  const extractSubjectAndGrade = (content: any): { subject: string | null; grade: string | null } => {
    try {
      const data = content.data;
      
      // Video Finder: data.searchCriteria.subject and data.searchCriteria.gradeLevel
      if (content.type === "video-finder" && data?.searchCriteria) {
        return {
          subject: data.searchCriteria.subject || null,
          grade: data.searchCriteria.gradeLevel || null,
        };
      }
      
      // Presentation: data.gradeLevel (no subject)
      if (content.type === "presentation" && data) {
        return {
          subject: null,
          grade: data.gradeLevel || null,
        };
      }
      
      // Interactive Book: data.subject and data.gradeLevel
      if (content.type === "interactive-book" && data) {
        return {
          subject: data.subject || null,
          grade: data.gradeLevel || null,
        };
      }
      
      // Other content types might have these in metadata
      if (data?.metadata) {
        return {
          subject: data.metadata.subject || null,
          grade: data.metadata.gradeLevel || data.metadata.grade || null,
        };
      }
      
      return { subject: null, grade: null };
    } catch {
      return { subject: null, grade: null };
    }
  };

  // Content routes
  app.get("/api/content", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized - no user ID in session" });
      }
      
      // Get user profile to check email
      const userProfile = await storage.getProfileById(userId);
      const userEmail = userProfile?.email || "unknown";
      
      console.log(`[DEBUG] Getting content for user: ${userId}`);
      console.log(`[DEBUG] User email: ${userEmail}`);
      
      // Special debugging for the problematic user
      if (userEmail === "royston.emmanuel@oecs.int") {
        console.log(`[DEBUG] Special handling for royston.emmanuel@oecs.int`);
        console.log(`[DEBUG] User ID type: ${typeof userId}, value: ${userId}`);
        console.log(`[DEBUG] User profile:`, JSON.stringify(userProfile, null, 2));
      }
      
      const { search, type, subject, grade, tags, startDate, endDate } = req.query;
      let contents = await storage.getContentByUserId(userId);
      
      // Apply search filter (title or description)
      if (search && typeof search === 'string') {
        const searchLower = search.toLowerCase();
        contents = contents.filter(c => 
          c.title.toLowerCase().includes(searchLower) || 
          (c.description && c.description.toLowerCase().includes(searchLower))
        );
      }
      
      // Apply content type filter
      if (type && typeof type === 'string') {
        contents = contents.filter(c => c.type === type);
      }
      
      // Apply subject filter
      if (subject && typeof subject === 'string') {
        contents = contents.filter(c => {
          const { subject: contentSubject } = extractSubjectAndGrade(c);
          return contentSubject && contentSubject.toLowerCase() === subject.toLowerCase();
        });
      }
      
      // Apply grade filter
      if (grade && typeof grade === 'string') {
        contents = contents.filter(c => {
          const { grade: contentGrade } = extractSubjectAndGrade(c);
          return contentGrade && contentGrade.toLowerCase() === grade.toLowerCase();
        });
      }
      
      // Apply tags filter (comma-separated)
      if (tags && typeof tags === 'string') {
        const tagList = tags.split(',').map(t => t.trim().toLowerCase());
        contents = contents.filter(c => 
          c.tags && c.tags.some(tag => tagList.includes(tag.toLowerCase()))
        );
      }
      
      // Apply date range filter
      if (startDate && typeof startDate === 'string') {
        const start = new Date(startDate);
        if (!isNaN(start.getTime())) {
          contents = contents.filter(c => {
            if (!c.updatedAt) return false;
            const updated = new Date(c.updatedAt);
            return !isNaN(updated.getTime()) && updated >= start;
          });
        }
      }
      if (endDate && typeof endDate === 'string') {
        const end = new Date(endDate);
        if (!isNaN(end.getTime())) {
          end.setHours(23, 59, 59, 999); // Include the entire end date
          contents = contents.filter(c => {
            if (!c.updatedAt) return false;
            const updated = new Date(c.updatedAt);
            return !isNaN(updated.getTime()) && updated <= end;
          });
        }
      }
      
      res.json(contents);
    } catch (error: any) {
      console.error("========================================");
      console.error("Get content error:", error);
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error code:", error.code);
      console.error("Error stack:", error.stack);
//   console.error("User ID:", userId); // userId is not defined; commented out to fix error
      console.error("========================================");
      res.status(500).json({ 
        message: "Failed to fetch content",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
        details: process.env.NODE_ENV === "development" ? {
          name: error.name,
          code: error.code,
          message: error.message
        } : undefined
      });
    }
  });

  // Public content route
  app.get("/api/content/public", requireAuth, async (req, res) => {
    try {
      const { search, type, subject, grade, tags, startDate, endDate } = req.query;
      console.log(`[DEBUG] Query params:`, { search, type, subject, grade, tags, startDate, endDate });
      
      let contents = await storage.getPublicContent();
      console.log(`[DEBUG] Public content query returned ${contents.length} items`);
      console.log(`[DEBUG] First item:`, contents[0] ? JSON.stringify(contents[0]) : 'none');
      
      // Apply search filter (title or description)
      if (search && typeof search === 'string') {
        const searchLower = search.toLowerCase();
        contents = contents.filter(c => 
          c.title.toLowerCase().includes(searchLower) || 
          (c.description && c.description.toLowerCase().includes(searchLower))
        );
        console.log(`[DEBUG] After search filter: ${contents.length} items`);
      }
      
      // Apply content type filter
      if (type && typeof type === 'string') {
        contents = contents.filter(c => c.type === type);
        console.log(`[DEBUG] After type filter: ${contents.length} items`);
      }
      
      // Apply subject filter
      if (subject && typeof subject === 'string') {
        contents = contents.filter(c => {
          const { subject: contentSubject } = extractSubjectAndGrade(c);
          return contentSubject && contentSubject.toLowerCase() === subject.toLowerCase();
        });
        console.log(`[DEBUG] After subject filter: ${contents.length} items`);
      }
      
      // Apply grade filter
      if (grade && typeof grade === 'string') {
        contents = contents.filter(c => {
          const { grade: contentGrade } = extractSubjectAndGrade(c);
          return contentGrade && contentGrade.toLowerCase() === grade.toLowerCase();
        });
        console.log(`[DEBUG] After grade filter: ${contents.length} items`);
      }
      
      // Apply tags filter (comma-separated)
      if (tags && typeof tags === 'string') {
        const tagList = tags.split(',').map(t => t.trim().toLowerCase());
        contents = contents.filter(c => 
          c.tags && c.tags.some((tag: string) => tagList.includes(tag.toLowerCase()))
        );
        console.log(`[DEBUG] After tags filter: ${contents.length} items`);
      }
      
      // Apply date range filter
      if (startDate && typeof startDate === 'string') {
        const start = new Date(startDate);
        if (!isNaN(start.getTime())) {
          contents = contents.filter(c => {
            if (!c.updatedAt) return false;
            const updated = new Date(c.updatedAt);
            return !isNaN(updated.getTime()) && updated >= start;
          });
          console.log(`[DEBUG] After startDate filter: ${contents.length} items`);
        }
      }
      if (endDate && typeof endDate === 'string') {
        const end = new Date(endDate);
        if (!isNaN(end.getTime())) {
          end.setHours(23, 59, 59, 999); // Include the entire end date
          contents = contents.filter(c => {
            if (!c.updatedAt) return false;
            const updated = new Date(c.updatedAt);
            return !isNaN(updated.getTime()) && updated <= end;
          });
          console.log(`[DEBUG] After endDate filter: ${contents.length} items`);
        }
      }
      
      console.log(`[DEBUG] Final response: ${contents.length} items`);
      console.log(`[DEBUG] Response data:`, JSON.stringify(contents));
      
      // Prevent caching so updates are immediately visible
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      res.json(contents);
    } catch (error: any) {
      console.error("Get public content error:", error);
      res.status(500).json({ message: "Failed to fetch public content" });
    }
  });

  app.get("/api/content/:id", requireAuth, async (req, res) => {
    try {
      const content = await storage.getContentById(req.params.id);
      if (!content) {
        return res.status(404).json({ message: "Content not found" });
      }

      if (content.userId !== req.session.userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      res.json(content);
    } catch (error: any) {
      console.error("Get content error:", error);
      res.status(500).json({ message: "Failed to fetch content" });
    }
  });

  app.post("/api/content", requireAuth, async (req, res) => {
    try {
      const { title, description, type, data, isPublished, isPublic, tags, subject, gradeLevel, ageRange } = req.body;

      if (!title || !type || !data) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const content = await storage.createContent({
        title,
        description: description || null,
        type,
        data,
        userId: req.session.userId!,
        isPublished: isPublished || false,
        isPublic: isPublic || false,
        tags: tags || null,
        subject: subject || null,
        gradeLevel: gradeLevel || null,
        ageRange: ageRange || null,
      });

      res.json(content);
    } catch (error: any) {
      console.error("Create content error:", error);
      res.status(500).json({ message: "Failed to create content" });
    }
  });

  app.put("/api/content/:id", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getContentById(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Content not found" });
      }

      if (existing.userId !== req.session.userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { title, description, data, isPublished, isPublic, tags, subject, gradeLevel, ageRange } = req.body;
      const updates: any = {};

      if (title !== undefined) updates.title = title;
      if (description !== undefined) updates.description = description;
      if (data !== undefined) updates.data = data;
      if (isPublished !== undefined) updates.isPublished = isPublished;
      if (isPublic !== undefined) updates.isPublic = isPublic;
      if (tags !== undefined) updates.tags = tags;
      if (subject !== undefined) updates.subject = subject;
      if (gradeLevel !== undefined) updates.gradeLevel = gradeLevel;
      if (ageRange !== undefined) updates.ageRange = ageRange;

      const updated = await storage.updateContent(req.params.id, updates);
      res.json(updated);
    } catch (error: any) {
      console.error("Update content error:", error);
      res.status(500).json({ message: "Failed to update content" });
    }
  });

  app.delete("/api/content/:id", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getContentById(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Content not found" });
      }

      if (existing.userId !== req.session.userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      await storage.deleteContent(req.params.id);
      res.json({ message: "Content deleted successfully" });
    } catch (error: any) {
      console.error("Delete content error:", error);
      res.status(500).json({ message: "Failed to delete content" });
    }
  });

  app.post("/api/content/:id/share", requireAuth, async (req, res) => {
    try {
      const content = await storage.getContentById(req.params.id);
      if (!content) {
        return res.status(404).json({ message: "Content not found" });
      }

      if (content.userId !== req.session.userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Ensure content is published
      if (!content.isPublished) {
        await storage.updateContent(req.params.id, { isPublished: true });
      }

      const share = await storage.createShare({
        contentId: req.params.id,
        sharedBy: req.session.userId!,
      });

      res.json(share);
    } catch (error: any) {
      console.error("Share content error:", error);
      res.status(500).json({ message: "Failed to share content" });
    }
  });

  // Copy public content to user's library
  app.post("/api/content/:id/copy", requireAuth, async (req, res) => {
    try {
      const copiedContent = await storage.copyContent(req.params.id, req.session.userId!);
      res.json(copiedContent);
    } catch (error: any) {
      console.error("Copy content error:", error);
      if (error.message === "Content not found") {
        return res.status(404).json({ message: error.message });
      }
      if (error.message === "Content must be published and public to be copied") {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to copy content" });
    }
  });

  // Public preview route
  app.get("/api/preview/:id", async (req, res) => {
    try {
      const content = await storage.getPublishedContent(req.params.id);
      if (!content) {
        return res.status(404).json({ message: "Content not found or not published" });
      }

      res.json(content);
    } catch (error: any) {
      console.error("Preview content error:", error);
      res.status(500).json({ message: "Failed to fetch content" });
    }
  });

  // AI generation route
  app.post("/api/ai/generate", requireAuth, async (req, res) => {
    // Set a timeout to prevent Heroku's 30-second limit from causing issues
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        res.status(504).json({ 
          message: "Request timeout - The AI generation is taking longer than expected. Please try again with fewer items or simpler content." 
        });
      }
    }, 25000); // 25 seconds to give us buffer before Heroku's 30s limit

    try {
      // Check if OpenAI API key is configured
      if (!process.env.OPENAI_API_KEY) {
        clearTimeout(timeout);
        return res.status(500).json({ 
          message: "OpenAI API key is not configured. Please set OPENAI_API_KEY in your environment variables." 
        });
      }

      const parsed = aiGenerationSchema.parse(req.body);

      let result: any;

      switch (parsed.contentType) {
        case "quiz":
          result = { questions: await generateQuizQuestions(parsed) };
          break;
        case "flashcard":
          result = { cards: await generateFlashcards(parsed) };
          break;
        case "interactive-video":
          result = { hotspots: await generateVideoHotspots(parsed) };
          break;
        case "image-hotspot":
          result = { hotspots: await generateImageHotspots(parsed) };
          break;
        case "drag-drop":
          result = await generateDragDropItems(parsed);
          break;
        case "fill-blanks":
          result = await generateFillBlanksBlanks(parsed);
          break;
        case "memory-game":
          result = { cards: await generateMemoryGameCards(parsed) };
          break;
        case "interactive-book":
          result = { pages: await generateInteractiveBookPages(parsed) };
          break;
        default:
          clearTimeout(timeout);
          return res.status(400).json({ message: "Invalid content type" });
      }

      clearTimeout(timeout);
      
      if (!res.headersSent) {
        res.json(result);
      }
    } catch (error: any) {
      clearTimeout(timeout);
      
      console.error("AI generation error:", error);
      
      if (res.headersSent) {
        return; // Response already sent
      }
      
      // Provide more specific error messages
      if (error.message?.includes('API key') || error.message?.includes('authentication')) {
        return res.status(401).json({ 
          message: "OpenAI API authentication failed. Please check your OPENAI_API_KEY." 
        });
      }
      
      if (error.message?.includes('timeout') || error.code === 'ETIMEDOUT') {
        return res.status(504).json({ 
          message: "Request timeout - The AI generation took too long. Please try again with fewer items." 
        });
      }
      
      if (error.message?.includes('rate limit')) {
        return res.status(429).json({ 
          message: "Rate limit exceeded. Please wait a moment and try again." 
        });
      }
      
      res.status(500).json({ 
        message: error.message || "Failed to generate content. Please try again." 
      });
    }
  });

  // Enhanced AI generation for interactive videos with YouTube search
  app.post("/api/ai/generate-interactive-video", requireAuth, async (req, res) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        res.status(504).json({ 
          message: "Request timeout - The AI generation is taking longer than expected. Please try again with fewer items or simpler content." 
        });
      }
    }, 25000);

    try {
      if (!process.env.OPENAI_API_KEY) {
        clearTimeout(timeout);
        return res.status(500).json({ 
          message: "OpenAI API key is not configured. Please set OPENAI_API_KEY in your environment variables." 
        });
      }

      const {
        topic,
        difficulty = "intermediate",
        numberOfHotspots = 5,
        gradeLevel,
        additionalContext,
        videoId,
        videoTitle,
        videoDescription,
        videoDuration,
        videoTags,
        channelTitle,
      } = req.body;

      if (!topic || !videoId) {
        clearTimeout(timeout);
        return res.status(400).json({ message: "Topic and videoId are required" });
      }

      // If video metadata is incomplete, try to fetch more details from YouTube API
      let enhancedMetadata = {
        videoTitle,
        videoDescription,
        videoDuration,
        videoTags: videoTags || [],
        channelTitle: channelTitle || "",
      };

      // Fetch enhanced metadata if we have basic info but missing tags/channel
      if (videoId && (!videoTags || videoTags.length === 0 || !channelTitle)) {
        try {
          const { getYouTubeClient } = await import('./youtube');
          const youtube = getYouTubeClient();
          
          const videoResponse = await youtube.videos.list({
            part: ['snippet'],
            id: [videoId],
          });
          
          if (videoResponse.data.items && videoResponse.data.items.length > 0) {
            const video = videoResponse.data.items[0];
            enhancedMetadata = {
              videoTitle: video.snippet?.title || videoTitle,
              videoDescription: video.snippet?.description || videoDescription,
              videoDuration: videoDuration,
              videoTags: video.snippet?.tags || videoTags || [],
              channelTitle: video.snippet?.channelTitle || channelTitle || "",
            };
          }
        } catch (error) {
          console.warn("Could not fetch enhanced video metadata:", error);
          // Continue with provided metadata
        }
      }

      const request = {
        topic,
        difficulty,
        numberOfItems: numberOfHotspots,
        gradeLevel: gradeLevel || "",
        additionalContext: additionalContext || "",
      };

      const hotspots = await generateVideoHotspots(request, enhancedMetadata);
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

      clearTimeout(timeout);
      
      if (!res.headersSent) {
        res.json({
          videoUrl,
          hotspots,
        });
      }
    } catch (error: any) {
      clearTimeout(timeout);
      
      console.error("Interactive video AI generation error:", error);
      
      if (res.headersSent) {
        return;
      }
      
      if (error.message?.includes('API key') || error.message?.includes('authentication')) {
        return res.status(401).json({ 
          message: "OpenAI API authentication failed. Please check your OPENAI_API_KEY." 
        });
      }
      
      if (error.message?.includes('timeout') || error.code === 'ETIMEDOUT') {
        return res.status(504).json({ 
          message: "Request timeout - The AI generation took too long. Please try again with fewer items." 
        });
      }
      
      if (error.message?.includes('rate limit')) {
        return res.status(429).json({ 
          message: "Rate limit exceeded. Please wait a moment and try again." 
        });
      }
      
      res.status(500).json({ 
        message: error.message || "Failed to generate interactive video. Please try again." 
      });
    }
  });

  // Chat assistant endpoint with streaming
  app.post("/api/chat", requireAuth, async (req, res) => {
    try {
      const { message, context } = req.body;
      const userId = req.session.userId!;

      if (!message || typeof message !== "string") {
        return res.status(400).json({ message: "Message is required" });
      }

      // Get user info
      const user = await storage.getProfileById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get recent chat history for context (last 10 messages)
      const history = await storage.getChatHistory(userId, 10);
      const recentMessages = history.reverse().slice(-10);

      // Build context-aware system message
      let systemMessage = `You are a helpful AI assistant for the OECS Content Creator platform, an educational content creation tool for teachers in the Organization of Eastern Caribbean States.

Your role is to help educators:
- Create engaging educational content (quizzes, flashcards, interactive videos, etc.)
- Get guidance on using the platform features
- Answer questions about educational best practices
- Provide support with content creation

User Information:
- Name: ${user.fullName}
- Role: ${user.role}
- Institution: ${user.institution || "Not specified"}

Platform Features:
- 8 content types: Quiz, Flashcard, Interactive Video, Image Hotspot, Drag & Drop, Fill in the Blanks, Memory Game, Interactive Book
- AI-powered content generation
- Progress tracking and analytics
- Public sharing and preview links
- Full accessibility support (WCAG 2.1 AA compliant)

Be conversational, friendly, and educational. Provide specific, actionable advice.`;

      // Add additional context if provided
      if (context) {
        systemMessage += `\n\nCurrent Context:\n${JSON.stringify(context, null, 2)}`;
      }

      // Build messages array for OpenAI
      const messages: any[] = [
        { role: "system", content: systemMessage },
        ...recentMessages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        { role: "user", content: message },
      ];

      // Save user message
      await storage.createChatMessage({
        userId,
        role: "user",
        content: message,
        context: context || null,
      });

      // CRITICAL: Save session before starting SSE stream
      // This ensures auth cookies remain valid during streaming in production
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Set headers for streaming
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const openai = getOpenAIClient();
      const stream = await openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        stream: true,
        max_completion_tokens: 2048,
        temperature: 0.7,
      }, {
        timeout: 60000, // 60 second timeout for streaming (longer for chat)
      });

      let fullResponse = "";

      // Stream the response
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          fullResponse += content;
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      // Save assistant response
      await storage.createChatMessage({
        userId,
        role: "assistant",
        content: fullResponse,
        context: null,
      });

      res.write(`data: [DONE]\n\n`);
      res.end();
    } catch (error: any) {
      console.error("Chat error:", error);
      if (!res.headersSent) {
        res.status(500).json({ message: error.message || "Failed to process chat" });
      } else {
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
      }
    }
  });

  // Get chat history
  app.get("/api/chat/history", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const limit = parseInt(req.query.limit as string) || 50;
      const history = await storage.getChatHistory(userId, limit);
      res.json(history.reverse());
    } catch (error: any) {
      console.error("Get chat history error:", error);
      res.status(500).json({ message: "Failed to get chat history" });
    }
  });

  // Clear chat history
  app.delete("/api/chat/history", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      await storage.deleteChatHistory(userId);
      res.json({ message: "Chat history cleared" });
    } catch (error: any) {
      console.error("Delete chat history error:", error);
      res.status(500).json({ message: "Failed to clear chat history" });
    }
  });

  // Progress tracking routes
  app.post("/api/progress", requireAuth, async (req, res) => {
    try {
      const parsed = insertLearnerProgressSchema.parse({
        ...req.body,
        userId: req.session.userId!,
        completedAt: req.body.completedAt 
          ? new Date(req.body.completedAt) 
          : (req.body.completionPercentage >= 100 ? new Date() : null),
        lastAccessedAt: new Date(),
      });

      const progress = await storage.upsertLearnerProgress(parsed);
      res.json(progress);
    } catch (error: any) {
      console.error("Save progress error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to save progress" });
    }
  });

  app.get("/api/progress/:contentId", requireAuth, async (req, res) => {
    try {
      const progress = await storage.getLearnerProgress(req.session.userId!, req.params.contentId);
      res.json(progress || null);
    } catch (error: any) {
      console.error("Get progress error:", error);
      res.status(500).json({ message: "Failed to fetch progress" });
    }
  });

  app.get("/api/progress", requireAuth, async (req, res) => {
    try {
      const progress = await storage.getAllUserProgress(req.session.userId!);
      res.json(progress);
    } catch (error: any) {
      console.error("Get all progress error:", error);
      res.status(500).json({ message: "Failed to fetch progress" });
    }
  });

  // Quiz attempt routes
  app.post("/api/quiz-attempts", requireAuth, async (req, res) => {
    try {
      const parsed = insertQuizAttemptSchema.parse({
        ...req.body,
        userId: req.session.userId!,
      });

      const attempt = await storage.createQuizAttempt(parsed);
      res.json(attempt);
    } catch (error: any) {
      console.error("Save quiz attempt error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to save quiz attempt" });
    }
  });

  app.get("/api/quiz-attempts/:contentId", requireAuth, async (req, res) => {
    try {
      const attempts = await storage.getQuizAttempts(req.session.userId!, req.params.contentId);
      res.json(attempts);
    } catch (error: any) {
      console.error("Get quiz attempts error:", error);
      res.status(500).json({ message: "Failed to fetch quiz attempts" });
    }
  });

  // Interaction event routes
  app.post("/api/interaction-events", requireAuth, async (req, res) => {
    try {
      const parsed = insertInteractionEventSchema.parse({
        ...req.body,
        userId: req.session.userId!,
      });

      const event = await storage.createInteractionEvent(parsed);
      res.json(event);
    } catch (error: any) {
      console.error("Save interaction event error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to save interaction event" });
    }
  });

  app.get("/api/interaction-events/:contentId", requireAuth, async (req, res) => {
    try {
      const events = await storage.getInteractionEvents(req.session.userId!, req.params.contentId);
      res.json(events);
    } catch (error: any) {
      console.error("Get interaction events error:", error);
      res.status(500).json({ message: "Failed to fetch interaction events" });
    }
  });

  // Recent student activity for teacher dashboard
  app.get("/api/dashboard/recent-activity", requireAuth, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const activity = await storage.getRecentStudentActivity(req.session.userId!, limit);
      res.json(activity);
    } catch (error: any) {
      console.error("Get recent activity error:", error);
      res.json([]);
    }
  });

  // Analytics routes
  app.get("/api/analytics/overview", requireAuth, async (req, res) => {
    try {
      const analytics = await storage.getUserContentAnalytics(req.session.userId!);
      res.json(analytics);
    } catch (error: any) {
      console.error("Get analytics overview error:", error);
      console.error("Error stack:", error.stack);
      // Return empty array instead of error to prevent UI breaking
      res.json([]);
    }
  });

  app.get("/api/analytics/content/:contentId", requireAuth, async (req, res) => {
    try {
      // First verify user owns this content
      const content = await storage.getContentById(req.params.contentId);
      if (!content || content.userId !== req.session.userId!) {
        return res.status(403).json({ message: "Not authorized to view analytics for this content" });
      }

      const analytics = await storage.getContentAnalytics(req.params.contentId);
      res.json(analytics);
    } catch (error: any) {
      console.error("Get content analytics error:", error);
      res.status(500).json({ message: "Failed to fetch content analytics" });
    }
  });

  app.get("/api/analytics/content/:contentId/learners", requireAuth, async (req, res) => {
    try {
      // First verify user owns this content
      const content = await storage.getContentById(req.params.contentId);
      if (!content || content.userId !== req.session.userId!) {
        return res.status(403).json({ message: "Not authorized to view learner data for this content" });
      }

      const learners = await storage.getContentLearners(req.params.contentId);
      res.json(learners);
    } catch (error: any) {
      console.error("Get content learners error:", error);
      res.status(500).json({ message: "Failed to fetch learner data" });
    }
  });

  app.get("/api/analytics/content/:contentId/questions", requireAuth, async (req, res) => {
    try {
      const content = await storage.getContentById(req.params.contentId);
      if (!content || content.userId !== req.session.userId!) {
        return res.status(403).json({ message: "Not authorized to view analytics for this content" });
      }

      const analytics = await storage.getQuestionAnalytics(req.params.contentId);
      res.json(analytics);
    } catch (error: any) {
      console.error("Get question analytics error:", error);
      res.status(500).json({ message: "Failed to fetch question analytics" });
    }
  });

  app.get("/api/analytics/content/:contentId/performance", requireAuth, async (req, res) => {
    try {
      const content = await storage.getContentById(req.params.contentId);
      if (!content || content.userId !== req.session.userId!) {
        return res.status(403).json({ message: "Not authorized to view analytics for this content" });
      }

      const performance = await storage.getStudentPerformanceDistribution(req.params.contentId);
      res.json(performance);
    } catch (error: any) {
      console.error("Get performance distribution error:", error);
      res.status(500).json({ message: "Failed to fetch performance distribution" });
    }
  });

  app.get("/api/analytics/content/:contentId/score-distribution", requireAuth, async (req, res) => {
    try {
      const content = await storage.getContentById(req.params.contentId);
      if (!content || content.userId !== req.session.userId!) {
        return res.status(403).json({ message: "Not authorized to view analytics for this content" });
      }

      const distribution = await storage.getScoreDistribution(req.params.contentId);
      res.json(distribution);
    } catch (error: any) {
      console.error("Get score distribution error:", error);
      res.status(500).json({ message: "Failed to fetch score distribution" });
    }
  });

  app.get("/api/analytics/content/:contentId/export/csv", requireAuth, async (req, res) => {
    try {
      const content = await storage.getContentById(req.params.contentId);
      if (!content || content.userId !== req.session.userId!) {
        return res.status(403).json({ message: "Not authorized to export data for this content" });
      }

      const attempts = await storage.getAllQuizAttemptsForContent(req.params.contentId);
      
      // Get user profiles for names
      const userIds = [...new Set(attempts.map(a => a.userId))];
      const userProfiles = userIds.length > 0 ? await Promise.all(
        userIds.map(id => storage.getProfileById(id))
      ) : [];
      const userMap = userProfiles.reduce((acc, profile) => {
        if (profile) acc[profile.id] = profile;
        return acc;
      }, {} as Record<string, any>);

      // Generate CSV
      const headers = ['Student Name', 'Email', 'Score', 'Total Questions', 'Percentage', 'Completed At'];
      const rows = attempts.map(attempt => {
        const user = userMap[attempt.userId];
        const percentage = ((attempt.score / attempt.totalQuestions) * 100).toFixed(1);
        return [
          user?.fullName || 'Unknown',
          user?.email || 'Unknown',
          attempt.score.toString(),
          attempt.totalQuestions.toString(),
          percentage,
          new Date(attempt.completedAt).toISOString(),
        ];
      });

      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="quiz-results-${contentId}.csv"`);
      res.send(csv);
    } catch (error: any) {
      console.error("Export CSV error:", error);
      res.status(500).json({ message: "Failed to export CSV" });
    }
  });

  app.get("/api/analytics/content/:contentId/export/json", requireAuth, async (req, res) => {
    try {
      const content = await storage.getContentById(req.params.contentId);
      if (!content || content.userId !== req.session.userId!) {
        return res.status(403).json({ message: "Not authorized to export data for this content" });
      }

      const attempts = await storage.getAllQuizAttemptsForContent(req.params.contentId);
      
      // Get user profiles for names
      const userIds = [...new Set(attempts.map(a => a.userId))];
      const userProfiles = userIds.length > 0 ? await Promise.all(
        userIds.map(id => storage.getProfileById(id))
      ) : [];
      const userMap = userProfiles.reduce((acc, profile) => {
        if (profile) acc[profile.id] = profile;
        return acc;
      }, {} as Record<string, any>);

      // Format data for export
      const exportData = {
        contentId: content.id,
        contentTitle: content.title,
        exportDate: new Date().toISOString(),
        totalAttempts: attempts.length,
        attempts: attempts.map(attempt => {
          const user = userMap[attempt.userId];
          return {
            attemptId: attempt.id,
            studentName: user?.fullName || 'Unknown',
            studentEmail: user?.email || 'Unknown',
            score: attempt.score,
            totalQuestions: attempt.totalQuestions,
            percentage: Math.round((attempt.score / attempt.totalQuestions) * 100 * 10) / 10,
            completedAt: attempt.completedAt,
            answers: attempt.answers,
          };
        }),
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="quiz-results-${contentId}.json"`);
      res.send(JSON.stringify(exportData, null, 2));
    } catch (error: any) {
      console.error("Export JSON error:", error);
      res.status(500).json({ message: "Failed to export JSON" });
    }
  });

  // Class management routes
  app.post("/api/classes", requireAuth, async (req, res) => {
    try {
      const { name, description, subject, gradeLevel } = req.body;
      
      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ message: "Class name is required" });
      }

      const class_ = await storage.createClass({
        name: name.trim(),
        description: description?.trim() || null,
        subject: subject?.trim() || null,
        gradeLevel: gradeLevel?.trim() || null,
        userId: req.session.userId!,
      });

      res.json(class_);
    } catch (error: any) {
      console.error("Create class error:", error);
      res.status(500).json({ message: "Failed to create class" });
    }
  });

  app.get("/api/classes", requireAuth, async (req, res) => {
    try {
      const classes = await storage.getClassesByUserId(req.session.userId!);
      res.json(classes);
    } catch (error: any) {
      console.error("Get classes error:", error);
      res.status(500).json({ message: "Failed to fetch classes" });
    }
  });

  app.get("/api/classes/:id", requireAuth, async (req, res) => {
    try {
      const class_ = await storage.getClassById(req.params.id);
      if (!class_) {
        return res.status(404).json({ message: "Class not found" });
      }
      if (class_.userId !== req.session.userId!) {
        return res.status(403).json({ message: "Not authorized to view this class" });
      }
      res.json(class_);
    } catch (error: any) {
      console.error("Get class error:", error);
      res.status(500).json({ message: "Failed to fetch class" });
    }
  });

  app.put("/api/classes/:id", requireAuth, async (req, res) => {
    try {
      const class_ = await storage.getClassById(req.params.id);
      if (!class_) {
        return res.status(404).json({ message: "Class not found" });
      }
      if (class_.userId !== req.session.userId!) {
        return res.status(403).json({ message: "Not authorized to update this class" });
      }

      const { name, description, subject, gradeLevel } = req.body;
      const updates: any = {};
      if (name !== undefined) updates.name = name.trim();
      if (description !== undefined) updates.description = description?.trim() || null;
      if (subject !== undefined) updates.subject = subject?.trim() || null;
      if (gradeLevel !== undefined) updates.gradeLevel = gradeLevel?.trim() || null;

      const updated = await storage.updateClass(req.params.id, updates);
      res.json(updated);
    } catch (error: any) {
      console.error("Update class error:", error);
      res.status(500).json({ message: "Failed to update class" });
    }
  });

  app.delete("/api/classes/:id", requireAuth, async (req, res) => {
    try {
      const class_ = await storage.getClassById(req.params.id);
      if (!class_) {
        return res.status(404).json({ message: "Class not found" });
      }
      if (class_.userId !== req.session.userId!) {
        return res.status(403).json({ message: "Not authorized to delete this class" });
      }

      await storage.deleteClass(req.params.id);
      res.json({ message: "Class deleted successfully" });
    } catch (error: any) {
      console.error("Delete class error:", error);
      res.status(500).json({ message: "Failed to delete class" });
    }
  });

  // Class enrollment routes
  app.get("/api/classes/:id/enrollments", requireAuth, async (req, res) => {
    try {
      const class_ = await storage.getClassById(req.params.id);
      if (!class_) {
        return res.status(404).json({ message: "Class not found" });
      }
      if (class_.userId !== req.session.userId!) {
        return res.status(403).json({ message: "Not authorized to view enrollments" });
      }

      const enrollments = await storage.getClassEnrollments(req.params.id);
      res.json(enrollments);
    } catch (error: any) {
      console.error("Get enrollments error:", error);
      res.status(500).json({ message: "Failed to fetch enrollments" });
    }
  });

  app.post("/api/classes/:id/enrollments", requireAuth, async (req, res) => {
    try {
      const class_ = await storage.getClassById(req.params.id);
      if (!class_) {
        return res.status(404).json({ message: "Class not found" });
      }
      if (class_.userId !== req.session.userId!) {
        return res.status(403).json({ message: "Not authorized to manage enrollments" });
      }

      const { userId } = req.body;
      if (!userId || typeof userId !== 'string') {
        return res.status(400).json({ message: "User ID is required" });
      }

      const enrollment = await storage.createClassEnrollment({
        classId: req.params.id,
        userId,
      });

      res.json(enrollment);
    } catch (error: any) {
      console.error("Create enrollment error:", error);
      if (error.message?.includes('unique') || error.message?.includes('duplicate')) {
        return res.status(409).json({ message: "User is already enrolled in this class" });
      }
      res.status(500).json({ message: "Failed to create enrollment" });
    }
  });

  app.delete("/api/classes/:id/enrollments/:userId", requireAuth, async (req, res) => {
    try {
      const class_ = await storage.getClassById(req.params.id);
      if (!class_) {
        return res.status(404).json({ message: "Class not found" });
      }
      if (class_.userId !== req.session.userId!) {
        return res.status(403).json({ message: "Not authorized to manage enrollments" });
      }

      await storage.deleteClassEnrollment(req.params.id, req.params.userId);
      res.json({ message: "Enrollment removed successfully" });
    } catch (error: any) {
      console.error("Delete enrollment error:", error);
      res.status(500).json({ message: "Failed to remove enrollment" });
    }
  });

  // Create a new student and enroll them in a class
  app.post("/api/classes/:id/students", requireAuth, async (req, res) => {
    try {
      const { firstName, lastName, email } = req.body;

      if (!firstName?.trim() || !lastName?.trim() || !email?.trim()) {
        return res.status(400).json({ message: "First name, last name, and email are required" });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({ message: "Invalid email format" });
      }

      const class_ = await storage.getClassById(req.params.id);
      if (!class_) {
        return res.status(404).json({ message: "Class not found" });
      }
      if (class_.userId !== req.session.userId!) {
        return res.status(403).json({ message: "Not authorized to manage this class" });
      }

      // Check if user already exists with this email
      let user = await storage.getProfileByEmail(email.trim().toLowerCase());
      let isNewUser = false;

      if (user) {
        // User exists, check if already enrolled
        const enrollments = await storage.getClassEnrollments(req.params.id);
        const alreadyEnrolled = enrollments.some((e: any) => e.userId === user!.id);
        if (alreadyEnrolled) {
          return res.status(409).json({ message: "This student is already enrolled in the class" });
        }
      } else {
        // Create new user
        const fullName = `${firstName.trim()} ${lastName.trim()}`;
        user = await storage.createProfile({
          email: email.trim().toLowerCase(),
          fullName,
          password: null, // User will need to set password via password reset
          role: 'student',
          authProvider: 'email',
        });
        isNewUser = true;
      }

      // Enroll the student
      await storage.createClassEnrollment({
        classId: req.params.id,
        userId: user.id,
      });

      // Send welcome email with password setup link for new users
      let emailSent = false;
      if (isNewUser) {
        try {
          const crypto = await import('crypto');
          const resetToken = crypto.randomBytes(32).toString('hex');
          const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours for welcome emails

          await storage.setPasswordResetToken(user.email, resetToken, expiresAt);

          const { sendWelcomeEmail } = await import('./email');
          emailSent = await sendWelcomeEmail(user.email, user.fullName, resetToken, class_.name);
        } catch (emailError) {
          console.error("Failed to send welcome email:", emailError);
          // Don't fail the request if email fails
        }
      }

      res.json({
        message: isNewUser
          ? (emailSent ? "Student created and enrolled. Welcome email sent." : "Student created and enrolled. Email could not be sent - student should use 'Forgot Password' to set their password.")
          : "Student enrolled successfully",
        student: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
        },
        emailSent,
      });
    } catch (error: any) {
      console.error("Create student error:", error);
      if (error.message?.includes('unique') || error.message?.includes('duplicate')) {
        return res.status(409).json({ message: "A user with this email already exists" });
      }
      res.status(500).json({ message: error.message || "Failed to create student" });
    }
  });

  // User search endpoint for finding students to enroll
  // Profile management routes
  app.get("/api/profile", requireAuth, async (req, res) => {
    try {
      const profile = await storage.getProfileById(req.session.userId!);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      res.json(profile);
    } catch (error: any) {
      console.error("Get profile error:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.put("/api/profile", requireAuth, async (req, res) => {
    try {
      const { fullName, institution } = req.body;
      
      if (fullName && typeof fullName === 'string' && !fullName.trim()) {
        return res.status(400).json({ message: "Full name cannot be empty" });
      }

      const updates: any = {};
      if (fullName) updates.fullName = fullName.trim();
      if (institution !== undefined) updates.institution = institution?.trim() || null;
      updates.updatedAt = new Date();

      const updated = await storage.updateProfile(req.session.userId!, updates);
      if (!updated) {
        return res.status(404).json({ message: "Profile not found" });
      }
      res.json(updated);
    } catch (error: any) {
      console.error("Update profile error:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.put("/api/profile/password", requireAuth, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ message: "New password must be at least 8 characters long" });
      }

      // Get current profile to verify password
      const profile = await storage.getProfileById(req.session.userId!);
      if (!profile || !profile.password) {
        return res.status(400).json({ message: "Password change not available for OAuth accounts" });
      }

      // Verify current password
      const isValid = await bcrypt.compare(currentPassword, profile.password);
      if (!isValid) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      const updated = await storage.updateProfile(req.session.userId!, {
        password: hashedPassword,
        updatedAt: new Date(),
      });

      if (!updated) {
        return res.status(404).json({ message: "Profile not found" });
      }

      res.json({ message: "Password updated successfully" });
    } catch (error: any) {
      console.error("Change password error:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  app.get("/api/users/search", requireAuth, async (req, res) => {
    try {
      const { email, q } = req.query;
      
      if (!email && !q) {
        return res.status(400).json({ message: "Email or search query is required" });
      }

      const searchTerm = (email || q) as string;
      
      // Search by email (exact match preferred, but also partial match)
      const user = await storage.getProfileByEmail(searchTerm);
      
      if (user) {
        return res.json([{
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          institution: user.institution,
        }]);
      }

      // If exact match not found, return empty (could extend to search by name in future)
      res.json([]);
    } catch (error: any) {
      console.error("User search error:", error);
      res.status(500).json({ message: "Failed to search users" });
    }
  });

  // Student classes route
  app.get("/api/student/classes", requireAuth, async (req, res) => {
    try {
      const studentClasses = await storage.getStudentClasses(req.session.userId!);
      res.json(studentClasses);
    } catch (error: any) {
      console.error("Get student classes error:", error);
      res.status(500).json({ message: "Failed to fetch student classes" });
    }
  });

  // Content assignment routes
  app.post("/api/content/:contentId/assignments", requireAuth, async (req, res) => {
    try {
      const content = await storage.getContentById(req.params.contentId);
      if (!content) {
        return res.status(404).json({ message: "Content not found" });
      }
      if (content.userId !== req.session.userId!) {
        return res.status(403).json({ message: "Not authorized to assign this content" });
      }

      const { classId, dueDate, instructions } = req.body;
      if (!classId || typeof classId !== 'string') {
        return res.status(400).json({ message: "Class ID is required" });
      }

      const class_ = await storage.getClassById(classId);
      if (!class_) {
        return res.status(404).json({ message: "Class not found" });
      }
      if (class_.userId !== req.session.userId!) {
        return res.status(403).json({ message: "Not authorized to assign to this class" });
      }

      const assignment = await storage.createContentAssignment({
        contentId: req.params.contentId,
        classId,
        dueDate: dueDate ? new Date(dueDate) : null,
        instructions: instructions?.trim() || null,
      });

      // Send email notifications to all students in the class (non-blocking)
      (async () => {
        try {
          console.log(`[EMAIL] Starting notification process for class: ${classId}`);
          const enrollments = await storage.getClassEnrollments(classId);
          console.log(`[EMAIL] Found ${enrollments.length} enrollments in class`);
          console.log(`[EMAIL] Enrollments:`, enrollments.map((e: any) => ({ email: e.email, role: e.role })));

          const students = enrollments
            .filter((e: any) => e.role === 'student')
            .map((e: any) => ({ email: e.email, fullName: e.fullName }));

          console.log(`[EMAIL] Found ${students.length} students to notify`);

          if (students.length > 0) {
            const { sendBulkAssignmentNotifications } = await import('./email');
            const result = await sendBulkAssignmentNotifications(
              students,
              content.title,
              content.type,
              class_.name,
              req.params.contentId,
              dueDate ? new Date(dueDate) : null,
              instructions?.trim() || null
            );
            console.log(`[EMAIL] Assignment notifications sent: ${result.sent} success, ${result.failed} failed`);
          } else {
            console.log(`[EMAIL] No students to notify in this class`);
          }
        } catch (emailError) {
          console.error('[EMAIL] Failed to send assignment notification emails:', emailError);
        }
      })();

      res.json(assignment);
    } catch (error: any) {
      console.error("Create assignment error:", error);
      if (error.message?.includes('unique') || error.message?.includes('duplicate')) {
        return res.status(409).json({ message: "Content is already assigned to this class" });
      }
      res.status(500).json({ message: "Failed to create assignment" });
    }
  });

  app.get("/api/content/:contentId/assignments", requireAuth, async (req, res) => {
    try {
      const content = await storage.getContentById(req.params.contentId);
      if (!content) {
        return res.status(404).json({ message: "Content not found" });
      }
      if (content.userId !== req.session.userId!) {
        return res.status(403).json({ message: "Not authorized to view assignments" });
      }

      const assignments = await storage.getContentAssignments(req.params.contentId);
      res.json(assignments);
    } catch (error: any) {
      console.error("Get assignments error:", error);
      res.status(500).json({ message: "Failed to fetch assignments" });
    }
  });

  app.delete("/api/content/:contentId/assignments/:classId", requireAuth, async (req, res) => {
    try {
      const content = await storage.getContentById(req.params.contentId);
      if (!content) {
        return res.status(404).json({ message: "Content not found" });
      }
      if (content.userId !== req.session.userId!) {
        return res.status(403).json({ message: "Not authorized to manage assignments" });
      }

      await storage.deleteContentAssignment(req.params.contentId, req.params.classId);
      res.json({ message: "Assignment removed successfully" });
    } catch (error: any) {
      console.error("Delete assignment error:", error);
      res.status(500).json({ message: "Failed to remove assignment" });
    }
  });

  app.get("/api/classes/:id/assignments", requireAuth, async (req, res) => {
    try {
      const class_ = await storage.getClassById(req.params.id);
      if (!class_) {
        return res.status(404).json({ message: "Class not found" });
      }
      if (class_.userId !== req.session.userId!) {
        return res.status(403).json({ message: "Not authorized to view assignments" });
      }

      const assignments = await storage.getClassAssignments(req.params.id);
      res.json(assignments);
    } catch (error: any) {
      console.error("Get class assignments error:", error);
      res.status(500).json({ message: "Failed to fetch assignments" });
    }
  });

  app.get("/api/student/assignments", requireAuth, async (req, res) => {
    try {
      const assignments = await storage.getStudentAssignments(req.session.userId!);
      res.json(assignments);
    } catch (error: any) {
      console.error("Get student assignments error:", error);
      res.status(500).json({ message: "Failed to fetch assignments" });
    }
  });

  // Helper function to parse CSV line, handling quoted fields
  function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    // Add the last field
    result.push(current);
    
    return result;
  }

  // CSV bulk upload route
  app.post("/api/classes/bulk-upload", requireAuth, async (req, res) => {
    try {
      const { csvData, classId } = req.body;
      
      if (!csvData || typeof csvData !== 'string') {
        return res.status(400).json({ message: "CSV data is required" });
      }

      // Parse CSV data
      const lines = csvData.trim().split('\n');
      if (lines.length < 2) {
        return res.status(400).json({ message: "CSV must have at least a header row and one data row" });
      }

      const headers = parseCSVLine(lines[0]).map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
      const emailIndex = headers.findIndex(h => h === 'email' || h === 'e-mail' || h === 'student_email' || h === 'email address' || h.startsWith('student_email'));
      const firstNameIndex = headers.findIndex(h => h === 'firstname' || h === 'first name' || h === 'first_name');
      const lastNameIndex = headers.findIndex(h => h === 'lastname' || h === 'last name' || h === 'last_name');
      const nameIndex = headers.findIndex(h => h === 'name' || h === 'full name' || h === 'fullname');

      const enrollments: any[] = [];
      const errors: string[] = [];
      const targetClassId = classId;

      // If classId is provided, we're enrolling in an existing class - need email column
      if (targetClassId && emailIndex === -1) {
        return res.status(400).json({ 
          message: "CSV must have an 'email' column when enrolling in an existing class. Expected format: email (or student_email)" 
        });
      }

      // If classId is provided, enroll students in that class
      // Otherwise, create new classes based on CSV data
      if (targetClassId) {
        const class_ = await storage.getClassById(targetClassId);
        if (!class_) {
          return res.status(404).json({ message: "Class not found" });
        }
        if (class_.userId !== req.session.userId!) {
          return res.status(403).json({ message: "Not authorized to manage this class" });
        }

        // Enroll students in existing class
        for (let i = 1; i < lines.length; i++) {
          const values = parseCSVLine(lines[i]).map(v => v.trim().replace(/^"|"$/g, ''));
          const email = values[emailIndex];
          
          if (!email) {
            errors.push(`Row ${i + 1}: Missing email`);
            continue;
          }

          // Find user by email, or create if doesn't exist
          let user = await storage.getProfileByEmail(email);
          if (!user) {
            // Auto-create user if they don't exist
            // Build full name from firstname + lastname, or fall back to name column, or derive from email
            let fullName: string;
            const firstName = firstNameIndex !== -1 ? values[firstNameIndex]?.trim() : '';
            const lastName = lastNameIndex !== -1 ? values[lastNameIndex]?.trim() : '';

            if (firstName || lastName) {
              fullName = `${firstName} ${lastName}`.trim();
            } else if (nameIndex !== -1 && values[nameIndex]) {
              fullName = values[nameIndex];
            } else {
              fullName = email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            }

            try {
              user = await storage.createProfile({
                email,
                fullName,
                password: null, // User will need to set password via password reset
                role: 'student',
                authProvider: 'email',
              });
            } catch (e: any) {
              errors.push(`Row ${i + 1}: Failed to create user for email ${email}: ${e.message}`);
              continue;
            }
          }

          enrollments.push({
            classId: targetClassId,
            userId: user.id,
          });
        }

        if (enrollments.length > 0) {
          await storage.bulkCreateEnrollments(enrollments);
        }
      } else {
        // Create ONE new class from CSV with student list
        // Expected format:
        // class_name,description,subject,grade_level
        // Math 101,Introduction to Mathematics,Mathematics,Grade 5
        // (blank line)
        // firstname,lastname,email
        // John,Smith,john.smith@example.com
        // Jane,Doe,jane.doe@example.com

        const classHeaders = ['class_name', 'name', 'class name'];
        const classNameIndex = headers.findIndex(h => classHeaders.includes(h));

        if (classNameIndex === -1) {
          return res.status(400).json({ message: "CSV must have a 'class_name' or 'name' column for creating classes" });
        }

        // Parse class info from the first data row
        const classValues = parseCSVLine(lines[1]).map(v => v.trim().replace(/^"|"$/g, ''));
        const className = classValues[classNameIndex];

        if (!className) {
          return res.status(400).json({ message: "Missing class name in the first data row" });
        }

        // Get description index
        const descIndex = headers.findIndex(h => h === 'description' || h === 'desc');
        const subjectIndex = headers.findIndex(h => h === 'subject');
        const gradeLevelIndex = headers.findIndex(h => h === 'grade_level' || h === 'grade level' || h === 'gradelevel');

        // Create class
        const class_ = await storage.createClass({
          name: className,
          description: descIndex !== -1 ? classValues[descIndex] : null,
          subject: subjectIndex !== -1 ? classValues[subjectIndex] : null,
          gradeLevel: gradeLevelIndex !== -1 ? classValues[gradeLevelIndex] : null,
          userId: req.session.userId!,
        });

        // Find the student section (look for firstname/lastname/email headers after a blank line)
        let studentStartIndex = -1;
        let studentHeaders: string[] = [];
        let studentEmailIndex = -1;
        let studentFirstNameIndex = -1;
        let studentLastNameIndex = -1;
        let studentNameIndex = -1;

        for (let i = 2; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue; // Skip blank lines

          const potentialHeaders = parseCSVLine(line).map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
          const hasEmailHeader = potentialHeaders.some(h =>
            h === 'email' || h === 'e-mail' || h === 'student_email' || h === 'email address'
          );
          const hasNameHeader = potentialHeaders.some(h =>
            h === 'firstname' || h === 'first name' || h === 'first_name' ||
            h === 'lastname' || h === 'last name' || h === 'last_name' ||
            h === 'name' || h === 'full name' || h === 'fullname'
          );

          if (hasEmailHeader && hasNameHeader) {
            studentHeaders = potentialHeaders;
            studentStartIndex = i + 1;
            studentEmailIndex = potentialHeaders.findIndex(h =>
              h === 'email' || h === 'e-mail' || h === 'student_email' || h === 'email address'
            );
            studentFirstNameIndex = potentialHeaders.findIndex(h =>
              h === 'firstname' || h === 'first name' || h === 'first_name'
            );
            studentLastNameIndex = potentialHeaders.findIndex(h =>
              h === 'lastname' || h === 'last name' || h === 'last_name'
            );
            studentNameIndex = potentialHeaders.findIndex(h =>
              h === 'name' || h === 'full name' || h === 'fullname'
            );
            break;
          }
        }

        let enrolledCount = 0;

        if (studentStartIndex > 0) {
          // Process student rows
          for (let i = studentStartIndex; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue; // Skip blank lines

            const values = parseCSVLine(line).map(v => v.trim().replace(/^"|"$/g, ''));
            const email = studentEmailIndex !== -1 ? values[studentEmailIndex] : null;

            if (!email || !email.includes('@')) {
              errors.push(`Row ${i + 1}: Missing or invalid email`);
              continue;
            }

            // Find or create user
            let user = await storage.getProfileByEmail(email);
            if (!user) {
              // Build full name from firstname + lastname, or fall back to name column, or derive from email
              let fullName: string;
              const firstName = studentFirstNameIndex !== -1 ? values[studentFirstNameIndex]?.trim() : '';
              const lastName = studentLastNameIndex !== -1 ? values[studentLastNameIndex]?.trim() : '';

              if (firstName || lastName) {
                fullName = `${firstName} ${lastName}`.trim();
              } else if (studentNameIndex !== -1 && values[studentNameIndex]) {
                fullName = values[studentNameIndex];
              } else {
                fullName = email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
              }

              try {
                user = await storage.createProfile({
                  email,
                  fullName,
                  password: null,
                  role: 'student',
                  authProvider: 'email',
                });
              } catch (e: any) {
                errors.push(`Row ${i + 1}: Failed to create user for ${email}: ${e.message}`);
                continue;
              }
            }

            // Enroll the user
            try {
              await storage.createClassEnrollment({
                classId: class_.id,
                userId: user.id,
              });
              enrolledCount++;
            } catch (e: any) {
              if (!e.message?.includes('unique') && !e.message?.includes('duplicate')) {
                errors.push(`Row ${i + 1}: Failed to enroll ${email}`);
              } else {
                enrolledCount++; // Already enrolled counts as success
              }
            }
          }
        }

        return res.json({
          message: `Successfully created class "${className}" with ${enrolledCount} student(s)`,
          classes: [class_],
          errors: errors.length > 0 ? errors : undefined,
        });
      }

      res.json({
        message: `Successfully enrolled ${enrollments.length} student(s)`,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error: any) {
      console.error("Bulk upload error:", error);
      res.status(500).json({ message: error.message || "Failed to process bulk upload" });
    }
  });

  // YouTube video search route (simple query-based for book pages)
  app.post("/api/youtube/search-simple", requireAuth, async (req, res) => {
    try {
      const { query, maxResults = 10 } = req.body;

      if (!query || typeof query !== 'string' || !query.trim()) {
        return res.status(400).json({ message: "Search query is required" });
      }

      if (maxResults < 1 || maxResults > 50) {
        return res.status(400).json({ message: "Max results must be between 1 and 50" });
      }

      const { searchEducationalVideos } = await import('./youtube');
      const results = await searchEducationalVideos({
        subject: "",
        topic: query.trim(),
        learningOutcome: "",
        gradeLevel: "",
        ageRange: "",
        maxResults,
      });

      res.json({ results, searchDate: new Date().toISOString() });
    } catch (error: any) {
      console.error("YouTube search error:", error);
      res.status(500).json({ 
        message: error.message || "Failed to search YouTube videos. Please try again." 
      });
    }
  });

  // YouTube video search route
  app.post("/api/youtube/search", requireAuth, async (req, res) => {
    try {
      const { subject, topic, learningOutcome, gradeLevel, ageRange, videoCount } = req.body;

      if (!subject || !topic || !learningOutcome || !gradeLevel || !videoCount) {
        return res.status(400).json({ message: "Missing required search criteria" });
      }

      if (videoCount < 1 || videoCount > 50) {
        return res.status(400).json({ message: "Video count must be between 1 and 50" });
      }

      const results = await searchEducationalVideos({
        subject,
        topic,
        learningOutcome,
        gradeLevel,
        ageRange: ageRange || '',
        maxResults: videoCount,
      });

      res.json({ results, searchDate: new Date().toISOString() });
    } catch (error: any) {
      console.error("YouTube search error:", error);
      res.status(500).json({ 
        message: error.message || "Failed to search YouTube videos. Please try again." 
      });
    }
  });

  // Video Finder AI pedagogy generation route
  app.post("/api/video-finder/generate-pedagogy", requireAuth, async (req, res) => {
    try {
      const parsed = videoFinderPedagogySchema.parse(req.body);

      const result = await generateVideoFinderPedagogy(parsed);

      res.json(result);
    } catch (error: any) {
      console.error("Video Finder pedagogy generation error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ 
        message: error.message || "Failed to generate pedagogical content. Please try again." 
      });
    }
  });

  // Presentation AI generation route
  app.post("/api/presentation/generate", requireAuth, aiGenerationRateLimit, async (req, res) => {
    // Set a timeout to prevent Heroku's 30-second limit from causing issues
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        res.status(504).json({ 
          message: "Request timeout - The AI generation is taking longer than expected. Please try again with fewer slides or simpler content." 
        });
      }
    }, 25000); // 25 seconds to give us buffer before Heroku's 30s limit

    try {
      const parsed = presentationGenerationSchema.parse(req.body);

      console.log("Presentation generation started:", {
        topic: parsed.topic,
        numberOfSlides: parsed.numberOfSlides,
        gradeLevel: parsed.gradeLevel
      });

      const slides = await generatePresentation(parsed);

      clearTimeout(timeout);
      
      if (!res.headersSent) {
        console.log("Presentation generation completed:", slides.length, "slides");
        res.json({ slides, generatedDate: new Date().toISOString() });
      }
    } catch (error: any) {
      clearTimeout(timeout);
      
      console.error("Presentation generation error:", error);
      
      if (res.headersSent) {
        return; // Response already sent
      }
      
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      
      // Check if it's a timeout error
      if (error.message?.includes('timeout') || error.code === 'ETIMEDOUT') {
        return res.status(504).json({ 
          message: "Request timeout - The AI generation took too long. Please try again with fewer slides." 
        });
      }
      
      res.status(500).json({ 
        message: error.message || "Failed to generate slides content. Please try again." 
      });
    }
  });

  // Fetch image from Unsplash for a given query
  app.post("/api/unsplash/search", requireAuth, imageSearchRateLimit, async (req, res) => {
    try {
      const { query, count = 1 } = req.body;
      
      if (!query) {
        return res.status(400).json({ message: "Query is required" });
      }

      const { searchPhotos } = await import('./unsplash');
      const photos = await searchPhotos(query, count);
      
      res.json({ photos });
    } catch (error: any) {
      console.error("Unsplash search error:", error);
      res.status(500).json({ 
        message: error.message || "Failed to search for images" 
      });
    }
  });

  // AI image generation endpoint using OpenAI DALL-E
  app.post("/api/ai/generate-image", requireAuth, async (req, res) => {
    try {
      const { prompt } = req.body;
      
      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ message: "Prompt is required" });
      }

      // Check if OpenAI API key is configured before calling getOpenAIClient
      if (!process.env.OPENAI_API_KEY) {
        return res.status(400).json({ 
          message: "OpenAI API key is not configured. Please add OPENAI_API_KEY to your environment variables to use AI image generation." 
        });
      }

      // Use OpenAI DALL-E for image generation (safe to call now that key is verified)
      let openai;
      try {
        openai = getOpenAIClient();
      } catch (configError: any) {
        return res.status(400).json({ 
          message: configError.message || "OpenAI configuration error. Please check your API key." 
        });
      }
      
      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
      });

      if (!response.data || response.data.length === 0) {
        throw new Error('No image data returned from OpenAI');
      }

      const imageUrl = response.data[0]?.url;
      
      if (!imageUrl) {
        throw new Error('No image URL returned from OpenAI');
      }

      res.json({ 
        imageUrl,
        prompt,
        revisedPrompt: response.data[0]?.revised_prompt,
      });
    } catch (error: any) {
      console.error("OpenAI image generation error:", error);
      res.status(500).json({ 
        message: error.message || "Failed to generate image with AI. Please try again." 
      });
    }
  });

  // Create actual Google Slides presentation from generated content
  app.post("/api/presentation/create-presentation", requireAuth, presentationCreationRateLimit, async (req, res) => {
    try {
      const { title, slides, colorTheme } = req.body;

      if (!title || !slides || !Array.isArray(slides)) {
        return res.status(400).json({ message: "Missing required fields: title and slides" });
      }

      // Get user profile to access Google OAuth tokens
      const user = await storage.getProfileById(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!user.googleAccessToken || !user.googleRefreshToken) {
        return res.status(403).json({
          message: "Please sign in with Google to create presentations in Google Slides. Your current account doesn't have Google Slides access."
        });
      }

      // Import services (dynamic to avoid loading if not needed)
      const { createPresentation, addSlidesToPresentation } = await import('./presentation');
      const { searchPhotos, getAltText, generateAttribution } = await import('./unsplash');
      const { GoogleAuthError, TokenExpiredError } = await import('./errors/presentation-errors');

      // Fetch real images for slides that need them (parallel processing)
      const slidesWithImages = await Promise.all(slides.map(async (slide: any) => {
        if (slide.imageUrl && typeof slide.imageUrl === 'string' && !slide.imageUrl.startsWith('http')) {
          // imageUrl contains a search query, not an actual URL
          try {
            const photos = await searchPhotos(slide.imageUrl, 1);
            if (photos.length > 0) {
              const photo = photos[0];
              return {
                ...slide,
                imageUrl: photo.urls.regular,
                imageAlt: slide.imageAlt || getAltText(photo),
                imageAttribution: generateAttribution(photo),
              };
            }
          } catch (error) {
            console.warn(`Failed to fetch image for query "${slide.imageUrl}":`, error);
            // Continue without image if fetch fails
          }
        }
        return slide;
      }));

      // Create presentation
      const { presentationId, url } = await createPresentation(user, title);

      // Add slides to presentation with options
      const result = await addSlidesToPresentation(user, presentationId, slidesWithImages, {
        colorTheme: colorTheme || 'blue',
        allowUntrustedImages: false, // Only allow trusted image domains
      });

      res.json({
        presentationId,
        url,
        message: "Presentation created successfully in Google Slides!",
        successCount: result.successCount,
        warnings: result.warnings.length > 0 ? result.warnings : undefined,
        failedSlides: result.failedSlides.length > 0 ? result.failedSlides : undefined,
      });
    } catch (error: any) {
      console.error("Create presentation error:", error);

      // Handle custom error types
      if (error.name === 'GoogleAuthError' || error.name === 'TokenExpiredError') {
        return res.status(403).json({
          message: error.message || "Please reconnect your Google account to create presentations."
        });
      }

      if (error.name === 'BatchSizeExceededError') {
        return res.status(400).json({
          message: error.message
        });
      }

      if (error.message?.includes('not connected their Google account')) {
        return res.status(403).json({
          message: "Please sign in with Google to create presentations. Go to Settings and connect your Google account."
        });
      }

      res.status(500).json({
        message: error.message || "Failed to create presentation. Please try again."
      });
    }
  });

  // Google Classroom: List teacher's courses
  app.get("/api/google-classroom/courses", requireAuth, async (req, res) => {
    try {
      const user = await storage.getProfileById(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!user.googleAccessToken) {
        return res.status(403).json({ 
          message: "Please sign in with Google to access Google Classroom. Your current account doesn't have Google access." 
        });
      }

      const { listTeacherCourses } = await import('./google-classroom');
      const courses = await listTeacherCourses(user);

      res.json({ courses });
    } catch (error: any) {
      console.error("List Google Classroom courses error:", error);
      res.status(500).json({ 
        message: error.message || "Failed to list Google Classroom courses" 
      });
    }
  });

  // Google Classroom: Share content as assignment
  app.post("/api/google-classroom/share", requireAuth, async (req, res) => {
    try {
      const { courseId, title, description, materialLink, dueDate, dueTime } = req.body;

      if (!courseId || !title || !materialLink) {
        return res.status(400).json({ 
          message: "Missing required fields: courseId, title, materialLink" 
        });
      }

      const user = await storage.getProfileById(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!user.googleAccessToken) {
        return res.status(403).json({ 
          message: "Please sign in with Google to share to Google Classroom" 
        });
      }

      const { shareToClassroom } = await import('./google-classroom');
      const coursework = await shareToClassroom(
        user,
        courseId,
        title,
        description || '',
        materialLink,
        dueDate,
        dueTime
      );

      res.json({ 
        coursework,
        message: "Successfully shared to Google Classroom!" 
      });
    } catch (error: any) {
      console.error("Share to Google Classroom error:", error);
      res.status(500).json({ 
        message: error.message || "Failed to share to Google Classroom" 
      });
    }
  });

  // Google Classroom: Post announcement
  app.post("/api/google-classroom/announce", requireAuth, async (req, res) => {
    try {
      const { courseId, text, materialLink, materialTitle } = req.body;

      if (!courseId || !text) {
        return res.status(400).json({ 
          message: "Missing required fields: courseId, text" 
        });
      }

      const user = await storage.getProfileById(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!user.googleAccessToken) {
        return res.status(403).json({ 
          message: "Please sign in with Google to post to Google Classroom" 
        });
      }

      const { postAnnouncement } = await import('./google-classroom');
      const announcement = await postAnnouncement(
        user,
        courseId,
        text,
        materialLink,
        materialTitle
      );

      res.json({ 
        announcement,
        message: "Successfully posted announcement to Google Classroom!" 
      });
    } catch (error: any) {
      console.error("Post announcement to Google Classroom error:", error);
      res.status(500).json({ 
        message: error.message || "Failed to post announcement to Google Classroom" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
