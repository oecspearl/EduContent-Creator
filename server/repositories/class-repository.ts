import { db } from "../../db";
import { classes, classEnrollments, contentAssignments, h5pContent, profiles } from "@shared/schema";
import type {
  Class, InsertClass,
  ClassEnrollment, InsertClassEnrollment,
  ContentAssignment, InsertContentAssignment,
} from "@shared/schema";
import { eq, and, desc, inArray } from "drizzle-orm";

export class ClassRepository {
  // ─── Classes ─────────────────────────────────────────────

  async create(classData: InsertClass): Promise<Class> {
    const [class_] = await db.insert(classes).values({
      ...classData,
      updatedAt: new Date(),
    }).returning();
    return class_;
  }

  async update(id: string, updates: Partial<InsertClass>): Promise<Class | undefined> {
    const [updated] = await db.update(classes)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(classes.id, id))
      .returning();
    return updated;
  }

  async delete(id: string): Promise<void> {
    await db.delete(classes).where(eq(classes.id, id));
  }

  async getById(id: string): Promise<Class | undefined> {
    const [class_] = await db.select().from(classes).where(eq(classes.id, id)).limit(1);
    return class_;
  }

  async getByUserId(userId: string): Promise<Class[]> {
    return await db.select().from(classes)
      .where(eq(classes.userId, userId))
      .orderBy(desc(classes.createdAt));
  }

  // ─── Enrollments ─────────────────────────────────────────

  async createEnrollment(enrollment: InsertClassEnrollment): Promise<ClassEnrollment> {
    const [enrollment_] = await db.insert(classEnrollments).values(enrollment).returning();
    return enrollment_;
  }

  async deleteEnrollment(classId: string, userId: string): Promise<void> {
    await db.delete(classEnrollments)
      .where(and(eq(classEnrollments.classId, classId), eq(classEnrollments.userId, userId)));
  }

  async getEnrollments(classId: string): Promise<any[]> {
    return await db
      .select({
        enrollmentId: classEnrollments.id,
        userId: profiles.id,
        fullName: profiles.fullName,
        email: profiles.email,
        role: profiles.role,
        enrolledAt: classEnrollments.enrolledAt,
      })
      .from(classEnrollments)
      .innerJoin(profiles, eq(classEnrollments.userId, profiles.id))
      .where(eq(classEnrollments.classId, classId))
      .orderBy(desc(classEnrollments.enrolledAt));
  }

  async getStudentClasses(userId: string): Promise<Class[]> {
    return await db
      .select({
        id: classes.id,
        name: classes.name,
        description: classes.description,
        userId: classes.userId,
        subject: classes.subject,
        gradeLevel: classes.gradeLevel,
        createdAt: classes.createdAt,
        updatedAt: classes.updatedAt,
      })
      .from(classEnrollments)
      .innerJoin(classes, eq(classEnrollments.classId, classes.id))
      .where(eq(classEnrollments.userId, userId))
      .orderBy(desc(classes.createdAt));
  }

  async bulkCreateEnrollments(enrollments: InsertClassEnrollment[]): Promise<ClassEnrollment[]> {
    if (enrollments.length === 0) return [];
    return await db.insert(classEnrollments).values(enrollments).returning();
  }

  // ─── Content assignments ─────────────────────────────────

  async createAssignment(assignment: InsertContentAssignment): Promise<ContentAssignment> {
    const [assignment_] = await db.insert(contentAssignments).values(assignment).returning();
    return assignment_;
  }

  async deleteAssignment(contentId: string, classId: string): Promise<void> {
    await db.delete(contentAssignments)
      .where(and(eq(contentAssignments.contentId, contentId), eq(contentAssignments.classId, classId)));
  }

  async getContentAssignments(contentId: string): Promise<any[]> {
    return await db
      .select({
        assignmentId: contentAssignments.id,
        classId: classes.id,
        className: classes.name,
        classDescription: classes.description,
        assignedAt: contentAssignments.assignedAt,
        dueDate: contentAssignments.dueDate,
        instructions: contentAssignments.instructions,
      })
      .from(contentAssignments)
      .innerJoin(classes, eq(contentAssignments.classId, classes.id))
      .where(eq(contentAssignments.contentId, contentId))
      .orderBy(desc(contentAssignments.assignedAt));
  }

  async getClassAssignments(classId: string): Promise<any[]> {
    return await db
      .select({
        assignmentId: contentAssignments.id,
        contentId: h5pContent.id,
        contentTitle: h5pContent.title,
        contentType: h5pContent.type,
        assignedAt: contentAssignments.assignedAt,
        dueDate: contentAssignments.dueDate,
        instructions: contentAssignments.instructions,
      })
      .from(contentAssignments)
      .innerJoin(h5pContent, eq(contentAssignments.contentId, h5pContent.id))
      .where(eq(contentAssignments.classId, classId))
      .orderBy(desc(contentAssignments.assignedAt));
  }

  async getStudentAssignments(userId: string): Promise<any[]> {
    const studentClassIds = await db
      .select({ classId: classEnrollments.classId })
      .from(classEnrollments)
      .where(eq(classEnrollments.userId, userId));

    if (studentClassIds.length === 0) return [];

    const classIds = studentClassIds.map(c => c.classId);

    return await db
      .select({
        assignmentId: contentAssignments.id,
        contentId: h5pContent.id,
        contentTitle: h5pContent.title,
        contentType: h5pContent.type,
        classId: classes.id,
        className: classes.name,
        assignedAt: contentAssignments.assignedAt,
        dueDate: contentAssignments.dueDate,
        instructions: contentAssignments.instructions,
      })
      .from(contentAssignments)
      .innerJoin(h5pContent, eq(contentAssignments.contentId, h5pContent.id))
      .innerJoin(classes, eq(contentAssignments.classId, classes.id))
      .where(inArray(contentAssignments.classId, classIds))
      .orderBy(desc(contentAssignments.assignedAt));
  }
}
