import type { RouteContext } from "./types";

export function registerClassroomRoutes({ app, storage, requireTeacher }: RouteContext) {
  // List teacher's Google Classroom courses (teachers only)
  app.get("/api/google-classroom/courses", requireTeacher, async (req: any, res) => {
    try {
      const user = await storage.getProfileById(req.session.userId!);
      if (!user) return res.status(404).json({ message: "User not found" });
      if (!user.googleAccessToken) {
        return res.status(403).json({ message: "Please sign in with Google to access Google Classroom." });
      }

      const { listTeacherCourses } = await import("../google-classroom");
      const courses = await listTeacherCourses(user);
      res.json({ courses });
    } catch (error: any) {
      console.error("List Google Classroom courses error:", error);
      res.status(500).json({ message: error.message || "Failed to list Google Classroom courses" });
    }
  });

  // Share content as assignment
  app.post("/api/google-classroom/share", requireTeacher, async (req: any, res) => {
    try {
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
    } catch (error: any) {
      console.error("Share to Google Classroom error:", error);
      res.status(500).json({ message: error.message || "Failed to share to Google Classroom" });
    }
  });

  // Post announcement
  app.post("/api/google-classroom/announce", requireTeacher, async (req: any, res) => {
    try {
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
    } catch (error: any) {
      console.error("Post announcement to Google Classroom error:", error);
      res.status(500).json({ message: error.message || "Failed to post announcement to Google Classroom" });
    }
  });
}
