import { curriculumRepository } from "../repositories/curriculum-repository";
import { asyncHandler } from "../utils/async-handler";
import type { RouteContext } from "./types";

export function registerCurriculumRoutes({ app, requireAuth }: RouteContext) {
  // All curriculum endpoints require authentication but are available to any role

  app.get("/api/curriculum/subjects", requireAuth, asyncHandler(async (_req, res) => {
    const subjects = await curriculumRepository.getSubjects();
    res.json(subjects);
  }));

  app.get("/api/curriculum/grades", requireAuth, asyncHandler(async (req, res) => {
    const { subject } = req.query;
    if (!subject || typeof subject !== "string") {
      return res.status(400).json({ message: "subject query parameter is required" });
    }
    const grades = await curriculumRepository.getGrades(subject);
    res.json(grades);
  }));

  app.get("/api/curriculum/strands", requireAuth, asyncHandler(async (req, res) => {
    const { subject, grade } = req.query;
    if (!subject || typeof subject !== "string" || !grade || typeof grade !== "string") {
      return res.status(400).json({ message: "subject and grade query parameters are required" });
    }
    const strands = await curriculumRepository.getStrands(subject, grade);
    res.json(strands);
  }));

  app.get("/api/curriculum/elos", requireAuth, asyncHandler(async (req, res) => {
    const { strandId } = req.query;
    if (!strandId || typeof strandId !== "string") {
      return res.status(400).json({ message: "strandId query parameter is required" });
    }
    const elos = await curriculumRepository.getElos(strandId);
    res.json(elos);
  }));

  app.get("/api/curriculum/scos", requireAuth, asyncHandler(async (req, res) => {
    const { eloId } = req.query;
    if (!eloId || typeof eloId !== "string") {
      return res.status(400).json({ message: "eloId query parameter is required" });
    }
    const scos = await curriculumRepository.getScos(eloId);
    res.json(scos);
  }));
}
