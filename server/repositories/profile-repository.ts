import { db } from "../../db";
import { profiles } from "@shared/schema";
import type { Profile, InsertProfile } from "@shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export class ProfileRepository {
  async create(insertProfile: InsertProfile): Promise<Profile> {
    const password = insertProfile.password
      ? (insertProfile.password.startsWith('$2') ? insertProfile.password : await bcrypt.hash(insertProfile.password, 10))
      : null;

    const [profile] = await db
      .insert(profiles)
      .values({ ...insertProfile, password })
      .returning();
    return profile;
  }

  async update(id: string, updates: Partial<InsertProfile>): Promise<Profile | undefined> {
    if (updates.password && typeof updates.password === 'string' && !updates.password.startsWith('$2')) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    const updateData: any = { ...updates };
    updateData.updatedAt = new Date();

    const [profile] = await db
      .update(profiles)
      .set(updateData)
      .where(eq(profiles.id, id))
      .returning();
    return profile;
  }

  async getById(id: string): Promise<Profile | undefined> {
    const [profile] = await db.select().from(profiles).where(eq(profiles.id, id)).limit(1);
    return profile;
  }

  async getByEmail(email: string): Promise<Profile | undefined> {
    const [profile] = await db.select().from(profiles).where(eq(profiles.email, email)).limit(1);
    return profile;
  }

  async setPasswordResetToken(email: string, token: string, expiresAt: Date): Promise<Profile | undefined> {
    const [profile] = await db
      .update(profiles)
      .set({
        passwordResetToken: token,
        passwordResetExpiry: expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(profiles.email, email))
      .returning();
    return profile;
  }

  async getByResetToken(token: string): Promise<Profile | undefined> {
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.passwordResetToken, token))
      .limit(1);
    return profile;
  }

  async clearPasswordResetToken(id: string): Promise<void> {
    await db
      .update(profiles)
      .set({
        passwordResetToken: null,
        passwordResetExpiry: null,
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, id));
  }
}
