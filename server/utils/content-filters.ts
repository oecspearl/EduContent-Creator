import type { H5pContent } from "@shared/schema";

/** Extract subject and grade from content-type-specific data shapes. */
export function extractSubjectAndGrade(content: H5pContent): { subject: string | null; grade: string | null } {
  try {
    const data = content.data as Record<string, any>;

    if (content.type === "video-finder" && data?.searchCriteria) {
      return {
        subject: data.searchCriteria.subject || null,
        grade: data.searchCriteria.gradeLevel || null,
      };
    }

    if (content.type === "presentation" && data) {
      return { subject: null, grade: data.gradeLevel || null };
    }

    if (content.type === "interactive-book" && data) {
      return { subject: data.subject || null, grade: data.gradeLevel || null };
    }

    if (data?.metadata) {
      return {
        subject: data.metadata.subject || null,
        grade: data.metadata.gradeLevel || data.metadata.grade || null,
      };
    }

    return { subject: null, grade: null };
  } catch {
    return { subject: null, grade: null };
  }
}

interface ContentFilterQuery {
  search?: string;
  type?: string;
  subject?: string;
  grade?: string;
  tags?: string;
  startDate?: string;
  endDate?: string;
}

/** Apply standard search/type/subject/grade/tags/date filters to a content list. */
export function filterContent(contents: H5pContent[], query: ContentFilterQuery): H5pContent[] {
  let result = contents;

  if (query.search) {
    const searchLower = query.search.toLowerCase();
    result = result.filter(
      (c) =>
        c.title.toLowerCase().includes(searchLower) ||
        (c.description && c.description.toLowerCase().includes(searchLower)),
    );
  }

  if (query.type) {
    result = result.filter((c) => c.type === query.type);
  }

  if (query.subject) {
    const subjectLower = query.subject.toLowerCase();
    result = result.filter((c) => {
      const { subject } = extractSubjectAndGrade(c);
      return subject && subject.toLowerCase() === subjectLower;
    });
  }

  if (query.grade) {
    const gradeLower = query.grade.toLowerCase();
    result = result.filter((c) => {
      const { grade } = extractSubjectAndGrade(c);
      return grade && grade.toLowerCase() === gradeLower;
    });
  }

  if (query.tags) {
    const tagList = query.tags.split(",").map((t) => t.trim().toLowerCase());
    result = result.filter(
      (c) => c.tags && c.tags.some((tag: string) => tagList.includes(tag.toLowerCase())),
    );
  }

  if (query.startDate) {
    const start = new Date(query.startDate);
    if (!isNaN(start.getTime())) {
      result = result.filter((c) => {
        if (!c.updatedAt) return false;
        const updated = new Date(c.updatedAt);
        return !isNaN(updated.getTime()) && updated >= start;
      });
    }
  }

  if (query.endDate) {
    const end = new Date(query.endDate);
    if (!isNaN(end.getTime())) {
      end.setHours(23, 59, 59, 999);
      result = result.filter((c) => {
        if (!c.updatedAt) return false;
        const updated = new Date(c.updatedAt);
        return !isNaN(updated.getTime()) && updated <= end;
      });
    }
  }

  return result;
}
