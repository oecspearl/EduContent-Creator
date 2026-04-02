import { db } from "../../db";
import { studentAssignments, h5pContent, profiles } from "@shared/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { asyncHandler } from "../utils/async-handler";
import { AuthService } from "../services/auth-service";
import { NotificationService } from "../services/notification-service";
import { AuditService } from "../services/audit-service";
import { notifyUser } from "../websocket";
import type { RouteContext } from "./types";

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    if (char === '"') {
      if (inQuotes && nextChar === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) { result.push(current); current = ""; }
    else current += char;
  }
  result.push(current);
  return result;
}

export function registerClassRoutes({ app, storage, requireAuth, requireTeacher }: RouteContext) {
  const authSvc = new AuthService(storage);
  const notifSvc = new NotificationService();
  const auditSvc = new AuditService();
  // CRUD (teachers only)
  app.post("/api/classes", requireTeacher, asyncHandler(async (req: any, res) => {
    const { name, description, subject, gradeLevel } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) return res.status(400).json({ message: "Class name is required" });

    const class_ = await storage.createClass({
      name: name.trim(),
      description: description?.trim() || null,
      subject: subject?.trim() || null,
      gradeLevel: gradeLevel?.trim() || null,
      userId: req.session.userId!,
    });
    res.json(class_);
  }));

  app.get("/api/classes", requireTeacher, asyncHandler(async (req: any, res) => {
    const classes = await storage.getClassesByUserId(req.session.userId!);
    res.json(classes);
  }));

  app.get("/api/classes/:id", requireTeacher, asyncHandler(async (req: any, res) => {
    const class_ = await storage.getClassById(req.params.id);
    if (!class_) return res.status(404).json({ message: "Class not found" });
    if (class_.userId !== req.session.userId!) return res.status(403).json({ message: "Not authorized to view this class" });
    res.json(class_);
  }));

  app.put("/api/classes/:id", requireTeacher, asyncHandler(async (req: any, res) => {
    const class_ = await storage.getClassById(req.params.id);
    if (!class_) return res.status(404).json({ message: "Class not found" });
    if (class_.userId !== req.session.userId!) return res.status(403).json({ message: "Not authorized to update this class" });

    const { name, description, subject, gradeLevel } = req.body;
    const updates: any = {};
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description?.trim() || null;
    if (subject !== undefined) updates.subject = subject?.trim() || null;
    if (gradeLevel !== undefined) updates.gradeLevel = gradeLevel?.trim() || null;

    const updated = await storage.updateClass(req.params.id, updates);
    res.json(updated);
  }));

  app.delete("/api/classes/:id", requireTeacher, asyncHandler(async (req: any, res) => {
    const class_ = await storage.getClassById(req.params.id);
    if (!class_) return res.status(404).json({ message: "Class not found" });
    if (class_.userId !== req.session.userId!) return res.status(403).json({ message: "Not authorized to delete this class" });
    await storage.deleteClass(req.params.id);
    res.json({ message: "Class deleted successfully" });
  }));

  // Enrollments
  app.get("/api/classes/:id/enrollments", requireTeacher, asyncHandler(async (req: any, res) => {
    const class_ = await storage.getClassById(req.params.id);
    if (!class_) return res.status(404).json({ message: "Class not found" });
    if (class_.userId !== req.session.userId!) return res.status(403).json({ message: "Not authorized to view enrollments" });
    const enrollments = await storage.getClassEnrollments(req.params.id);
    res.json(enrollments);
  }));

  app.post("/api/classes/:id/enrollments", requireTeacher, asyncHandler(async (req: any, res) => {
    const class_ = await storage.getClassById(req.params.id);
    if (!class_) return res.status(404).json({ message: "Class not found" });
    if (class_.userId !== req.session.userId!) return res.status(403).json({ message: "Not authorized to manage enrollments" });

    const { userId } = req.body;
    if (!userId || typeof userId !== "string") return res.status(400).json({ message: "User ID is required" });

    try {
      const enrollment = await storage.createClassEnrollment({ classId: req.params.id, userId });
      res.json(enrollment);
    } catch (error: any) {
      if (error.message?.includes("unique") || error.message?.includes("duplicate")) {
        return res.status(409).json({ message: "User is already enrolled in this class" });
      }
      throw error;
    }
  }));

  app.delete("/api/classes/:id/enrollments/:userId", requireTeacher, asyncHandler(async (req: any, res) => {
    const class_ = await storage.getClassById(req.params.id);
    if (!class_) return res.status(404).json({ message: "Class not found" });
    if (class_.userId !== req.session.userId!) return res.status(403).json({ message: "Not authorized to manage enrollments" });
    await storage.deleteClassEnrollment(req.params.id, req.params.userId);
    res.json({ message: "Enrollment removed successfully" });
  }));

  // Create student and enroll
  app.post("/api/classes/:id/students", requireTeacher, asyncHandler(async (req: any, res) => {
    const { firstName, lastName, email } = req.body;
    if (!firstName?.trim() || !lastName?.trim() || !email?.trim()) {
      return res.status(400).json({ message: "First name, last name, and email are required" });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) return res.status(400).json({ message: "Invalid email format" });

    const class_ = await storage.getClassById(req.params.id);
    if (!class_) return res.status(404).json({ message: "Class not found" });
    if (class_.userId !== req.session.userId!) return res.status(403).json({ message: "Not authorized to manage this class" });

    try {
      let user = await storage.getProfileByEmail(email.trim().toLowerCase());
      let isNewUser = false;

      if (user) {
        if (user.role === "teacher" || user.role === "admin") {
          return res.status(400).json({ message: "This email belongs to a teacher account. Teachers cannot be enrolled as students." });
        }
        const enrollments = await storage.getClassEnrollments(req.params.id);
        if (enrollments.some((e: any) => e.userId === user!.id)) {
          return res.status(409).json({ message: "This student is already enrolled in the class" });
        }
      } else {
        user = await storage.createProfile({
          email: email.trim().toLowerCase(),
          fullName: `${firstName.trim()} ${lastName.trim()}`,
          password: null,
          role: "student",
          authProvider: "email",
        });
        isNewUser = true;
      }

      await storage.createClassEnrollment({ classId: req.params.id, userId: user.id });

      let emailSent = false;
      if (isNewUser) {
        try {
          const crypto = await import("crypto");
          const resetToken = crypto.randomBytes(32).toString("hex");
          const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
          await storage.setPasswordResetToken(user.email, resetToken, expiresAt);
          const { sendWelcomeEmail } = await import("../email");
          emailSent = await sendWelcomeEmail(user.email, user.fullName, resetToken, class_.name);
        } catch {
          // Don't fail request if email fails
        }
      }

      res.json({
        message: isNewUser
          ? emailSent
            ? "Student created and enrolled. Welcome email sent."
            : "Student created and enrolled. Email could not be sent - student should use 'Forgot Password' to set their password."
          : "Student enrolled successfully",
        student: { id: user.id, email: user.email, fullName: user.fullName },
        emailSent,
      });
    } catch (error: any) {
      if (error.message?.includes("unique") || error.message?.includes("duplicate")) {
        return res.status(409).json({ message: "A user with this email already exists" });
      }
      throw error;
    }
  }));

  // Profile and user search
  app.get("/api/profile", requireAuth, asyncHandler(async (req: any, res) => {
    const profile = await storage.getProfileById(req.session.userId!);
    if (!profile) return res.status(404).json({ message: "Profile not found" });
    res.json(profile);
  }));

  app.put("/api/profile", requireAuth, asyncHandler(async (req: any, res) => {
    const { fullName, institution } = req.body;
    if (fullName && typeof fullName === "string" && !fullName.trim()) {
      return res.status(400).json({ message: "Full name cannot be empty" });
    }
    const updates: any = {};
    if (fullName) updates.fullName = fullName.trim();
    if (institution !== undefined) updates.institution = institution?.trim() || null;
    updates.updatedAt = new Date();

    const updated = await storage.updateProfile(req.session.userId!, updates);
    if (!updated) return res.status(404).json({ message: "Profile not found" });
    res.json(updated);
  }));

  app.put("/api/profile/password", requireAuth, asyncHandler(async (req: any, res) => {
    const result = await authSvc.changePassword(req.session.userId!, req.body.currentPassword, req.body.newPassword);
    if (!result.ok) return res.status(result.status).json({ message: result.message });
    res.json(result.data);
  }));

  app.get("/api/users/search", requireTeacher, asyncHandler(async (req: any, res) => {
    const { email, q } = req.query;
    if (!email && !q) return res.status(400).json({ message: "Email or search query is required" });
    const searchTerm = (email || q) as string;
    const user = await storage.getProfileByEmail(searchTerm);
    if (user) {
      return res.json([{ id: user.id, email: user.email, fullName: user.fullName, role: user.role, institution: user.institution }]);
    }
    res.json([]);
  }));

  app.get("/api/student/classes", requireAuth, asyncHandler(async (req: any, res) => {
    const studentClasses = await storage.getStudentClasses(req.session.userId!);
    res.json(studentClasses);
  }));

  // Content assignments
  app.post("/api/content/:contentId/assignments", requireTeacher, asyncHandler(async (req: any, res) => {
    const content = await storage.getContentById(req.params.contentId);
    if (!content) return res.status(404).json({ message: "Content not found" });
    if (content.userId !== req.session.userId!) return res.status(403).json({ message: "Not authorized to assign this content" });

    const { classId, dueDate, instructions } = req.body;
    if (!classId || typeof classId !== "string") return res.status(400).json({ message: "Class ID is required" });

    const class_ = await storage.getClassById(classId);
    if (!class_) return res.status(404).json({ message: "Class not found" });
    if (class_.userId !== req.session.userId!) return res.status(403).json({ message: "Not authorized to assign to this class" });

    let assignment;
    try {
      assignment = await storage.createContentAssignment({
        contentId: req.params.contentId,
        classId,
        dueDate: dueDate ? new Date(dueDate) : null,
        instructions: instructions?.trim() || null,
      });
    } catch (error: any) {
      if (error.message?.includes("unique") || error.message?.includes("duplicate")) {
        return res.status(409).json({ message: "Content is already assigned to this class" });
      }
      throw error;
    }

    // Send email + in-app notifications (non-blocking)
    (async () => {
      try {
        const enrollments = await storage.getClassEnrollments(classId);
        const students = enrollments.filter((e: any) => e.role === "student");
        const studentIds = students.map((e: any) => e.userId);

        // In-app notifications
        if (studentIds.length > 0) {
          await notifSvc.createAssignmentNotification(
            studentIds, content.title, class_.name, dueDate ? new Date(dueDate) : null,
          );
          // Real-time push via WebSocket
          studentIds.forEach((id: string) => {
            notifyUser(id, "new_assignment", {
              contentTitle: content.title,
              className: class_.name,
              contentId: req.params.contentId,
            });
          });
        }

        // Audit log
        auditSvc.log({
          userId: req.session.userId!,
          action: "content_assigned",
          entityType: "assignment",
          entityId: assignment.id,
          metadata: { contentId: req.params.contentId, classId, studentCount: studentIds.length },
        });

        // Email notifications
        const studentEmails = students.map((e: any) => ({ email: e.email, fullName: e.fullName }));
        if (studentEmails.length > 0) {
          const { sendBulkAssignmentNotifications } = await import("../email");
          await sendBulkAssignmentNotifications(
            studentEmails, content.title, content.type, class_.name,
            req.params.contentId, dueDate ? new Date(dueDate) : null, instructions?.trim() || null,
          );
        }
      } catch (notifError) {
        console.error("Failed to send assignment notifications:", notifError);
      }
    })();

    res.json(assignment);
  }));

  app.get("/api/content/:contentId/assignments", requireTeacher, asyncHandler(async (req: any, res) => {
    const content = await storage.getContentById(req.params.contentId);
    if (!content) return res.status(404).json({ message: "Content not found" });
    if (content.userId !== req.session.userId!) return res.status(403).json({ message: "Not authorized to view assignments" });
    const assignments = await storage.getContentAssignments(req.params.contentId);
    res.json(assignments);
  }));

  app.delete("/api/content/:contentId/assignments/:classId", requireTeacher, asyncHandler(async (req: any, res) => {
    const content = await storage.getContentById(req.params.contentId);
    if (!content) return res.status(404).json({ message: "Content not found" });
    if (content.userId !== req.session.userId!) return res.status(403).json({ message: "Not authorized to manage assignments" });
    await storage.deleteContentAssignment(req.params.contentId, req.params.classId);
    res.json({ message: "Assignment removed successfully" });
  }));

  app.get("/api/classes/:id/assignments", requireTeacher, asyncHandler(async (req: any, res) => {
    const class_ = await storage.getClassById(req.params.id);
    if (!class_) return res.status(404).json({ message: "Class not found" });
    if (class_.userId !== req.session.userId!) return res.status(403).json({ message: "Not authorized to view assignments" });
    const assignments = await storage.getClassAssignments(req.params.id);
    res.json(assignments);
  }));

  app.get("/api/student/assignments", requireAuth, asyncHandler(async (req: any, res) => {
    const assignments = await storage.getStudentAssignments(req.session.userId!);
    res.json(assignments);
  }));

  // CSV bulk upload
  app.post("/api/classes/bulk-upload", requireTeacher, asyncHandler(async (req: any, res) => {
    const { csvData, classId } = req.body;
    if (!csvData || typeof csvData !== "string") return res.status(400).json({ message: "CSV data is required" });

    const lines = csvData.trim().split("\n");
    if (lines.length < 2) return res.status(400).json({ message: "CSV must have at least a header row and one data row" });

    const headers = parseCSVLine(lines[0]).map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());
    const emailIndex = headers.findIndex((h) => h === "email" || h === "e-mail" || h === "student_email" || h === "email address" || h.startsWith("student_email"));
    const firstNameIndex = headers.findIndex((h) => h === "firstname" || h === "first name" || h === "first_name");
    const lastNameIndex = headers.findIndex((h) => h === "lastname" || h === "last name" || h === "last_name");
    const nameIndex = headers.findIndex((h) => h === "name" || h === "full name" || h === "fullname");

    const enrollments: any[] = [];
    const errors: string[] = [];
    const targetClassId = classId;

    if (targetClassId && emailIndex === -1) {
      return res.status(400).json({ message: "CSV must have an 'email' column when enrolling in an existing class." });
    }

    if (targetClassId) {
      const class_ = await storage.getClassById(targetClassId);
      if (!class_) return res.status(404).json({ message: "Class not found" });
      if (class_.userId !== req.session.userId!) return res.status(403).json({ message: "Not authorized to manage this class" });

      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]).map((v) => v.trim().replace(/^"|"$/g, ""));
        const email = values[emailIndex];
        if (!email) { errors.push(`Row ${i + 1}: Missing email`); continue; }

        let user = await storage.getProfileByEmail(email);
        if (!user) {
          let fullName: string;
          const firstName = firstNameIndex !== -1 ? values[firstNameIndex]?.trim() : "";
          const lastName = lastNameIndex !== -1 ? values[lastNameIndex]?.trim() : "";
          if (firstName || lastName) fullName = `${firstName} ${lastName}`.trim();
          else if (nameIndex !== -1 && values[nameIndex]) fullName = values[nameIndex];
          else fullName = email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

          try {
            user = await storage.createProfile({ email, fullName, password: null, role: "student", authProvider: "email" });
          } catch (e: any) {
            errors.push(`Row ${i + 1}: Failed to create user for email ${email}: ${e.message}`);
            continue;
          }
        }
        enrollments.push({ classId: targetClassId, userId: user.id });
      }

      if (enrollments.length > 0) await storage.bulkCreateEnrollments(enrollments);
    } else {
      // Create new class from CSV
      const classHeaders = ["class_name", "name", "class name"];
      const classNameIndex = headers.findIndex((h) => classHeaders.includes(h));
      if (classNameIndex === -1) return res.status(400).json({ message: "CSV must have a 'class_name' or 'name' column for creating classes" });

      const classValues = parseCSVLine(lines[1]).map((v) => v.trim().replace(/^"|"$/g, ""));
      const className = classValues[classNameIndex];
      if (!className) return res.status(400).json({ message: "Missing class name in the first data row" });

      const descIndex = headers.findIndex((h) => h === "description" || h === "desc");
      const subjectIndex = headers.findIndex((h) => h === "subject");
      const gradeLevelIndex = headers.findIndex((h) => h === "grade_level" || h === "grade level" || h === "gradelevel");

      const class_ = await storage.createClass({
        name: className,
        description: descIndex !== -1 ? classValues[descIndex] : null,
        subject: subjectIndex !== -1 ? classValues[subjectIndex] : null,
        gradeLevel: gradeLevelIndex !== -1 ? classValues[gradeLevelIndex] : null,
        userId: req.session.userId!,
      });

      // Find student section
      let studentStartIndex = -1;
      let studentEmailIndex = -1;
      let studentFirstNameIndex = -1;
      let studentLastNameIndex = -1;
      let studentNameIndex = -1;

      for (let i = 2; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const potentialHeaders = parseCSVLine(line).map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());
        const hasEmailHeader = potentialHeaders.some((h) => h === "email" || h === "e-mail" || h === "student_email" || h === "email address");
        const hasNameHeader = potentialHeaders.some((h) =>
          h === "firstname" || h === "first name" || h === "first_name" ||
          h === "lastname" || h === "last name" || h === "last_name" ||
          h === "name" || h === "full name" || h === "fullname",
        );

        if (hasEmailHeader && hasNameHeader) {
          studentStartIndex = i + 1;
          studentEmailIndex = potentialHeaders.findIndex((h) => h === "email" || h === "e-mail" || h === "student_email" || h === "email address");
          studentFirstNameIndex = potentialHeaders.findIndex((h) => h === "firstname" || h === "first name" || h === "first_name");
          studentLastNameIndex = potentialHeaders.findIndex((h) => h === "lastname" || h === "last name" || h === "last_name");
          studentNameIndex = potentialHeaders.findIndex((h) => h === "name" || h === "full name" || h === "fullname");
          break;
        }
      }

      let enrolledCount = 0;
      if (studentStartIndex > 0) {
        for (let i = studentStartIndex; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          const values = parseCSVLine(line).map((v) => v.trim().replace(/^"|"$/g, ""));
          const email = studentEmailIndex !== -1 ? values[studentEmailIndex] : null;
          if (!email || !email.includes("@")) { errors.push(`Row ${i + 1}: Missing or invalid email`); continue; }

          let user = await storage.getProfileByEmail(email);
          if (!user) {
            let fullName: string;
            const firstName = studentFirstNameIndex !== -1 ? values[studentFirstNameIndex]?.trim() : "";
            const lastName = studentLastNameIndex !== -1 ? values[studentLastNameIndex]?.trim() : "";
            if (firstName || lastName) fullName = `${firstName} ${lastName}`.trim();
            else if (studentNameIndex !== -1 && values[studentNameIndex]) fullName = values[studentNameIndex];
            else fullName = email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

            try {
              user = await storage.createProfile({ email, fullName, password: null, role: "student", authProvider: "email" });
            } catch (e: any) {
              errors.push(`Row ${i + 1}: Failed to create user for ${email}: ${e.message}`);
              continue;
            }
          }

          try {
            await storage.createClassEnrollment({ classId: class_.id, userId: user.id });
            enrolledCount++;
          } catch (e: any) {
            if (!e.message?.includes("unique") && !e.message?.includes("duplicate")) {
              errors.push(`Row ${i + 1}: Failed to enroll ${email}`);
            } else {
              enrolledCount++;
            }
          }
        }
      }

      return res.json({
        message: `Successfully created class "${className}" with ${enrolledCount} student(s)`,
        classes: [class_],
        errors: errors.length > 0 ? errors : undefined,
      });
    }

    res.json({
      message: `Successfully enrolled ${enrollments.length} student(s)`,
      errors: errors.length > 0 ? errors : undefined,
    });
  }));

  // ─── Student-level assignments ────────────────────────────

  // Assign content to specific students
  app.post("/api/content/:contentId/student-assignments", requireTeacher, asyncHandler(async (req: any, res) => {
    const content = await storage.getContentById(req.params.contentId);
    if (!content) return res.status(404).json({ message: "Content not found" });
    if (content.userId !== req.session.userId!) return res.status(403).json({ message: "Not authorized to assign this content" });

    const { studentIds, dueDate, instructions } = req.body;
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ message: "At least one student ID is required" });
    }

    const results = [];
    const errors = [];
    for (const studentId of studentIds) {
      try {
        const [assignment] = await db.insert(studentAssignments).values({
          contentId: req.params.contentId,
          studentId,
          assignedBy: req.session.userId!,
          dueDate: dueDate ? new Date(dueDate) : null,
          instructions: instructions?.trim() || null,
        }).returning();
        results.push(assignment);

        // Notify the student
        (async () => {
          try {
            const notifSvc = new NotificationService();
            await notifSvc.create(
              studentId,
              "new_assignment",
              "New Assignment",
              `You have been assigned "${content.title}"`,
              `/preview/${req.params.contentId}`,
            );
            notifyUser(studentId, "new_assignment", {
              contentTitle: content.title,
              contentId: req.params.contentId,
            });
          } catch (e) { /* non-blocking */ }
        })();
      } catch (error: any) {
        if (error.message?.includes("unique") || error.code === "23505") {
          errors.push({ studentId, error: "Already assigned" });
        } else {
          throw error;
        }
      }
    }

    res.json({ assigned: results.length, errors });
  }));

  // List student-level assignments for a piece of content
  app.get("/api/content/:contentId/student-assignments", requireTeacher, asyncHandler(async (req: any, res) => {
    const content = await storage.getContentById(req.params.contentId);
    if (!content) return res.status(404).json({ message: "Content not found" });
    if (content.userId !== req.session.userId!) return res.status(403).json({ message: "Not authorized" });

    const assignments = await db.select({
      id: studentAssignments.id,
      studentId: studentAssignments.studentId,
      fullName: profiles.fullName,
      email: profiles.email,
      assignedAt: studentAssignments.assignedAt,
      dueDate: studentAssignments.dueDate,
      instructions: studentAssignments.instructions,
    })
      .from(studentAssignments)
      .innerJoin(profiles, eq(studentAssignments.studentId, profiles.id))
      .where(eq(studentAssignments.contentId, req.params.contentId))
      .orderBy(desc(studentAssignments.assignedAt));

    res.json(assignments);
  }));

  // Remove a student-level assignment
  app.delete("/api/content/:contentId/student-assignments/:studentId", requireTeacher, asyncHandler(async (req: any, res) => {
    const content = await storage.getContentById(req.params.contentId);
    if (!content) return res.status(404).json({ message: "Content not found" });
    if (content.userId !== req.session.userId!) return res.status(403).json({ message: "Not authorized" });

    await db.delete(studentAssignments).where(and(
      eq(studentAssignments.contentId, req.params.contentId),
      eq(studentAssignments.studentId, req.params.studentId),
    ));
    res.json({ message: "Student assignment removed" });
  }));
}
