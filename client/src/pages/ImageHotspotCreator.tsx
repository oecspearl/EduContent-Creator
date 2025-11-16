import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AIGenerationModal } from "@/components/AIGenerationModal";
import { 
  ArrowLeft, 
  Sparkles, 
  Plus, 
  Trash2,
  Globe,
  Image as ImageIcon
} from "lucide-react";
import type { H5pContent, ImageHotspotData, ImageHotspot } from "@shared/schema";
import ShareToClassroomDialog from "@/components/ShareToClassroomDialog";

export default function ImageHotspotCreator() {
  const params = useParams();
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const contentId = params.id;
  const isEditing = !!contentId;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [hotspots, setHotspots] = useState<ImageHotspot[]>([]);
  const [isPublished, setIsPublished] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { data: content } = useQuery<H5pContent>({
    queryKey: ["/api/content", contentId],
    enabled: isEditing,
  });

  useEffect(() => {
    if (content && content.type === "image-hotspot") {
      setTitle(content.title);
      setDescription(content.description || "");
      const imageData = content.data as ImageHotspotData;
      setImageUrl(imageData.imageUrl || "");
      setHotspots(imageData.hotspots || []);
      setIsPublished(content.isPublished);
      setIsPublic(content.isPublic || false);
    }
  }, [content]);

  const saveMutation = useMutation({
    mutationFn: async (publish: boolean = false) => {
      const data: ImageHotspotData = { imageUrl, hotspots };
      
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
          type: "image-hotspot",
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
        navigate(`/create/image-hotspot/${data.id}`);
      }
      toast({ title: "Saved!", description: "Image hotspot saved successfully." });
      setIsSaving(false);
    },
  });

  useEffect(() => {
    if (!title || !imageUrl) return;
    
    const timer = setTimeout(() => {
      setIsSaving(true);
      saveMutation.mutate(isPublished);
    }, 2000);

    return () => clearTimeout(timer);
  }, [title, description, imageUrl, hotspots, isPublic]);

  const addHotspot = () => {
    const newHotspot: ImageHotspot = {
      id: Date.now().toString(),
      x: 50,
      y: 50,
      title: "",
      description: "",
    };
    setHotspots([...hotspots, newHotspot]);
  };

  const updateHotspot = (index: number, updates: Partial<ImageHotspot>) => {
    const updated = [...hotspots];
    updated[index] = { ...updated[index], ...updates };
    setHotspots(updated);
  };

  const removeHotspot = (index: number) => {
    setHotspots(hotspots.filter((_, i) => i !== index));
  };

  const handleAIGenerated = (data: any) => {
    if (data.hotspots) {
      setHotspots(prev => [...prev, ...data.hotspots]);
    }
  };

  const handlePublish = async () => {
    setIsPublished(!isPublished);
    await saveMutation.mutateAsync(!isPublished);
    toast({
      title: isPublished ? "Unpublished" : "Published!",
      description: isPublished
        ? "Image hotspot is now private."
        : "Image hotspot is now publicly accessible via share link.",
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
              <h1 className="text-lg font-semibold">Image Hotspot Creator</h1>
              {isSaving && <Badge variant="outline">Saving...</Badge>}
            </div>
          </div>
          <div className="flex items-center gap-2">
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
              disabled={!title || !imageUrl}
              data-testid="button-publish"
            >
              <Globe className="h-4 w-4 mr-1" />
              {isPublished ? "Unpublish" : "Publish"}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Editor */}
          <div className="space-y-6">
            {/* Title & Description */}
            <Card>
              <CardHeader>
                <CardTitle>Image Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Parts of a Cell"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    data-testid="input-title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of this image hotspot..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="h-20 resize-none"
                    data-testid="textarea-description"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="imageUrl">Image URL *</Label>
                  <Input
                    id="imageUrl"
                    placeholder="https://example.com/image.jpg"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    data-testid="input-image-url"
                  />
                  <p className="text-xs text-muted-foreground">
                    Paste an image URL to add interactive hotspots
                  </p>
                </div>
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="isPublic" className="text-base">Share as Public Resource</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow other teachers to discover and use this image hotspot on the Shared Resources page
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

            {/* Hotspots List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Hotspots ({hotspots.length})</h3>
                <Button onClick={addHotspot} size="sm" data-testid="button-add-hotspot">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Hotspot
                </Button>
              </div>

              {hotspots.length === 0 ? (
                <Card className="text-center py-8">
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      No hotspots yet. Add interactive points to your image.
                    </p>
                    <Button onClick={addHotspot} size="sm" data-testid="button-add-first-hotspot">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Hotspot
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                hotspots.map((hotspot, index) => (
                  <Card key={hotspot.id} data-testid={`hotspot-${index}`}>
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex items-start justify-between">
                        <h4 className="font-medium">Hotspot {index + 1}</h4>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => removeHotspot(index)}
                          data-testid={`button-delete-${index}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>X Position (%)</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={hotspot.x}
                            onChange={(e) => updateHotspot(index, { x: parseInt(e.target.value) || 0 })}
                            data-testid={`input-x-${index}`}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Y Position (%)</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={hotspot.y}
                            onChange={(e) => updateHotspot(index, { y: parseInt(e.target.value) || 0 })}
                            data-testid={`input-y-${index}`}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Title</Label>
                        <Input
                          placeholder="Hotspot title..."
                          value={hotspot.title}
                          onChange={(e) => updateHotspot(index, { title: e.target.value })}
                          data-testid={`input-title-${index}`}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                          placeholder="Hotspot description..."
                          value={hotspot.description}
                          onChange={(e) => updateHotspot(index, { description: e.target.value })}
                          className="h-20 resize-none"
                          data-testid={`textarea-description-${index}`}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Preview */}
          <div className="lg:sticky lg:top-20 h-fit">
            <Card>
              <CardHeader>
                <CardTitle>Preview</CardTitle>
              </CardHeader>
              <CardContent>
                {imageUrl ? (
                  <div className="relative bg-muted rounded-lg overflow-hidden" style={{ aspectRatio: "16/9" }}>
                    <img src={imageUrl} alt="Hotspot image" className="w-full h-full object-contain" />
                    {hotspots.map((hotspot, index) => (
                      <div
                        key={hotspot.id}
                        className="absolute w-6 h-6 bg-primary rounded-full border-2 border-primary-foreground cursor-pointer transform -translate-x-1/2 -translate-y-1/2 hover-elevate transition-all"
                        style={{
                          left: `${hotspot.x}%`,
                          top: `${hotspot.y}%`,
                        }}
                        title={hotspot.title}
                      >
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-card text-card-foreground px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 hover:opacity-100 transition-opacity shadow-lg">
                          {hotspot.title || `Hotspot ${index + 1}`}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    className="flex items-center justify-center bg-muted rounded-lg"
                    style={{ aspectRatio: "16/9" }}
                  >
                    <div className="text-center">
                      <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Enter an image URL to see preview</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <AIGenerationModal
        open={showAIModal}
        onOpenChange={setShowAIModal}
        contentType="image-hotspot"
        onGenerated={handleAIGenerated}
      />
    </div>
  );
}
