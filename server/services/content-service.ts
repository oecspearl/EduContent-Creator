import type { IStorage } from "../storage";
import type { H5pContent, InsertH5pContent } from "@shared/schema";
import { filterContent } from "../utils/content-filters";

export type ContentResult<T = H5pContent> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string };

export class ContentService {
  constructor(private storage: IStorage) {}

  async getUserContent(userId: string, query: Record<string, any> = {}): Promise<H5pContent[]> {
    const contents = await this.storage.getContentByUserId(userId);
    return filterContent(contents, query);
  }

  async getPublicContent(query: Record<string, any> = {}): Promise<H5pContent[]> {
    const contents = await this.storage.getPublicContent();
    return filterContent(contents, query);
  }

  async getById(id: string, userId: string, userRole?: string): Promise<ContentResult> {
    const content = await this.storage.getContentById(id);
    if (!content) return { ok: false, status: 404, message: "Content not found" };

    // Owner can always access
    if (content.userId === userId) return { ok: true, data: content };

    // Students can access content assigned to them via class enrollments
    if (userRole === "student") {
      const assignments = await this.storage.getStudentAssignments(userId);
      const isAssigned = assignments.some((a: any) => a.contentId === id);
      if (isAssigned) return { ok: true, data: content };

      // Also allow access to published public content
      if (content.isPublished && content.isPublic) return { ok: true, data: content };
    }

    return { ok: false, status: 403, message: "Forbidden" };
  }

  async create(userId: string, input: {
    title: string;
    description?: string | null;
    type: string;
    data: any;
    isPublished?: boolean;
    isPublic?: boolean;
    tags?: string[] | null;
    subject?: string | null;
    gradeLevel?: string | null;
    ageRange?: string | null;
    curriculumContext?: any | null;
  }): Promise<ContentResult> {
    if (!input.title || !input.type || !input.data) {
      return { ok: false, status: 400, message: "Missing required fields" };
    }

    const content = await this.storage.createContent({
      title: input.title,
      description: input.description || null,
      type: input.type,
      data: input.data,
      userId,
      isPublished: input.isPublished || false,
      isPublic: input.isPublic || false,
      tags: input.tags || null,
      subject: input.subject || null,
      gradeLevel: input.gradeLevel || null,
      ageRange: input.ageRange || null,
      curriculumContext: input.curriculumContext || null,
    });

    return { ok: true, data: content };
  }

  async update(id: string, userId: string, updates: Partial<InsertH5pContent>): Promise<ContentResult> {
    const existing = await this.storage.getContentById(id);
    if (!existing) return { ok: false, status: 404, message: "Content not found" };
    if (existing.userId !== userId) return { ok: false, status: 403, message: "Forbidden" };

    const updated = await this.storage.updateContent(id, updates);
    if (!updated) return { ok: false, status: 500, message: "Failed to update content" };
    return { ok: true, data: updated };
  }

  async delete(id: string, userId: string): Promise<ContentResult<{ message: string }>> {
    const existing = await this.storage.getContentById(id);
    if (!existing) return { ok: false, status: 404, message: "Content not found" };
    if (existing.userId !== userId) return { ok: false, status: 403, message: "Forbidden" };

    await this.storage.deleteContent(id);
    return { ok: true, data: { message: "Content deleted successfully" } };
  }

  async share(id: string, userId: string): Promise<ContentResult> {
    const content = await this.storage.getContentById(id);
    if (!content) return { ok: false, status: 404, message: "Content not found" };
    if (content.userId !== userId) return { ok: false, status: 403, message: "Forbidden" };

    if (!content.isPublished) {
      await this.storage.updateContent(id, { isPublished: true });
    }

    const share = await this.storage.createShare({ contentId: id, sharedBy: userId });
    return { ok: true, data: share as any };
  }

  async duplicate(id: string, userId: string): Promise<ContentResult> {
    const content = await this.storage.getContentById(id);
    if (!content) return { ok: false, status: 404, message: "Content not found" };
    if (content.userId !== userId) return { ok: false, status: 403, message: "Forbidden" };

    const duplicated = await this.storage.createContent({
      userId,
      title: `${content.title} (Copy)`,
      description: content.description,
      type: content.type,
      data: content.data as any,
      tags: content.tags,
      subject: content.subject,
      gradeLevel: content.gradeLevel,
      ageRange: content.ageRange,
      isPublished: false,
      isPublic: false,
    });
    return { ok: true, data: duplicated };
  }

  async copy(id: string, userId: string): Promise<ContentResult> {
    try {
      const copiedContent = await this.storage.copyContent(id, userId);
      return { ok: true, data: copiedContent };
    } catch (error: any) {
      if (error.message === "Content not found") return { ok: false, status: 404, message: error.message };
      if (error.message === "Content must be published and public to be copied") return { ok: false, status: 403, message: error.message };
      throw error;
    }
  }

  async getPublished(id: string): Promise<ContentResult> {
    const content = await this.storage.getPublishedContent(id);
    if (!content) return { ok: false, status: 404, message: "Content not found or not published" };
    return { ok: true, data: content };
  }

  /** Verify the calling user owns the content. Returns the content or error. */
  async verifyOwnership(contentId: string, userId: string): Promise<ContentResult> {
    const content = await this.storage.getContentById(contentId);
    if (!content || content.userId !== userId) {
      return { ok: false, status: 403, message: "Not authorized" };
    }
    return { ok: true, data: content };
  }
}
