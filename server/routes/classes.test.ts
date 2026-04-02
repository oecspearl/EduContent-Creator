import { describe, it, expect } from "vitest";
import { z } from "zod";

/**
 * Tests for the Zod validation schemas used in class routes.
 *
 * These schemas are defined at the top of classes.ts.
 * We re-define them here to test in isolation without importing
 * the full route module (which has Express/DB side effects).
 */

const createClassSchema = z.object({
  name: z.string().min(1, "Class name is required").transform(s => s.trim()),
  description: z.string().nullable().optional().transform(s => s?.trim() || null),
  subject: z.string().nullable().optional().transform(s => s?.trim() || null),
  gradeLevel: z.string().nullable().optional().transform(s => s?.trim() || null),
});

const enrollStudentSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
});

const createStudentSchema = z.object({
  firstName: z.string().min(1, "First name is required").transform(s => s.trim()),
  lastName: z.string().min(1, "Last name is required").transform(s => s.trim()),
  email: z.string().email("Invalid email format").transform(s => s.trim().toLowerCase()),
  classId: z.string().min(1),
});

const assignContentSchema = z.object({
  classId: z.string().min(1, "Class ID is required"),
  dueDate: z.string().optional(),
  instructions: z.string().optional().transform(s => s?.trim() || undefined),
});

const studentAssignmentSchema = z.object({
  studentIds: z.array(z.string().min(1)).min(1, "At least one student ID is required"),
  dueDate: z.string().optional(),
  instructions: z.string().optional().transform(s => s?.trim() || undefined),
});

describe("Class route validation schemas", () => {
  describe("createClassSchema", () => {
    it("accepts valid class data", () => {
      const result = createClassSchema.parse({ name: "Math 101" });
      expect(result.name).toBe("Math 101");
      expect(result.description).toBeNull();
    });

    it("trims whitespace", () => {
      const result = createClassSchema.parse({ name: "  Math 101  ", description: "  desc  " });
      expect(result.name).toBe("Math 101");
      expect(result.description).toBe("desc");
    });

    it("rejects empty name", () => {
      expect(() => createClassSchema.parse({ name: "" })).toThrow();
    });

    it("rejects missing name", () => {
      expect(() => createClassSchema.parse({})).toThrow();
    });

    it("converts empty description to null", () => {
      const result = createClassSchema.parse({ name: "Test", description: "   " });
      expect(result.description).toBeNull();
    });
  });

  describe("enrollStudentSchema", () => {
    it("accepts valid userId", () => {
      const result = enrollStudentSchema.parse({ userId: "abc-123" });
      expect(result.userId).toBe("abc-123");
    });

    it("rejects empty userId", () => {
      expect(() => enrollStudentSchema.parse({ userId: "" })).toThrow();
    });

    it("rejects missing userId", () => {
      expect(() => enrollStudentSchema.parse({})).toThrow();
    });
  });

  describe("createStudentSchema", () => {
    it("accepts valid student data", () => {
      const result = createStudentSchema.parse({
        firstName: "Jane",
        lastName: "Doe",
        email: "Jane.Doe@School.edu",
        classId: "class-1",
      });
      expect(result.firstName).toBe("Jane");
      expect(result.lastName).toBe("Doe");
      expect(result.email).toBe("jane.doe@school.edu"); // lowercased
    });

    it("rejects invalid email", () => {
      expect(() => createStudentSchema.parse({
        firstName: "Jane", lastName: "Doe", email: "not-an-email", classId: "c1",
      })).toThrow();
    });

    it("rejects empty firstName", () => {
      expect(() => createStudentSchema.parse({
        firstName: "", lastName: "Doe", email: "j@e.com", classId: "c1",
      })).toThrow();
    });

    it("trims names", () => {
      const result = createStudentSchema.parse({
        firstName: "  Jane  ", lastName: "  Doe  ", email: "j@e.com", classId: "c1",
      });
      expect(result.firstName).toBe("Jane");
      expect(result.lastName).toBe("Doe");
    });
  });

  describe("assignContentSchema", () => {
    it("accepts valid assignment", () => {
      const result = assignContentSchema.parse({ classId: "class-1" });
      expect(result.classId).toBe("class-1");
      expect(result.dueDate).toBeUndefined();
      expect(result.instructions).toBeUndefined();
    });

    it("trims instructions", () => {
      const result = assignContentSchema.parse({ classId: "c1", instructions: "  Do this  " });
      expect(result.instructions).toBe("Do this");
    });

    it("converts blank instructions to undefined", () => {
      const result = assignContentSchema.parse({ classId: "c1", instructions: "   " });
      expect(result.instructions).toBeUndefined();
    });

    it("rejects missing classId", () => {
      expect(() => assignContentSchema.parse({})).toThrow();
    });
  });

  describe("studentAssignmentSchema", () => {
    it("accepts valid student IDs", () => {
      const result = studentAssignmentSchema.parse({ studentIds: ["s1", "s2"] });
      expect(result.studentIds).toEqual(["s1", "s2"]);
    });

    it("rejects empty array", () => {
      expect(() => studentAssignmentSchema.parse({ studentIds: [] })).toThrow();
    });

    it("rejects empty string in array", () => {
      expect(() => studentAssignmentSchema.parse({ studentIds: ["s1", ""] })).toThrow();
    });

    it("rejects missing studentIds", () => {
      expect(() => studentAssignmentSchema.parse({})).toThrow();
    });
  });
});
