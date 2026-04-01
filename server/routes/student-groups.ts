import { db } from "../../db";
import { studentGroups, studentGroupMembers, profiles } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { asyncHandler } from "../utils/async-handler";
import type { RouteContext } from "./types";

const createGroupSchema = z.object({
  classId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  memberIds: z.array(z.string()).optional(),
});

export function registerStudentGroupRoutes({ app, requireTeacher }: RouteContext) {
  // Create group
  app.post("/api/student-groups", requireTeacher, asyncHandler(async (req: any, res) => {
    const parsed = createGroupSchema.parse(req.body);
    const [group] = await db.insert(studentGroups).values({
      classId: parsed.classId,
      name: parsed.name,
      description: parsed.description || null,
    }).returning();

    if (parsed.memberIds && parsed.memberIds.length > 0) {
      await db.insert(studentGroupMembers).values(
        parsed.memberIds.map(userId => ({ groupId: group.id, userId })),
      );
    }

    res.json(group);
  }));

  // List groups for a class
  app.get("/api/classes/:classId/groups", requireTeacher, asyncHandler(async (req: any, res) => {
    const groups = await db.select().from(studentGroups)
      .where(eq(studentGroups.classId, req.params.classId));

    const enriched = await Promise.all(
      groups.map(async (group) => {
        const members = await db.select({
          userId: profiles.id,
          fullName: profiles.fullName,
          email: profiles.email,
        })
          .from(studentGroupMembers)
          .innerJoin(profiles, eq(studentGroupMembers.userId, profiles.id))
          .where(eq(studentGroupMembers.groupId, group.id));
        return { ...group, members };
      }),
    );

    res.json(enriched);
  }));

  // Add member to group
  app.post("/api/student-groups/:groupId/members", requireTeacher, asyncHandler(async (req: any, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: "userId is required" });
    const [member] = await db.insert(studentGroupMembers).values({
      groupId: req.params.groupId,
      userId,
    }).returning();
    res.json(member);
  }));

  // Remove member from group
  app.delete("/api/student-groups/:groupId/members/:userId", requireTeacher, asyncHandler(async (req: any, res) => {
    await db.delete(studentGroupMembers).where(
      and(eq(studentGroupMembers.groupId, req.params.groupId), eq(studentGroupMembers.userId, req.params.userId)),
    );
    res.json({ message: "Member removed" });
  }));

  // Delete group
  app.delete("/api/student-groups/:id", requireTeacher, asyncHandler(async (req: any, res) => {
    await db.delete(studentGroups).where(eq(studentGroups.id, req.params.id));
    res.json({ message: "Group deleted" });
  }));
}
