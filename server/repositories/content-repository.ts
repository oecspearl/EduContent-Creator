import { db } from "../../db";
import { h5pContent, contentShares, profiles } from "@shared/schema";
import type {
  H5pContent, InsertH5pContent,
  ContentShare, InsertContentShare,
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

export class ContentRepository {
  async create(insertContent: InsertH5pContent): Promise<H5pContent> {
    const [content] = await db.insert(h5pContent).values(insertContent).returning();
    return content;
  }

  async update(id: string, updates: Partial<InsertH5pContent>): Promise<H5pContent | undefined> {
    const [content] = await db
      .update(h5pContent)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(h5pContent.id, id))
      .returning();
    return content;
  }

  async delete(id: string): Promise<void> {
    await db.delete(h5pContent).where(eq(h5pContent.id, id));
  }

  async getById(id: string): Promise<H5pContent | undefined> {
    const [content] = await db.select().from(h5pContent).where(eq(h5pContent.id, id)).limit(1);
    return content;
  }

  async getByUserId(userId: string, limit?: number): Promise<H5pContent[]> {
    const queryLimit = limit || 50;

    try {
      return await db
        .select()
        .from(h5pContent)
        .where(eq(h5pContent.userId, userId))
        .orderBy(desc(h5pContent.updatedAt))
        .limit(queryLimit);
    } catch (error: any) {
      const isOversized = error.message?.includes("response is too large") || error.message?.includes("507");
      if (!isOversized) throw error;

      console.warn(`[STORAGE] Response too large for user ${userId}. Falling back to metadata-only query.`);
      try {
        const metadata = await db
          .select({
            id: h5pContent.id,
            title: h5pContent.title,
            description: h5pContent.description,
            type: h5pContent.type,
            userId: h5pContent.userId,
            isPublished: h5pContent.isPublished,
            isPublic: h5pContent.isPublic,
            tags: h5pContent.tags,
            subject: h5pContent.subject,
            gradeLevel: h5pContent.gradeLevel,
            ageRange: h5pContent.ageRange,
            createdAt: h5pContent.createdAt,
            updatedAt: h5pContent.updatedAt,
          })
          .from(h5pContent)
          .where(eq(h5pContent.userId, userId))
          .orderBy(desc(h5pContent.updatedAt))
          .limit(queryLimit);

        return metadata.map((item) => ({ ...item, data: {} })) as H5pContent[];
      } catch {
        console.error("[STORAGE] Metadata-only query also failed. Returning empty array.");
        return [];
      }
    }
  }

  async getPublished(id: string): Promise<H5pContent | undefined> {
    const [content] = await db
      .select()
      .from(h5pContent)
      .where(and(eq(h5pContent.id, id), eq(h5pContent.isPublished, true)))
      .limit(1);
    return content;
  }

  async getPublic(): Promise<any[]> {
    return await db
      .select({
        id: h5pContent.id,
        title: h5pContent.title,
        description: h5pContent.description,
        type: h5pContent.type,
        data: h5pContent.data,
        userId: h5pContent.userId,
        isPublished: h5pContent.isPublished,
        isPublic: h5pContent.isPublic,
        tags: h5pContent.tags,
        createdAt: h5pContent.createdAt,
        updatedAt: h5pContent.updatedAt,
        creatorName: profiles.fullName,
        creatorInstitution: profiles.institution,
      })
      .from(h5pContent)
      .leftJoin(profiles, eq(h5pContent.userId, profiles.id))
      .where(and(eq(h5pContent.isPublic, true), eq(h5pContent.isPublished, true)))
      .orderBy(desc(h5pContent.createdAt));
  }

  async copy(contentId: string, userId: string): Promise<H5pContent> {
    const [original] = await db
      .select()
      .from(h5pContent)
      .where(and(
        eq(h5pContent.id, contentId),
        eq(h5pContent.isPublished, true),
        eq(h5pContent.isPublic, true)
      ))
      .limit(1);

    if (!original) {
      throw new Error("Content not found or not available for copying");
    }

    const copyData: InsertH5pContent = {
      userId,
      title: `Copy of ${original.title}`,
      description: original.description,
      type: original.type,
      data: original.data as any,
      tags: original.tags,
      isPublished: false,
      isPublic: false,
    };

    const [copiedContent] = await db.insert(h5pContent).values(copyData).returning();
    return copiedContent;
  }

  async createShare(insertShare: InsertContentShare): Promise<ContentShare> {
    const [share] = await db.insert(contentShares).values(insertShare).returning();
    return share;
  }

  async getSharesByContentId(contentId: string): Promise<ContentShare[]> {
    return await db.select().from(contentShares).where(eq(contentShares.contentId, contentId));
  }
}
