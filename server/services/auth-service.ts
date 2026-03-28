import bcrypt from "bcryptjs";
import crypto from "crypto";
import type { IStorage } from "../storage";
import type { Profile } from "@shared/schema";

/** Result returned from auth operations — either success with data or failure with message. */
export type AuthResult<T = Profile> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string };

/** Profile without the password field. */
export type SafeProfile = Omit<Profile, "password">;

function stripPassword(profile: Profile): SafeProfile {
  const { password: _, ...safe } = profile;
  return safe;
}

export class AuthService {
  constructor(private storage: IStorage) {}

  async register(input: {
    email: string;
    password: string;
    fullName: string;
    role?: string;
    institution?: string | null;
  }): Promise<AuthResult<SafeProfile>> {
    if (!input.email || !input.password || !input.fullName) {
      return { ok: false, status: 400, message: "Missing required fields" };
    }

    const existing = await this.storage.getProfileByEmail(input.email);
    if (existing) {
      return { ok: false, status: 400, message: "Email already registered" };
    }

    const profile = await this.storage.createProfile({
      email: input.email,
      password: input.password,
      fullName: input.fullName,
      role: input.role || "teacher",
      institution: input.institution || null,
    });

    return { ok: true, data: stripPassword(profile) };
  }

  async login(email: string, password: string): Promise<AuthResult<SafeProfile>> {
    if (!email || !password) {
      return { ok: false, status: 400, message: "Missing email or password" };
    }

    const profile = await this.storage.getProfileByEmail(email);
    if (!profile || !profile.password) {
      return { ok: false, status: 401, message: "Invalid credentials" };
    }

    const isValid = await bcrypt.compare(password, profile.password);
    if (!isValid) {
      return { ok: false, status: 401, message: "Invalid credentials" };
    }

    return { ok: true, data: stripPassword(profile) };
  }

  async getProfile(userId: string): Promise<AuthResult<SafeProfile>> {
    const profile = await this.storage.getProfileById(userId);
    if (!profile) {
      return { ok: false, status: 404, message: "Profile not found" };
    }
    return { ok: true, data: stripPassword(profile) };
  }

  async requestPasswordReset(email: string): Promise<{ token: string; profile: Profile } | null> {
    if (!email || typeof email !== "string") return null;

    const normalizedEmail = email.trim().toLowerCase();
    const profile = await this.storage.getProfileByEmail(normalizedEmail);
    if (!profile) return null;

    const resetToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await this.storage.setPasswordResetToken(normalizedEmail, resetToken, expiresAt);

    return { token: resetToken, profile };
  }

  async resetPassword(token: string, newPassword: string): Promise<AuthResult<{ message: string }>> {
    if (!token || typeof token !== "string") {
      return { ok: false, status: 400, message: "Reset token is required" };
    }
    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
      return { ok: false, status: 400, message: "Password must be at least 6 characters" };
    }

    const profile = await this.storage.getProfileByResetToken(token);
    if (!profile) {
      return { ok: false, status: 400, message: "Invalid or expired reset token" };
    }
    if (!profile.passwordResetExpiry || new Date() > new Date(profile.passwordResetExpiry)) {
      return { ok: false, status: 400, message: "Reset token has expired. Please request a new one." };
    }

    await this.storage.updateProfile(profile.id, { password: newPassword });
    await this.storage.clearPasswordResetToken(profile.id);

    return { ok: true, data: { message: "Password has been reset successfully. You can now log in with your new password." } };
  }

  async validateResetToken(token: string): Promise<{ valid: boolean; email?: string; message?: string }> {
    if (!token) return { valid: false, message: "Token is required" };

    const profile = await this.storage.getProfileByResetToken(token);
    if (!profile) return { valid: false, message: "Invalid reset token" };
    if (!profile.passwordResetExpiry || new Date() > new Date(profile.passwordResetExpiry)) {
      return { valid: false, message: "Reset token has expired" };
    }

    return { valid: true, email: profile.email };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<AuthResult<{ message: string }>> {
    if (!currentPassword || !newPassword) {
      return { ok: false, status: 400, message: "Current password and new password are required" };
    }
    if (newPassword.length < 8) {
      return { ok: false, status: 400, message: "New password must be at least 8 characters long" };
    }

    const profile = await this.storage.getProfileById(userId);
    if (!profile || !profile.password) {
      return { ok: false, status: 400, message: "Password change not available for OAuth accounts" };
    }

    const isValid = await bcrypt.compare(currentPassword, profile.password);
    if (!isValid) {
      return { ok: false, status: 401, message: "Current password is incorrect" };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const updated = await this.storage.updateProfile(userId, { password: hashedPassword });
    if (!updated) {
      return { ok: false, status: 404, message: "Profile not found" };
    }

    return { ok: true, data: { message: "Password updated successfully" } };
  }

  /**
   * Find or create a user from an OAuth provider.
   * Returns the profile (creating one if needed) and whether the user is new.
   */
  async findOrCreateOAuthUser(opts: {
    email: string;
    fullName: string;
    provider: "google" | "microsoft";
    providerId: string;
    googleAccessToken?: string;
    googleRefreshToken?: string;
  }): Promise<{ profile: Profile; isNew: boolean }> {
    let user = await this.storage.getProfileByEmail(opts.email);

    if (!user) {
      const sentinelPassword = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);
      user = await this.storage.createProfile({
        email: opts.email,
        password: sentinelPassword,
        fullName: opts.fullName,
        role: "teacher",
        institution: null,
        authProvider: opts.provider,
        googleId: opts.provider === "google" ? opts.providerId : null,
        microsoftId: opts.provider === "microsoft" ? opts.providerId : null,
      });

      if (opts.googleAccessToken) {
        await this.storage.updateProfile(user.id, {
          googleAccessToken: opts.googleAccessToken,
          googleRefreshToken: opts.googleRefreshToken,
        } as any);
      }

      return { profile: user, isNew: true };
    }

    // Link provider if not already linked
    const updates: Record<string, any> = {};
    if (opts.provider === "microsoft" && !user.microsoftId) {
      updates.microsoftId = opts.providerId;
    }
    if (opts.provider === "google" && !user.googleId) {
      updates.googleId = opts.providerId;
    }
    if (Object.keys(updates).length > 0) {
      await this.storage.updateProfile(user.id, updates);
    }

    return { profile: user, isNew: false };
  }
}
