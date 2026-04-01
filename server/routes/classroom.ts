import type { RouteContext } from "./types";
import { asyncHandler } from "../utils/async-handler";

export function registerClassroomRoutes({ app, storage, requireTeacher }: RouteContext) {
  // List teacher's Google Classroom courses (teachers only)
  app.get("/api/google-classroom/courses", requireTeacher, asyncHandler(async (req: any, res) => {
    const user = await storage.getProfileById(req.session.userId!);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!user.googleAccessToken) {
      return res.status(403).json({ message: "Please sign in with Google to access Google Classroom." });
    }

    const { listTeacherCourses } = await import("../google-classroom");
    const courses = await listTeacherCourses(user);
    res.json({ courses });
  }));

  // Share content as assignment
  app.post("/api/google-classroom/share", requireTeacher, asyncHandler(async (req: any, res) => {
    const { courseId, title, description, materialLink, dueDate, dueTime } = req.body;
    if (!courseId || !title || !materialLink) {
      return res.status(400).json({ message: "Missing required fields: courseId, title, materialLink" });
    }

    const user = await storage.getProfileById(req.session.userId!);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!user.googleAccessToken) {
      return res.status(403).json({ message: "Please sign in with Google to share to Google Classroom" });
    }

    const { shareToClassroom } = await import("../google-classroom");
    const coursework = await shareToClassroom(user, courseId, title, description || "", materialLink, dueDate, dueTime);
    res.json({ coursework, message: "Successfully shared to Google Classroom!" });
  }));

  // Post announcement
  app.post("/api/google-classroom/announce", requireTeacher, asyncHandler(async (req: any, res) => {
    const { courseId, text, materialLink, materialTitle } = req.body;
    if (!courseId || !text) {
      return res.status(400).json({ message: "Missing required fields: courseId, text" });
    }

    const user = await storage.getProfileById(req.session.userId!);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!user.googleAccessToken) {
      return res.status(403).json({ message: "Please sign in with Google to post to Google Classroom" });
    }

    const { postAnnouncement } = await import("../google-classroom");
    const announcement = await postAnnouncement(user, courseId, text, materialLink, materialTitle);
    res.json({ announcement, message: "Successfully posted announcement to Google Classroom!" });
  }));
}
