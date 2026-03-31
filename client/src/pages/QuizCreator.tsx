import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { QuizSettingsPanel } from "@/components/quiz/QuizSettingsPanel";
import { AIGenerationModal } from "@/components/AIGenerationModal";
import { ImageGeneratorDialog } from "@/components/ImageGeneratorDialog";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import {
  ArrowLeft,
  Save,
  Sparkles,
  Plus,
  Settings,
  Globe,
  Download,
  RefreshCw,
  RefreshCwOff
} from "lucide-react";
import type { QuizData, QuizQuestion } from "@shared/schema";
import ShareToClassroomDialog from "@/components/ShareToClassroomDialog";
import { generateHTMLExport, downloadHTML } from "@/lib/html-export";
import { ContentMetadataFields } from "@/components/ContentMetadataFields";
import { QuestionCard } from "@/components/quiz/QuestionCard";
import { useContentEditor } from "@/hooks/useContentEditor";

export default function QuizCreator() {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [settings, setSettings] = useState({
    shuffleQuestions: false,
    showCorrectAnswers: true,
    allowRetry: true,
    timeLimit: undefined as number | undefined,
  });
  const [showAIModal, setShowAIModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showImageGenerator, setShowImageGenerator] = useState(false);
  const [activeImageQuestionIndex, setActiveImageQuestionIndex] = useState<number | null>(null);
  const [imageUrlInputs, setImageUrlInputs] = useState<Record<number, string>>({});
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const editor = useContentEditor<QuizData>({
    contentType: "quiz",
    contentLabel: "Quiz",
    buildData: useCallback(() => ({ questions, settings }), [questions, settings]),
    populateFromContent: useCallback((content) => {
      const data = content.data as QuizData;
      setQuestions(data.questions || []);
      setSettings({
        shuffleQuestions: data.settings?.shuffleQuestions ?? false,
        showCorrectAnswers: data.settings?.showCorrectAnswers ?? true,
        allowRetry: data.settings?.allowRetry ?? true,
        timeLimit: data.settings?.timeLimit,
      });
    }, []),
    canSave: useCallback(() => questions.length > 0, [questions.length]),
    autosaveDeps: [questions, settings],
  });

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
      editor.toast({
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
      editor.toast({
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
      editor.toast({
        title: "Image uploaded",
        description: "Image has been added to the question.",
      });
    };
    reader.readAsDataURL(file);
  };

  const handleImageUrlSubmit = (index: number) => {
    const url = imageUrlInputs[index];
    if (!url?.trim()) {
      editor.toast({
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
      editor.toast({
        title: "Image URL added",
        description: "The image URL has been added to the question.",
      });
    } catch {
      editor.toast({
        title: "Invalid URL",
        description: "Please enter a valid image URL",
        variant: "destructive",
      });
    }
  };

  const removeQuestionImage = (index: number) => {
    updateQuestion(index, { imageUrl: undefined, imageAlt: undefined });
    editor.toast({
      title: "Image removed",
      description: "Image has been removed from the question.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card/95 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => editor.navigate("/dashboard")} data-testid="button-back" className="cursor-pointer">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold">Quiz Creator</h1>
              {editor.isSaving && <Badge variant="outline">Saving...</Badge>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!editor.autosave && (
              <Button
                variant="default"
                size="sm"
                onClick={editor.handleManualSave}
                disabled={editor.isSaving || !editor.title || questions.length === 0}
                data-testid="button-save"
                className="cursor-pointer"
              >
                <Save className="h-4 w-4 mr-1" />
                {editor.isSaving ? "Saving..." : "Save"}
              </Button>
            )}
            <Button
              variant={editor.isPublished ? "outline" : "default"}
              size="sm"
              onClick={editor.handlePublish}
              disabled={!editor.title || questions.length === 0}
              data-testid="button-publish"
              className="cursor-pointer"
            >
              <Globe className="h-4 w-4 mr-1" />
              {editor.isPublished ? "Unpublish" : "Publish"}
            </Button>
          </div>
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="bg-background border-b">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <Breadcrumbs items={editor.breadcrumbs} />
        </div>
      </div>

      {/* Sub-toolbar — actions */}
      <div className="bg-muted/30 border-b">
        <div className="max-w-7xl mx-auto px-6 py-2 flex items-center gap-2 flex-wrap">
          {editor.contentId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (!editor.content) return;
                const html = generateHTMLExport(editor.content, editor.content.data);
                downloadHTML(html, editor.title || "quiz");
                editor.toast({
                  title: "Download started",
                  description: "Your quiz is being downloaded as HTML.",
                });
              }}
              disabled={!editor.contentId || !editor.content}
              data-testid="button-download-html"
              className="cursor-pointer"
            >
              <Download className="h-4 w-4 mr-1" />
              Download HTML
            </Button>
          )}
          <Button
            variant={editor.autosave ? "default" : "outline"}
            size="sm"
            onClick={() => {
              editor.setAutosave(!editor.autosave);
              editor.toast({
                title: editor.autosave ? "Autosave disabled" : "Autosave enabled",
                description: editor.autosave
                  ? "Changes will not be saved automatically. Use the Save button."
                  : "Changes will be saved automatically.",
              });
            }}
            data-testid="button-autosave-toggle"
            title={editor.autosave ? "Autosave is ON - Click to disable" : "Autosave is OFF - Click to enable"}
            className="cursor-pointer"
          >
            {editor.autosave ? (
              <>
                <RefreshCw className="h-4 w-4 mr-1" />
                Autosave On
              </>
            ) : (
              <>
                <RefreshCwOff className="h-4 w-4 mr-1" />
                Autosave Off
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowSettings(!showSettings)} data-testid="button-settings" className="cursor-pointer">
            <Settings className="h-4 w-4 mr-1" />
            Settings
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowAIModal(true)} data-testid="button-ai-generate" className="cursor-pointer">
            <Sparkles className="h-4 w-4 mr-1" />
            AI Generate
          </Button>
          {editor.contentId && editor.isPublished && (
            <ShareToClassroomDialog
              contentTitle={editor.title}
              contentDescription={editor.description}
              materialLink={`${window.location.origin}/public/${editor.contentId}`}
            />
          )}
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
                    value={editor.title}
                    onChange={(e) => editor.setTitle(e.target.value)}
                    data-testid="input-title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of this quiz..."
                    value={editor.description}
                    onChange={(e) => editor.setDescription(e.target.value)}
                    className="h-20 resize-none"
                    data-testid="textarea-description"
                  />
                </div>
                <ContentMetadataFields
                  subject={editor.subject}
                  gradeLevel={editor.gradeLevel}
                  ageRange={editor.ageRange}
                  onSubjectChange={editor.setSubject}
                  onGradeLevelChange={editor.setGradeLevel}
                  onAgeRangeChange={editor.setAgeRange}
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
                    checked={editor.isPublic}
                    onCheckedChange={editor.setIsPublicWithAutoPublish}
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
                  <QuestionCard
                    key={question.id}
                    question={question}
                    index={index}
                    onUpdate={(updates) => updateQuestion(index, updates)}
                    onRemove={() => removeQuestion(index)}
                    imageUrlInput={imageUrlInputs[index] || ""}
                    onImageUrlInputChange={(value) => setImageUrlInputs(prev => ({ ...prev, [index]: value }))}
                    onImageUrlSubmit={() => handleImageUrlSubmit(index)}
                    onFileUpload={(e) => handleFileUpload(index, e)}
                    onRemoveImage={() => removeQuestionImage(index)}
                    onOpenImageGenerator={() => {
                      setActiveImageQuestionIndex(index);
                      setShowImageGenerator(true);
                    }}
                    fileInputRef={(el) => { fileInputRefs.current[index] = el; }}
                  />
                ))
              )}
            </div>
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <QuizSettingsPanel
              settings={settings}
              onSettingsChange={setSettings}
              autosave={editor.autosave}
              onAutosaveChange={editor.setAutosave}
            />
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
