import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AIGenerationModal } from "@/components/AIGenerationModal";
import { ImageGeneratorDialog } from "@/components/ImageGeneratorDialog";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";
import {
  ArrowLeft,
  Save,
  Sparkles,
  Plus,
  Trash2,
  GripVertical,
  Settings,
  Eye,
  Globe,
  Download,
  ImageIcon,
  ChevronDown,
  Upload,
  Link,
  X
} from "lucide-react";
import type { H5pContent, QuizData, QuizQuestion } from "@shared/schema";
import ShareToClassroomDialog from "@/components/ShareToClassroomDialog";
import { generateHTMLExport, downloadHTML } from "@/lib/html-export";
import { ContentMetadataFields } from "@/components/ContentMetadataFields";

export default function QuizCreator() {
  const params = useParams();
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const contentId = params.id;
  const isEditing = !!contentId;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [ageRange, setAgeRange] = useState("");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [settings, setSettings] = useState({
    shuffleQuestions: false,
    showCorrectAnswers: true,
    allowRetry: true,
    timeLimit: undefined as number | undefined,
  });
  const [isPublished, setIsPublished] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [autosave, setAutosave] = useState(true);
  const [showAIModal, setShowAIModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showImageGenerator, setShowImageGenerator] = useState(false);
  const [activeImageQuestionIndex, setActiveImageQuestionIndex] = useState<number | null>(null);
  const [imageUrlInputs, setImageUrlInputs] = useState<Record<number, string>>({});
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const { data: content } = useQuery<H5pContent>({
    queryKey: ["/api/content", contentId],
    enabled: isEditing,
  });

  useEffect(() => {
    if (content && content.type === "quiz") {
      setTitle(content.title);
      setDescription(content.description || "");
      setSubject(content.subject || "");
      setGradeLevel(content.gradeLevel || "");
      setAgeRange(content.ageRange || "");
      const quizData = content.data as QuizData;
      setQuestions(quizData.questions || []);
      setSettings({
        shuffleQuestions: quizData.settings?.shuffleQuestions ?? false,
        showCorrectAnswers: quizData.settings?.showCorrectAnswers ?? true,
        allowRetry: quizData.settings?.allowRetry ?? true,
        timeLimit: quizData.settings?.timeLimit,
      });
      setIsPublished(content.isPublished);
      setIsPublic(content.isPublic || false);
    }
  }, [content]);

  const saveMutation = useMutation({
    mutationFn: async (publish: boolean = false) => {
      const data: QuizData = { questions, settings };
      
      if (isEditing) {
      const response = await apiRequest("PUT", `/api/content/${contentId}`, {
        title,
        description,
        subject,
        gradeLevel,
        ageRange,
        data,
        isPublished: publish,
        isPublic,
      });
        return await response.json();
      } else {
        const response = await apiRequest("POST", "/api/content", {
          title,
          description,
          subject,
          gradeLevel,
          ageRange,
          type: "quiz",
          data,
          isPublished: publish,
          isPublic,
        });
        return await response.json();
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/content"] });
      queryClient.invalidateQueries({ queryKey: ["/api/content/public"] });
      if (!isEditing) {
        navigate(`/create/quiz/${data.id}`);
      }
      toast({ title: "Saved!", description: "Quiz saved successfully." });
      setIsSaving(false);
    },
  });

  useEffect(() => {
    if (!autosave) return; // Skip autosave if disabled
    if (!title || questions.length === 0) return;
    
    const timer = setTimeout(() => {
      setIsSaving(true);
      saveMutation.mutate(isPublished);
    }, 2000);

    return () => clearTimeout(timer);
  }, [title, description, questions, settings, isPublic, autosave, isPublished]);
  
  const handleManualSave = () => {
    if (!title || questions.length === 0) {
      toast({
        title: "Cannot save",
        description: "Please add a title and at least one question.",
        variant: "destructive",
      });
      return;
    }
    setIsSaving(true);
    saveMutation.mutate(isPublished);
  };

  const addQuestion = () => {
    const newQuestion: QuizQuestion = {
      id: Date.now().toString(),
      type: "multiple-choice",
      question: "",
      options: ["", "", "", ""],
      correctAnswer: 0,
      explanation: "",
    };
    setQuestions([...questions, newQuestion]);
  };

  const updateQuestion = (index: number, updates: Partial<QuizQuestion>) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], ...updates };
    setQuestions(updated);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleAIGenerated = (data: any) => {
    if (data.questions) {
      setQuestions(prev => [...prev, ...data.questions]);
    }
  };

  const handleImageGenerated = (imageUrl: string) => {
    if (activeImageQuestionIndex !== null) {
      updateQuestion(activeImageQuestionIndex, { imageUrl });
      toast({
        title: "Image added",
        description: "AI-generated image has been added to the question.",
      });
    }
    setShowImageGenerator(false);
    setActiveImageQuestionIndex(null);
  };

  const handleFileUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      updateQuestion(index, { imageUrl: result, imageAlt: file.name });
      toast({
        title: "Image uploaded",
        description: "Image has been added to the question.",
      });
    };
    reader.readAsDataURL(file);
  };

  const handleImageUrlSubmit = (index: number) => {
    const url = imageUrlInputs[index];
    if (!url?.trim()) {
      toast({
        title: "URL required",
        description: "Please enter an image URL",
        variant: "destructive",
      });
      return;
    }

    try {
      new URL(url);
      updateQuestion(index, { imageUrl: url });
      setImageUrlInputs((prev) => ({ ...prev, [index]: "" }));
      toast({
        title: "Image URL added",
        description: "The image URL has been added to the question.",
      });
    } catch {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid image URL",
        variant: "destructive",
      });
    }
  };

  const removeQuestionImage = (index: number) => {
    updateQuestion(index, { imageUrl: undefined, imageAlt: undefined });
    toast({
      title: "Image removed",
      description: "Image has been removed from the question.",
    });
  };

  const handlePublish = async () => {
    setIsPublished(!isPublished);
    await saveMutation.mutateAsync(!isPublished);
    toast({
      title: isPublished ? "Unpublished" : "Published!",
      description: isPublished
        ? "Quiz is now private."
        : "Quiz is now publicly accessible via share link.",
    });
  };

  const breadcrumbs = useBreadcrumbs(contentId);

  return (
    <div className="min-h-screen bg-background">
      {/* Toolbar */}
      <div className="sticky top-0 z-10 bg-card/95 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold">Quiz Creator</h1>
              {isSaving && <Badge variant="outline">Saving...</Badge>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {contentId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!content) return;
                  const html = generateHTMLExport(content, content.data);
                  downloadHTML(html, title || "quiz");
                  toast({
                    title: "Download started",
                    description: "Your quiz is being downloaded as HTML.",
                  });
                }}
                disabled={!contentId || !content}
                data-testid="button-download-html"
              >
                <Download className="h-4 w-4 mr-1" />
                Download HTML
              </Button>
            )}
            {!autosave && (
              <Button 
                variant="default" 
                size="sm" 
                onClick={handleManualSave}
                disabled={isSaving || !title || questions.length === 0}
                data-testid="button-save"
              >
                <Save className="h-4 w-4 mr-1" />
                {isSaving ? "Saving..." : "Save"}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setShowSettings(!showSettings)} data-testid="button-settings">
              <Settings className="h-4 w-4 mr-1" />
              Settings
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowAIModal(true)} data-testid="button-ai-generate">
              <Sparkles className="h-4 w-4 mr-1" />
              AI Generate
            </Button>
            {contentId && isPublished && (
              <ShareToClassroomDialog
                contentTitle={title}
                contentDescription={description}
                materialLink={`${window.location.origin}/public/${contentId}`}
              />
            )}
            <Button
              variant={isPublished ? "outline" : "default"}
              size="sm"
              onClick={handlePublish}
              disabled={!title || questions.length === 0}
              data-testid="button-publish"
            >
              <Globe className="h-4 w-4 mr-1" />
              {isPublished ? "Unpublish" : "Publish"}
            </Button>
          </div>
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="bg-background border-b">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <Breadcrumbs items={breadcrumbs} />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Editor */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title & Description */}
            <Card>
              <CardHeader>
                <CardTitle>Quiz Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., World War II Quiz"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    data-testid="input-title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of this quiz..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="h-20 resize-none"
                    data-testid="textarea-description"
                  />
                </div>
                <ContentMetadataFields
                  subject={subject}
                  gradeLevel={gradeLevel}
                  ageRange={ageRange}
                  onSubjectChange={setSubject}
                  onGradeLevelChange={setGradeLevel}
                  onAgeRangeChange={setAgeRange}
                />
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="isPublic" className="text-base">Share as Public Resource</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow other teachers to discover and use this quiz on the Shared Resources page. Content will be automatically published when shared.
                    </p>
                  </div>
                  <Switch
                    id="isPublic"
                    checked={isPublic}
                    onCheckedChange={(checked) => {
                      setIsPublic(checked);
                      if (checked) {
                        setIsPublished(true);
                      }
                    }}
                    data-testid="switch-public"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Questions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Questions ({questions.length})</h3>
                <Button onClick={addQuestion} size="sm" data-testid="button-add-question">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Question
                </Button>
              </div>

              {questions.length === 0 ? (
                <Card className="text-center py-12">
                  <CardContent>
                    <p className="text-muted-foreground mb-4">No questions yet. Add your first question to get started.</p>
                    <Button onClick={addQuestion} data-testid="button-add-first-question">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Question
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                questions.map((question, index) => (
                  <Card key={question.id} data-testid={`question-${index}`}>
                    <CardHeader>
                      <div className="flex items-start gap-3">
                        <GripVertical className="h-5 w-5 text-muted-foreground mt-1 cursor-move" />
                        <div className="flex-1 space-y-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <Label>Question {index + 1}</Label>
                              <Textarea
                                placeholder="Enter your question..."
                                value={question.question}
                                onChange={(e) => updateQuestion(index, { question: e.target.value })}
                                className="mt-2 resize-none"
                                data-testid={`input-question-${index}`}
                              />
                            </div>
                            <div className="flex flex-col gap-2">
                              <Select
                                value={question.type}
                                onValueChange={(value: any) => {
                                  const updates: Partial<QuizQuestion> = { type: value };
                                  if (value === "true-false") {
                                    updates.options = undefined;
                                    updates.correctAnswer = "true";
                                    updates.items = undefined;
                                    updates.zones = undefined;
                                    updates.dragItems = undefined;
                                  } else if (value === "multiple-choice" && !question.options) {
                                    updates.options = ["", "", "", ""];
                                    updates.correctAnswer = 0;
                                    updates.items = undefined;
                                    updates.zones = undefined;
                                    updates.dragItems = undefined;
                                  } else if (value === "fill-blank") {
                                    updates.options = undefined;
                                    updates.correctAnswer = "";
                                    updates.items = undefined;
                                    updates.zones = undefined;
                                    updates.dragItems = undefined;
                                    updates.caseSensitive = false;
                                    updates.acceptableAnswers = [];
                                  } else if (value === "ordering") {
                                    updates.options = undefined;
                                    const defaultItems = ["", "", ""];
                                    updates.items = question.items || defaultItems;
                                    updates.correctAnswer = question.items || defaultItems;
                                    updates.zones = undefined;
                                    updates.dragItems = undefined;
                                  } else if (value === "drag-drop") {
                                    updates.options = undefined;
                                    updates.items = undefined;
                                    const defaultZones = [{ id: "zone1", label: "Category 1" }, { id: "zone2", label: "Category 2" }];
                                    const defaultItems = [{ id: "item1", content: "", correctZone: "zone1" }, { id: "item2", content: "", correctZone: "zone2" }];
                                    updates.zones = question.zones || defaultZones;
                                    updates.dragItems = question.dragItems || defaultItems;
                                    // Store correct answer as a mapping of itemId -> zoneId
                                    const correctMapping: Record<string, string> = {};
                                    (updates.dragItems || defaultItems).forEach((item: any) => {
                                      correctMapping[item.id] = item.correctZone;
                                    });
                                    updates.correctAnswer = correctMapping;
                                  }
                                  updateQuestion(index, updates);
                                }}
                              >
                                <SelectTrigger className="w-40" data-testid={`select-type-${index}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                                  <SelectItem value="true-false">True/False</SelectItem>
                                  <SelectItem value="fill-blank">Fill in Blank</SelectItem>
                                  <SelectItem value="ordering">Ordering</SelectItem>
                                  <SelectItem value="drag-drop">Drag and Drop</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                variant="destructive"
                                size="icon"
                                onClick={() => removeQuestion(index)}
                                data-testid={`button-delete-${index}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Answer Options */}
                          {question.type === "multiple-choice" && question.options && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label>Answer Options</Label>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const newOptions = [...question.options!, ""];
                                    updateQuestion(index, { options: newOptions });
                                  }}
                                  data-testid={`button-add-option-${index}`}
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Add Option
                                </Button>
                              </div>
                              {question.options.map((option, optIndex) => (
                                <div key={optIndex} className="flex items-center gap-2">
                                  <Input
                                    placeholder={`Option ${optIndex + 1}`}
                                    value={option}
                                    onChange={(e) => {
                                      const newOptions = [...question.options!];
                                      newOptions[optIndex] = e.target.value;
                                      updateQuestion(index, { options: newOptions });
                                    }}
                                    data-testid={`input-option-${index}-${optIndex}`}
                                  />
                                  <Button
                                    variant={question.correctAnswer === optIndex ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => updateQuestion(index, { correctAnswer: optIndex })}
                                    data-testid={`button-correct-${index}-${optIndex}`}
                                  >
                                    {question.correctAnswer === optIndex ? "Correct" : "Mark Correct"}
                                  </Button>
                                  {question.options!.length > 2 && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive hover:text-destructive"
                                      onClick={() => {
                                        const newOptions = question.options!.filter((_, i) => i !== optIndex);
                                        // Adjust correctAnswer if needed
                                        let newCorrectAnswer = question.correctAnswer as number;
                                        if (optIndex === newCorrectAnswer) {
                                          newCorrectAnswer = 0; // Reset to first option if deleted option was correct
                                        } else if (optIndex < newCorrectAnswer) {
                                          newCorrectAnswer--; // Shift down if deleted option was before correct
                                        }
                                        updateQuestion(index, { options: newOptions, correctAnswer: newCorrectAnswer });
                                      }}
                                      data-testid={`button-delete-option-${index}-${optIndex}`}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {question.type === "true-false" && (
                            <div className="flex gap-2">
                              <Button
                                variant={question.correctAnswer === "true" ? "default" : "outline"}
                                onClick={() => updateQuestion(index, { correctAnswer: "true" })}
                                data-testid={`button-true-${index}`}
                              >
                                True
                              </Button>
                              <Button
                                variant={question.correctAnswer === "false" ? "default" : "outline"}
                                onClick={() => updateQuestion(index, { correctAnswer: "false" })}
                                data-testid={`button-false-${index}`}
                              >
                                False
                              </Button>
                            </div>
                          )}

                          {question.type === "fill-blank" && (
                            <div className="space-y-3">
                            <div>
                                <Label>Correct Answer(s)</Label>
                              <Input
                                placeholder="Enter the correct answer..."
                                  value={Array.isArray(question.acceptableAnswers) && question.acceptableAnswers.length > 0 
                                    ? question.acceptableAnswers[0] 
                                    : (question.correctAnswer as string) || ""}
                                  onChange={(e) => {
                                    const answer = e.target.value;
                                    updateQuestion(index, { 
                                      correctAnswer: answer,
                                      acceptableAnswers: [answer]
                                    });
                                  }}
                                data-testid={`input-answer-${index}`}
                              />
                                <p className="text-xs text-muted-foreground mt-1">
                                  You can add multiple acceptable answers below
                                </p>
                              </div>
                              <div>
                                <Label>Additional Acceptable Answers (Optional)</Label>
                                <Textarea
                                  placeholder="Enter additional acceptable answers, one per line..."
                                  value={question.acceptableAnswers?.slice(1).join("\n") || ""}
                                  onChange={(e) => {
                                    const firstAnswer = Array.isArray(question.acceptableAnswers) && question.acceptableAnswers.length > 0
                                      ? question.acceptableAnswers[0]
                                      : (question.correctAnswer as string) || "";
                                    const additional = e.target.value.split("\n").filter(a => a.trim());
                                    updateQuestion(index, {
                                      acceptableAnswers: [firstAnswer, ...additional]
                                    });
                                  }}
                                  rows={3}
                                  className="text-sm"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  id={`case-sensitive-${index}`}
                                  checked={question.caseSensitive || false}
                                  onChange={(e) => updateQuestion(index, { caseSensitive: e.target.checked })}
                                  className="rounded"
                                />
                                <Label htmlFor={`case-sensitive-${index}`} className="text-sm font-normal">
                                  Case sensitive
                                </Label>
                              </div>
                            </div>
                          )}

                          {question.type === "ordering" && (
                            <div className="space-y-3">
                              <Label>Items to Order (drag to reorder)</Label>
                              <p className="text-xs text-muted-foreground">
                                Arrange items in the correct order. The order you set here is the correct answer.
                              </p>
                              <div className="space-y-2">
                                {question.items?.map((item, itemIndex) => (
                                  <div key={itemIndex} className="flex items-center gap-2">
                                    <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
                                    <Input
                                      placeholder={`Item ${itemIndex + 1}`}
                                      value={item}
                                      onChange={(e) => {
                                        const newItems = [...(question.items || [])];
                                        newItems[itemIndex] = e.target.value;
                                        updateQuestion(index, { 
                                          items: newItems,
                                          correctAnswer: newItems
                                        });
                                      }}
                                      data-testid={`input-item-${index}-${itemIndex}`}
                                    />
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        const newItems = question.items?.filter((_, i) => i !== itemIndex) || [];
                                        updateQuestion(index, { 
                                          items: newItems,
                                          correctAnswer: newItems
                                        });
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const newItems = [...(question.items || []), ""];
                                    updateQuestion(index, { 
                                      items: newItems,
                                      correctAnswer: newItems
                                    });
                                  }}
                                >
                                  <Plus className="h-4 w-4 mr-1" />
                                  Add Item
                                </Button>
                              </div>
                            </div>
                          )}

                          {question.type === "drag-drop" && (
                            <div className="space-y-4">
                              <div>
                                <Label>Drop Zones (Categories)</Label>
                                <p className="text-xs text-muted-foreground mb-2">
                                  Define the categories or zones where items can be dropped
                                </p>
                                <div className="space-y-2">
                                  {question.zones?.map((zone, zoneIndex) => (
                                    <div key={zone.id} className="flex items-center gap-2">
                                      <Input
                                        placeholder={`Zone ${zoneIndex + 1} label`}
                                        value={zone.label}
                                        onChange={(e) => {
                                          const newZones = [...(question.zones || [])];
                                          newZones[zoneIndex] = { ...zone, label: e.target.value };
                                          updateQuestion(index, { zones: newZones });
                                        }}
                                        data-testid={`input-zone-${index}-${zoneIndex}`}
                                      />
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => {
                                          const newZones = question.zones?.filter((_, i) => i !== zoneIndex) || [];
                                          // Also remove drag items that reference this zone
                                          const newDragItems = question.dragItems?.filter(item => item.correctZone !== zone.id) || [];
                                          updateQuestion(index, { zones: newZones, dragItems: newDragItems });
                                        }}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ))}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      const newZone = { id: `zone${Date.now()}`, label: "" };
                                      const newZones = [...(question.zones || []), newZone];
                                      updateQuestion(index, { zones: newZones });
                                    }}
                                  >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Add Zone
                                  </Button>
                                </div>
                              </div>
                              <div>
                                <Label>Drag Items</Label>
                                <p className="text-xs text-muted-foreground mb-2">
                                  Define items that students will drag to the correct zones
                                </p>
                                <div className="space-y-2">
                                  {question.dragItems?.map((item, itemIndex) => (
                                    <div key={item.id} className="flex items-center gap-2">
                                      <Input
                                        placeholder={`Item ${itemIndex + 1}`}
                                        value={item.content}
                                        onChange={(e) => {
                                          const newDragItems = [...(question.dragItems || [])];
                                          newDragItems[itemIndex] = { ...item, content: e.target.value };
                                          updateQuestion(index, { dragItems: newDragItems });
                                        }}
                                        data-testid={`input-drag-item-${index}-${itemIndex}`}
                                      />
                                      <Select
                                        value={item.correctZone}
                                        onValueChange={(zoneId) => {
                                          const newDragItems = [...(question.dragItems || [])];
                                          newDragItems[itemIndex] = { ...item, correctZone: zoneId };
                                          updateQuestion(index, { dragItems: newDragItems });
                                        }}
                                      >
                                        <SelectTrigger className="w-40">
                                          <SelectValue placeholder="Correct zone" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {question.zones?.map((zone) => (
                                            <SelectItem key={zone.id} value={zone.id}>
                                              {zone.label || `Zone ${zone.id}`}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => {
                                          const newDragItems = question.dragItems?.filter((_, i) => i !== itemIndex) || [];
                                          updateQuestion(index, { dragItems: newDragItems });
                                        }}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ))}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      const firstZone = question.zones?.[0]?.id || "zone1";
                                      const newItem = { id: `item${Date.now()}`, content: "", correctZone: firstZone };
                                      const newDragItems = [...(question.dragItems || []), newItem];
                                      updateQuestion(index, { dragItems: newDragItems });
                                    }}
                                    disabled={!question.zones || question.zones.length === 0}
                                  >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Add Item
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Explanation */}
                          <div>
                            <Label>Explanation (Optional)</Label>
                            <Textarea
                              placeholder="Explain the answer..."
                              value={question.explanation || ""}
                              onChange={(e) => updateQuestion(index, { explanation: e.target.value })}
                              className="mt-2 h-16 resize-none"
                              data-testid={`textarea-explanation-${index}`}
                            />
                          </div>

                          {/* Question Image Section */}
                          <Collapsible>
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                                <span className="flex items-center gap-2 text-sm">
                                  <ImageIcon className="h-4 w-4" />
                                  {question.imageUrl ? "Question Image (Added)" : "Add Image (Optional)"}
                                </span>
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="space-y-3 pt-2">
                              {question.imageUrl ? (
                                <div className="space-y-2">
                                  <div className="relative">
                                    <img
                                      src={question.imageUrl}
                                      alt={question.imageAlt || "Question image"}
                                      className="w-full max-h-40 object-contain rounded border bg-muted/50"
                                      onError={() => {
                                        toast({
                                          title: "Image load failed",
                                          description: "The image could not be loaded.",
                                          variant: "destructive",
                                        });
                                      }}
                                    />
                                    <Button
                                      variant="destructive"
                                      size="icon"
                                      className="absolute top-2 right-2 h-6 w-6"
                                      onClick={() => removeQuestionImage(index)}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                  <div>
                                    <Label className="text-xs">Image Alt Text</Label>
                                    <Input
                                      value={question.imageAlt || ""}
                                      onChange={(e) => updateQuestion(index, { imageAlt: e.target.value })}
                                      placeholder="Describe the image..."
                                      className="mt-1 h-8 text-sm"
                                    />
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <div className="flex gap-2">
                                    <Input
                                      value={imageUrlInputs[index] || ""}
                                      onChange={(e) => setImageUrlInputs((prev) => ({ ...prev, [index]: e.target.value }))}
                                      placeholder="Enter image URL..."
                                      className="h-8 text-sm"
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          handleImageUrlSubmit(index);
                                        }
                                      }}
                                    />
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleImageUrlSubmit(index)}
                                      className="h-8"
                                    >
                                      <Link className="h-3 w-3" />
                                    </Button>
                                  </div>
                                  <div className="flex gap-2">
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      ref={(el) => { fileInputRefs.current[index] = el; }}
                                      onChange={(e) => handleFileUpload(index, e)}
                                    />
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => fileInputRefs.current[index]?.click()}
                                      className="flex-1 h-8 text-xs"
                                    >
                                      <Upload className="h-3 w-3 mr-1" />
                                      Upload
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setActiveImageQuestionIndex(index);
                                        setShowImageGenerator(true);
                                      }}
                                      className="flex-1 h-8 text-xs"
                                    >
                                      <Sparkles className="h-3 w-3 mr-1" />
                                      AI Generate
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </CollapsibleContent>
                          </Collapsible>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div className="lg:col-span-1">
              <Card className="sticky top-20">
                <CardHeader>
                  <CardTitle>Quiz Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="autosave" className="text-base">Autosave</Label>
                      <p className="text-xs text-muted-foreground">
                        Automatically save changes after 2 seconds
                      </p>
                    </div>
                    <Switch
                      id="autosave"
                      checked={autosave}
                      onCheckedChange={setAutosave}
                      data-testid="switch-autosave"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="shuffle">Shuffle Questions</Label>
                    <Switch
                      id="shuffle"
                      checked={settings.shuffleQuestions}
                      onCheckedChange={(checked) => setSettings({ ...settings, shuffleQuestions: checked })}
                      data-testid="switch-shuffle"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="showAnswers">Show Correct Answers</Label>
                    <Switch
                      id="showAnswers"
                      checked={settings.showCorrectAnswers}
                      onCheckedChange={(checked) => setSettings({ ...settings, showCorrectAnswers: checked })}
                      data-testid="switch-show-answers"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="retry">Allow Retry</Label>
                    <Switch
                      id="retry"
                      checked={settings.allowRetry}
                      onCheckedChange={(checked) => setSettings({ ...settings, allowRetry: checked })}
                      data-testid="switch-retry"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timeLimit">Time Limit (minutes)</Label>
                    <Input
                      id="timeLimit"
                      type="number"
                      min="0"
                      placeholder="No limit"
                      value={settings.timeLimit || ""}
                      onChange={(e) =>
                        setSettings({ ...settings, timeLimit: e.target.value ? parseInt(e.target.value) : undefined })
                      }
                      data-testid="input-time-limit"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      <AIGenerationModal
        open={showAIModal}
        onOpenChange={setShowAIModal}
        contentType="quiz"
        onGenerated={handleAIGenerated}
      />

      <ImageGeneratorDialog
        open={showImageGenerator}
        onOpenChange={(open) => {
          setShowImageGenerator(open);
          if (!open) setActiveImageQuestionIndex(null);
        }}
        onImageGenerated={handleImageGenerated}
      />
    </div>
  );
}
