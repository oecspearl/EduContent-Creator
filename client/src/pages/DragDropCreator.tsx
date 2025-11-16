import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AIGenerationModal } from "@/components/AIGenerationModal";
import { ArrowLeft, Sparkles, Plus, Trash2, Globe } from "lucide-react";
import type { H5pContent, DragAndDropData } from "@shared/schema";
import ShareToClassroomDialog from "@/components/ShareToClassroomDialog";

export default function DragDropCreator() {
  const params = useParams();
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const contentId = params.id;
  const isEditing = !!contentId;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<DragAndDropData["items"]>([]);
  const [zones, setZones] = useState<DragAndDropData["zones"]>([]);
  const [settings, setSettings] = useState({
    showZoneLabels: true,
    instantFeedback: true,
    allowRetry: true,
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
    if (content && content.type === "drag-drop") {
      setTitle(content.title);
      setDescription(content.description || "");
      const data = content.data as DragAndDropData;
      setItems(data.items || []);
      setZones(data.zones || []);
      setSettings(data.settings || settings);
      setIsPublished(content.isPublished);
      setIsPublic(content.isPublic || false);
    }
  }, [content]);

  const saveMutation = useMutation({
    mutationFn: async (publish: boolean = false) => {
      const data: DragAndDropData = { items, zones, settings };
      
      if (isEditing) {
        const response = await apiRequest("PUT", `/api/content/${contentId}`, {
          title, description, data, isPublished: publish, isPublic,
        });
        return await response.json();
      } else {
        const response = await apiRequest("POST", "/api/content", {
          title, description, type: "drag-drop", data, isPublished: publish, isPublic,
        });
        return await response.json();
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/content"] });
      if (!isEditing) navigate(`/create/drag-drop/${data.id}`);
      toast({ title: "Saved!", description: "Drag & Drop activity saved successfully." });
      setIsSaving(false);
    },
  });

  useEffect(() => {
    if (!title || items.length === 0 || zones.length === 0) return;
    const timer = setTimeout(() => {
      setIsSaving(true);
      saveMutation.mutate(isPublished);
    }, 2000);
    return () => clearTimeout(timer);
  }, [title, description, items, zones, settings, isPublic]);

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

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Drag & Drop Activity</h1>
              <p className="text-sm text-muted-foreground">
                {isSaving ? "Saving..." : isEditing ? "Editing activity" : "Create new activity"}
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
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="isPublic" className="text-base">Share as Public Resource</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow other teachers to discover and use this drag & drop activity on the Shared Resources page
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
                    placeholder="Item content"
                    data-testid={`input-item-content-${idx}`}
                  />
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

      {showAIModal && (
        <AIGenerationModal
          contentType="drag-drop"
          onClose={() => setShowAIModal(false)}
          onGenerated={handleAIGenerated}
        />
      )}
    </div>
  );
}
