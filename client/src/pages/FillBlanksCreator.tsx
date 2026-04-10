import { useState, useCallback } from "react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { AIGenerationModal } from "@/components/AIGenerationModal";
import { ArrowLeft, Sparkles, Plus, Trash2, Globe, Save, X } from "lucide-react";
import type { FillInBlanksData } from "@shared/schema";
import ShareToClassroomDialog from "@/components/ShareToClassroomDialog";
import { ContentMetadataFields } from "@/components/ContentMetadataFields";
import { useContentEditor } from "@/hooks/useContentEditor";

export default function FillBlanksCreator() {
  const [text, setText] = useState("");
  const [blanks, setBlanks] = useState<FillInBlanksData["blanks"]>([]);
  const [settings, setSettings] = useState({
    caseSensitive: false,
    showHints: true,
    allowRetry: true,
  });
  const [wordBank, setWordBank] = useState<string[]>([]);
  const [wordBankInput, setWordBankInput] = useState("");
  const [showAIModal, setShowAIModal] = useState(false);
  const [rawAnswerInputs, setRawAnswerInputs] = useState<Record<string, string>>({});

  const editor = useContentEditor<FillInBlanksData>({
    contentType: "fill-blanks",
    contentLabel: "Fill in the Blanks activity",
    buildData: useCallback(() => ({ text, blanks, wordBank, settings }), [text, blanks, wordBank, settings]),
    populateFromContent: useCallback((content) => {
      const data = content.data as FillInBlanksData;
      setText(data.text || "");
      setBlanks(data.blanks || []);
      setWordBank(data.wordBank || []);
      setSettings(data.settings || { caseSensitive: false, showHints: true, allowRetry: true });
    }, []),
    canSave: useCallback(() => !!text && blanks.length > 0, [text, blanks.length]),
    autosaveDeps: [text, blanks, wordBank, settings],
  });

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
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card/95 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => editor.navigate("/dashboard")} data-testid="button-back" className="cursor-pointer">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold">Fill in the Blanks</h1>
              {editor.isSaving && <span className="text-sm text-muted-foreground">Saving...</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!editor.autosave && (
              <Button
                variant="default"
                size="sm"
                onClick={editor.handleManualSave}
                disabled={editor.isSaving || !editor.title || !text || blanks.length === 0}
                data-testid="button-save"
                className="cursor-pointer"
              >
                <Save className="h-4 w-4 mr-1" />
                {editor.isSaving ? "Saving..." : "Save"}
              </Button>
            )}
            <Button
              variant={editor.isPublished ? "default" : "outline"}
              size="sm"
              onClick={editor.handlePublish}
              data-testid="button-publish"
              className="cursor-pointer"
            >
              <Globe className="h-4 w-4 mr-1" />
              {editor.isPublished ? "Published" : "Publish"}
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
                  value={editor.title}
                  onChange={(e) => editor.setTitle(e.target.value)}
                  placeholder="Enter activity title"
                  data-testid="input-title"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={editor.description}
                  onChange={(e) => editor.setDescription(e.target.value)}
                  placeholder="Enter activity description"
                  data-testid="input-description"
                />
              </div>
              <ContentMetadataFields
                subject={editor.subject}
                gradeLevel={editor.gradeLevel}
                ageRange={editor.ageRange}
                onSubjectChange={editor.setSubject}
                onGradeLevelChange={editor.setGradeLevel}
                onAgeRangeChange={editor.setAgeRange}
                curriculumContext={editor.curriculumContext}
                onCurriculumChange={editor.setCurriculumContext}
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
                  checked={editor.isPublic}
                  onCheckedChange={editor.setIsPublicWithAutoPublish}
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
              <Label>
                Type your text and use <strong>*blank*</strong> where you want blanks to appear. Use the toolbar for formatting.
              </Label>
              <div className="mt-2" data-testid="textarea-text">
                <RichTextEditor
                  content={text}
                  onChange={setText}
                  placeholder="Example: The capital of France is *blank*."
                  keepAsterisksLiteral
                />
              </div>
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
                      value={rawAnswerInputs[blank.id] ?? blank.correctAnswers.join(", ")}
                      onChange={(e) => {
                        setRawAnswerInputs(prev => ({ ...prev, [blank.id]: e.target.value }));
                      }}
                      onBlur={(e) => {
                        const updated = [...blanks];
                        updated[idx] = {
                          ...updated[idx],
                          correctAnswers: e.target.value.split(",").map(a => a.trim()).filter(Boolean)
                        };
                        setBlanks(updated);
                        setRawAnswerInputs(prev => {
                          const next = { ...prev };
                          delete next[blank.id];
                          return next;
                        });
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
              <CardTitle>Word Bank (Optional)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Add words students can choose from when filling blanks. Leave empty to require free-text entry.
              </p>
              <div className="flex gap-2">
                <Input
                  value={wordBankInput}
                  onChange={(e) => setWordBankInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && wordBankInput.trim()) {
                      e.preventDefault();
                      setWordBank([...wordBank, wordBankInput.trim()]);
                      setWordBankInput("");
                    }
                  }}
                  placeholder="Type a word and press Enter"
                  data-testid="input-word-bank"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    if (wordBankInput.trim()) {
                      setWordBank([...wordBank, wordBankInput.trim()]);
                      setWordBankInput("");
                    }
                  }}
                  disabled={!wordBankInput.trim()}
                  data-testid="button-add-word"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {wordBank.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {wordBank.map((word, i) => (
                    <Badge key={i} variant="secondary" className="flex items-center gap-1 pr-1">
                      {word}
                      <button
                        type="button"
                        onClick={() => setWordBank(wordBank.filter((_, j) => j !== i))}
                        className="ml-1 hover:text-destructive"
                        data-testid={`button-remove-word-${i}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
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
                  checked={editor.autosave}
                  onCheckedChange={editor.setAutosave}
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

      <AIGenerationModal
        open={showAIModal}
        onOpenChange={setShowAIModal}
        contentType="fill-blanks"
        onGenerated={handleAIGenerated}
        curriculumContext={editor.curriculumContext}
      />
    </div>
  );
}
