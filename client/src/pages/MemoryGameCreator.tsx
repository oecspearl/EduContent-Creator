import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AIGenerationModal } from "@/components/AIGenerationModal";
import { ImageGeneratorDialog } from "@/components/ImageGeneratorDialog";
import { ArrowLeft, Sparkles, Plus, Trash2, Globe, Image as ImageIcon, Upload, X } from "lucide-react";
import type { H5pContent, MemoryGameData, MemoryCard } from "@shared/schema";
import ShareToClassroomDialog from "@/components/ShareToClassroomDialog";

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
    fileInputRef: React.RefObject<HTMLInputElement>,
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
  const params = useParams();
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const contentId = params.id;
  const breadcrumbs = useBreadcrumbs(contentId);
  const isEditing = !!contentId;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cards, setCards] = useState<MemoryGameData["cards"]>([]);
  const [settings, setSettings] = useState({
    rows: 4,
    columns: 4,
    showTimer: true,
    showMoves: true,
  });
  const [isPublished, setIsPublished] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { data: content } = useQuery<H5pContent>({
    queryKey: ["/api/content", contentId],
    enabled: isEditing,
  });

  useEffect(() => {
    if (content && content.type === "memory-game") {
      setTitle(content.title);
      setDescription(content.description || "");
      const data = content.data as MemoryGameData;
      setCards(data.cards || []);
      setSettings(data.settings || settings);
      setIsPublished(content.isPublished);
      setIsPublic(content.isPublic || false);
    }
  }, [content]);

  const saveMutation = useMutation({
    mutationFn: async (publish: boolean = false) => {
      const data: MemoryGameData = { cards, settings };
      
      if (isEditing) {
        const response = await apiRequest("PUT", `/api/content/${contentId}`, {
          title, description, data, isPublished: publish, isPublic,
        });
        return await response.json();
      } else {
        const response = await apiRequest("POST", "/api/content", {
          title, description, type: "memory-game", data, isPublished: publish, isPublic,
        });
        return await response.json();
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/content"] });
      queryClient.invalidateQueries({ queryKey: ["/api/content/public"] });
      if (!isEditing) navigate(`/create/memory-game/${data.id}`);
      toast({ title: "Saved!", description: "Memory Game saved successfully." });
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
      <div className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Memory Game</h1>
              <p className="text-sm text-muted-foreground">
                {isSaving ? "Saving..." : isEditing ? "Editing game" : "Create new game"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
                  placeholder="Enter game title"
                  data-testid="input-title"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter game description"
                  data-testid="input-description"
                />
              </div>
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="isPublic" className="text-base">Share as Public Resource</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow other teachers to discover and use this memory game on the Shared Resources page. Content will be automatically published when shared.
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

      {showAIModal && (
        <AIGenerationModal
          contentType="memory-game"
          onClose={() => setShowAIModal(false)}
          onGenerated={handleAIGenerated}
        />
      )}
    </div>
  );
}
