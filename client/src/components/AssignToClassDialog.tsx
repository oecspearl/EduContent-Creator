import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Users, X, Calendar } from "lucide-react";
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

type AssignToClassDialogProps = {
  contentId: string;
  children: React.ReactNode;
};

export function AssignToClassDialog({ contentId, children }: AssignToClassDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [instructions, setInstructions] = useState("");

  const { data: classes } = useQuery<Class[]>({
    queryKey: ["/api/classes"],
    enabled: open,
  });

  const { data: assignments, refetch: refetchAssignments } = useQuery<Assignment[]>({
    queryKey: ["/api/content", contentId, "assignments"],
    enabled: open && !!contentId,
  });

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
      toast({
        title: "Content assigned",
        description: "Content has been assigned to the class successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign content",
        variant: "destructive",
      });
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
      toast({
        title: "Assignment removed",
        description: "Content has been unassigned from the class.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove assignment",
        variant: "destructive",
      });
    },
  });

  const handleAssign = () => {
    if (!selectedClassId) {
      toast({
        title: "Class required",
        description: "Please select a class to assign content to.",
        variant: "destructive",
      });
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

  const assignedClassIds = assignments?.map(a => a.classId) || [];
  const availableClasses = classes?.filter(c => !assignedClassIds.includes(c.id)) || [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Assign to Classes
          </DialogTitle>
          <DialogDescription>
            Assign this content to one or more classes. Students enrolled in those classes will see this as an assignment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
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
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        No available classes
                      </div>
                    ) : (
                      availableClasses.map((class_) => (
                        <SelectItem key={class_.id} value={class_.id}>
                          {class_.name}
                          {class_.subject && ` - ${class_.subject}`}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {availableClasses.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    All your classes already have this content assigned, or you have no classes yet.
                  </p>
                )}
              </div>

              {selectedClassId && (
                <>
                  <div>
                    <Label htmlFor="due-date">Due Date (Optional)</Label>
                    <Input
                      id="due-date"
                      type="datetime-local"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="instructions">Instructions (Optional)</Label>
                    <Textarea
                      id="instructions"
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      placeholder="Add any special instructions for students..."
                      rows={3}
                    />
                  </div>
                </>
              )}

              <Button
                onClick={handleAssign}
                disabled={!selectedClassId || assignMutation.isPending}
                className="w-full"
              >
                Assign to Class
              </Button>
            </div>
          </div>

          {/* Current Assignments */}
          {assignments && assignments.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold">Current Assignments</h3>
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
                            <div className="text-xs text-muted-foreground">
                              {assignment.classDescription}
                            </div>
                          )}
                          {assignment.instructions && (
                            <div className="text-xs text-muted-foreground mt-1">
                              <strong>Instructions:</strong> {assignment.instructions}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(assignment.assignedAt), "MMM d, yyyy")}
                        </div>
                      </TableCell>
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUnassign(assignment.classId)}
                          disabled={unassignMutation.isPending}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

