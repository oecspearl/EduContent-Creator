import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BookOpen, Loader2, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CurriculumContext } from "@shared/schema";

type CurriculumSubject = { subjectSlug: string; subjectName: string };
type CurriculumGrade = { gradeLevel: string };
type CurriculumStrand = { id: string; strandName: string; strandOrder: number };
type CurriculumElo = { id: string; eloText: string; eloOrder: number };
type CurriculumSco = { id: string; scoText: string; scoOrder: number };

type CurriculumSelectorProps = {
  curriculumContext: CurriculumContext | null;
  onCurriculumChange: (ctx: CurriculumContext | null) => void;
  onSubjectSync?: (subject: string) => void;
  onGradeSync?: (grade: string) => void;
};

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  return res.json();
}

export function CurriculumSelector({
  curriculumContext,
  onCurriculumChange,
  onSubjectSync,
  onGradeSync,
}: CurriculumSelectorProps) {
  const [enabled, setEnabled] = useState(!!curriculumContext);
  const [manualEntry, setManualEntry] = useState(!!curriculumContext);
  const [manualStrand, setManualStrand] = useState(curriculumContext?.strand ?? "");
  const [manualElo, setManualElo] = useState(curriculumContext?.eloText ?? "");
  const [loading, setLoading] = useState("");

  // Sync when curriculumContext is restored from DB (async load)
  useEffect(() => {
    if (curriculumContext && !enabled) {
      setEnabled(true);
      setManualEntry(true);
      setManualStrand(curriculumContext.strand ?? "");
      setManualElo(curriculumContext.eloText ?? "");
    }
  }, [curriculumContext]);

  // Selection state
  const [subjects, setSubjects] = useState<CurriculumSubject[]>([]);
  const [grades, setGrades] = useState<CurriculumGrade[]>([]);
  const [strands, setStrands] = useState<CurriculumStrand[]>([]);
  const [elos, setElos] = useState<CurriculumElo[]>([]);
  const [scos, setScos] = useState<CurriculumSco[]>([]);

  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedSubjectName, setSelectedSubjectName] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedStrandId, setSelectedStrandId] = useState("");
  const [selectedStrandName, setSelectedStrandName] = useState("");
  const [selectedEloId, setSelectedEloId] = useState("");
  const [selectedEloText, setSelectedEloText] = useState("");
  const [selectedScoIds, setSelectedScoIds] = useState<string[]>([]);

  // Load subjects when enabled
  useEffect(() => {
    if (!enabled) return;
    if (subjects.length > 0) return;
    setLoading("subjects");
    fetchJson<CurriculumSubject[]>("/api/curriculum/subjects")
      .then(setSubjects)
      .catch(console.error)
      .finally(() => setLoading(""));
  }, [enabled]);

  // Load grades when subject changes
  useEffect(() => {
    if (!selectedSubject) { setGrades([]); return; }
    setLoading("grades");
    fetchJson<CurriculumGrade[]>(`/api/curriculum/grades?subject=${encodeURIComponent(selectedSubject)}`)
      .then(setGrades)
      .catch(console.error)
      .finally(() => setLoading(""));
  }, [selectedSubject]);

  // Load strands when grade changes
  useEffect(() => {
    if (!selectedSubject || !selectedGrade) { setStrands([]); return; }
    setLoading("strands");
    fetchJson<CurriculumStrand[]>(`/api/curriculum/strands?subject=${encodeURIComponent(selectedSubject)}&grade=${encodeURIComponent(selectedGrade)}`)
      .then(setStrands)
      .catch(console.error)
      .finally(() => setLoading(""));
  }, [selectedSubject, selectedGrade]);

  // Load ELOs when strand changes
  useEffect(() => {
    if (!selectedStrandId) { setElos([]); return; }
    setLoading("elos");
    fetchJson<CurriculumElo[]>(`/api/curriculum/elos?strandId=${encodeURIComponent(selectedStrandId)}`)
      .then(setElos)
      .catch(console.error)
      .finally(() => setLoading(""));
  }, [selectedStrandId]);

  // Load SCOs when ELO changes
  useEffect(() => {
    if (!selectedEloId) { setScos([]); return; }
    setLoading("scos");
    fetchJson<CurriculumSco[]>(`/api/curriculum/scos?eloId=${encodeURIComponent(selectedEloId)}`)
      .then(setScos)
      .catch(console.error)
      .finally(() => setLoading(""));
  }, [selectedEloId]);

  // Emit curriculum context when ELO is selected (dropdown mode)
  useEffect(() => {
    if (!enabled || manualEntry || !selectedEloText) {
      return;
    }
    const scoTexts = scos
      .filter((s) => selectedScoIds.includes(s.id))
      .map((s) => s.scoText);

    onCurriculumChange({
      subject: selectedSubjectName,
      grade: selectedGrade,
      strand: selectedStrandName,
      eloText: selectedEloText,
      scoTexts: scoTexts.length > 0 ? scoTexts : undefined,
    });
  }, [enabled, manualEntry, selectedSubjectName, selectedGrade, selectedStrandName, selectedEloText, selectedScoIds, scos]);

  // Emit curriculum context for manual entry mode
  useEffect(() => {
    if (!enabled || !manualEntry || !manualElo.trim()) {
      return;
    }
    onCurriculumChange({
      subject: selectedSubjectName,
      grade: selectedGrade,
      strand: manualStrand,
      eloText: manualElo,
    });
  }, [enabled, manualEntry, selectedSubjectName, selectedGrade, manualStrand, manualElo]);

  function handleToggle(checked: boolean) {
    setEnabled(checked);
    if (!checked) {
      onCurriculumChange(null);
      resetSelections();
      setManualEntry(false);
      setManualStrand("");
      setManualElo("");
    }
  }

  function handleManualEntryToggle(on: boolean) {
    setManualEntry(on);
    if (on) {
      // Clear dropdown-derived context when switching to manual
      onCurriculumChange(null);
    } else {
      // Clear manual text when switching back to dropdowns
      setManualStrand("");
      setManualElo("");
      onCurriculumChange(null);
    }
  }

  function resetSelections() {
    setSelectedSubject("");
    setSelectedSubjectName("");
    setSelectedGrade("");
    setSelectedStrandId("");
    setSelectedStrandName("");
    setSelectedEloId("");
    setSelectedEloText("");
    setSelectedScoIds([]);
    setGrades([]);
    setStrands([]);
    setElos([]);
    setScos([]);
  }

  function handleSubjectChange(slug: string) {
    const subj = subjects.find((s) => s.subjectSlug === slug);
    setSelectedSubject(slug);
    setSelectedSubjectName(subj?.subjectName || "");
    setSelectedGrade("");
    setSelectedStrandId("");
    setSelectedStrandName("");
    setSelectedEloId("");
    setSelectedEloText("");
    setSelectedScoIds([]);
    if (subj && onSubjectSync) onSubjectSync(subj.subjectName);
  }

  function handleGradeChange(grade: string) {
    setSelectedGrade(grade);
    setSelectedStrandId("");
    setSelectedStrandName("");
    setSelectedEloId("");
    setSelectedEloText("");
    setSelectedScoIds([]);
    if (onGradeSync) onGradeSync(grade);
  }

  function handleStrandChange(strandId: string) {
    const strand = strands.find((s) => s.id === strandId);
    setSelectedStrandId(strandId);
    setSelectedStrandName(strand?.strandName || "");
    setSelectedEloId("");
    setSelectedEloText("");
    setSelectedScoIds([]);
  }

  function handleEloChange(eloId: string) {
    const elo = elos.find((e) => e.id === eloId);
    setSelectedEloId(eloId);
    setSelectedEloText(elo?.eloText || "");
    setSelectedScoIds([]);
  }

  function toggleSco(scoId: string) {
    setSelectedScoIds((prev) =>
      prev.includes(scoId) ? prev.filter((id) => id !== scoId) : [...prev, scoId],
    );
  }

  if (!enabled) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed">
        <BookOpen className="h-5 w-5 text-muted-foreground" />
        <div className="flex-1">
          <Label htmlFor="curriculum-toggle" className="cursor-pointer text-sm font-medium">
            Align to OECS Harmonised Primary Curriculum
          </Label>
          <p className="text-xs text-muted-foreground">
            Select specific learning outcomes from the curriculum to guide AI content generation
          </p>
        </div>
        <Switch id="curriculum-toggle" checked={false} onCheckedChange={handleToggle} />
      </div>
    );
  }

  const isLoading = (field: string) => loading === field;

  return (
    <div className="space-y-4 p-4 rounded-lg border border-primary/20 bg-primary/5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <Label className="text-sm font-semibold text-primary">OECS Curriculum Alignment</Label>
        </div>
        <Switch id="curriculum-toggle" checked={true} onCheckedChange={handleToggle} />
      </div>

      {/* Mode toggle: dropdowns vs manual text entry */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={!manualEntry ? "default" : "outline"}
          className="h-7 text-xs"
          onClick={() => handleManualEntryToggle(false)}
        >
          Select from curriculum
        </Button>
        <Button
          type="button"
          size="sm"
          variant={manualEntry ? "default" : "outline"}
          className="h-7 text-xs"
          onClick={() => handleManualEntryToggle(true)}
        >
          <PenLine className="h-3 w-3 mr-1" />
          Type manually
        </Button>
      </div>

      {!manualEntry ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Subject */}
          <div className="space-y-1">
            <Label className="text-xs">Subject</Label>
            <Select value={selectedSubject} onValueChange={handleSubjectChange}>
              <SelectTrigger className="h-9">
                {isLoading("subjects") ? (
                  <span className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />Loading...</span>
                ) : (
                  <SelectValue placeholder="Select subject" />
                )}
              </SelectTrigger>
              <SelectContent>
                {subjects.map((s) => (
                  <SelectItem key={s.subjectSlug} value={s.subjectSlug}>{s.subjectName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Grade */}
          <div className="space-y-1">
            <Label className="text-xs">Grade Level</Label>
            <Select value={selectedGrade} onValueChange={handleGradeChange} disabled={!selectedSubject}>
              <SelectTrigger className="h-9">
                {isLoading("grades") ? (
                  <span className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />Loading...</span>
                ) : (
                  <SelectValue placeholder="Select grade" />
                )}
              </SelectTrigger>
              <SelectContent>
                {grades.map((g) => (
                  <SelectItem key={g.gradeLevel} value={g.gradeLevel}>{g.gradeLevel}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Strand */}
          <div className="space-y-1 md:col-span-2">
            <Label className="text-xs">Strand</Label>
            <Select value={selectedStrandId} onValueChange={handleStrandChange} disabled={!selectedGrade}>
              <SelectTrigger className="h-9">
                {isLoading("strands") ? (
                  <span className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />Loading...</span>
                ) : (
                  <SelectValue placeholder="Select strand" />
                )}
              </SelectTrigger>
              <SelectContent>
                {strands.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.strandName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ELO */}
          <div className="space-y-1 md:col-span-2">
            <Label className="text-xs">Essential Learning Outcome (ELO)</Label>
            <Select value={selectedEloId} onValueChange={handleEloChange} disabled={!selectedStrandId}>
              <SelectTrigger className="h-9">
                {isLoading("elos") ? (
                  <span className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />Loading...</span>
                ) : (
                  <SelectValue placeholder="Select ELO" />
                )}
              </SelectTrigger>
              <SelectContent>
                {elos.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    <span className="line-clamp-2">{e.eloText}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* SCOs - shown after ELO is selected */}
          {selectedEloId && scos.length > 0 && (
            <div className="space-y-2 md:col-span-2">
              <Label className="text-xs">Specific Curriculum Outcomes (click to select)</Label>
              <div className="flex flex-wrap gap-2">
                {scos.map((sco) => {
                  const isSelected = selectedScoIds.includes(sco.id);
                  return (
                    <Badge
                      key={sco.id}
                      variant={isSelected ? "default" : "outline"}
                      className="cursor-pointer text-xs max-w-full"
                      onClick={() => toggleSco(sco.id)}
                    >
                      <span className="line-clamp-1">{sco.scoText}</span>
                    </Badge>
                  );
                })}
              </div>
              {selectedScoIds.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No SCOs selected — AI will align to the ELO above. Click SCOs to narrow the focus.
                </p>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Type the curriculum details directly if you know them. Subject and grade will still be inferred from the fields above.
          </p>
          <div className="space-y-1">
            <Label className="text-xs">Strand (optional)</Label>
            <Input
              value={manualStrand}
              onChange={(e) => setManualStrand(e.target.value)}
              placeholder="e.g. Reading and Responding to Literature"
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Essential Learning Outcome (ELO)</Label>
            <Textarea
              value={manualElo}
              onChange={(e) => setManualElo(e.target.value)}
              placeholder="e.g. Students will be able to identify the main idea and supporting details in a text."
              className="text-sm min-h-20 resize-none"
            />
          </div>
        </div>
      )}

      {/* Summary of selected curriculum */}
      {(selectedEloText || (manualEntry && manualElo.trim())) && (
        <div className="rounded-md bg-background p-3 border text-xs space-y-1">
          <p className="font-medium text-foreground">Selected Curriculum Target:</p>
          {manualEntry ? (
            <>
              {manualStrand && <p className="text-muted-foreground"><strong>Strand:</strong> {manualStrand}</p>}
              <p className="text-muted-foreground"><strong>ELO:</strong> {manualElo}</p>
            </>
          ) : (
            <>
              <p className="text-muted-foreground"><strong>ELO:</strong> {selectedEloText}</p>
              {selectedScoIds.length > 0 && (
                <p className="text-muted-foreground">
                  <strong>SCOs:</strong> {scos.filter((s) => selectedScoIds.includes(s.id)).map((s) => s.scoText).join("; ")}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
