import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { RichTextEditor } from "@/components/RichTextEditor";
import { ArrowLeft, Plus, Trash2, Globe, ChevronLeft, ChevronRight, Layers, X } from "lucide-react";
import type { H5pContent, InteractiveBookData, ContentType } from "@shared/schema";

export default function InteractiveBookCreator() {
  const params = useParams();
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const contentId = params.id;
  const isEditing = !!contentId;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pages, setPages] = useState<InteractiveBookData["pages"]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [settings, setSettings] = useState({
    showNavigation: true,
    showProgress: true,
    requireCompletion: false,
  });
  const [isPublished, setIsPublished] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showEmbedDialog, setShowEmbedDialog] = useState(false);

  const { data: content } = useQuery<H5pContent>({
    queryKey: ["/api/content", contentId],
    enabled: isEditing,
  });

  const { data: availableContent } = useQuery<H5pContent[]>({
    queryKey: ["/api/content"],
  });

  useEffect(() => {
    if (content && content.type === "interactive-book") {
      setTitle(content.title);
      setDescription(content.description || "");
      const data = content.data as InteractiveBookData;
      setPages(data.pages || []);
      setSettings(data.settings || settings);
      setIsPublished(content.isPublished);
    }
  }, [content]);

  const saveMutation = useMutation({
    mutationFn: async (publish: boolean = false) => {
      const data: InteractiveBookData = { pages, settings };
      
      if (isEditing) {
        const response = await apiRequest("PUT", `/api/content/${contentId}`, {
          title, description, data, isPublished: publish,
        });
        return await response.json();
      } else {
        const response = await apiRequest("POST", "/api/content", {
          title, description, type: "interactive-book", data, isPublished: publish,
        });
        return await response.json();
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/content"] });
      if (!isEditing) navigate(`/create/interactive-book/${data.id}`);
      toast({ title: "Saved!", description: "Interactive Book saved successfully." });
      setIsSaving(false);
    },
  });

  useEffect(() => {
    if (!title || pages.length === 0) return;
    const timer = setTimeout(() => {
      setIsSaving(true);
      saveMutation.mutate(isPublished);
    }, 2000);
    return () => clearTimeout(timer);
  }, [title, description, pages, settings]);

  const addPage = () => {
    setPages([...pages, {
      id: Date.now().toString(),
      title: "",
      content: "",
    }]);
  };

  const embedContent = (selectedContent: H5pContent) => {
    const updated = [...pages];
    updated[currentPageIndex] = {
      ...updated[currentPageIndex],
      embeddedContentId: selectedContent.id,
    };
    setPages(updated);
    setShowEmbedDialog(false);
    toast({ title: "Embedded!", description: `${selectedContent.title} has been embedded in this page.` });
  };

  const removeEmbeddedContent = () => {
    const updated = [...pages];
    updated[currentPageIndex] = {
      ...updated[currentPageIndex],
      embeddedContentId: undefined,
      embeddedContent: undefined,
    };
    setPages(updated);
    toast({ title: "Removed", description: "Embedded content has been removed from this page." });
  };

  const getContentTypeLabel = (type: ContentType) => {
    const labels: Record<ContentType, string> = {
      "quiz": "Quiz",
      "flashcard": "Flashcard",
      "interactive-video": "Interactive Video",
      "image-hotspot": "Image Hotspot",
      "drag-drop": "Drag & Drop",
      "fill-blanks": "Fill in the Blanks",
      "memory-game": "Memory Game",
      "interactive-book": "Interactive Book",
    };
    return labels[type] || type;
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
              <h1 className="text-2xl font-bold">Interactive Book</h1>
              <p className="text-sm text-muted-foreground">
                {isSaving ? "Saving..." : isEditing ? "Editing book" : "Create new book"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
                  placeholder="Enter book title"
                  data-testid="input-title"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter book description"
                  data-testid="input-description"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Pages ({pages.length})</CardTitle>
                <Button onClick={addPage} size="sm" data-testid="button-add-page">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Page
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {pages.length > 0 && (
                <>
                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPageIndex(Math.max(0, currentPageIndex - 1))}
                      disabled={currentPageIndex === 0}
                      data-testid="button-prev-page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {currentPageIndex + 1} of {pages.length}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPageIndex(Math.min(pages.length - 1, currentPageIndex + 1))}
                      disabled={currentPageIndex === pages.length - 1}
                      data-testid="button-next-page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>

                  {pages[currentPageIndex] && (
                    <div className="border rounded-lg p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>Editing Page {currentPageIndex + 1}</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setPages(pages.filter((_, i) => i !== currentPageIndex));
                            setCurrentPageIndex(Math.max(0, currentPageIndex - 1));
                          }}
                          data-testid={`button-remove-page-${currentPageIndex}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div>
                        <Label>Page Title</Label>
                        <Input
                          value={pages[currentPageIndex].title}
                          onChange={(e) => {
                            const updated = [...pages];
                            updated[currentPageIndex] = { ...updated[currentPageIndex], title: e.target.value };
                            setPages(updated);
                          }}
                          placeholder="Page title"
                          data-testid={`input-page-title-${currentPageIndex}`}
                        />
                      </div>
                      <div>
                        <Label>Page Content</Label>
                        <RichTextEditor
                          content={pages[currentPageIndex].content}
                          onChange={(html) => {
                            const updated = [...pages];
                            updated[currentPageIndex] = { ...updated[currentPageIndex], content: html };
                            setPages(updated);
                          }}
                          placeholder="Write your page content here. Use the toolbar to format text and add images..."
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label>Interactive Content (Optional)</Label>
                          {!pages[currentPageIndex].embeddedContentId && !pages[currentPageIndex].embeddedContent && (
                            <Dialog open={showEmbedDialog} onOpenChange={setShowEmbedDialog}>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm" data-testid="button-embed-content">
                                  <Layers className="h-4 w-4 mr-2" />
                                  Embed Content
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>Select Content to Embed</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-2">
                                  {availableContent?.filter(c => c.type !== "interactive-book" && c.id !== contentId).map((c) => (
                                    <Card
                                      key={c.id}
                                      className="cursor-pointer hover-elevate"
                                      onClick={() => embedContent(c)}
                                      data-testid={`embed-option-${c.id}`}
                                    >
                                      <CardContent className="p-4 flex items-center justify-between">
                                        <div>
                                          <h4 className="font-medium">{c.title}</h4>
                                          <p className="text-sm text-muted-foreground">{getContentTypeLabel(c.type as ContentType)}</p>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  ))}
                                  {(!availableContent || availableContent.filter(c => c.type !== "interactive-book").length === 0) && (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                      No content available to embed. Create some quizzes, flashcards, or other interactive content first!
                                    </p>
                                  )}
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                        {(pages[currentPageIndex].embeddedContentId || pages[currentPageIndex].embeddedContent) && (
                          <Card className="bg-accent/10">
                            <CardContent className="p-4 flex items-center justify-between">
                              <div>
                                <p className="font-medium text-sm">
                                  Embedded: {
                                    pages[currentPageIndex].embeddedContentId 
                                      ? (availableContent?.find(c => c.id === pages[currentPageIndex].embeddedContentId)?.title || "Content")
                                      : (pages[currentPageIndex].embeddedContent ? `${getContentTypeLabel(pages[currentPageIndex].embeddedContent!.type as ContentType)} (Legacy)` : "Content")
                                  }
                                </p>
                                <p className="text-xs text-muted-foreground">This interactive element will appear after the page content</p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={removeEmbeddedContent}
                                data-testid="button-remove-embedded-content"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Show navigation</Label>
                <Switch
                  checked={settings.showNavigation}
                  onCheckedChange={(checked) => setSettings({ ...settings, showNavigation: checked })}
                  data-testid="switch-show-navigation"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Show progress</Label>
                <Switch
                  checked={settings.showProgress}
                  onCheckedChange={(checked) => setSettings({ ...settings, showProgress: checked })}
                  data-testid="switch-show-progress"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Require completion to proceed</Label>
                <Switch
                  checked={settings.requireCompletion}
                  onCheckedChange={(checked) => setSettings({ ...settings, requireCompletion: checked })}
                  data-testid="switch-require-completion"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
