import { useState, useEffect } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AIGenerationModal } from "@/components/AIGenerationModal";
import { 
  ArrowLeft, 
  Save, 
  Sparkles, 
  Plus, 
  Trash2, 
  GripVertical, 
  Settings,
  Eye,
  Globe
} from "lucide-react";
import type { H5pContent, QuizData, QuizQuestion } from "@shared/schema";
import ShareToClassroomDialog from "@/components/ShareToClassroomDialog";

export default function QuizCreator() {
  const params = useParams();
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const contentId = params.id;
  const isEditing = !!contentId;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [settings, setSettings] = useState({
    shuffleQuestions: false,
    showCorrectAnswers: true,
    allowRetry: true,
    timeLimit: undefined as number | undefined,
  });
  const [isPublished, setIsPublished] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { data: content } = useQuery<H5pContent>({
    queryKey: ["/api/content", contentId],
    enabled: isEditing,
  });

  useEffect(() => {
    if (content && content.type === "quiz") {
      setTitle(content.title);
      setDescription(content.description || "");
      const quizData = content.data as QuizData;
      setQuestions(quizData.questions || []);
      setSettings(quizData.settings || settings);
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
          data,
          isPublished: publish,
          isPublic,
        });
        return await response.json();
      } else {
        const response = await apiRequest("POST", "/api/content", {
          title,
          description,
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
      if (!isEditing) {
        navigate(`/create/quiz/${data.id}`);
      }
      toast({ title: "Saved!", description: "Quiz saved successfully." });
      setIsSaving(false);
    },
  });

  useEffect(() => {
    if (!title || questions.length === 0) return;
    
    const timer = setTimeout(() => {
      setIsSaving(true);
      saveMutation.mutate(isPublished);
    }, 2000);

    return () => clearTimeout(timer);
  }, [title, description, questions, settings, isPublic]);

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
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="isPublic" className="text-base">Share as Public Resource</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow other teachers to discover and use this quiz on the Shared Resources page
                    </p>
                  </div>
                  <Switch
                    id="isPublic"
                    checked={isPublic}
                    onCheckedChange={setIsPublic}
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
                                  } else if (value === "multiple-choice" && !question.options) {
                                    updates.options = ["", "", "", ""];
                                    updates.correctAnswer = 0;
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
                              <Label>Answer Options</Label>
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
                            <div>
                              <Label>Correct Answer</Label>
                              <Input
                                placeholder="Enter the correct answer..."
                                value={question.correctAnswer as string}
                                onChange={(e) => updateQuestion(index, { correctAnswer: e.target.value })}
                                data-testid={`input-answer-${index}`}
                              />
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
    </div>
  );
}
