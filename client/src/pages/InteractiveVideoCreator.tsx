import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { youtubeLoader } from "@/lib/youtube-loader";
import { AIGenerationModal } from "@/components/AIGenerationModal";
import { InteractiveVideoAIGenerator } from "@/components/InteractiveVideoAIGenerator";
import { 
  ArrowLeft, 
  Sparkles, 
  Plus, 
  Trash2,
  Globe,
  ChevronDown,
  Play,
  Save,
  Settings
} from "lucide-react";
import type { H5pContent, InteractiveVideoData, VideoHotspot, QuizQuestion } from "@shared/schema";
import ShareToClassroomDialog from "@/components/ShareToClassroomDialog";
import { ContentMetadataFields } from "@/components/ContentMetadataFields";

export default function InteractiveVideoCreator() {
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
  const [videoUrl, setVideoUrl] = useState("");
  const [hotspots, setHotspots] = useState<VideoHotspot[]>([]);
  const [isPublished, setIsPublished] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [autosave, setAutosave] = useState(true);
  const [showAIModal, setShowAIModal] = useState(false);
  const [showEnhancedAIModal, setShowEnhancedAIModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const previewPlayerRef = useRef<any>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  const { data: content } = useQuery<H5pContent>({
    queryKey: ["/api/content", contentId],
    enabled: isEditing,
  });

  useEffect(() => {
    if (content && content.type === "interactive-video") {
      setTitle(content.title);
      setDescription(content.description || "");
      setSubject(content.subject || "");
      setGradeLevel(content.gradeLevel || "");
      setAgeRange(content.ageRange || "");
      const videoData = content.data as InteractiveVideoData;
      setVideoUrl(videoData.videoUrl || "");
      setHotspots(videoData.hotspots || []);
      setIsPublished(content.isPublished);
      setIsPublic(content.isPublic || false);
    }
  }, [content]);

  const saveMutation = useMutation({
    mutationFn: async (publish: boolean = false) => {
      const data: InteractiveVideoData = { videoUrl, hotspots };
      
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
          type: "interactive-video",
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
        navigate(`/create/interactive-video/${data.id}`);
      }
      toast({ title: "Saved!", description: "Interactive video saved successfully." });
      setIsSaving(false);
    },
  });

  useEffect(() => {
    if (!autosave) return; // Skip autosave if disabled
    if (!title || !videoUrl) return;
    
    const timer = setTimeout(() => {
      setIsSaving(true);
      saveMutation.mutate(isPublished);
    }, 2000);

    return () => clearTimeout(timer);
  }, [title, description, videoUrl, hotspots, isPublic, autosave, isPublished]);
  
  const handleManualSave = () => {
    if (!title || !videoUrl) {
      toast({
        title: "Cannot save",
        description: "Please add a title and video URL.",
        variant: "destructive",
      });
      return;
    }
    setIsSaving(true);
    saveMutation.mutate(isPublished);
  };

  const addHotspot = () => {
    const newHotspot: VideoHotspot = {
      id: Date.now().toString(),
      timestamp: 0,
      type: "question",
      title: "",
      content: "",
    };
    setHotspots([...hotspots, newHotspot]);
  };

  const updateHotspot = (index: number, updates: Partial<VideoHotspot>) => {
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

  const handleEnhancedAIGenerated = (videoUrl: string, hotspots: VideoHotspot[]) => {
    setVideoUrl(videoUrl);
    setHotspots(hotspots);
  };

  const handlePublish = async () => {
    setIsPublished(!isPublished);
    await saveMutation.mutateAsync(!isPublished);
    toast({
      title: isPublished ? "Unpublished" : "Published!",
      description: isPublished
        ? "Interactive video is now private."
        : "Interactive video is now publicly accessible via share link.",
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getYouTubeVideoId = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
    return match ? match[1] : null;
  };

  useEffect(() => {
    if (!showPreview || !videoUrl) return;

    const videoId = getYouTubeVideoId(videoUrl);
    if (!videoId) return;

    const initializePreviewPlayer = () => {
      if (!previewContainerRef.current) return;

      if (previewPlayerRef.current) {
        previewPlayerRef.current.destroy();
        previewPlayerRef.current = null;
      }

      previewPlayerRef.current = new window.YT.Player(previewContainerRef.current, {
        videoId: videoId,
        playerVars: {
          controls: 1,
          modestbranding: 1,
          rel: 0,
        },
        events: {
          onReady: (event: any) => {
            setVideoDuration(event.target.getDuration());
          },
        },
      });
    };

    // Use shared YouTube loader
    youtubeLoader.load(initializePreviewPlayer);

    return () => {
      if (previewPlayerRef.current) {
        previewPlayerRef.current.destroy();
        previewPlayerRef.current = null;
      }
    };
  }, [showPreview, videoUrl]);

  const jumpToTimestamp = (timestamp: number) => {
    if (!previewPlayerRef.current) return;
    previewPlayerRef.current.seekTo(timestamp, true);
    previewPlayerRef.current.playVideo();
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
              <h1 className="text-lg font-semibold">Interactive Video Creator</h1>
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
            {!autosave && (
              <Button 
                variant="default" 
                size="sm" 
                onClick={handleManualSave}
                disabled={isSaving || !title || !videoUrl}
                data-testid="button-save"
              >
                <Save className="h-4 w-4 mr-1" />
                {isSaving ? "Saving..." : "Save"}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setShowEnhancedAIModal(true)} data-testid="button-ai-generate-enhanced">
              <Sparkles className="h-4 w-4 mr-1" />
              AI Generate (YouTube Search)
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowAIModal(true)} data-testid="button-ai-generate">
              <Sparkles className="h-4 w-4 mr-1" />
              AI Generate Hotspots
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
              disabled={!title || !videoUrl}
              data-testid="button-publish"
            >
              <Globe className="h-4 w-4 mr-1" />
              {isPublished ? "Unpublish" : "Publish"}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="space-y-6">
          {/* Title & Description */}
          <Card>
            <CardHeader>
              <CardTitle>Video Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Cell Division Explained"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  data-testid="input-title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of this interactive video..."
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
              <div className="space-y-2">
                <Label htmlFor="videoUrl">YouTube Video URL *</Label>
                <Input
                  id="videoUrl"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  data-testid="input-video-url"
                />
                <p className="text-xs text-muted-foreground">
                  Paste a YouTube video URL to add interactive hotspots
                </p>
              </div>
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="isPublic" className="text-base">Share as Public Resource</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow other teachers to discover and use this interactive video on the Shared Resources page. Content will be automatically published when shared.
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
                  checked={autosave}
                  onCheckedChange={setAutosave}
                  data-testid="switch-autosave"
                />
              </div>
            </CardContent>
          </Card>

          {/* Video Preview */}
          {videoUrl && (
            <Collapsible open={showPreview} onOpenChange={setShowPreview}>
              <Card>
                <CardHeader>
                  <CollapsibleTrigger className="flex items-center justify-between w-full hover-elevate rounded-lg -mx-2 px-2">
                    <div className="flex items-center gap-2">
                      <Play className="h-5 w-5" />
                      <CardTitle>Video Preview</CardTitle>
                    </div>
                    <ChevronDown
                      className={`h-5 w-5 transition-transform ${showPreview ? "rotate-180" : ""}`}
                    />
                  </CollapsibleTrigger>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    {/* Video Player */}
                    <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: "16/9" }}>
                      <div ref={previewContainerRef} className="w-full h-full" />
                    </div>

                    {/* Hotspot Timeline */}
                    {hotspots.length > 0 && videoDuration > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">Hotspot Timeline</h4>
                        <div className="relative h-12 bg-muted rounded-lg">
                          {hotspots.map((hotspot, index) => {
                            const position = (hotspot.timestamp / videoDuration) * 100;
                            return (
                              <button
                                key={hotspot.id}
                                className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium cursor-pointer transition-all hover:scale-125 ${
                                  hotspot.type === "question"
                                    ? "bg-primary text-primary-foreground"
                                    : hotspot.type === "info"
                                    ? "bg-blue-500 text-white"
                                    : "bg-green-500 text-white"
                                }`}
                                style={{ left: `${position}%` }}
                                onClick={() => jumpToTimestamp(hotspot.timestamp)}
                                title={`${hotspot.title} at ${formatTime(hotspot.timestamp)}`}
                                aria-label={`Jump to ${hotspot.title} at ${formatTime(hotspot.timestamp)}`}
                                data-testid={`preview-marker-${index}`}
                              >
                                {index + 1}
                              </button>
                            );
                          })}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-primary" />
                            <span>Question</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-blue-500" />
                            <span>Information</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-green-500" />
                            <span>Navigation</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}

          {/* Hotspots */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Hotspots ({hotspots.length})</h3>
              <Button onClick={addHotspot} size="sm" data-testid="button-add-hotspot">
                <Plus className="h-4 w-4 mr-1" />
                Add Hotspot
              </Button>
            </div>

            {hotspots.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    No hotspots yet. Add interactive moments to your video.
                  </p>
                  <Button onClick={addHotspot} data-testid="button-add-first-hotspot">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Hotspot
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {hotspots.map((hotspot, index) => (
                  <Card key={hotspot.id} data-testid={`hotspot-${index}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium">Hotspot {index + 1}</h4>
                          <p className="text-sm text-muted-foreground">
                            {formatTime(hotspot.timestamp)}
                          </p>
                        </div>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => removeHotspot(index)}
                          data-testid={`button-delete-${index}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Timestamp (seconds)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={hotspot.timestamp}
                          onChange={(e) => updateHotspot(index, { timestamp: parseInt(e.target.value) || 0 })}
                          data-testid={`input-timestamp-${index}`}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Type</Label>
                        <Select
                          value={hotspot.type}
                          onValueChange={(value: any) => updateHotspot(index, { type: value })}
                        >
                          <SelectTrigger data-testid={`select-type-${index}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="question">Single Question</SelectItem>
                            <SelectItem value="quiz">Quiz (Multiple Questions)</SelectItem>
                            <SelectItem value="info">Information</SelectItem>
                            <SelectItem value="navigation">Navigation</SelectItem>
                          </SelectContent>
                        </Select>
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
                        <Label>Content</Label>
                        <Textarea
                          placeholder="Description or question..."
                          value={hotspot.content}
                          onChange={(e) => updateHotspot(index, { content: e.target.value })}
                          className="h-20 resize-none"
                          data-testid={`textarea-content-${index}`}
                        />
                      </div>

                      {hotspot.type === "question" && (
                        <>
                          <div className="space-y-2">
                            <Label>Options (comma-separated)</Label>
                            <Input
                              placeholder="Option 1, Option 2, Option 3"
                              value={hotspot.options?.join(", ") || ""}
                              onChange={(e) =>
                                updateHotspot(index, { options: e.target.value.split(",").map((s) => s.trim()) })
                              }
                              data-testid={`input-options-${index}`}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Correct Answer (index, 0-based)</Label>
                            <Input
                              type="number"
                              min="0"
                              value={hotspot.correctAnswer || 0}
                              onChange={(e) => updateHotspot(index, { correctAnswer: parseInt(e.target.value) || 0 })}
                              data-testid={`input-correct-${index}`}
                            />
                          </div>
                        </>
                      )}

                      {hotspot.type === "quiz" && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <Label>Questions ({hotspot.questions?.length || 0})</Label>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const newQuestion: QuizQuestion = {
                                  id: Date.now().toString(),
                                  type: "multiple-choice",
                                  question: "",
                                  options: ["", "", "", ""],
                                  correctAnswer: 0,
                                };
                                updateHotspot(index, {
                                  questions: [...(hotspot.questions || []), newQuestion],
                                });
                              }}
                              data-testid={`button-add-question-${index}`}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add Question
                            </Button>
                          </div>

                          {hotspot.questions && hotspot.questions.length > 0 ? (
                            <div className="space-y-4 border rounded-lg p-4">
                              {hotspot.questions.map((question, qIndex) => (
                                <Card key={question.id} className="p-4">
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                      <Label className="text-sm font-medium">Question {qIndex + 1}</Label>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          const updatedQuestions = hotspot.questions?.filter((_, i) => i !== qIndex) || [];
                                          updateHotspot(index, { questions: updatedQuestions });
                                        }}
                                        data-testid={`button-remove-question-${index}-${qIndex}`}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>

                                    <div className="space-y-2">
                                      <Label className="text-xs">Question Type</Label>
                                      <Select
                                        value={question.type}
                                        onValueChange={(value: any) => {
                                          const updated = [...(hotspot.questions || [])];
                                          updated[qIndex] = {
                                            ...question,
                                            type: value,
                                            options: value === "multiple-choice" ? question.options || ["", "", "", ""] : undefined,
                                            correctAnswer: value === "true-false" ? "true" : value === "multiple-choice" ? 0 : "",
                                          };
                                          updateHotspot(index, { questions: updated });
                                        }}
                                      >
                                        <SelectTrigger className="h-8">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                                          <SelectItem value="true-false">True/False</SelectItem>
                                          <SelectItem value="fill-blank">Fill in the Blank</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    <div className="space-y-2">
                                      <Label className="text-xs">Question Text</Label>
                                      <Textarea
                                        placeholder="Enter the question..."
                                        value={question.question}
                                        onChange={(e) => {
                                          const updated = [...(hotspot.questions || [])];
                                          updated[qIndex] = { ...question, question: e.target.value };
                                          updateHotspot(index, { questions: updated });
                                        }}
                                        className="h-20 resize-none"
                                        data-testid={`textarea-question-${index}-${qIndex}`}
                                      />
                                    </div>

                                    {question.type === "multiple-choice" && (
                                      <>
                                        <div className="space-y-2">
                                          <Label className="text-xs">Options</Label>
                                          {question.options?.map((option, optIndex) => (
                                            <div key={optIndex} className="flex items-center gap-2">
                                              <Input
                                                placeholder={`Option ${optIndex + 1}`}
                                                value={option}
                                                onChange={(e) => {
                                                  const updated = [...(hotspot.questions || [])];
                                                  const newOptions = [...(question.options || [])];
                                                  newOptions[optIndex] = e.target.value;
                                                  updated[qIndex] = { ...question, options: newOptions };
                                                  updateHotspot(index, { questions: updated });
                                                }}
                                                data-testid={`input-option-${index}-${qIndex}-${optIndex}`}
                                              />
                                              <Button
                                                type="button"
                                                size="sm"
                                                variant={question.correctAnswer === optIndex ? "default" : "outline"}
                                                onClick={() => {
                                                  const updated = [...(hotspot.questions || [])];
                                                  updated[qIndex] = { ...question, correctAnswer: optIndex };
                                                  updateHotspot(index, { questions: updated });
                                                }}
                                                data-testid={`button-correct-${index}-${qIndex}-${optIndex}`}
                                              >
                                                Correct
                                              </Button>
                                            </div>
                                          ))}
                                        </div>
                                      </>
                                    )}

                                    {question.type === "true-false" && (
                                      <div className="space-y-2">
                                        <Label className="text-xs">Correct Answer</Label>
                                        <Select
                                          value={String(question.correctAnswer)}
                                          onValueChange={(value) => {
                                            const updated = [...(hotspot.questions || [])];
                                            updated[qIndex] = { ...question, correctAnswer: value };
                                            updateHotspot(index, { questions: updated });
                                          }}
                                        >
                                          <SelectTrigger className="h-8">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="true">True</SelectItem>
                                            <SelectItem value="false">False</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    )}

                                    {question.type === "fill-blank" && (
                                      <div className="space-y-2">
                                        <Label className="text-xs">Correct Answer</Label>
                                        <Input
                                          placeholder="Enter the correct answer..."
                                          value={String(question.correctAnswer || "")}
                                          onChange={(e) => {
                                            const updated = [...(hotspot.questions || [])];
                                            updated[qIndex] = { ...question, correctAnswer: e.target.value };
                                            updateHotspot(index, { questions: updated });
                                          }}
                                          data-testid={`input-fill-blank-${index}-${qIndex}`}
                                        />
                                      </div>
                                    )}

                                    <div className="space-y-2">
                                      <Label className="text-xs">Explanation (Optional)</Label>
                                      <Textarea
                                        placeholder="Explanation for the answer..."
                                        value={question.explanation || ""}
                                        onChange={(e) => {
                                          const updated = [...(hotspot.questions || [])];
                                          updated[qIndex] = { ...question, explanation: e.target.value };
                                          updateHotspot(index, { questions: updated });
                                        }}
                                        className="h-16 resize-none"
                                        data-testid={`textarea-explanation-${index}-${qIndex}`}
                                      />
                                    </div>
                                  </div>
                                </Card>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8 border rounded-lg text-muted-foreground">
                              <p>No questions yet. Click "Add Question" to get started.</p>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <AIGenerationModal
        open={showAIModal}
        onOpenChange={setShowAIModal}
        contentType="interactive-video"
        onGenerated={handleAIGenerated}
      />
      <InteractiveVideoAIGenerator
        open={showEnhancedAIModal}
        onOpenChange={setShowEnhancedAIModal}
        onGenerated={handleEnhancedAIGenerated}
        subject={subject}
        gradeLevel={gradeLevel}
        ageRange={ageRange}
      />
    </div>
  );
}
