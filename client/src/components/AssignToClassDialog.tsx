import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Users, User, X, Calendar } from "lucide-react";
import { format } from "date-fns";

type Class = {
  id: string;
  name: string;
  description: string | null;
  subject: string | null;
  gradeLevel: string | null;
};

type Assignment = {
  assignmentId: string;
  classId: string;
  className: string;
  classDescription: string | null;
  assignedAt: string;
  dueDate: string | null;
  instructions: string | null;
};

type StudentAssignment = {
  id: string;
  studentId: string;
  fullName: string;
  email: string;
  assignedAt: string;
  dueDate: string | null;
  instructions: string | null;
};

type Enrollment = {
  userId: string;
  fullName: string;
  email: string;
  role: string;
};

type AssignToClassDialogProps = {
  contentId: string;
  children: React.ReactNode;
};

export function AssignToClassDialog({ contentId, children }: AssignToClassDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  // Class assignment state
  const [selectedClassId, setSelectedClassId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [instructions, setInstructions] = useState("");

  // Student assignment state
  const [studentSourceClassId, setStudentSourceClassId] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentDueDate, setStudentDueDate] = useState("");
  const [studentInstructions, setStudentInstructions] = useState("");

  const { data: classes } = useQuery<Class[]>({
    queryKey: ["/api/classes"],
    enabled: open,
  });

  const { data: assignments, refetch: refetchAssignments } = useQuery<Assignment[]>({
    queryKey: ["/api/content", contentId, "assignments"],
    enabled: open && !!contentId,
  });

  const { data: studentAssignments, refetch: refetchStudentAssignments } = useQuery<StudentAssignment[]>({
    queryKey: [`/api/content/${contentId}/student-assignments`],
    enabled: open && !!contentId,
  });

  const { data: enrollments } = useQuery<Enrollment[]>({
    queryKey: [`/api/classes/${studentSourceClassId}/enrollments`],
    enabled: open && !!studentSourceClassId,
  });

  // ── Class assignment mutations ──────────────────────────

  const assignMutation = useMutation({
    mutationFn: async (data: { classId: string; dueDate?: string; instructions?: string }) => {
      const response = await apiRequest("POST", `/api/content/${contentId}/assignments`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content", contentId, "assignments"] });
      setSelectedClassId("");
      setDueDate("");
      setInstructions("");
      refetchAssignments();
      toast({ title: "Content assigned", description: "Content has been assigned to the class." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to assign content", variant: "destructive" });
    },
  });

  const unassignMutation = useMutation({
    mutationFn: async (classId: string) => {
      const response = await apiRequest("DELETE", `/api/content/${contentId}/assignments/${classId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content", contentId, "assignments"] });
      refetchAssignments();
      toast({ title: "Assignment removed" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to remove assignment", variant: "destructive" });
    },
  });

  // ── Student assignment mutations ────────────────────────

  const assignStudentsMutation = useMutation({
    mutationFn: async (data: { studentIds: string[]; dueDate?: string; instructions?: string }) => {
      const response = await apiRequest("POST", `/api/content/${contentId}/student-assignments`, data);
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: [`/api/content/${contentId}/student-assignments`] });
      setSelectedStudentIds([]);
      setStudentDueDate("");
      setStudentInstructions("");
      refetchStudentAssignments();
      const msg = data.errors?.length > 0
        ? `Assigned to ${data.assigned} student(s). ${data.errors.length} already assigned.`
        : `Assigned to ${data.assigned} student(s).`;
      toast({ title: "Students assigned", description: msg });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to assign", variant: "destructive" });
    },
  });

  const unassignStudentMutation = useMutation({
    mutationFn: async (studentId: string) => {
      const response = await apiRequest("DELETE", `/api/content/${contentId}/student-assignments/${studentId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/content/${contentId}/student-assignments`] });
      refetchStudentAssignments();
      toast({ title: "Student assignment removed" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to remove", variant: "destructive" });
    },
  });

  // ── Handlers ────────────────────────────────────────────

  const handleAssign = () => {
    if (!selectedClassId) {
      toast({ title: "Class required", description: "Please select a class.", variant: "destructive" });
      return;
    }
    assignMutation.mutate({
      classId: selectedClassId,
      dueDate: dueDate || undefined,
      instructions: instructions.trim() || undefined,
    });
  };

  const handleUnassign = (classId: string) => {
    if (confirm("Are you sure you want to remove this assignment?")) {
      unassignMutation.mutate(classId);
    }
  };

  const handleAssignStudents = () => {
    if (selectedStudentIds.length === 0) {
      toast({ title: "No students selected", description: "Please select at least one student.", variant: "destructive" });
      return;
    }
    assignStudentsMutation.mutate({
      studentIds: selectedStudentIds,
      dueDate: studentDueDate || undefined,
      instructions: studentInstructions.trim() || undefined,
    });
  };

  const handleUnassignStudent = (studentId: string) => {
    if (confirm("Remove this student's assignment?")) {
      unassignStudentMutation.mutate(studentId);
    }
  };

  const toggleStudent = (studentId: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const assignedClassIds = assignments?.map(a => a.classId) || [];
  const availableClasses = classes?.filter(c => !assignedClassIds.includes(c.id)) || [];
  const assignedStudentIds = studentAssignments?.map(a => a.studentId) || [];
  const availableStudents = (enrollments || [])
    .filter(e => e.role === "student" && !assignedStudentIds.includes(e.userId));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Assign Content
          </DialogTitle>
          <DialogDescription>
            Assign this content to classes or individual students.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="classes">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="classes" className="gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Classes
            </TabsTrigger>
            <TabsTrigger value="students" className="gap-1.5">
              <User className="h-3.5 w-3.5" />
              Individual Students
            </TabsTrigger>
          </TabsList>

          {/* ── Classes Tab ─────────────────────────────────── */}
          <TabsContent value="classes" className="space-y-6 mt-4">
            {/* Assign New Class */}
            <div className="space-y-4 border rounded-lg p-4">
              <h3 className="font-semibold">Assign to New Class</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="class-select">Select Class</Label>
                  <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                    <SelectTrigger id="class-select">
                      <SelectValue placeholder="Choose a class..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableClasses.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">No available classes</div>
                      ) : (
                        availableClasses.map((class_) => (
                          <SelectItem key={class_.id} value={class_.id}>
                            {class_.name}{class_.subject && ` - ${class_.subject}`}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {selectedClassId && (
                  <>
                    <div>
                      <Label htmlFor="due-date">Due Date (Optional)</Label>
                      <Input id="due-date" type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="instructions">Instructions (Optional)</Label>
                      <Textarea id="instructions" value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Add any special instructions..." rows={3} />
                    </div>
                  </>
                )}

                <Button onClick={handleAssign} disabled={!selectedClassId || assignMutation.isPending} className="w-full">
                  Assign to Class
                </Button>
              </div>
            </div>

            {/* Current Class Assignments */}
            {assignments && assignments.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold">Current Class Assignments</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Class</TableHead>
                      <TableHead>Assigned</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignments.map((assignment) => (
                      <TableRow key={assignment.assignmentId}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{assignment.className}</div>
                            {assignment.classDescription && (
                              <div className="text-xs text-muted-foreground">{assignment.classDescription}</div>
                            )}
                            {assignment.instructions && (
                              <div className="text-xs text-muted-foreground mt-1"><strong>Instructions:</strong> {assignment.instructions}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell><div className="text-sm">{format(new Date(assignment.assignedAt), "MMM d, yyyy")}</div></TableCell>
                        <TableCell>
                          {assignment.dueDate ? (
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(assignment.dueDate), "MMM d, yyyy h:mm a")}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">No due date</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => handleUnassign(assignment.classId)} disabled={unassignMutation.isPending}>
                            <X className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* ── Students Tab ────────────────────────────────── */}
          <TabsContent value="students" className="space-y-6 mt-4">
            {/* Assign to Students */}
            <div className="space-y-4 border rounded-lg p-4">
              <h3 className="font-semibold">Assign to Individual Students</h3>
              <div className="space-y-4">
                <div>
                  <Label>Select a class to pick students from</Label>
                  <Select value={studentSourceClassId} onValueChange={(v) => { setStudentSourceClassId(v); setSelectedStudentIds([]); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a class..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(classes || []).map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {studentSourceClassId && (
                  <>
                    <div>
                      <Label className="mb-2 block">Select Students ({selectedStudentIds.length} selected)</Label>
                      {availableStudents.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          {(enrollments || []).filter(e => e.role === "student").length === 0
                            ? "No students enrolled in this class."
                            : "All students in this class are already assigned."}
                        </p>
                      ) : (
                        <div className="space-y-1 border rounded-lg p-3 max-h-48 overflow-y-auto">
                          {availableStudents.map((student) => (
                            <label key={student.userId} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer">
                              <Checkbox
                                checked={selectedStudentIds.includes(student.userId)}
                                onCheckedChange={() => toggleStudent(student.userId)}
                              />
                              <div className="flex-1 min-w-0">
                                <span className="text-sm font-medium">{student.fullName}</span>
                                <span className="text-xs text-muted-foreground ml-2">{student.email}</span>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    {selectedStudentIds.length > 0 && (
                      <>
                        <div>
                          <Label htmlFor="student-due-date">Due Date (Optional)</Label>
                          <Input id="student-due-date" type="datetime-local" value={studentDueDate} onChange={(e) => setStudentDueDate(e.target.value)} />
                        </div>
                        <div>
                          <Label htmlFor="student-instructions">Instructions (Optional)</Label>
                          <Textarea id="student-instructions" value={studentInstructions} onChange={(e) => setStudentInstructions(e.target.value)} placeholder="Add any special instructions..." rows={3} />
                        </div>
                      </>
                    )}

                    <Button
                      onClick={handleAssignStudents}
                      disabled={selectedStudentIds.length === 0 || assignStudentsMutation.isPending}
                      className="w-full"
                    >
                      {assignStudentsMutation.isPending ? "Assigning..." : `Assign to ${selectedStudentIds.length} Student(s)`}
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Current Student Assignments */}
            {studentAssignments && studentAssignments.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold">Current Student Assignments</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Assigned</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentAssignments.map((sa) => (
                      <TableRow key={sa.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{sa.fullName}</div>
                            <div className="text-xs text-muted-foreground">{sa.email}</div>
                            {sa.instructions && (
                              <div className="text-xs text-muted-foreground mt-1"><strong>Instructions:</strong> {sa.instructions}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell><div className="text-sm">{format(new Date(sa.assignedAt), "MMM d, yyyy")}</div></TableCell>
                        <TableCell>
                          {sa.dueDate ? (
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(sa.dueDate), "MMM d, yyyy h:mm a")}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">No due date</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => handleUnassignStudent(sa.studentId)} disabled={unassignStudentMutation.isPending}>
                            <X className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
