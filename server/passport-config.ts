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
        // Request Slides API and Classroom API access
        scope: [
          'profile',
          'email',
          'https://www.googleapis.com/auth/presentations', // Google Slides API
          'https://www.googleapis.com/auth/classroom.courses.readonly', // List Classroom courses
          'https://www.googleapis.com/auth/classroom.coursework.students', // Create coursework/assignments
          'https://www.googleapis.com/auth/classroom.announcements', // Create announcements
        ],
      } as any,
      async (accessToken: string, refreshToken: string, profile: GoogleProfile, done: VerifyCallback) => {
        try {
          // Check if user exists with this Google ID or email
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(new Error('No email found in Google profile'), undefined);
          }

          let user = await storage.getProfileByEmail(email);

          // Calculate token expiry (typically 1 hour from now)
          const tokenExpiry = new Date(Date.now() + 3600 * 1000);

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
              googleAccessToken: accessToken,
              googleRefreshToken: refreshToken,
              googleTokenExpiry: tokenExpiry,
            });
          } else {
            // Update existing user with new tokens
            await storage.updateProfile(user.id, {
              googleId: profile.id,
              googleAccessToken: accessToken,
              googleRefreshToken: refreshToken || user.googleRefreshToken, // Keep existing if new one not provided
              googleTokenExpiry: tokenExpiry,
            });
            // Refresh user object
            user = await storage.getProfileById(user.id);
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
