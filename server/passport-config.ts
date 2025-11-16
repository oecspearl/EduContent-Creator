import passport from 'passport';
import { Strategy as GoogleStrategy, Profile as GoogleProfile, VerifyCallback } from 'passport-google-oauth20';
import { storage } from './storage';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import type { Profile } from '@shared/schema';

// Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        // Use relative path - Passport.js will automatically derive the full URL from the request
        // This ensures it works across localhost, workspace URLs, and custom domains
        callbackURL: '/api/auth/google/callback',
      },
      async (accessToken: string, refreshToken: string, profile: GoogleProfile, done: VerifyCallback) => {
        try {
          // Check if user exists with this Google ID or email
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(new Error('No email found in Google profile'), undefined);
          }

          let user = await storage.getProfileByEmail(email);

          if (!user) {
            // Create new OAuth user with sentinel password hash
            const sentinelPassword = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
            
            user = await storage.createProfile({
              email,
              password: sentinelPassword,
              fullName: profile.displayName || email,
              role: 'teacher',
              institution: null,
              authProvider: 'google',
              googleId: profile.id,
              microsoftId: null,
            });
          } else if (!user.googleId) {
            // Link Google account to existing email user
            await storage.updateProfile(user.id, {
              googleId: profile.id,
            });
          }

          return done(null, user);
        } catch (error) {
          return done(error as Error, undefined);
        }
      }
    )
  );
}

// Serialize user for session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await storage.getProfileById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
