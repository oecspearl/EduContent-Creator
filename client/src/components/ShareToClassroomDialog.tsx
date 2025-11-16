import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Users, Calendar } from "lucide-react";
import { SiGoogleclassroom } from "react-icons/si";

interface ShareToClassroomDialogProps {
  contentTitle: string;
  contentDescription?: string;
  materialLink: string;
  children?: React.ReactNode;
}

interface GoogleClassroomCourse {
  id: string;
  name: string;
  section?: string;
  descriptionHeading?: string;
  room?: string;
}

export default function ShareToClassroomDialog({
  contentTitle,
  contentDescription,
  materialLink,
  children,
}: ShareToClassroomDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [shareType, setShareType] = useState<"assignment" | "announcement">("assignment");
  
  // Assignment fields
  const [selectedCourse, setSelectedCourse] = useState("");
  const [assignmentTitle, setAssignmentTitle] = useState(contentTitle);
  const [assignmentDescription, setAssignmentDescription] = useState(contentDescription || "");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  
  // Announcement fields
  const [announcementText, setAnnouncementText] = useState(
    `Check out this new content: ${contentTitle}`
  );

  // Fetch user's Google Classroom courses
  const { data: coursesData, isLoading: loadingCourses } = useQuery<{ courses: GoogleClassroomCourse[] }>({
    queryKey: ["/api/google-classroom/courses"],
    enabled: open,
  });

  const courses = coursesData?.courses || [];

  // Share as assignment mutation
  const shareAssignmentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCourse) {
        throw new Error("Please select a course");
      }

      const payload: any = {
        courseId: selectedCourse,
        title: assignmentTitle,
        description: assignmentDescription,
        materialLink,
      };

      // Add due date if provided
      if (dueDate) {
        const [year, month, day] = dueDate.split("-").map(Number);
        payload.dueDate = { year, month, day };

        if (dueTime) {
          const [hours, minutes] = dueTime.split(":").map(Number);
          payload.dueTime = { hours, minutes };
        }
      }

      const response = await apiRequest("POST", "/api/google-classroom/share", payload);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Shared to Google Classroom!",
        description: "Assignment created successfully.",
      });
      setOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to share",
        description: error.message || "Could not share to Google Classroom",
        variant: "destructive",
      });
    },
  });

  // Post announcement mutation
  const postAnnouncementMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCourse) {
        throw new Error("Please select a course");
      }

      const response = await apiRequest("POST", "/api/google-classroom/announce", {
        courseId: selectedCourse,
        text: announcementText,
        materialLink,
        materialTitle: contentTitle,
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Posted to Google Classroom!",
        description: "Announcement created successfully.",
      });
      setOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to post",
        description: error.message || "Could not post announcement to Google Classroom",
        variant: "destructive",
      });
    },
  });

  const handleShare = () => {
    if (shareType === "assignment") {
      shareAssignmentMutation.mutate();
    } else {
      postAnnouncementMutation.mutate();
    }
  };

  const isLoading = shareAssignmentMutation.isPending || postAnnouncementMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm" data-testid="button-share-classroom">
            <SiGoogleclassroom className="h-4 w-4 mr-2" />
            Share to Classroom
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SiGoogleclassroom className="h-5 w-5" />
            Share to Google Classroom
          </DialogTitle>
          <DialogDescription>
            Share this content with your students on Google Classroom
          </DialogDescription>
        </DialogHeader>

        <Tabs value={shareType} onValueChange={(v) => {
          setShareType(v as "assignment" | "announcement");
          // Reset course selection when switching tabs for clarity
          setSelectedCourse("");
        }}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="assignment" data-testid="tab-assignment">
              <Calendar className="h-4 w-4 mr-2" />
              Assignment
            </TabsTrigger>
            <TabsTrigger value="announcement" data-testid="tab-announcement">
              <Users className="h-4 w-4 mr-2" />
              Announcement
            </TabsTrigger>
          </TabsList>

          <div className="mt-4 space-y-4">
            {/* Course selection (common to both) */}
            <div>
              <Label htmlFor="course">Select Course *</Label>
              {loadingCourses ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : courses.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4 text-center border rounded-md">
                  No courses found. Make sure you're signed in with Google and have active courses.
                </div>
              ) : (
                <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                  <SelectTrigger id="course" data-testid="select-course">
                    <SelectValue placeholder="Choose a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.name} {course.section ? `(${course.section})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Assignment tab */}
            <TabsContent value="assignment" className="space-y-4">
              <div>
                <Label htmlFor="assignmentTitle">Assignment Title *</Label>
                <Input
                  id="assignmentTitle"
                  value={assignmentTitle}
                  onChange={(e) => setAssignmentTitle(e.target.value)}
                  placeholder="Enter assignment title"
                  data-testid="input-assignment-title"
                />
              </div>

              <div>
                <Label htmlFor="assignmentDescription">Instructions (Optional)</Label>
                <Textarea
                  id="assignmentDescription"
                  value={assignmentDescription}
                  onChange={(e) => setAssignmentDescription(e.target.value)}
                  placeholder="Add instructions for students..."
                  rows={4}
                  data-testid="textarea-assignment-description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dueDate">Due Date (Optional)</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    data-testid="input-due-date"
                  />
                </div>
                <div>
                  <Label htmlFor="dueTime">Due Time (Optional)</Label>
                  <Input
                    id="dueTime"
                    type="time"
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                    disabled={!dueDate}
                    data-testid="input-due-time"
                  />
                </div>
              </div>

              <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md">
                <strong>Note:</strong> The content will be attached as a link in the assignment.
              </div>
            </TabsContent>

            {/* Announcement tab */}
            <TabsContent value="announcement" className="space-y-4">
              <div>
                <Label htmlFor="announcementText">Announcement Text *</Label>
                <Textarea
                  id="announcementText"
                  value={announcementText}
                  onChange={(e) => setAnnouncementText(e.target.value)}
                  placeholder="Write your announcement..."
                  rows={6}
                  data-testid="textarea-announcement"
                />
              </div>

              <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md">
                <strong>Note:</strong> The content will be attached as a link in the announcement.
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isLoading}
            data-testid="button-cancel-share"
          >
            Cancel
          </Button>
          <Button
            onClick={handleShare}
            disabled={isLoading || !selectedCourse || courses.length === 0}
            data-testid="button-confirm-share"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sharing...
              </>
            ) : (
              <>
                <SiGoogleclassroom className="h-4 w-4 mr-2" />
                {shareType === "assignment" ? "Create Assignment" : "Post Announcement"}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
