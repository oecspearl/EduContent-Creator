import { useState, useEffect, useRef, useCallback } from "react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { useContentEditor } from "@/hooks/useContentEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AIGenerationModal } from "@/components/AIGenerationModal";
import { ImageGeneratorDialog } from "@/components/ImageGeneratorDialog";
import { ArrowLeft, Sparkles, Plus, Trash2, Globe, Image as ImageIcon, Upload, X, Download, Save } from "lucide-react";
import type { MemoryGameData, MemoryCard } from "@shared/schema";
import ShareToClassroomDialog from "@/components/ShareToClassroomDialog";
import { generateHTMLExport, downloadHTML } from "@/lib/html-export";
import { ContentMetadataFields } from "@/components/ContentMetadataFields";

type CardPairEditorProps = {
  card1: MemoryCard;
  card2: MemoryCard;
  pairIndex: number;
  onCard1Update: (updates: Partial<MemoryCard>) => void;
  onCard2Update: (updates: Partial<MemoryCard>) => void;
  onRemove: () => void;
  onImageUpload: (cardId: string, file: File) => void;
  onImageUrl: (cardId: string, url: string) => void;
  onImageGenerated: (cardId: string, imageUrl: string) => void;
  onRemoveImage: (cardId: string) => void;
};

function CardPairEditor({
  card1,
  card2,
  pairIndex,
  onCard1Update,
  onCard2Update,
  onRemove,
  onImageUpload,
  onImageUrl,
  onImageGenerated,
  onRemoveImage,
}: CardPairEditorProps) {
  const [showImageDialog1, setShowImageDialog1] = useState(false);
  const [showImageDialog2, setShowImageDialog2] = useState(false);
  const [imageUrlInput1, setImageUrlInput1] = useState("");
  const [imageUrlInput2, setImageUrlInput2] = useState("");
  const fileInputRef1 = useRef<HTMLInputElement>(null);
  const fileInputRef2 = useRef<HTMLInputElement>(null);

  const renderCardEditor = (
    card: MemoryCard,
    cardNumber: 1 | 2,
    showImageDialog: boolean,
    setShowImageDialog: (show: boolean) => void,
    imageUrlInput: string,
    setImageUrlInput: (url: string) => void,
    fileInputRef: React.RefObject<HTMLInputElement | null>,
    onUpdate: (updates: Partial<MemoryCard>) => void
  ) => {
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        if (file.size > 2 * 1024 * 1024) {
          alert("File size must be less than 2MB");
          return;
        }
        onImageUpload(card.id, file);
      }
    };

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Card {cardNumber}</Label>
          <div className="flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                onUpdate({ type: card.type === "text" ? "image" : "text" });
                if (card.type === "text") {
                  setShowImageDialog(true);
                }
              }}
              data-testid={`button-toggle-type-${cardNumber}-${pairIndex}`}
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {card.type === "text" ? (
          <Input
            value={card.content}
            onChange={(e) => onUpdate({ content: e.target.value })}
            placeholder="Card content"
            data-testid={`input-card${cardNumber}-${pairIndex}`}
          />
        ) : (
          <div className="space-y-2">
            {card.imageUrl ? (
              <div className="relative border rounded-lg p-2">
                <img
                  src={card.imageUrl}
                  alt="Card image"
                  className="w-full h-32 object-contain rounded"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute top-1 right-1"
                  onClick={() => onRemoveImage(card.id)}
                  data-testid={`button-remove-image-${cardNumber}-${pairIndex}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline" className="w-full" data-testid={`button-add-image-${cardNumber}-${pairIndex}`}>
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Add Image
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Image to Card {cardNumber}</DialogTitle>
                  </DialogHeader>
                  <Tabs defaultValue="upload" className="py-4">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="upload">Upload</TabsTrigger>
                      <TabsTrigger value="url">URL</TabsTrigger>
                      <TabsTrigger value="ai">AI Generate</TabsTrigger>
                    </TabsList>
                    <TabsContent value="upload" className="space-y-4 pt-4">
                      <div>
                        <Label htmlFor={`image-file-${card.id}`}>Choose an image file</Label>
                        <Input
                          ref={fileInputRef}
                          id={`image-file-${card.id}`}
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="mt-2"
                          data-testid={`input-image-file-${cardNumber}-${pairIndex}`}
                        />
                        <p className="text-sm text-muted-foreground mt-2">
                          Maximum file size: 2MB. Supported formats: JPG, PNG, GIF, WebP
                        </p>
                      </div>
                    </TabsContent>
                    <TabsContent value="url" className="space-y-4 pt-4">
                      <div>
                        <Label htmlFor={`image-url-${card.id}`}>Image URL</Label>
                        <Input
                          id={`image-url-${card.id}`}
                          value={imageUrlInput}
                          onChange={(e) => setImageUrlInput(e.target.value)}
                          placeholder="https://example.com/image.jpg"
                          className="mt-2"
                          data-testid={`input-image-url-${cardNumber}-${pairIndex}`}
                        />
                      </div>
                      <Button
                        onClick={() => {
                          if (imageUrlInput.trim()) {
                            onImageUrl(card.id, imageUrlInput.trim());
                            setImageUrlInput("");
                            setShowImageDialog(false);
                          }
                        }}
                        className="w-full"
                        data-testid={`button-use-url-${cardNumber}-${pairIndex}`}
                      >
                        Use URL
                      </Button>
                    </TabsContent>
                    <TabsContent value="ai" className="space-y-4 pt-4">
                      <ImageGeneratorDialog
                        open={showImageDialog}
                        onOpenChange={setShowImageDialog}
                        onImageGenerated={(imageUrl) => {
                          onImageGenerated(card.id, imageUrl);
                          setShowImageDialog(false);
                        }}
                      />
                    </TabsContent>
                  </Tabs>
                </DialogContent>
              </Dialog>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Label>Pair {pairIndex + 1}</Label>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          data-testid={`button-remove-pair-${pairIndex}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {renderCardEditor(card1, 1, showImageDialog1, setShowImageDialog1, imageUrlInput1, setImageUrlInput1, fileInputRef1, onCard1Update)}
        {renderCardEditor(card2, 2, showImageDialog2, setShowImageDialog2, imageUrlInput2, setImageUrlInput2, fileInputRef2, onCard2Update)}
      </div>
    </div>
  );
}

export default function MemoryGameCreator() {
  const [cards, setCards] = useState<MemoryGameData["cards"]>([]);
  const [settings, setSettings] = useState({
    rows: 4,
    columns: 4,
    showTimer: true,
    showMoves: true,
  });
  const [showAIModal, setShowAIModal] = useState(false);

  const editor = useContentEditor<MemoryGameData>({
    contentType: "memory-game",
    contentLabel: "Memory Game",
    buildData: useCallback(() => ({ cards, settings }), [cards, settings]),
    populateFromContent: useCallback((content) => {
      const data = content.data as MemoryGameData;
      setCards(data.cards || []);
      setSettings(data.settings || { rows: 4, columns: 4, showTimer: true, showMoves: true });
    }, []),
    canSave: useCallback(() => cards.length > 0, [cards.length]),
    autosaveDeps: [cards, settings],
  });

  const addPair = () => {
    const matchId = Date.now().toString();
    setCards([
      ...cards,
      { id: `${matchId}-1`, content: "", matchId, type: "text" },
      { id: `${matchId}-2`, content: "", matchId, type: "text" },
    ]);
  };

  const handleImageUpload = (cardId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      const updated = cards.map(c =>
        c.id === cardId
          ? { ...c, type: "image" as const, imageUrl, content: "" }
          : c
      );
      setCards(updated);
    };
    reader.readAsDataURL(file);
  };

  const handleImageUrl = (cardId: string, url: string) => {
    const updated = cards.map(c =>
      c.id === cardId
        ? { ...c, type: "image" as const, imageUrl: url, content: "" }
        : c
    );
    setCards(updated);
  };

  const handleImageGenerated = (cardId: string, imageUrl: string) => {
    const updated = cards.map(c =>
      c.id === cardId
        ? { ...c, type: "image" as const, imageUrl, content: "" }
        : c
    );
    setCards(updated);
  };

  const removeImage = (cardId: string) => {
    const updated = cards.map(c =>
      c.id === cardId
        ? { ...c, type: "text" as const, imageUrl: undefined, content: "" }
        : c
    );
    setCards(updated);
  };

  const handleAIGenerated = (data: any) => {
    if (data.cards) setCards(data.cards);
    setShowAIModal(false);
  };

  const pairs = [];
  for (let i = 0; i < cards.length; i += 2) {
    if (cards[i] && cards[i + 1]) {
      pairs.push([cards[i], cards[i + 1]]);
    }
  }

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
              <h1 className="text-lg font-semibold">Memory Game</h1>
              {editor.isSaving && <span className="text-sm text-muted-foreground">Saving...</span>}
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
          {editor.contentId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (!editor.content) return;
                const html = generateHTMLExport(editor.content, editor.content.data);
                downloadHTML(html, editor.title || "memory-game");
                editor.toast({
                  title: "Download started",
                  description: "Your memory game is being downloaded as HTML.",
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
                  placeholder="Enter game title"
                  data-testid="input-title"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={editor.description}
                  onChange={(e) => editor.setDescription(e.target.value)}
                  placeholder="Enter game description"
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
                    Allow other teachers to discover and use this memory game on the Shared Resources page. Content will be automatically published when shared.
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
              <div className="flex items-center justify-between">
                <CardTitle>Card Pairs</CardTitle>
                <Button onClick={addPair} size="sm" data-testid="button-add-pair">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Pair
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {pairs.map(([card1, card2], idx) => (
                <CardPairEditor
                  key={card1.matchId}
                  card1={card1}
                  card2={card2}
                  pairIndex={idx}
                  onCard1Update={(updates) => {
                    const updated = [...cards];
                    const index = updated.findIndex(c => c.id === card1.id);
                    updated[index] = { ...updated[index], ...updates };
                    setCards(updated);
                  }}
                  onCard2Update={(updates) => {
                    const updated = [...cards];
                    const index = updated.findIndex(c => c.id === card2.id);
                    updated[index] = { ...updated[index], ...updates };
                    setCards(updated);
                  }}
                  onRemove={() => setCards(cards.filter(c => c.matchId !== card1.matchId))}
                  onImageUpload={handleImageUpload}
                  onImageUrl={handleImageUrl}
                  onImageGenerated={handleImageGenerated}
                  onRemoveImage={removeImage}
                />
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
                  checked={editor.autosave}
                  onCheckedChange={editor.setAutosave}
                  data-testid="switch-autosave"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Show timer</Label>
                <Switch
                  checked={settings.showTimer}
                  onCheckedChange={(checked) => setSettings({ ...settings, showTimer: checked })}
                  data-testid="switch-show-timer"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Show move counter</Label>
                <Switch
                  checked={settings.showMoves}
                  onCheckedChange={(checked) => setSettings({ ...settings, showMoves: checked })}
                  data-testid="switch-show-moves"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AIGenerationModal
        contentType="memory-game"
        open={showAIModal}
        onOpenChange={setShowAIModal}
        onGenerated={handleAIGenerated}
        curriculumContext={editor.curriculumContext}
      />
    </div>
  );
}
