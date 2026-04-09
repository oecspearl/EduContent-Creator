import { useState, useCallback } from "react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AIGenerationModal } from "@/components/AIGenerationModal";
import { ImageGeneratorDialog } from "@/components/ImageGeneratorDialog";
import { ArrowLeft, Sparkles, Plus, Trash2, Globe, Download, Save, Image as ImageIcon, X } from "lucide-react";
import type { DragAndDropData } from "@shared/schema";
import ShareToClassroomDialog from "@/components/ShareToClassroomDialog";
import { generateHTMLExport, downloadHTML } from "@/lib/html-export";
import { ContentMetadataFields } from "@/components/ContentMetadataFields";
import { useContentEditor } from "@/hooks/useContentEditor";

export default function DragDropCreator() {
  const [items, setItems] = useState<DragAndDropData["items"]>([]);
  const [zones, setZones] = useState<DragAndDropData["zones"]>([]);
  const [settings, setSettings] = useState({
    showZoneLabels: true,
    instantFeedback: true,
    allowRetry: true,
  });
  const [showAIModal, setShowAIModal] = useState(false);
  const [openImageDialogForItem, setOpenImageDialogForItem] = useState<string | null>(null);
  const [imageUrlInputs, setImageUrlInputs] = useState<Record<string, string>>({});

  const editor = useContentEditor<DragAndDropData>({
    contentType: "drag-drop",
    contentLabel: "Drag & Drop activity",
    buildData: useCallback(() => ({ items, zones, settings }), [items, zones, settings]),
    populateFromContent: useCallback((content) => {
      const data = content.data as DragAndDropData;
      setItems(data.items || []);
      setZones(data.zones || []);
      setSettings(data.settings || { showZoneLabels: true, instantFeedback: true, allowRetry: true });
    }, []),
    canSave: useCallback(() => items.length > 0 && zones.length > 0, [items.length, zones.length]),
    autosaveDeps: [items, zones, settings],
  });

  const addZone = () => {
    setZones([...zones, {
      id: Date.now().toString(),
      label: "",
      allowMultiple: true,
    }]);
  };

  const addItem = () => {
    setItems([...items, {
      id: Date.now().toString(),
      content: "",
      correctZone: zones[0]?.id || "",
    }]);
  };

  const handleAIGenerated = (data: any) => {
    if (data.zones) setZones(data.zones);
    if (data.items) setItems(data.items);
    setShowAIModal(false);
  };

  const handleItemImageUpload = (itemId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, imageUrl } : i));
      setOpenImageDialogForItem(null);
    };
    reader.readAsDataURL(file);
  };

  const handleItemImageUrl = (itemId: string, url: string) => {
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, imageUrl: url } : i));
    setImageUrlInputs(prev => { const next = { ...prev }; delete next[itemId]; return next; });
    setOpenImageDialogForItem(null);
  };

  const handleItemImageGenerated = (itemId: string, imageUrl: string) => {
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, imageUrl } : i));
    setOpenImageDialogForItem(null);
  };

  const removeItemImage = (itemId: string) => {
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, imageUrl: undefined } : i));
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
              <h1 className="text-lg font-semibold">Drag & Drop Activity</h1>
              {editor.isSaving && <span className="text-sm text-muted-foreground">Saving...</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!editor.autosave && (
              <Button
                variant="default"
                size="sm"
                onClick={editor.handleManualSave}
                disabled={editor.isSaving || !editor.title || items.length === 0 || zones.length === 0}
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
                downloadHTML(html, editor.title || "drag-drop");
                editor.toast({
                  title: "Download started",
                  description: "Your drag and drop activity is being downloaded as HTML.",
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
                    Allow other teachers to discover and use this drag & drop activity on the Shared Resources page. Content will be automatically published when shared.
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
                <CardTitle>Drop Zones</CardTitle>
                <Button onClick={addZone} size="sm" data-testid="button-add-zone">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Zone
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {zones.map((zone, idx) => (
                <div key={zone.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Zone {idx + 1}</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setZones(zones.filter((_, i) => i !== idx))}
                      data-testid={`button-remove-zone-${idx}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input
                    value={zone.label}
                    onChange={(e) => {
                      const updated = [...zones];
                      updated[idx] = { ...updated[idx], label: e.target.value };
                      setZones(updated);
                    }}
                    placeholder="Zone label"
                    data-testid={`input-zone-label-${idx}`}
                  />
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={zone.allowMultiple}
                      onCheckedChange={(checked) => {
                        const updated = [...zones];
                        updated[idx] = { ...updated[idx], allowMultiple: checked };
                        setZones(updated);
                      }}
                      data-testid={`switch-allow-multiple-${idx}`}
                    />
                    <Label>Allow multiple items</Label>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Draggable Items</CardTitle>
                <Button onClick={addItem} size="sm" disabled={zones.length === 0} data-testid="button-add-item">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item, idx) => (
                <div key={item.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Item {idx + 1}</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setItems(items.filter((_, i) => i !== idx))}
                      data-testid={`button-remove-item-${idx}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input
                    value={item.content}
                    onChange={(e) => {
                      const updated = [...items];
                      updated[idx] = { ...updated[idx], content: e.target.value };
                      setItems(updated);
                    }}
                    placeholder="Item label (shown below image if image is set)"
                    data-testid={`input-item-content-${idx}`}
                  />
                  {item.imageUrl ? (
                    <div className="relative border rounded-lg p-2">
                      <img
                        src={item.imageUrl}
                        alt={item.content || "Item image"}
                        className="w-full h-24 object-contain rounded"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute top-1 right-1"
                        onClick={() => removeItemImage(item.id)}
                        data-testid={`button-remove-item-image-${idx}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Dialog
                      open={openImageDialogForItem === item.id}
                      onOpenChange={(open) => setOpenImageDialogForItem(open ? item.id : null)}
                    >
                      <DialogTrigger asChild>
                        <Button type="button" variant="outline" size="sm" className="w-full" data-testid={`button-add-item-image-${idx}`}>
                          <ImageIcon className="h-4 w-4 mr-2" />
                          Add Image
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Image to Item {idx + 1}</DialogTitle>
                        </DialogHeader>
                        <Tabs defaultValue="upload" className="py-4">
                          <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="upload">Upload</TabsTrigger>
                            <TabsTrigger value="url">URL</TabsTrigger>
                            <TabsTrigger value="ai">AI Generate</TabsTrigger>
                          </TabsList>
                          <TabsContent value="upload" className="space-y-4 pt-4">
                            <div>
                              <Label>Choose an image file</Label>
                              <Input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    if (file.size > 2 * 1024 * 1024) {
                                      alert("File size must be less than 2MB");
                                      return;
                                    }
                                    handleItemImageUpload(item.id, file);
                                  }
                                }}
                                className="mt-2"
                                data-testid={`input-item-image-file-${idx}`}
                              />
                              <p className="text-sm text-muted-foreground mt-2">
                                Maximum file size: 2MB. Supported formats: JPG, PNG, GIF, WebP
                              </p>
                            </div>
                          </TabsContent>
                          <TabsContent value="url" className="space-y-4 pt-4">
                            <div>
                              <Label>Image URL</Label>
                              <Input
                                value={imageUrlInputs[item.id] || ""}
                                onChange={(e) => setImageUrlInputs(prev => ({ ...prev, [item.id]: e.target.value }))}
                                placeholder="https://example.com/image.jpg"
                                className="mt-2"
                                data-testid={`input-item-image-url-${idx}`}
                              />
                            </div>
                            <Button
                              onClick={() => {
                                const url = imageUrlInputs[item.id]?.trim();
                                if (url) handleItemImageUrl(item.id, url);
                              }}
                              disabled={!imageUrlInputs[item.id]?.trim()}
                              className="w-full"
                            >
                              Use URL
                            </Button>
                          </TabsContent>
                          <TabsContent value="ai" className="space-y-4 pt-4">
                            <ImageGeneratorDialog
                              open={openImageDialogForItem === item.id}
                              onOpenChange={(open) => setOpenImageDialogForItem(open ? item.id : null)}
                              onImageGenerated={(imageUrl) => handleItemImageGenerated(item.id, imageUrl)}
                            />
                          </TabsContent>
                        </Tabs>
                      </DialogContent>
                    </Dialog>
                  )}
                  <div>
                    <Label>Correct Zone</Label>
                    <select
                      className="w-full border rounded-md p-2"
                      value={item.correctZone}
                      onChange={(e) => {
                        const updated = [...items];
                        updated[idx] = { ...updated[idx], correctZone: e.target.value };
                        setItems(updated);
                      }}
                      data-testid={`select-correct-zone-${idx}`}
                    >
                      {zones.map((zone) => (
                        <option key={zone.id} value={zone.id}>
                          {zone.label || `Zone ${zones.indexOf(zone) + 1}`}
                        </option>
                      ))}
                    </select>
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
                  checked={editor.autosave}
                  onCheckedChange={editor.setAutosave}
                  data-testid="switch-autosave"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Show zone labels</Label>
                <Switch
                  checked={settings.showZoneLabels}
                  onCheckedChange={(checked) => setSettings({ ...settings, showZoneLabels: checked })}
                  data-testid="switch-show-zone-labels"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Instant feedback</Label>
                <Switch
                  checked={settings.instantFeedback}
                  onCheckedChange={(checked) => setSettings({ ...settings, instantFeedback: checked })}
                  data-testid="switch-instant-feedback"
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
        contentType="drag-drop"
        onGenerated={handleAIGenerated}
        curriculumContext={editor.curriculumContext}
      />
    </div>
  );
}
