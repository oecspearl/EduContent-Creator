import { describe, it, expect, beforeEach } from "vitest";
import { AuthService } from "./auth-service";
import { makeProfile, mockStorage } from "../test-utils";

describe("AuthService", () => {
  let storage: ReturnType<typeof mockStorage>;
  let auth: AuthService;

  beforeEach(() => {
    storage = mockStorage();
    auth = new AuthService(storage);
  });

  describe("register", () => {
    it("returns error when fields are missing", async () => {
      const result = await auth.register({ email: "", password: "pass", fullName: "" });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.status).toBe(400);
    });

    it("returns error when email already exists", async () => {
      (storage.getProfileByEmail as any).mockResolvedValue(makeProfile());
      const result = await auth.register({ email: "test@example.com", password: "pass123", fullName: "Test" });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.message).toBe("Email already registered");
    });

    it("creates profile and strips password on success", async () => {
      (storage.getProfileByEmail as any).mockResolvedValue(undefined);
      (storage.createProfile as any).mockResolvedValue(makeProfile());
      const result = await auth.register({ email: "new@example.com", password: "pass123", fullName: "New User" });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).not.toHaveProperty("password");
        expect(result.data.email).toBe("test@example.com");
      }
    });
  });

  describe("login", () => {
    it("returns error for missing fields", async () => {
      const result = await auth.login("", "");
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.status).toBe(400);
    });

    it("returns error for non-existent user", async () => {
      (storage.getProfileByEmail as any).mockResolvedValue(undefined);
      const result = await auth.login("nobody@example.com", "pass");
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.status).toBe(401);
    });

    it("returns error for OAuth user without password", async () => {
      (storage.getProfileByEmail as any).mockResolvedValue(makeProfile({ password: null }));
      const result = await auth.login("test@example.com", "pass");
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.status).toBe(401);
    });
  });

  describe("getProfile", () => {
    it("returns profile without password", async () => {
      (storage.getProfileById as any).mockResolvedValue(makeProfile());
      const result = await auth.getProfile("user-1");
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.data).not.toHaveProperty("password");
    });

    it("returns 404 for unknown user", async () => {
      (storage.getProfileById as any).mockResolvedValue(undefined);
      const result = await auth.getProfile("unknown");
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.status).toBe(404);
    });
  });

  describe("requestPasswordReset", () => {
    it("returns null for non-existent email", async () => {
      (storage.getProfileByEmail as any).mockResolvedValue(undefined);
      const result = await auth.requestPasswordReset("nobody@example.com");
      expect(result).toBeNull();
    });

    it("generates token for existing user", async () => {
      const profile = makeProfile();
      (storage.getProfileByEmail as any).mockResolvedValue(profile);
      (storage.setPasswordResetToken as any).mockResolvedValue(profile);
      const result = await auth.requestPasswordReset("test@example.com");
      expect(result).not.toBeNull();
      expect(result!.token).toHaveLength(64);
      expect(storage.setPasswordResetToken).toHaveBeenCalled();
    });
  });

  describe("resetPassword", () => {
    it("rejects missing token", async () => {
      const result = await auth.resetPassword("", "newpass123");
      expect(result.ok).toBe(false);
    });

    it("rejects short password", async () => {
      const result = await auth.resetPassword("validtoken", "ab");
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.message).toContain("at least 6");
    });

    it("rejects expired token", async () => {
      (storage.getProfileByResetToken as any).mockResolvedValue(
        makeProfile({ passwordResetExpiry: new Date("2020-01-01") }),
      );
      const result = await auth.resetPassword("validtoken", "newpass123");
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.message).toContain("expired");
    });

    it("succeeds with valid token and password", async () => {
      const future = new Date(Date.now() + 3600000);
      (storage.getProfileByResetToken as any).mockResolvedValue(makeProfile({ passwordResetExpiry: future }));
      (storage.updateProfile as any).mockResolvedValue(makeProfile());
      (storage.clearPasswordResetToken as any).mockResolvedValue(undefined);

      const result = await auth.resetPassword("validtoken", "newpass123");
      expect(result.ok).toBe(true);
      expect(storage.updateProfile).toHaveBeenCalled();
      expect(storage.clearPasswordResetToken).toHaveBeenCalled();
    });
  });

  describe("validateResetToken", () => {
    it("returns invalid for missing token", async () => {
      const result = await auth.validateResetToken("");
      expect(result.valid).toBe(false);
    });

    it("returns valid for good token", async () => {
      const future = new Date(Date.now() + 3600000);
      (storage.getProfileByResetToken as any).mockResolvedValue(makeProfile({ passwordResetExpiry: future }));
      const result = await auth.validateResetToken("goodtoken");
      expect(result.valid).toBe(true);
      expect(result.email).toBe("test@example.com");
    });
  });
});
