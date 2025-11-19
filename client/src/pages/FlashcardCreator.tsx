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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
  Download
} from "lucide-react";
import type { H5pContent, FlashcardData } from "@shared/schema";
import ShareToClassroomDialog from "@/components/ShareToClassroomDialog";
import { ContentMetadataFields } from "@/components/ContentMetadataFields";
import { generateHTMLExport, downloadHTML } from "@/lib/html-export";

export default function FlashcardCreator() {
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
  const [cards, setCards] = useState<FlashcardData["cards"]>([]);
  const [settings, setSettings] = useState({
    shuffleCards: false,
    showProgress: true,
    autoFlipDelay: undefined as number | undefined,
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
    if (content && content.type === "flashcard") {
      setTitle(content.title);
      setDescription(content.description || "");
      setSubject(content.subject || "");
      setGradeLevel(content.gradeLevel || "");
      setAgeRange(content.ageRange || "");
      const flashcardData = content.data as FlashcardData;
      setCards(flashcardData.cards || []);
      setSettings({
        shuffleCards: flashcardData.settings?.shuffleCards ?? settings.shuffleCards,
        showProgress: flashcardData.settings?.showProgress ?? settings.showProgress,
        autoFlipDelay: flashcardData.settings?.autoFlipDelay ?? settings.autoFlipDelay,
      });
      setIsPublished(content.isPublished);
      setIsPublic(content.isPublic || false);
    }
  }, [content]);

  const saveMutation = useMutation({
    mutationFn: async (publish: boolean = false) => {
      const data: FlashcardData = { cards, settings };
      
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
          type: "flashcard",
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
        navigate(`/create/flashcard/${data.id}`);
      }
      toast({ title: "Saved!", description: "Flashcard set saved successfully." });
      setIsSaving(false);
    },
  });

  useEffect(() => {
    if (!title || cards.length === 0) return;
    
    const timer = setTimeout(() => {
      setIsSaving(true);
      saveMutation.mutate(isPublished);
    }, 2000);

    return () => clearTimeout(timer);
  }, [title, description, cards, settings, isPublic]);

  const addCard = () => {
    const newCard = {
      id: Date.now().toString(),
      front: "",
      back: "",
      category: "",
      frontImageUrl: undefined,
      backImageUrl: undefined,
      frontImageAlt: undefined,
      backImageAlt: undefined,
    };
    setCards([...cards, newCard]);
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

  const handlePublish = async () => {
    setIsPublished(!isPublished);
    await saveMutation.mutateAsync(!isPublished);
    toast({
      title: isPublished ? "Unpublished" : "Published!",
      description: isPublished
        ? "Flashcard set is now private."
        : "Flashcard set is now publicly accessible via share link.",
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
              <h1 className="text-lg font-semibold">Flashcard Creator</h1>
              {isSaving && <Badge variant="outline">Saving...</Badge>}
            </div>
          </div>

      {/* Breadcrumbs */}
      <div className="bg-background border-b">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <Breadcrumbs items={breadcrumbs} />
        </div>
      </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowSettings(!showSettings)} data-testid="button-settings">
              <Settings className="h-4 w-4 mr-1" />
              Settings
            </Button>
            {contentId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!content) return;
                  const html = generateHTMLExport(content, content.data);
                  downloadHTML(html, title || "flashcards");
                  toast({
                    title: "Download started",
                    description: "Your flashcards are being downloaded as HTML.",
                  });
                }}
                disabled={!contentId || !content}
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
              disabled={!title || cards.length === 0}
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
                <CardTitle>Flashcard Set Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Spanish Vocabulary - Food"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    data-testid="input-title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of this flashcard set..."
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
                      Allow other teachers to discover and use this flashcard deck on the Shared Resources page. Content will be automatically published when shared.
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
                              <Textarea
                                placeholder="Question or term..."
                                value={card.front}
                                onChange={(e) => updateCard(index, { front: e.target.value })}
                                className="h-24 resize-none"
                                data-testid={`textarea-front-${index}`}
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
                                        const value = e.target.value.trim();
                                        updateCard(index, { frontImageAlt: value || undefined });
                                      }}
                                      className="text-sm"
                                      data-testid={`input-front-image-alt-${index}`}
                                    />
                                    <div className="mt-2 rounded-md overflow-hidden border">
                                      <img 
                                        src={card.frontImageUrl} 
                                        alt={card.frontImageAlt || "Front preview"} 
                                        className="w-full h-32 object-cover"
                                        loading="lazy"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                      />
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label>Back</Label>
                              <Textarea
                                placeholder="Answer or definition..."
                                value={card.back}
                                onChange={(e) => updateCard(index, { back: e.target.value })}
                                className="h-24 resize-none"
                                data-testid={`textarea-back-${index}`}
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
                                        const value = e.target.value.trim();
                                        updateCard(index, { backImageAlt: value || undefined });
                                      }}
                                      className="text-sm"
                                      data-testid={`input-back-image-alt-${index}`}
                                    />
                                    <div className="mt-2 rounded-md overflow-hidden border">
                                      <img 
                                        src={card.backImageUrl} 
                                        alt={card.backImageAlt || "Back preview"} 
                                        className="w-full h-32 object-cover"
                                        loading="lazy"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                      />
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
      />
    </div>
  );
}
