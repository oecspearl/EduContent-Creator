import { pool } from "../../db/index";

export class CurriculumRepository {
  /** Distinct subjects available in the curriculum spine. */
  async getSubjects(): Promise<Array<{ subjectSlug: string; subjectName: string }>> {
    const result = await pool!.query(
      `SELECT DISTINCT subject_slug, subject_name
       FROM curriculum_spine_strands
       ORDER BY subject_name`,
    );
    return result.rows.map((r: any) => ({ subjectSlug: r.subject_slug, subjectName: r.subject_name }));
  }

  /** Grade levels available for a given subject. */
  async getGrades(subjectSlug: string): Promise<Array<{ gradeLevel: string }>> {
    const result = await pool!.query(
      `SELECT DISTINCT grade_level
       FROM curriculum_spine_strands
       WHERE subject_slug = $1
       ORDER BY grade_level`,
      [subjectSlug],
    );
    return result.rows.map((r: any) => ({ gradeLevel: r.grade_level }));
  }

  /** Strands for a subject + grade combination. */
  async getStrands(subjectSlug: string, gradeLevel: string): Promise<Array<{ id: string; strandName: string; strandOrder: number }>> {
    const result = await pool!.query(
      `SELECT id, strand_name, strand_order
       FROM curriculum_spine_strands
       WHERE subject_slug = $1 AND grade_level = $2
       ORDER BY strand_order`,
      [subjectSlug, gradeLevel],
    );
    return result.rows.map((r: any) => ({ id: r.id, strandName: r.strand_name, strandOrder: r.strand_order }));
  }

  /** Essential Learning Outcomes under a strand. */
  async getElos(strandId: string): Promise<Array<{ id: string; eloText: string; eloOrder: number }>> {
    const result = await pool!.query(
      `SELECT id, elo_text, elo_order
       FROM curriculum_spine_elos
       WHERE strand_id = $1
       ORDER BY elo_order`,
      [strandId],
    );
    return result.rows.map((r: any) => ({ id: r.id, eloText: r.elo_text, eloOrder: r.elo_order }));
  }

  /** Specific Curriculum Outcomes under an ELO. */
  async getScos(eloId: string): Promise<Array<{ id: string; scoText: string; scoOrder: number }>> {
    const result = await pool!.query(
      `SELECT id, sco_text, sco_order
       FROM curriculum_spine_scos
       WHERE elo_id = $1
       ORDER BY sco_order`,
      [eloId],
    );
    return result.rows.map((r: any) => ({ id: r.id, scoText: r.sco_text, scoOrder: r.sco_order }));
  }
}

export const curriculumRepository = new CurriculumRepository();
