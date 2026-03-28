import { describe, it, expect, beforeEach } from "vitest";
import { ContentService } from "./content-service";
import { makeContent, mockStorage } from "../test-utils";

describe("ContentService", () => {
  let storage: ReturnType<typeof mockStorage>;
  let svc: ContentService;

  beforeEach(() => {
    storage = mockStorage();
    svc = new ContentService(storage);
  });

  describe("getById", () => {
    it("returns 404 when content not found", async () => {
      (storage.getContentById as any).mockResolvedValue(undefined);
      const result = await svc.getById("missing", "user-1");
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.status).toBe(404);
    });

    it("returns 403 when user doesn't own content", async () => {
      (storage.getContentById as any).mockResolvedValue(makeContent({ userId: "other-user" }));
      const result = await svc.getById("content-1", "user-1");
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.status).toBe(403);
    });

    it("returns content when user owns it", async () => {
      const content = makeContent();
      (storage.getContentById as any).mockResolvedValue(content);
      const result = await svc.getById("content-1", "user-1");
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.data.id).toBe("content-1");
    });
  });

  describe("create", () => {
    it("rejects missing fields", async () => {
      const result = await svc.create("user-1", { title: "", type: "", data: null });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.status).toBe(400);
    });

    it("creates content with defaults", async () => {
      const created = makeContent();
      (storage.createContent as any).mockResolvedValue(created);
      const result = await svc.create("user-1", { title: "New", type: "quiz", data: {} });
      expect(result.ok).toBe(true);
      expect(storage.createContent).toHaveBeenCalledWith(
        expect.objectContaining({ title: "New", type: "quiz", userId: "user-1", isPublished: false, isPublic: false }),
      );
    });
  });

  describe("update", () => {
    it("returns 404 for missing content", async () => {
      (storage.getContentById as any).mockResolvedValue(undefined);
      const result = await svc.update("missing", "user-1", { title: "Updated" });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.status).toBe(404);
    });

    it("returns 403 for wrong user", async () => {
      (storage.getContentById as any).mockResolvedValue(makeContent({ userId: "other" }));
      const result = await svc.update("content-1", "user-1", { title: "Updated" });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.status).toBe(403);
    });

    it("updates and returns content", async () => {
      (storage.getContentById as any).mockResolvedValue(makeContent());
      (storage.updateContent as any).mockResolvedValue(makeContent({ title: "Updated" }));
      const result = await svc.update("content-1", "user-1", { title: "Updated" });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.data.title).toBe("Updated");
    });
  });

  describe("delete", () => {
    it("returns 403 for wrong user", async () => {
      (storage.getContentById as any).mockResolvedValue(makeContent({ userId: "other" }));
      const result = await svc.delete("content-1", "user-1");
      expect(result.ok).toBe(false);
    });

    it("deletes and confirms", async () => {
      (storage.getContentById as any).mockResolvedValue(makeContent());
      (storage.deleteContent as any).mockResolvedValue(undefined);
      const result = await svc.delete("content-1", "user-1");
      expect(result.ok).toBe(true);
      expect(storage.deleteContent).toHaveBeenCalledWith("content-1");
    });
  });

  describe("share", () => {
    it("auto-publishes unpublished content", async () => {
      (storage.getContentById as any).mockResolvedValue(makeContent({ isPublished: false }));
      (storage.updateContent as any).mockResolvedValue(makeContent({ isPublished: true }));
      (storage.createShare as any).mockResolvedValue({ id: "share-1" });

      await svc.share("content-1", "user-1");
      expect(storage.updateContent).toHaveBeenCalledWith("content-1", { isPublished: true });
    });

    it("skips publish for already-published content", async () => {
      (storage.getContentById as any).mockResolvedValue(makeContent({ isPublished: true }));
      (storage.createShare as any).mockResolvedValue({ id: "share-1" });

      await svc.share("content-1", "user-1");
      expect(storage.updateContent).not.toHaveBeenCalled();
    });
  });

  describe("verifyOwnership", () => {
    it("returns 403 when user doesn't own content", async () => {
      (storage.getContentById as any).mockResolvedValue(makeContent({ userId: "other" }));
      const result = await svc.verifyOwnership("content-1", "user-1");
      expect(result.ok).toBe(false);
    });

    it("returns ok when user owns content", async () => {
      (storage.getContentById as any).mockResolvedValue(makeContent());
      const result = await svc.verifyOwnership("content-1", "user-1");
      expect(result.ok).toBe(true);
    });

    it("returns 403 when content not found", async () => {
      (storage.getContentById as any).mockResolvedValue(undefined);
      const result = await svc.verifyOwnership("missing", "user-1");
      expect(result.ok).toBe(false);
    });
  });

  describe("getUserContent", () => {
    it("applies filters to content list", async () => {
      (storage.getContentByUserId as any).mockResolvedValue([
        makeContent({ id: "1", title: "Math Quiz", type: "quiz" }),
        makeContent({ id: "2", title: "Science Cards", type: "flashcard" }),
      ]);
      const result = await svc.getUserContent("user-1", { type: "quiz" });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("1");
    });
  });

  describe("getPublished", () => {
    it("returns 404 when not published", async () => {
      (storage.getPublishedContent as any).mockResolvedValue(undefined);
      const result = await svc.getPublished("content-1");
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.status).toBe(404);
    });

    it("returns published content", async () => {
      (storage.getPublishedContent as any).mockResolvedValue(makeContent({ isPublished: true }));
      const result = await svc.getPublished("content-1");
      expect(result.ok).toBe(true);
    });
  });
});
