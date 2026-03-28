import passportConfig from "../passport-config";
import { getMsalClient, getRedirectUri } from "../msal-config";
import { AuthService } from "../services/auth-service";
import type { RouteContext } from "./types";

export function registerAuthRoutes(
  { app, storage }: RouteContext,
  isGoogleOAuthAvailable: boolean,
  isMicrosoftOAuthAvailable: boolean,
) {
  const auth = new AuthService(storage);

  // Register
  app.post("/api/auth/register", async (req, res) => {
    try {
      const result = await auth.register(req.body);
      if (!result.ok) return res.status(result.status).json({ message: result.message });

      req.session.userId = (result.data as any).id;
      await new Promise<void>((resolve, reject) => {
        req.session.save((err: any) => (err ? reject(err) : resolve()));
      });
      res.json(result.data);
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const result = await auth.login(email, password);
      if (!result.ok) return res.status(result.status).json({ message: result.message });

      req.session.userId = (result.data as any).id;
      await new Promise<void>((resolve, reject) => {
        req.session.save((err: any) => (err ? reject(err) : resolve()));
      });
      res.json(result.data);
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Get current user
  app.get("/api/auth/me", (req: any, res: any, next: any) => {
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    next();
  }, async (req: any, res: any) => {
    try {
      const result = await auth.getProfile(req.session.userId!);
      if (!result.ok) return res.status(result.status).json({ message: result.message });
      res.json(result.data);
    } catch (error: any) {
      console.error("Get profile error:", error);
      res.status(500).json({ message: "Failed to get profile" });
    }
  });

  // Available providers
  app.get("/api/auth/providers", (_req, res) => {
    res.json({ google: isGoogleOAuthAvailable, microsoft: isMicrosoftOAuthAvailable });
  });

  // Logout
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ message: "Logout failed" });
      res.json({ message: "Logged out successfully" });
    });
  });

  // Forgot password
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const result = await auth.requestPasswordReset(req.body.email);
      // Always return success to prevent email enumeration
      const successMsg = "If an account exists with that email, a password reset link will be sent.";
      if (!result) return res.json({ message: successMsg });

      const { sendPasswordResetEmail } = await import("../email");
      await sendPasswordResetEmail(result.profile.email, result.profile.fullName, result.token);
      res.json({ message: successMsg });
    } catch (error: any) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Failed to process request" });
    }
  });

  // Reset password
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const result = await auth.resetPassword(req.body.token, req.body.password);
      if (!result.ok) return res.status(result.status).json({ message: result.message });
      res.json(result.data);
    } catch (error: any) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Validate reset token
  app.get("/api/auth/validate-reset-token", async (req, res) => {
    try {
      const result = await auth.validateResetToken(req.query.token as string);
      if (!result.valid) return res.status(result.message === "Token is required" ? 400 : 200).json(result);
      res.json(result);
    } catch (error: any) {
      console.error("Validate reset token error:", error);
      res.status(500).json({ valid: false, message: "Failed to validate token" });
    }
  });

  // Google OAuth
  app.get("/api/auth/google", (req, res, next) => {
    if (!isGoogleOAuthAvailable) {
      return res.status(503).json({
        message: "Google authentication is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
      });
    }
    const returnTo = req.query.returnTo as string;
    if (returnTo && returnTo.startsWith("/")) req.session.oauthReturnTo = returnTo;

    passportConfig.authenticate("google", {
      scope: [
        "profile", "email",
        "https://www.googleapis.com/auth/presentations",
        "https://www.googleapis.com/auth/drive.file",
        "https://www.googleapis.com/auth/classroom.courses.readonly",
        "https://www.googleapis.com/auth/classroom.coursework.students",
        "https://www.googleapis.com/auth/classroom.announcements",
      ],
      accessType: "offline",
      prompt: "consent",
    } as any)(req, res, next);
  });

  app.get("/api/auth/google/callback", (req, res, next) => {
    if (!isGoogleOAuthAvailable) return res.redirect("/login?error=google_not_configured");

    passportConfig.authenticate("google", {
      failureRedirect: "/login?error=google_auth_failed",
      failureMessage: true,
    }, (err: any, user: any) => {
      if (err) {
        console.error("[Google OAuth] Authentication error:", err);
        return res.redirect("/login?error=google_auth_error&message=" + encodeURIComponent(err.message || "Unknown error"));
      }
      if (!user) return res.redirect("/login?error=google_no_user");

      req.logIn(user, (loginErr: any) => {
        if (loginErr) {
          console.error("[Google OAuth] Login error:", loginErr);
          return res.redirect("/login?error=login_failed");
        }
        req.session.userId = user.id;
        const returnTo = req.session.oauthReturnTo;
        delete req.session.oauthReturnTo;

        req.session.save((saveErr: any) => {
          if (saveErr) {
            console.error("[Google OAuth] Session save error:", saveErr);
            return res.redirect("/login?error=session_save_failed");
          }
          const target = (returnTo && returnTo.startsWith("/") && !returnTo.includes("//"))
            ? returnTo + "?googleAuthSuccess=true"
            : "/dashboard?googleAuthSuccess=true";
          res.redirect(target);
        });
      });
    })(req, res, next);
  });

  // Microsoft OAuth
  app.get("/api/auth/microsoft", async (req, res) => {
    if (!isMicrosoftOAuthAvailable) {
      return res.status(503).json({
        message: "Microsoft authentication is not configured. Please set MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET.",
      });
    }
    const returnTo = req.query.returnTo as string;
    if (returnTo && returnTo.startsWith("/")) req.session.oauthReturnTo = returnTo;

    try {
      const msalClient = getMsalClient();
      if (!msalClient) return res.status(503).json({ message: "Microsoft OAuth client not configured" });
      const redirectUri = getRedirectUri(req);
      const authUrl = await msalClient.getAuthCodeUrl({ scopes: ["user.read"], redirectUri });
      res.redirect(authUrl);
    } catch (error) {
      console.error("Microsoft OAuth initiation error:", error);
      res.status(500).json({ message: "Failed to initiate Microsoft authentication" });
    }
  });

  app.get("/api/auth/microsoft/callback", async (req, res) => {
    if (!isMicrosoftOAuthAvailable) return res.redirect("/login?error=microsoft_not_configured");
    if (req.query.error) return res.redirect(`/login?error=${req.query.error}`);
    if (!req.query.code) return res.redirect("/login?error=no_code");

    try {
      const msalClient = getMsalClient();
      if (!msalClient) return res.redirect("/login?error=microsoft_not_configured");

      const redirectUri = getRedirectUri(req);
      const response = await msalClient.acquireTokenByCode({
        code: req.query.code as string,
        scopes: ["user.read"],
        redirectUri,
      });

      if (!response || !response.account) return res.redirect("/login?error=microsoft_no_account");

      // Fetch user info from Graph API
      let email: string | null = null;
      let name: string | null = null;
      try {
        const graphResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
          headers: { Authorization: `Bearer ${response.accessToken}` },
        });
        if (graphResponse.ok) {
          const userInfo = await graphResponse.json();
          email = userInfo.mail || userInfo.userPrincipalName || userInfo.email;
          name = userInfo.displayName || userInfo.givenName || userInfo.name;
        }
      } catch {
        // Fall through to account fallback
      }

      if (!email) {
        const account = response.account;
        email = account.username || account.localAccountId;
        name = name || account.name || account.username?.split("@")[0] || "User";
      }

      const microsoftId = response.account.homeAccountId;
      if (!email) return res.redirect("/login?error=microsoft_no_email");

      const { profile } = await auth.findOrCreateOAuthUser({
        email,
        fullName: name || email,
        provider: "microsoft",
        providerId: microsoftId,
      });

      req.session.userId = profile.id;
      const returnTo = req.session.oauthReturnTo;
      delete req.session.oauthReturnTo;

      req.session.save((err) => {
        if (err) {
          console.error("Microsoft OAuth: Session save error:", err);
          return res.redirect("/login?error=session_failed");
        }
        const target = (returnTo && returnTo.startsWith("/") && !returnTo.includes("//"))
          ? returnTo + "?microsoftAuthSuccess=true"
          : "/dashboard?microsoftAuthSuccess=true";
        res.redirect(target);
      });
    } catch (error) {
      console.error("Microsoft OAuth callback error:", error);
      res.redirect("/login?error=microsoft_auth_failed");
    }
  });
}
