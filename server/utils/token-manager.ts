/**
 * Token refresh manager with locking mechanism to prevent race conditions
 */

import type { Profile } from '@shared/schema';
import { google } from 'googleapis';
import { storage } from '../storage';
import { TokenRefreshError } from '../errors/presentation-errors';

// In-memory lock to prevent concurrent token refreshes for the same user
const refreshLocks = new Map<string, Promise<void>>();

/**
 * Refreshes Google OAuth token with locking to prevent race conditions
 * @param user - User profile
 * @param oauth2Client - OAuth2 client instance
 * @returns Updated user profile with new tokens
 */
export async function refreshGoogleToken(
  user: Profile,
  oauth2Client: any
): Promise<Profile> {
  // Check if a refresh is already in progress for this user
  const existingLock = refreshLocks.get(user.id);
  if (existingLock) {
    // Wait for the existing refresh to complete
    await existingLock;
    // Re-fetch the user with updated tokens
    const updatedUser = await storage.getProfileById(user.id);
    if (!updatedUser) {
      throw new Error('User not found after token refresh');
    }
    return updatedUser;
  }

  // Create a new refresh lock
  const refreshPromise = (async () => {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();

      // Update user profile with new tokens
      await storage.updateProfile(user.id, {
        googleAccessToken: credentials.access_token || user.googleAccessToken,
        googleTokenExpiry: credentials.expiry_date
          ? new Date(credentials.expiry_date)
          : user.googleTokenExpiry,
      });

      // Update oauth2Client with new credentials
      oauth2Client.setCredentials(credentials);
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw new TokenRefreshError();
    } finally {
      // Remove lock after refresh completes or fails
      refreshLocks.delete(user.id);
    }
  })();

  // Store the lock
  refreshLocks.set(user.id, refreshPromise);

  // Wait for refresh to complete
  await refreshPromise;

  // Re-fetch the user with updated tokens
  const updatedUser = await storage.getProfileById(user.id);
  if (!updatedUser) {
    throw new Error('User not found after token refresh');
  }

  return updatedUser;
}

/**
 * Checks if a token needs refresh (expires within 5 minutes)
 * @param tokenExpiry - Token expiry timestamp
 * @returns True if token needs refresh
 */
export function needsTokenRefresh(tokenExpiry: Date | null): boolean {
  if (!tokenExpiry) return false;

  const now = new Date();
  const expiryTime = new Date(tokenExpiry);
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  return expiryTime <= fiveMinutesFromNow;
}

/**
 * Clears the refresh lock for a user (useful for testing)
 * @param userId - User ID
 */
export function clearRefreshLock(userId: string): void {
  refreshLocks.delete(userId);
}
