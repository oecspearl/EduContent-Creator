import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const SUBJECTS = [
  "English Language",
  "Mathematics",
  "Science",
  "Social Studies",
  "Visual Arts",
  "Music",
  "Drama/Theatre Arts",
  "Physical Education",
  "Religious Education/Values Education",
  "Agricultural Science",
  "Information and Communication Technology (ICT)",
  "Health and Family Life Education",
] as const;

const GRADE_LEVELS = [
  "Kindergarten",
  "Grade 1",
  "Grade 2",
  "Grade 3",
  "Grade 4",
  "Grade 5",
  "Grade 6",
  "Grade 7",
  "Grade 8",
  "Grade 9",
  "Grade 10",
  "Grade 11",
  "Grade 12",
] as const;

const AGE_RANGES = [
  "3-5 years",
  "5-7 years",
  "7-9 years",
  "9-11 years",
  "11-13 years",
  "13-15 years",
  "15-17 years",
  "17-19 years",
] as const;

type ContentMetadataFieldsProps = {
  subject: string;
  gradeLevel: string;
  ageRange: string;
  onSubjectChange: (value: string) => void;
  onGradeLevelChange: (value: string) => void;
  onAgeRangeChange: (value: string) => void;
};

export function ContentMetadataFields({
  subject,
  gradeLevel,
  ageRange,
  onSubjectChange,
  onGradeLevelChange,
  onAgeRangeChange,
}: ContentMetadataFieldsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="space-y-2">
        <Label htmlFor="subject">Subject</Label>
        <Select value={subject} onValueChange={onSubjectChange}>
          <SelectTrigger id="subject" data-testid="select-subject">
            <SelectValue placeholder="Select subject" />
          </SelectTrigger>
          <SelectContent>
            {SUBJECTS.map((subj) => (
              <SelectItem key={subj} value={subj}>
                {subj}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="gradeLevel">Grade Level</Label>
        <Select value={gradeLevel} onValueChange={onGradeLevelChange}>
          <SelectTrigger id="gradeLevel" data-testid="select-grade-level">
            <SelectValue placeholder="Select grade level" />
          </SelectTrigger>
          <SelectContent>
            {GRADE_LEVELS.map((grade) => (
              <SelectItem key={grade} value={grade}>
                {grade}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ageRange">Age Range</Label>
        <Select value={ageRange} onValueChange={onAgeRangeChange}>
          <SelectTrigger id="ageRange" data-testid="select-age-range">
            <SelectValue placeholder="Select age range" />
          </SelectTrigger>
          <SelectContent>
            {AGE_RANGES.map((range) => (
              <SelectItem key={range} value={range}>
                {range}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

