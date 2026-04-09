import React, { useState, useCallback, useEffect, useRef } from "react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { AIGenerationModal } from "@/components/AIGenerationModal";
import {
  ArrowLeft,
  Sparkles,
  Plus,
  Trash2,
  Globe,
  Image as ImageIcon,
  Save,
  Settings
} from "lucide-react";
import type { ImageHotspotData, ImageHotspot } from "@shared/schema";
import ShareToClassroomDialog from "@/components/ShareToClassroomDialog";
import { ContentMetadataFields } from "@/components/ContentMetadataFields";
import { useContentEditor } from "@/hooks/useContentEditor";

export default function ImageHotspotCreator() {
  const [imageUrl, setImageUrl] = useState("");
  const [hotspots, setHotspots] = useState<ImageHotspot[]>([]);
  const [showAIModal, setShowAIModal] = useState(false);

  // Interaction state
  const [selectedHotspotIndex, setSelectedHotspotIndex] = useState<number | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  // Refs
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const hotspotCardRefs = useRef<(HTMLDivElement | null)[]>([]);
  // Tracks when a drag just ended so the subsequent click event doesn't place a new hotspot
  const dragEndedRef = useRef(false);

  const editor = useContentEditor<ImageHotspotData>({
    contentType: "image-hotspot",
    contentLabel: "Image hotspot",
    buildData: useCallback(() => ({ imageUrl, hotspots }), [imageUrl, hotspots]),
    populateFromContent: useCallback((content) => {
      const data = content.data as ImageHotspotData;
      setImageUrl(data.imageUrl || "");
      setHotspots(data.hotspots || []);
    }, []),
    canSave: useCallback(() => !!imageUrl, [imageUrl]),
    autosaveDeps: [imageUrl, hotspots],
  });

  // Scroll selected hotspot card into view
  useEffect(() => {
    if (selectedHotspotIndex !== null) {
      hotspotCardRefs.current[selectedHotspotIndex]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selectedHotspotIndex]);

  // Release drag if mouse is released outside the container
  useEffect(() => {
    if (draggingIndex === null) return;
    const stop = () => setDraggingIndex(null);
    document.addEventListener("mouseup", stop);
    return () => document.removeEventListener("mouseup", stop);
  }, [draggingIndex]);

  const addHotspot = (x = 50, y = 50) => {
    const newIndex = hotspots.length;
    const newHotspot: ImageHotspot = {
      id: Date.now().toString(),
      x,
      y,
      title: "",
      description: "",
    };
    setHotspots([...hotspots, newHotspot]);
    setSelectedHotspotIndex(newIndex);
  };

  const updateHotspot = (index: number, updates: Partial<ImageHotspot>) => {
    const updated = [...hotspots];
    updated[index] = { ...updated[index], ...updates };
    setHotspots(updated);
  };

  const removeHotspot = (index: number) => {
    setHotspots(hotspots.filter((_, i) => i !== index));
    if (selectedHotspotIndex === index) setSelectedHotspotIndex(null);
    else if (selectedHotspotIndex !== null && selectedHotspotIndex > index) {
      setSelectedHotspotIndex(selectedHotspotIndex - 1);
    }
  };

  const handleAIGenerated = (data: any) => {
    if (data.hotspots) {
      setHotspots(prev => [...prev, ...data.hotspots]);
    }
  };

  // --- Preview interaction helpers ---

  const getContainerPct = (clientX: number, clientY: number) => {
    const rect = imageContainerRef.current!.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(100, Math.round(((clientX - rect.left) / rect.width) * 100))),
      y: Math.max(0, Math.min(100, Math.round(((clientY - rect.top) / rect.height) * 100))),
    };
  };

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Suppress the click that fires immediately after a drag-end
    if (dragEndedRef.current) { dragEndedRef.current = false; return; }
    if (draggingIndex !== null) return;
    if (!imageUrl) return;
    const { x, y } = getContainerPct(e.clientX, e.clientY);
    addHotspot(x, y);
  };

  const handleDotMouseDown = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    e.preventDefault();
    dragEndedRef.current = false;
    setDraggingIndex(index);
    setSelectedHotspotIndex(index);
  };

  const handleContainerMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (draggingIndex === null) return;
    const { x, y } = getContainerPct(e.clientX, e.clientY);
    updateHotspot(draggingIndex, { x, y });
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
              <h1 className="text-lg font-semibold">Image Hotspot Creator</h1>
              {editor.isSaving && <Badge variant="outline">Saving...</Badge>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!editor.autosave && (
              <Button
                variant="default"
                size="sm"
                onClick={editor.handleManualSave}
                disabled={editor.isSaving || !editor.title || !imageUrl}
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
              disabled={!editor.title || !imageUrl}
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
                    value={editor.title}
                    onChange={(e) => editor.setTitle(e.target.value)}
                    data-testid="input-title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of this image hotspot..."
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
                    Paste an image URL, then click on the preview to place hotspots
                  </p>
                </div>
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="isPublic" className="text-base">Share as Public Resource</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow other teachers to discover and use this image hotspot on the Shared Resources page. Content will be automatically published when shared.
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

            {/* Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Settings
                </CardTitle>
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
              </CardContent>
            </Card>

            {/* Hotspots List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Hotspots ({hotspots.length})</h3>
                <Button onClick={() => addHotspot()} size="sm" data-testid="button-add-hotspot">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Hotspot
                </Button>
              </div>

              {hotspots.length === 0 ? (
                <Card className="text-center py-8">
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      No hotspots yet. Click anywhere on the image to place one.
                    </p>
                    <Button onClick={() => addHotspot()} size="sm" data-testid="button-add-first-hotspot">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Hotspot
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                hotspots.map((hotspot, index) => (
                  <div
                    key={hotspot.id}
                    ref={(el) => { hotspotCardRefs.current[index] = el; }}
                  >
                    <Card
                      className={`transition-all cursor-pointer ${selectedHotspotIndex === index ? "ring-2 ring-primary" : ""}`}
                      onClick={() => setSelectedHotspotIndex(index)}
                      data-testid={`hotspot-${index}`}
                    >
                      <CardContent className="pt-6 space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
                              {index + 1}
                            </div>
                            <h4 className="font-medium">
                              {hotspot.title || `Hotspot ${index + 1}`}
                            </h4>
                          </div>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={(e) => { e.stopPropagation(); removeHotspot(index); }}
                            data-testid={`button-delete-${index}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">X Position (%)</Label>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={hotspot.x}
                              onChange={(e) => updateHotspot(index, { x: parseInt(e.target.value) || 0 })}
                              onClick={(e) => e.stopPropagation()}
                              data-testid={`input-x-${index}`}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Y Position (%)</Label>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={hotspot.y}
                              onChange={(e) => updateHotspot(index, { y: parseInt(e.target.value) || 0 })}
                              onClick={(e) => e.stopPropagation()}
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
                            onClick={(e) => e.stopPropagation()}
                            data-testid={`input-title-${index}`}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Textarea
                            placeholder="Hotspot description..."
                            value={hotspot.description}
                            onChange={(e) => updateHotspot(index, { description: e.target.value })}
                            onClick={(e) => e.stopPropagation()}
                            className="h-20 resize-none"
                            data-testid={`textarea-description-${index}`}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Preview */}
          <div className="lg:sticky lg:top-20 h-fit">
            <Card>
              <CardHeader>
                <CardTitle>Preview</CardTitle>
                {imageUrl && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Click on the image to place a hotspot · Drag a hotspot to reposition it
                  </p>
                )}
              </CardHeader>
              <CardContent>
                {imageUrl ? (
                  <div
                    ref={imageContainerRef}
                    className={`relative bg-muted rounded-lg overflow-hidden select-none ${draggingIndex !== null ? "cursor-grabbing" : "cursor-crosshair"}`}
                    style={{ aspectRatio: "16/9" }}
                    onClick={handleImageClick}
                    onMouseMove={handleContainerMouseMove}
                    onMouseUp={() => {
                      if (draggingIndex !== null) dragEndedRef.current = true;
                      setDraggingIndex(null);
                    }}
                  >
                    <img src={imageUrl} alt="Hotspot image" className="w-full h-full object-contain pointer-events-none" />
                    {hotspots.map((hotspot, index) => (
                      <div
                        key={hotspot.id}
                        className="absolute z-10 select-none"
                        style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%` }}
                        onMouseDown={(e) => handleDotMouseDown(e, index)}
                        onClick={(e) => { e.stopPropagation(); setSelectedHotspotIndex(index); }}
                        title={hotspot.title || `Hotspot ${index + 1}`}
                      >
                        {/* Pin: circle badge + stem + tip. Inner div shifted so tip sits exactly at coordinate. */}
                        <div
                          className={`flex flex-col items-center transition-transform ${draggingIndex === index ? "cursor-grabbing scale-110" : "cursor-grab"}`}
                          style={{ transform: "translate(-50%, -100%)" }}
                        >
                          {/* Badge */}
                          <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 text-xs font-bold shadow-lg transition-transform
                            ${selectedHotspotIndex === index
                              ? "bg-amber-400 border-amber-600 text-amber-900 scale-110"
                              : "bg-primary border-primary-foreground text-primary-foreground"}
                          `}>
                            {index + 1}
                          </div>
                          {/* Stem */}
                          <div className={`w-0.5 h-3 ${selectedHotspotIndex === index ? "bg-amber-600" : "bg-primary"}`} />
                          {/* Tip dot — sits at the exact coordinate */}
                          <div className={`w-2 h-2 rounded-full ${selectedHotspotIndex === index ? "bg-amber-600" : "bg-primary"}`} />
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
