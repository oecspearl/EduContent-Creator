import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  LogOut,
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Upload,
  FileText,
  GraduationCap,
  BookOpen,
  X,
  Download,
} from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

type Class = {
  id: string;
  name: string;
  description: string | null;
  userId: string;
  subject: string | null;
  gradeLevel: string | null;
  createdAt: string;
  updatedAt: string;
};

type Enrollment = {
  enrollmentId: string;
  userId: string;
  fullName: string;
  email: string;
  role: string;
  enrolledAt: string;
};

export default function ClassesPage() {
  const { user, logout } = useAuth();
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const breadcrumbs = useBreadcrumbs();
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isEnrollmentsDialogOpen, setIsEnrollmentsDialogOpen] = useState(false);
  const [isCSVDialogOpen, setIsCSVDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    subject: "",
    gradeLevel: "",
  });
  const [csvData, setCsvData] = useState("");
  const [csvClassId, setCsvClassId] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [isSearchingUser, setIsSearchingUser] = useState(false);
  const [foundUser, setFoundUser] = useState<any>(null);

  const { data: classes, isLoading } = useQuery<Class[]>({
    queryKey: ["/api/classes"],
  });

  const { data: enrollments, isLoading: isLoadingEnrollments, refetch: refetchEnrollments } = useQuery<Enrollment[]>({
    queryKey: ["/api/classes", selectedClassId, "enrollments"],
    enabled: !!selectedClassId && isEnrollmentsDialogOpen,
  });

  const selectedClass = classes?.find(c => c.id === selectedClassId);

  const createClassMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest("POST", "/api/classes", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
      setIsCreateDialogOpen(false);
      setFormData({ name: "", description: "", subject: "", gradeLevel: "" });
      toast({
        title: "Class created",
        description: "Class has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create class",
        variant: "destructive",
      });
    },
  });

  const updateClassMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      const response = await apiRequest("PUT", `/api/classes/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
      setIsEditDialogOpen(false);
      setEditingClass(null);
      setFormData({ name: "", description: "", subject: "", gradeLevel: "" });
      toast({
        title: "Class updated",
        description: "Class has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update class",
        variant: "destructive",
      });
    },
  });

  const deleteClassMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/classes/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
      toast({
        title: "Class deleted",
        description: "Class has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete class",
        variant: "destructive",
      });
    },
  });

  const enrollStudentMutation = useMutation({
    mutationFn: async (data: { classId: string; userId: string }) => {
      const response = await apiRequest("POST", `/api/classes/${data.classId}/enrollments`, {
        userId: data.userId,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classes", selectedClassId, "enrollments"] });
      setStudentEmail("");
      setFoundUser(null);
      refetchEnrollments();
      toast({
        title: "Student enrolled",
        description: "Student has been enrolled in the class successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to enroll student",
        variant: "destructive",
      });
    },
  });

  const removeEnrollmentMutation = useMutation({
    mutationFn: async ({ classId, userId }: { classId: string; userId: string }) => {
      const response = await apiRequest("DELETE", `/api/classes/${classId}/enrollments/${userId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classes", selectedClassId, "enrollments"] });
      refetchEnrollments();
      toast({
        title: "Student removed",
        description: "Student has been removed from the class.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove student",
        variant: "destructive",
      });
    },
  });

  const bulkUploadMutation = useMutation({
    mutationFn: async (data: { csvData: string; classId?: string }) => {
      const response = await apiRequest("POST", "/api/classes/bulk-upload", data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
      setIsCSVDialogOpen(false);
      setCsvData("");
      setCsvClassId("");
      toast({
        title: "Bulk upload successful",
        description: data.message || "Bulk upload completed successfully.",
      });
      if (data.errors && data.errors.length > 0) {
        toast({
          title: "Some errors occurred",
          description: `${data.errors.length} error(s) during upload. Check console for details.`,
          variant: "destructive",
        });
        console.error("Upload errors:", data.errors);
        data.errors.forEach((error: string, index: number) => {
          console.error(`  Error ${index + 1}: ${error}`);
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to process bulk upload",
        variant: "destructive",
      });
    },
  });

  const handleCreate = () => {
    if (!formData.name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a class name.",
        variant: "destructive",
      });
      return;
    }
    createClassMutation.mutate(formData);
  };

  const handleEdit = (class_: Class) => {
    setEditingClass(class_);
    setFormData({
      name: class_.name,
      description: class_.description || "",
      subject: class_.subject || "",
      gradeLevel: class_.gradeLevel || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!formData.name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a class name.",
        variant: "destructive",
      });
      return;
    }
    if (editingClass) {
      updateClassMutation.mutate({ id: editingClass.id, data: formData });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this class? This will also remove all enrollments and assignments.")) {
      deleteClassMutation.mutate(id);
    }
  };

  const handleBulkUpload = () => {
    if (!csvData.trim()) {
      toast({
        title: "CSV data required",
        description: "Please paste CSV data or select a file.",
        variant: "destructive",
      });
      return;
    }
      bulkUploadMutation.mutate({
        csvData,
        classId: csvClassId && csvClassId !== "create-new" ? csvClassId : undefined,
      });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setCsvData(text);
      };
      reader.readAsText(file);
    }
  };

  const searchUser = async () => {
    if (!studentEmail.trim()) {
      toast({
        title: "Email required",
        description: "Please enter a student email address.",
        variant: "destructive",
      });
      return;
    }

    setIsSearchingUser(true);
    try {
      const response = await apiRequest("GET", `/api/users/search?email=${encodeURIComponent(studentEmail.trim())}`);
      const users = await response.json();
      if (users.length > 0) {
        setFoundUser(users[0]);
      } else {
        setFoundUser(null);
        toast({
          title: "User not found",
          description: "No user found with that email address.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Search failed",
        description: error.message || "Failed to search for user",
        variant: "destructive",
      });
      setFoundUser(null);
    } finally {
      setIsSearchingUser(false);
    }
  };

  const handleEnrollStudent = () => {
    if (!foundUser || !selectedClassId) return;
    
    enrollStudentMutation.mutate({
      classId: selectedClassId,
      userId: foundUser.id,
    });
  };

  const handleRemoveEnrollment = (userId: string) => {
    if (!selectedClassId) return;
    
    if (confirm("Are you sure you want to remove this student from the class?")) {
      removeEnrollmentMutation.mutate({
        classId: selectedClassId,
        userId,
      });
    }
  };

  const downloadTemplate = () => {
    // If a class is selected, provide template for enrolling students
    // Otherwise, provide template for creating new classes
    const template = csvClassId && csvClassId !== "create-new"
      ? `firstname,lastname,email
John,Smith,john.smith@example.com
Jane,Doe,jane.doe@example.com
Michael,Johnson,michael.johnson@example.com`
      : `class_name,description,subject,grade_level,student_email1,student_email2,student_email3
Math 101,Introduction to Mathematics,Mathematics,Grade 5,student1@example.com,student2@example.com,student3@example.com
Science 101,Basic Science,Science,Grade 5,student1@example.com,student2@example.com`;
    
    const blob = new Blob([template], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = csvClassId && csvClassId !== "create-new" ? "enrollment_template.csv" : "class_template.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
      
      <header className="border-b border-border/40 bg-card sticky top-0 z-50" role="banner">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
              data-testid="button-back-dashboard"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <img 
                src="/favicon.png" 
                alt="OECS Content Creator Logo" 
                className="h-10 w-10 rounded-lg"
              />
              <div>
                <h1 className="text-xl font-semibold text-foreground">OECS Content Creator</h1>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {user ? getInitials(user.fullName) : "U"}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-foreground">{user?.fullName}</p>
                <p className="text-xs text-muted-foreground">{user?.role}</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={logout} 
              data-testid="button-logout"
              aria-label="Log out"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="bg-background border-b">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <Breadcrumbs items={breadcrumbs} />
        </div>
      </div>

      <main id="main-content" className="max-w-7xl mx-auto px-6 py-12" role="main">
        <div className="mb-12 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-foreground mb-3">Class Management</h2>
            <p className="text-base text-muted-foreground">
              Create and manage classes, enroll students, and assign content
            </p>
          </div>
          <div className="flex gap-3">
            <Dialog open={isCSVDialogOpen} onOpenChange={setIsCSVDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid="button-bulk-upload">
                  <Upload className="h-4 w-4 mr-2" />
                  Bulk Upload
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Bulk Upload Classes</DialogTitle>
                  <DialogDescription>
                    Upload a CSV file to create classes and enroll students
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Upload CSV File</Label>
                    <Input
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Or paste CSV data below
                    </p>
                  </div>
                  <div>
                    <Label>Or Enroll in Existing Class</Label>
                    <Select value={csvClassId || "create-new"} onValueChange={(value) => setCsvClassId(value === "create-new" ? "" : value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select class (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="create-new">Create new classes</SelectItem>
                        {classes && classes.length > 0 && (
                          <>
                            {classes.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </>
                        )}
                        {(!classes || classes.length === 0) && (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">
                            No classes available to enroll in
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      If a class is selected, students will be enrolled in that class. Otherwise, new classes will be created.
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>CSV Data</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={downloadTemplate}
                        type="button"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Download Template
                      </Button>
                    </div>
                    <Textarea
                      value={csvData}
                      onChange={(e) => setCsvData(e.target.value)}
                      placeholder="Paste CSV data here or upload a file..."
                      className="font-mono text-sm"
                      rows={10}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCSVDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleBulkUpload}
                    disabled={bulkUploadMutation.isPending}
                  >
                    {bulkUploadMutation.isPending ? "Uploading..." : "Upload"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-class">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Class
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Class</DialogTitle>
                  <DialogDescription>
                    Create a new class to organize your students
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Class Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Math 101"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Optional description"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="subject">Subject</Label>
                      <Input
                        id="subject"
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        placeholder="e.g., Mathematics"
                      />
                    </div>
                    <div>
                      <Label htmlFor="gradeLevel">Grade Level</Label>
                      <Input
                        id="gradeLevel"
                        value={formData.gradeLevel}
                        onChange={(e) => setFormData({ ...formData, gradeLevel: e.target.value })}
                        placeholder="e.g., Grade 5"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreate} disabled={createClassMutation.isPending}>
                    Create
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : !classes || classes.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Classes Yet</h3>
              <p className="text-muted-foreground mb-6">
                Create your first class to start organizing students and assigning content
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Class
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map((class_) => (
              <Card key={class_.id} className="border-border/40 shadow-sm hover:shadow-md transition-all duration-150 ease-out">
                <CardHeader className="p-6 pb-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-medium mb-2">{class_.name}</CardTitle>
                      {class_.description && (
                        <CardDescription className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                          {class_.description}
                        </CardDescription>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEdit(class_)}
                        data-testid={`button-edit-${class_.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDelete(class_.id)}
                        data-testid={`button-delete-${class_.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-6 pb-4">
                  <div className="space-y-3">
                    {class_.subject && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <BookOpen className="h-4 w-4" />
                        <span>{class_.subject}</span>
                      </div>
                    )}
                    {class_.gradeLevel && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <GraduationCap className="h-4 w-4" />
                        <span>{class_.gradeLevel}</span>
                      </div>
                    )}
                    <Button
                      variant="outline"
                      className="w-full mt-4 h-10 border-border/40"
                      onClick={() => {
                        setSelectedClassId(class_.id);
                        setIsEnrollmentsDialogOpen(true);
                      }}
                      data-testid={`button-view-enrollments-${class_.id}`}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      View Enrollments
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Class</DialogTitle>
            <DialogDescription>
              Update class information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Class Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Math 101"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-subject">Subject</Label>
                <Input
                  id="edit-subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="e.g., Mathematics"
                />
              </div>
              <div>
                <Label htmlFor="edit-gradeLevel">Grade Level</Label>
                <Input
                  id="edit-gradeLevel"
                  value={formData.gradeLevel}
                  onChange={(e) => setFormData({ ...formData, gradeLevel: e.target.value })}
                  placeholder="e.g., Grade 5"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateClassMutation.isPending}>
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enrollments Dialog */}
      <Dialog open={isEnrollmentsDialogOpen} onOpenChange={(open) => {
        setIsEnrollmentsDialogOpen(open);
        if (!open) {
          setStudentEmail("");
          setFoundUser(null);
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Class Enrollments</DialogTitle>
            <DialogDescription>
              {selectedClass && `Manage students enrolled in ${selectedClass.name}`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Add Student Section */}
            <div className="space-y-4 border rounded-lg p-4">
              <h3 className="font-semibold">Add Student</h3>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="Enter student email address"
                    value={studentEmail}
                    onChange={(e) => {
                      setStudentEmail(e.target.value);
                      setFoundUser(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && studentEmail.trim()) {
                        searchUser();
                      }
                    }}
                  />
                </div>
                <Button
                  onClick={searchUser}
                  disabled={!studentEmail.trim() || isSearchingUser}
                >
                  {isSearchingUser ? "Searching..." : "Search"}
                </Button>
              </div>
              
              {foundUser && (
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {getInitials(foundUser.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{foundUser.fullName}</div>
                      <div className="text-sm text-muted-foreground">{foundUser.email}</div>
                      {foundUser.role && (
                        <Badge variant="outline" className="mt-1">{foundUser.role}</Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={handleEnrollStudent}
                    disabled={enrollStudentMutation.isPending}
                    size="sm"
                  >
                    {enrollStudentMutation.isPending ? "Enrolling..." : "Enroll"}
                  </Button>
                </div>
              )}
            </div>

            {/* Enrollments List */}
            {isLoadingEnrollments ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : !enrollments || enrollments.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No students enrolled yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Use the form above to add students by email
                </p>
              </div>
            ) : (
              <div>
                <h3 className="font-semibold mb-3">Enrolled Students ({enrollments.length})</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Enrolled</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {enrollments.map((enrollment) => (
                      <TableRow key={enrollment.enrollmentId}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                {getInitials(enrollment.fullName)}
                              </AvatarFallback>
                            </Avatar>
                            <span>{enrollment.fullName}</span>
                          </div>
                        </TableCell>
                        <TableCell>{enrollment.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{enrollment.role}</Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(enrollment.enrolledAt), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveEnrollment(enrollment.userId)}
                            disabled={removeEnrollmentMutation.isPending}
                            data-testid={`button-remove-${enrollment.userId}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

