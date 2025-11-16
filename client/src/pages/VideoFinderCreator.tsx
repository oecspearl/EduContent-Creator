import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Search, Globe, ExternalLink, Play, Sparkles, X, CheckSquare, Square } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import type { H5pContent, VideoFinderData, VideoResult } from "@shared/schema";
import ShareToClassroomDialog from "@/components/ShareToClassroomDialog";

export default function VideoFinderCreator() {
  const params = useParams();
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const contentId = params.id;
  const isEditing = !!contentId;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [learningOutcome, setLearningOutcome] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [ageRange, setAgeRange] = useState("");
  const [videoCount, setVideoCount] = useState(10);
  const [searchResults, setSearchResults] = useState<VideoResult[]>([]);
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([]);
  const [searchDate, setSearchDate] = useState("");
  const [viewingInstructions, setViewingInstructions] = useState("");
  const [guidingQuestions, setGuidingQuestions] = useState<string[]>([]);
  const [isPublished, setIsPublished] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: content } = useQuery<H5pContent>({
    queryKey: ["/api/content", contentId],
    enabled: isEditing,
  });

  useEffect(() => {
    if (content && content.type === "video-finder") {
      setTitle(content.title);
      setDescription(content.description || "");
      const data = content.data as VideoFinderData;
      setSubject(data.searchCriteria.subject);
      setTopic(data.searchCriteria.topic);
      setLearningOutcome(data.searchCriteria.learningOutcome);
      setGradeLevel(data.searchCriteria.gradeLevel);
      setAgeRange(data.searchCriteria.ageRange);
      setVideoCount(data.searchCriteria.videoCount);
      setSearchResults(data.searchResults || []);
      setSelectedVideoIds((data.searchResults || []).map(v => v.id));
      setSearchDate(data.searchDate);
      setViewingInstructions(data.viewingInstructions || "");
      setGuidingQuestions(data.guidingQuestions || []);
      setIsPublished(content.isPublished);
      setIsPublic(content.isPublic || false);
    }
  }, [content]);

  const saveMutation = useMutation({
    mutationFn: async (params: { publish: boolean, selectedIds: string[] }) => {
      const selectedVideos = searchResults.filter(v => params.selectedIds.includes(v.id));
      const data: VideoFinderData = {
        searchCriteria: {
          subject,
          topic,
          learningOutcome,
          gradeLevel,
          ageRange,
          videoCount,
        },
        searchResults: selectedVideos,
        searchDate,
        viewingInstructions: viewingInstructions || undefined,
        guidingQuestions: guidingQuestions.length > 0 ? guidingQuestions : undefined,
      };

      if (isEditing) {
        const response = await apiRequest("PUT", `/api/content/${contentId}`, {
          title,
          description,
          data,
          isPublished: params.publish,
          isPublic,
        });
        return await response.json();
      } else {
        const response = await apiRequest("POST", "/api/content", {
          title,
          description,
          type: "video-finder",
          data,
          isPublished: params.publish,
          isPublic,
        });
        return await response.json();
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/content"] });
      queryClient.invalidateQueries({ queryKey: ["/api/content/public"] });
      if (!isEditing) {
        navigate(`/create/video-finder/${data.id}`);
      }
      toast({ title: "Saved!", description: "Video finder saved successfully." });
      setIsSaving(false);
    },
  });

  const searchMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/youtube/search", {
        subject,
        topic,
        learningOutcome,
        gradeLevel,
        ageRange,
        videoCount,
      });
      return await response.json();
    },
    onSuccess: (data) => {
      setSearchResults(data.results);
      setSelectedVideoIds(data.results.map((v: VideoResult) => v.id));
      setSearchDate(data.searchDate);
      setIsSearching(false);
      toast({
        title: "Search complete!",
        description: `Found ${data.results.length} videos`,
      });
    },
    onError: (error: any) => {
      setIsSearching(false);
      toast({
        title: "Search failed",
        description: error.message || "Failed to search YouTube. Please try again.",
        variant: "destructive",
      });
    },
  });

  const generatePedagogyMutation = useMutation({
    mutationFn: async () => {
      const selectedVideos = searchResults.filter(v => selectedVideoIds.includes(v.id));
      const response = await apiRequest("POST", "/api/video-finder/generate-pedagogy", {
        subject,
        topic,
        learningOutcome,
        gradeLevel,
        ageRange,
        videoCount: selectedVideos.length,
      });
      return await response.json();
    },
    onSuccess: (data) => {
      setViewingInstructions(data.viewingInstructions);
      setGuidingQuestions(data.guidingQuestions);
      setIsGenerating(false);
      toast({
        title: "Generated!",
        description: "AI has created viewing instructions and guiding questions",
      });
    },
    onError: (error: any) => {
      setIsGenerating(false);
      toast({
        title: "Generation failed",
        description: error.message || "Failed to generate pedagogical content. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSearch = () => {
    if (!subject || !topic || !learningOutcome || !gradeLevel) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    setIsSearching(true);
    searchMutation.mutate();
  };

  const handleSave = () => {
    if (!title) {
      toast({
        title: "Missing title",
        description: "Please provide a title for this content",
        variant: "destructive",
      });
      return;
    }
    if (searchResults.length > 0 && selectedVideoIds.length === 0) {
      toast({
        title: "No videos selected",
        description: "Please select at least one video to save",
        variant: "destructive",
      });
      return;
    }
    setIsSaving(true);
    saveMutation.mutate({ publish: isPublished, selectedIds: selectedVideoIds });
  };

  const handlePublish = async () => {
    if (!title) {
      toast({
        title: "Missing title",
        description: "Please provide a title before publishing",
        variant: "destructive",
      });
      return;
    }
    if (searchResults.length > 0 && selectedVideoIds.length === 0) {
      toast({
        title: "No videos selected",
        description: "Please select at least one video before publishing",
        variant: "destructive",
      });
      return;
    }
    setIsSaving(true);
    setIsPublished(true);
    saveMutation.mutate({ publish: true, selectedIds: selectedVideoIds });
  };

  const handleGeneratePedagogy = () => {
    if (!subject || !topic || !learningOutcome || !gradeLevel) {
      toast({
        title: "Missing information",
        description: "Please fill in all required search criteria fields first",
        variant: "destructive",
      });
      return;
    }
    if (selectedVideoIds.length === 0) {
      toast({
        title: "No videos selected",
        description: "Please select at least one video before generating pedagogical content",
        variant: "destructive",
      });
      return;
    }
    setIsGenerating(true);
    generatePedagogyMutation.mutate();
  };

  const toggleVideoSelection = (videoId: string) => {
    setSelectedVideoIds(prev =>
      prev.includes(videoId)
        ? prev.filter(id => id !== videoId)
        : [...prev, videoId]
    );
  };

  const selectAllVideos = () => {
    setSelectedVideoIds(searchResults.map(v => v.id));
  };

  const clearAllVideos = () => {
    setSelectedVideoIds([]);
  };

  const addGuidingQuestion = () => {
    setGuidingQuestions([...guidingQuestions, ""]);
  };

  const updateGuidingQuestion = (index: number, value: string) => {
    const updated = [...guidingQuestions];
    updated[index] = value;
    setGuidingQuestions(updated);
  };

  const removeGuidingQuestion = (index: number) => {
    setGuidingQuestions(guidingQuestions.filter((_, i) => i !== index));
  };

  const formatDuration = (duration: string) => {
    // Convert ISO 8601 duration to readable format
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return "";
    const hours = match[1] || "0";
    const minutes = match[2] || "0";
    const seconds = match[3] || "0";
    if (hours !== "0") {
      return `${hours}:${minutes.padStart(2, "0")}:${seconds.padStart(2, "0")}`;
    }
    return `${minutes}:${seconds.padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/dashboard")}
                data-testid="button-back"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-2xl font-bold text-foreground">
                {isEditing ? "Edit" : "Create"} Video Finder
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleSave}
                disabled={isSaving || !title}
                data-testid="button-save"
              >
                Save
              </Button>
              {contentId && isPublished && (
                <ShareToClassroomDialog
                  contentTitle={title}
                  contentDescription={description}
                  materialLink={`${window.location.origin}/public/${contentId}`}
                />
              )}
              {isPublished ? (
                <Button variant="default" disabled data-testid="button-published">
                  <Globe className="mr-2 h-4 w-4" />
                  Published
                </Button>
              ) : (
                <Button
                  onClick={handlePublish}
                  disabled={isSaving || !title || searchResults.length === 0}
                  data-testid="button-publish"
                >
                  <Globe className="mr-2 h-4 w-4" />
                  Publish
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Form */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Math Videos for Grade 5"
                    data-testid="input-title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of this video collection"
                    data-testid="input-description"
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="isPublic" className="text-base">Share as Public Resource</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow other teachers to discover and use this video collection on the Shared Resources page. Content will be automatically published when shared.
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
                <CardTitle>Search Criteria</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject *</Label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g., Mathematics, Science, English"
                    data-testid="input-subject"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="topic">Topic *</Label>
                  <Input
                    id="topic"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g., Fractions, Photosynthesis, Grammar"
                    data-testid="input-topic"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="learningOutcome">Learning Outcome *</Label>
                  <Input
                    id="learningOutcome"
                    value={learningOutcome}
                    onChange={(e) => setLearningOutcome(e.target.value)}
                    placeholder="e.g., Students will understand..."
                    data-testid="input-learning-outcome"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="gradeLevel">Grade Level *</Label>
                    <Select value={gradeLevel} onValueChange={setGradeLevel}>
                      <SelectTrigger id="gradeLevel" data-testid="select-grade-level">
                        <SelectValue placeholder="Select grade level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pre-K">Pre-K</SelectItem>
                        <SelectItem value="Kindergarten">Kindergarten</SelectItem>
                        <SelectItem value="K-2">K-2 (Grades K-2)</SelectItem>
                        <SelectItem value="3-5">3-5 (Grades 3-5)</SelectItem>
                        <SelectItem value="6-8">6-8 (Grades 6-8)</SelectItem>
                        <SelectItem value="9-12">9-12 (Grades 9-12)</SelectItem>
                        <SelectItem value="Higher Education">Higher Education</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ageRange">Age Range</Label>
                    <Input
                      id="ageRange"
                      value={ageRange}
                      onChange={(e) => setAgeRange(e.target.value)}
                      placeholder="e.g., 10-12"
                      data-testid="input-age-range"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="videoCount">Number of Videos (1-50)</Label>
                  <Input
                    id="videoCount"
                    type="number"
                    min={1}
                    max={50}
                    value={videoCount}
                    onChange={(e) => setVideoCount(parseInt(e.target.value) || 10)}
                    data-testid="input-video-count"
                  />
                </div>
                <Button
                  onClick={handleSearch}
                  disabled={isSearching || !subject || !topic || !learningOutcome || !gradeLevel}
                  className="w-full"
                  data-testid="button-search"
                >
                  {isSearching ? (
                    <>Searching...</>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Search YouTube
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Pedagogical Content Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle>Pedagogical Content</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGeneratePedagogy}
                  disabled={isGenerating || !subject || !topic || !learningOutcome || !gradeLevel}
                  data-testid="button-generate-pedagogy"
                >
                  {isGenerating ? (
                    <>Generating...</>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate with AI
                    </>
                  )}
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="viewingInstructions">Viewing Instructions</Label>
                  <p className="text-xs text-muted-foreground">
                    Provide guidance on what learners should focus on while watching
                  </p>
                  <Textarea
                    id="viewingInstructions"
                    value={viewingInstructions}
                    onChange={(e) => setViewingInstructions(e.target.value)}
                    placeholder="e.g., Watch these videos to understand how plants make their own food. Take notes on the inputs, outputs, and location of this process..."
                    rows={4}
                    data-testid="textarea-viewing-instructions"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Guiding Questions</Label>
                      <p className="text-xs text-muted-foreground">
                        Questions to help learners focus while watching
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addGuidingQuestion}
                      data-testid="button-add-question"
                    >
                      Add Question
                    </Button>
                  </div>
                  {guidingQuestions.length === 0 ? (
                    <div className="text-center py-6 text-sm text-muted-foreground border border-dashed rounded-lg">
                      No guiding questions yet. Click "Add Question" or generate with AI
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {guidingQuestions.map((question, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <span className="text-sm font-medium text-muted-foreground mt-2 flex-shrink-0">
                            {index + 1}.
                          </span>
                          <Input
                            value={question}
                            onChange={(e) => updateGuidingQuestion(index, e.target.value)}
                            placeholder="Enter a guiding question..."
                            data-testid={`input-question-${index}`}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeGuidingQuestion(index)}
                            data-testid={`button-remove-question-${index}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Results */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>
                    Video Results
                    {searchResults.length > 0 && (
                      <span className="ml-2 text-sm font-normal text-muted-foreground">
                        ({selectedVideoIds.length} of {searchResults.length} selected)
                      </span>
                    )}
                  </CardTitle>
                  {searchResults.length > 0 && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={selectAllVideos}
                        disabled={selectedVideoIds.length === searchResults.length}
                        data-testid="button-select-all"
                      >
                        Select All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearAllVideos}
                        disabled={selectedVideoIds.length === 0}
                        data-testid="button-clear-all"
                      >
                        Clear All
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {searchResults.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Search className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>No videos yet. Fill in the search criteria and click "Search YouTube"</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto">
                    {searchResults.map((video) => {
                      const isSelected = selectedVideoIds.includes(video.id);
                      return (
                        <div 
                          key={video.id}
                          className={`transition-all ${!isSelected ? 'opacity-60' : ''}`}
                        >
                          <Card className={`overflow-hidden ${isSelected ? 'border-primary border-2' : 'border-border'}`}>
                            <div className="flex gap-4 p-4">
                              <button
                                onClick={() => toggleVideoSelection(video.id)}
                                className="flex-shrink-0 self-start mt-1 hover-elevate active-elevate-2 p-1 rounded"
                                data-testid={`button-toggle-video-${video.id}`}
                              >
                                {isSelected ? (
                                  <CheckSquare className="h-5 w-5 text-primary" />
                                ) : (
                                  <Square className="h-5 w-5 text-muted-foreground" />
                                )}
                              </button>
                              <div className="relative flex-shrink-0 w-40 h-24 bg-muted rounded overflow-hidden group">
                                <img
                                  src={video.thumbnailUrl}
                                  alt={video.title}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Play className="h-8 w-8 text-white" />
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-sm line-clamp-2 mb-1">
                                  {video.title}
                                </h4>
                                <p className="text-xs text-muted-foreground mb-2">
                                  {video.channelTitle}
                                </p>
                                {video.duration && (
                                  <p className="text-xs text-muted-foreground mb-2">
                                    Duration: {formatDuration(video.duration)}
                                  </p>
                                )}
                                <a
                                  href={`https://www.youtube.com/watch?v=${video.videoId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                  data-testid={`link-video-${video.id}`}
                                >
                                  Watch on YouTube
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                            </div>
                          </Card>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
