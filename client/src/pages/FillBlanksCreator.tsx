import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AIGenerationModal } from "@/components/AIGenerationModal";
import { ArrowLeft, Sparkles, Plus, Trash2, Globe, HelpCircle, Save } from "lucide-react";
import type { H5pContent, FillInBlanksData } from "@shared/schema";
import ShareToClassroomDialog from "@/components/ShareToClassroomDialog";
import { ContentMetadataFields } from "@/components/ContentMetadataFields";

export default function FillBlanksCreator() {
  const params = useParams();
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const contentId = params.id;
  const breadcrumbs = useBreadcrumbs(contentId);
  const isEditing = !!contentId;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [ageRange, setAgeRange] = useState("");
  const [text, setText] = useState("");
  const [blanks, setBlanks] = useState<FillInBlanksData["blanks"]>([]);
  const [settings, setSettings] = useState({
    caseSensitive: false,
    showHints: true,
    allowRetry: true,
  });
  const [isPublished, setIsPublished] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [autosave, setAutosave] = useState(true);
  const [showAIModal, setShowAIModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { data: content } = useQuery<H5pContent>({
    queryKey: ["/api/content", contentId],
    enabled: isEditing,
  });

  useEffect(() => {
    if (content && content.type === "fill-blanks") {
      setTitle(content.title);
      setDescription(content.description || "");
      setSubject(content.subject || "");
      setGradeLevel(content.gradeLevel || "");
      setAgeRange(content.ageRange || "");
      const data = content.data as FillInBlanksData;
      setText(data.text || "");
      setBlanks(data.blanks || []);
      setSettings(data.settings || settings);
      setIsPublished(content.isPublished);
      setIsPublic(content.isPublic || false);
    }
  }, [content]);

  const saveMutation = useMutation({
    mutationFn: async (publish: boolean = false) => {
      const data: FillInBlanksData = { text, blanks, settings };
      
      if (isEditing) {
        const response = await apiRequest("PUT", `/api/content/${contentId}`, {
          title, description, subject, gradeLevel, ageRange, data, isPublished: publish, isPublic,
        });
        return await response.json();
      } else {
        const response = await apiRequest("POST", "/api/content", {
          title, description, subject, gradeLevel, ageRange, type: "fill-blanks", data, isPublished: publish, isPublic,
        });
        return await response.json();
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/content"] });
      queryClient.invalidateQueries({ queryKey: ["/api/content/public"] });
      if (!isEditing) navigate(`/create/fill-blanks/${data.id}`);
      toast({ title: "Saved!", description: "Fill in the Blanks activity saved successfully." });
      setIsSaving(false);
    },
  });

  useEffect(() => {
    if (!autosave) return; // Skip autosave if disabled
    if (!title || !text || blanks.length === 0) return;
    const timer = setTimeout(() => {
      setIsSaving(true);
      saveMutation.mutate(isPublished);
    }, 2000);
    return () => clearTimeout(timer);
  }, [title, description, text, blanks, settings, isPublic, autosave, isPublished]);
  
  const handleManualSave = () => {
    if (!title || !text || blanks.length === 0) {
      toast({
        title: "Cannot save",
        description: "Please add a title, text, and at least one blank.",
        variant: "destructive",
      });
      return;
    }
    setIsSaving(true);
    saveMutation.mutate(isPublished);
  };

  const addBlank = () => {
    setBlanks([...blanks, {
      id: Date.now().toString(),
      correctAnswers: [""],
      caseSensitive: settings.caseSensitive,
      showHint: "",
    }]);
  };

  const handleAIGenerated = (data: any) => {
    if (data.text) setText(data.text);
    if (data.blanks) setBlanks(data.blanks);
    setShowAIModal(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Fill in the Blanks</h1>
              <p className="text-sm text-muted-foreground">
                {isSaving ? "Saving..." : isEditing ? "Editing activity" : "Create new activity"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!autosave && (
              <Button 
                variant="default" 
                size="sm" 
                onClick={handleManualSave}
                disabled={isSaving || !title || !text || blanks.length === 0}
                data-testid="button-save"
              >
                <Save className="h-4 w-4 mr-1" />
                {isSaving ? "Saving..." : "Save"}
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowAIModal(true)} data-testid="button-ai-generate">
              <Sparkles className="h-4 w-4 mr-2" />
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
              variant={isPublished ? "default" : "outline"}
              onClick={() => {
                setIsPublished(!isPublished);
                saveMutation.mutate(!isPublished);
              }}
              data-testid="button-publish"
            >
              <Globe className="h-4 w-4 mr-2" />
              {isPublished ? "Published" : "Publish"}
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter activity title"
                  data-testid="input-title"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter activity description"
                  data-testid="input-description"
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
                    Allow other teachers to discover and use this fill in the blanks activity on the Shared Resources page. Content will be automatically published when shared.
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

          <Card>
            <CardHeader>
              <CardTitle>Text with Blanks</CardTitle>
            </CardHeader>
            <CardContent>
              <Label htmlFor="text">
                Enter text and use *blank* to mark where blanks should appear
              </Label>
              <Textarea
                id="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Example: The capital of France is *blank*."
                className="min-h-32 mt-2"
                data-testid="textarea-text"
              />
              <p className="text-sm text-muted-foreground mt-2">
                Blanks detected: {(text.match(/\*blank\*/g) || []).length}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Blank Answers</CardTitle>
                <Button onClick={addBlank} size="sm" data-testid="button-add-blank">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Blank
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Define correct answers for each blank in order of appearance
              </p>
              {blanks.map((blank, idx) => (
                <div key={blank.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Blank {idx + 1}</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setBlanks(blanks.filter((_, i) => i !== idx))}
                      data-testid={`button-remove-blank-${idx}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div>
                    <Label>Correct Answers (comma-separated)</Label>
                    <Input
                      value={blank.correctAnswers.join(", ")}
                      onChange={(e) => {
                        const updated = [...blanks];
                        updated[idx] = { 
                          ...updated[idx], 
                          correctAnswers: e.target.value.split(",").map(a => a.trim()).filter(Boolean)
                        };
                        setBlanks(updated);
                      }}
                      placeholder="Paris, paris"
                      data-testid={`input-answers-${idx}`}
                    />
                  </div>
                  <div>
                    <Label>Hint (optional)</Label>
                    <Input
                      value={blank.showHint || ""}
                      onChange={(e) => {
                        const updated = [...blanks];
                        updated[idx] = { ...updated[idx], showHint: e.target.value };
                        setBlanks(updated);
                      }}
                      placeholder="Starts with 'P'"
                      data-testid={`input-hint-${idx}`}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                <Label>Case sensitive answers</Label>
                <Switch
                  checked={settings.caseSensitive}
                  onCheckedChange={(checked) => setSettings({ ...settings, caseSensitive: checked })}
                  data-testid="switch-case-sensitive"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Show hints</Label>
                <Switch
                  checked={settings.showHints}
                  onCheckedChange={(checked) => setSettings({ ...settings, showHints: checked })}
                  data-testid="switch-show-hints"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Allow retry</Label>
                <Switch
                  checked={settings.allowRetry}
                  onCheckedChange={(checked) => setSettings({ ...settings, allowRetry: checked })}
                  data-testid="switch-allow-retry"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {showAIModal && (
        <AIGenerationModal
          contentType="fill-blanks"
          onClose={() => setShowAIModal(false)}
          onGenerated={handleAIGenerated}
        />
      )}
    </div>
  );
}
