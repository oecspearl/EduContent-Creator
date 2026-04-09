import { useState, useCallback } from "react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { AIGenerationModal } from "@/components/AIGenerationModal";
import {
  ArrowLeft,
  Sparkles,
  Plus,
  Trash2,
  GripVertical,
  Settings,
  Globe,
  Image as ImageIcon,
  Download,
  Save
} from "lucide-react";
import type { FlashcardData } from "@shared/schema";
import ShareToClassroomDialog from "@/components/ShareToClassroomDialog";
import { ContentMetadataFields } from "@/components/ContentMetadataFields";
import { generateHTMLExport, downloadHTML } from "@/lib/html-export";
import { useContentEditor } from "@/hooks/useContentEditor";

export default function FlashcardCreator() {
  const [cards, setCards] = useState<FlashcardData["cards"]>([]);
  const [settings, setSettings] = useState({
    shuffleCards: false,
    showProgress: true,
    autoFlipDelay: undefined as number | undefined,
  });
  const [showAIModal, setShowAIModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const editor = useContentEditor<FlashcardData>({
    contentType: "flashcard",
    contentLabel: "Flashcard set",
    buildData: useCallback(() => ({ cards, settings }), [cards, settings]),
    populateFromContent: useCallback((content) => {
      const data = content.data as FlashcardData;
      setCards(data.cards || []);
      setSettings({
        shuffleCards: data.settings?.shuffleCards ?? false,
        showProgress: data.settings?.showProgress ?? true,
        autoFlipDelay: data.settings?.autoFlipDelay,
      });
    }, []),
    canSave: useCallback(() => cards.length > 0, [cards.length]),
    autosaveDeps: [cards, settings],
  });

  const addCard = () => {
    setCards([...cards, {
      id: Date.now().toString(),
      front: "",
      back: "",
      category: "",
      frontImageUrl: undefined,
      backImageUrl: undefined,
      frontImageAlt: undefined,
      backImageAlt: undefined,
    }]);
  };

  const updateCard = (index: number, updates: Partial<typeof cards[0]>) => {
    const updated = [...cards];
    updated[index] = { ...updated[index], ...updates };
    setCards(updated);
  };

  const removeCard = (index: number) => {
    setCards(cards.filter((_, i) => i !== index));
  };

  const handleAIGenerated = (data: any) => {
    if (data.cards) {
      setCards(prev => [...prev, ...data.cards]);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header bar */}
      <div className="sticky top-0 z-10 bg-card/95 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => editor.navigate("/dashboard")} data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold">Flashcard Creator</h1>
              {editor.isSaving && <Badge variant="outline">Saving...</Badge>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!editor.autosave && (
              <Button
                variant="default"
                size="sm"
                onClick={editor.handleManualSave}
                disabled={editor.isSaving || !editor.title || cards.length === 0}
                data-testid="button-save"
              >
                <Save className="h-4 w-4 mr-1" />
                {editor.isSaving ? "Saving..." : "Save"}
              </Button>
            )}
            <Button
              variant={editor.isPublished ? "outline" : "default"}
              size="sm"
              onClick={editor.handlePublish}
              disabled={!editor.title || cards.length === 0}
              data-testid="button-publish"
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

      {/* Sub-toolbar */}
      <div className="bg-muted/30 border-b">
        <div className="max-w-7xl mx-auto px-6 py-2 flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setShowSettings(!showSettings)} data-testid="button-settings">
            <Settings className="h-4 w-4 mr-1" />
            Settings
          </Button>
          {editor.contentId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (!editor.content) return;
                const html = generateHTMLExport(editor.content, editor.content.data);
                downloadHTML(html, editor.title || "flashcards");
                editor.toast({
                  title: "Download started",
                  description: "Your flashcards are being downloaded as HTML.",
                });
              }}
              disabled={!editor.contentId || !editor.content}
              data-testid="button-download-html"
            >
              <Download className="h-4 w-4 mr-1" />
              Download HTML
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setShowAIModal(true)} data-testid="button-ai-generate">
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
                <CardTitle>Flashcard Set Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Spanish Vocabulary - Food"
                    value={editor.title}
                    onChange={(e) => editor.setTitle(e.target.value)}
                    data-testid="input-title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of this flashcard set..."
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
                  curriculumContext={editor.curriculumContext}
                  onCurriculumChange={editor.setCurriculumContext}
                />
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="isPublic" className="text-base">Share as Public Resource</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow other teachers to discover and use this flashcard deck on the Shared Resources page. Content will be automatically published when shared.
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

            {/* Cards */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Cards ({cards.length})</h3>
                <Button onClick={addCard} size="sm" data-testid="button-add-card">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Card
                </Button>
              </div>

              {cards.length === 0 ? (
                <Card className="text-center py-12">
                  <CardContent>
                    <p className="text-muted-foreground mb-4">No cards yet. Add your first flashcard to get started.</p>
                    <Button onClick={addCard} data-testid="button-add-first-card">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Card
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                cards.map((card, index) => (
                  <Card key={card.id} data-testid={`card-${index}`}>
                    <CardHeader>
                      <div className="flex items-start gap-3">
                        <GripVertical className="h-5 w-5 text-muted-foreground mt-1 cursor-move" />
                        <div className="flex-1 space-y-4">
                          <div className="flex items-start justify-between">
                            <h4 className="font-medium">Card {index + 1}</h4>
                            <Button
                              variant="destructive"
                              size="icon"
                              onClick={() => removeCard(index)}
                              data-testid={`button-delete-${index}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Front</Label>
                              <RichTextEditor
                                content={card.front}
                                onChange={(html) => updateCard(index, { front: html })}
                                placeholder="Question or term..."
                              />
                              <div className="space-y-1.5">
                                <Label className="text-xs flex items-center gap-1">
                                  <ImageIcon className="h-3 w-3" />
                                  Front Image URL (Optional)
                                </Label>
                                <Input
                                  placeholder="https://example.com/image.jpg"
                                  value={card.frontImageUrl || ""}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    updateCard(index, { frontImageUrl: value.trim() ? value : undefined });
                                  }}
                                  onBlur={(e) => {
                                    const value = e.target.value.trim();
                                    updateCard(index, { frontImageUrl: value || undefined });
                                  }}
                                  className="text-sm"
                                  data-testid={`input-front-image-${index}`}
                                />
                                {card.frontImageUrl && (
                                  <>
                                    <Input
                                      placeholder="Image description (for accessibility)"
                                      value={card.frontImageAlt || ""}
                                      onChange={(e) => {
                                        updateCard(index, { frontImageAlt: e.target.value || undefined });
                                      }}
                                      className="text-sm"
                                      data-testid={`input-front-image-alt-${index}`}
                                    />
                                    <div className="mt-2 rounded-md overflow-hidden border">
                                      <img
                                        src={card.frontImageUrl.trim()}
                                        alt={card.frontImageAlt || "Front preview"}
                                        className="w-full h-32 object-cover"
                                        loading="lazy"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).style.display = 'none';
                                          const next = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                                          if (next) next.style.display = 'flex';
                                        }}
                                      />
                                      <div className="hidden w-full h-24 items-center justify-center bg-muted text-xs text-muted-foreground text-center p-3">
                                        Could not load image. Use a direct image URL ending in .jpg, .png, .gif, etc.
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label>Back</Label>
                              <RichTextEditor
                                content={card.back}
                                onChange={(html) => updateCard(index, { back: html })}
                                placeholder="Answer or definition..."
                              />
                              <div className="space-y-1.5">
                                <Label className="text-xs flex items-center gap-1">
                                  <ImageIcon className="h-3 w-3" />
                                  Back Image URL (Optional)
                                </Label>
                                <Input
                                  placeholder="https://example.com/image.jpg"
                                  value={card.backImageUrl || ""}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    updateCard(index, { backImageUrl: value.trim() ? value : undefined });
                                  }}
                                  onBlur={(e) => {
                                    const value = e.target.value.trim();
                                    updateCard(index, { backImageUrl: value || undefined });
                                  }}
                                  className="text-sm"
                                  data-testid={`input-back-image-${index}`}
                                />
                                {card.backImageUrl && (
                                  <>
                                    <Input
                                      placeholder="Image description (for accessibility)"
                                      value={card.backImageAlt || ""}
                                      onChange={(e) => {
                                        updateCard(index, { backImageAlt: e.target.value || undefined });
                                      }}
                                      className="text-sm"
                                      data-testid={`input-back-image-alt-${index}`}
                                    />
                                    <div className="mt-2 rounded-md overflow-hidden border">
                                      <img
                                        src={card.backImageUrl.trim()}
                                        alt={card.backImageAlt || "Back preview"}
                                        className="w-full h-32 object-cover"
                                        loading="lazy"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).style.display = 'none';
                                          const next = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                                          if (next) next.style.display = 'flex';
                                        }}
                                      />
                                      <div className="hidden w-full h-24 items-center justify-center bg-muted text-xs text-muted-foreground text-center p-3">
                                        Could not load image. Use a direct image URL ending in .jpg, .png, .gif, etc.
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Category (Optional)</Label>
                            <Input
                              placeholder="e.g., Verbs, Numbers, Colors"
                              value={card.category || ""}
                              onChange={(e) => updateCard(index, { category: e.target.value })}
                              data-testid={`input-category-${index}`}
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
                  <CardTitle>Flashcard Settings</CardTitle>
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
                      checked={editor.autosave}
                      onCheckedChange={editor.setAutosave}
                      data-testid="switch-autosave"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="shuffle">Shuffle Cards</Label>
                    <Switch
                      id="shuffle"
                      checked={settings.shuffleCards}
                      onCheckedChange={(checked) => setSettings({ ...settings, shuffleCards: checked })}
                      data-testid="switch-shuffle"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="progress">Show Progress Bar</Label>
                    <Switch
                      id="progress"
                      checked={settings.showProgress}
                      onCheckedChange={(checked) => setSettings({ ...settings, showProgress: checked })}
                      data-testid="switch-progress"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="autoFlip">Auto-flip Delay (seconds)</Label>
                    <Input
                      id="autoFlip"
                      type="number"
                      min="0"
                      placeholder="No auto-flip"
                      value={settings.autoFlipDelay || ""}
                      onChange={(e) =>
                        setSettings({ ...settings, autoFlipDelay: e.target.value ? parseInt(e.target.value) : undefined })
                      }
                      data-testid="input-auto-flip"
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
        contentType="flashcard"
        onGenerated={handleAIGenerated}
        curriculumContext={editor.curriculumContext}
      />
    </div>
  );
}
