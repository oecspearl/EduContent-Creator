import { describe, it, expect } from "vitest";
import { extractSubjectAndGrade, filterContent } from "./content-filters";
import type { H5pContent } from "@shared/schema";

function makeContent(overrides: Partial<H5pContent> = {}): H5pContent {
  return {
    id: "1",
    title: "Test Content",
    description: "A test description",
    type: "quiz",
    data: {},
    userId: "user-1",
    isPublished: false,
    isPublic: false,
    tags: null,
    subject: null,
    gradeLevel: null,
    ageRange: null,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-06-15"),
    ...overrides,
  } as H5pContent;
}

describe("extractSubjectAndGrade", () => {
  it("extracts from video-finder searchCriteria", () => {
    const content = makeContent({
      type: "video-finder",
      data: { searchCriteria: { subject: "Math", gradeLevel: "Grade 5" } },
    });
    expect(extractSubjectAndGrade(content)).toEqual({ subject: "Math", grade: "Grade 5" });
  });

  it("extracts gradeLevel from presentation", () => {
    const content = makeContent({
      type: "presentation",
      data: { gradeLevel: "Grade 8" },
    });
    expect(extractSubjectAndGrade(content)).toEqual({ subject: null, grade: "Grade 8" });
  });

  it("extracts from interactive-book", () => {
    const content = makeContent({
      type: "interactive-book",
      data: { subject: "Science", gradeLevel: "Grade 3" },
    });
    expect(extractSubjectAndGrade(content)).toEqual({ subject: "Science", grade: "Grade 3" });
  });

  it("extracts from metadata", () => {
    const content = makeContent({
      type: "quiz",
      data: { metadata: { subject: "History", grade: "Grade 10" } },
    });
    expect(extractSubjectAndGrade(content)).toEqual({ subject: "History", grade: "Grade 10" });
  });

  it("returns nulls when no data matches", () => {
    const content = makeContent({ data: {} });
    expect(extractSubjectAndGrade(content)).toEqual({ subject: null, grade: null });
  });
});

describe("filterContent", () => {
  const contents = [
    makeContent({ id: "1", title: "Math Quiz", type: "quiz", tags: ["math", "grade5"], updatedAt: new Date("2025-03-01") }),
    makeContent({ id: "2", title: "Science Flashcards", description: "Biology review", type: "flashcard", tags: ["science"], updatedAt: new Date("2025-06-01") }),
    makeContent({ id: "3", title: "History Presentation", type: "presentation", tags: ["history"], updatedAt: new Date("2025-01-15") }),
  ];

  it("returns all when no filters applied", () => {
    expect(filterContent(contents, {})).toHaveLength(3);
  });

  it("filters by search (title)", () => {
    const result = filterContent(contents, { search: "math" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("filters by search (description)", () => {
    const result = filterContent(contents, { search: "biology" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  it("filters by type", () => {
    const result = filterContent(contents, { type: "flashcard" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  it("filters by tags", () => {
    const result = filterContent(contents, { tags: "math,history" });
    expect(result).toHaveLength(2);
  });

  it("filters by date range", () => {
    const result = filterContent(contents, { startDate: "2025-02-01", endDate: "2025-04-01" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("combines multiple filters", () => {
    const result = filterContent(contents, { search: "quiz", type: "quiz" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("returns empty for non-matching filters", () => {
    const result = filterContent(contents, { search: "nonexistent" });
    expect(result).toHaveLength(0);
  });
});
