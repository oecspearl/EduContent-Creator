import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Sparkles, Loader2, Search, Play, CheckCircle2 } from "lucide-react";
import type { VideoHotspot } from "@shared/schema";

type VideoResult = {
  id: string;
  videoId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  channelTitle: string;
  publishedAt: string;
  duration: string;
  tags?: string[];
  categoryId?: string;
  viewCount?: number;
  likeCount?: number;
};

type InteractiveVideoAIGeneratorProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerated: (videoUrl: string, hotspots: VideoHotspot[]) => void;
  subject?: string;
  gradeLevel?: string;
  ageRange?: string;
};

export function InteractiveVideoAIGenerator({
  open,
  onOpenChange,
  onGenerated,
  subject = "",
  gradeLevel = "",
  ageRange = "",
}: InteractiveVideoAIGeneratorProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<"search" | "select" | "generating">("search");
  const [isSearching, setIsSearching] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchResults, setSearchResults] = useState<VideoResult[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VideoResult | null>(null);
  const [formData, setFormData] = useState({
    topic: "",
    difficulty: "intermediate",
    numberOfHotspots: 5,
    additionalContext: "",
  });

  const handleSearch = async () => {
    if (!formData.topic.trim()) {
      toast({
        title: "Topic required",
        description: "Please enter a topic to search for videos.",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    try {
      const response = await apiRequest("POST", "/api/youtube/search-simple", {
        query: formData.topic,
        maxResults: 10,
      });

      const data = await response.json();
      if (data.results && data.results.length > 0) {
        setSearchResults(data.results);
        setStep("select");
        toast({
          title: "Videos found!",
          description: `Found ${data.results.length} videos. Select one to generate interactions.`,
        });
      } else {
        toast({
          title: "No videos found",
          description: "Please try a different search term.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Search failed",
        description: error.message || "Failed to search YouTube videos. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedVideo) {
      toast({
        title: "No video selected",
        description: "Please select a video first.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setStep("generating");
    try {
      const response = await apiRequest("POST", "/api/ai/generate-interactive-video", {
        topic: formData.topic,
        difficulty: formData.difficulty,
        numberOfHotspots: formData.numberOfHotspots,
        gradeLevel: gradeLevel || undefined,
        additionalContext: formData.additionalContext,
        videoId: selectedVideo.videoId,
        videoTitle: selectedVideo.title,
        videoDescription: selectedVideo.description,
        videoDuration: selectedVideo.duration,
        videoTags: (selectedVideo as any).tags || [],
        channelTitle: selectedVideo.channelTitle,
      });

      const data = await response.json();
      if (data.videoUrl && data.hotspots) {
        onGenerated(data.videoUrl, data.hotspots);
        onOpenChange(false);
        toast({
          title: "Interactive video created!",
          description: `Successfully generated ${data.hotspots.length} hotspots for the selected video.`,
        });
        
        // Reset form
        setFormData({
          topic: "",
          difficulty: "intermediate",
          numberOfHotspots: 5,
          additionalContext: "",
        });
        setSearchResults([]);
        setSelectedVideo(null);
        setStep("search");
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (error: any) {
      toast({
        title: "Generation failed",
        description: error.message || "Failed to generate interactive hotspots. Please try again.",
        variant: "destructive",
      });
      setStep("select");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBack = () => {
    setStep("search");
    setSelectedVideo(null);
  };

  const formatDuration = (duration: string) => {
    // Parse ISO 8601 duration (e.g., PT5M30S)
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return duration;
    
    const hours = parseInt(match[1] || "0");
    const minutes = parseInt(match[2] || "0");
    const seconds = parseInt(match[3] || "0");
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="modal-interactive-video-ai">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle>AI-Powered Interactive Video Creator</DialogTitle>
              <DialogDescription>
                Search YouTube for videos and automatically generate interactive hotspots
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {step === "search" && (
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="topic">Topic *</Label>
              <Input
                id="topic"
                placeholder="e.g., Photosynthesis, World War II, Python Programming"
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isSearching) {
                    handleSearch();
                  }
                }}
                data-testid="input-topic"
              />
              <p className="text-xs text-muted-foreground">
                Enter a topic to search for educational videos on YouTube
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="difficulty">Difficulty Level</Label>
                <Select
                  value={formData.difficulty}
                  onValueChange={(value) => setFormData({ ...formData, difficulty: value })}
                >
                  <SelectTrigger id="difficulty" data-testid="select-difficulty">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="numberOfHotspots">Number of Hotspots</Label>
                <Input
                  id="numberOfHotspots"
                  type="number"
                  min="3"
                  max="15"
                  value={formData.numberOfHotspots}
                  onChange={(e) => setFormData({ ...formData, numberOfHotspots: parseInt(e.target.value) || 5 })}
                  data-testid="input-number-hotspots"
                />
                <p className="text-xs text-muted-foreground">
                  AI will create a mix of single questions and quiz hotspots (with multiple questions)
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="additionalContext">Additional Context (Optional)</Label>
              <Textarea
                id="additionalContext"
                placeholder="Any specific requirements, focus areas, or learning objectives..."
                value={formData.additionalContext}
                onChange={(e) => setFormData({ ...formData, additionalContext: e.target.value })}
                className="h-24 resize-none"
                data-testid="textarea-context"
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSearching} data-testid="button-cancel">
                Cancel
              </Button>
              <Button onClick={handleSearch} disabled={isSearching} data-testid="button-search">
                {isSearching ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Search Videos
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "select" && (
          <div className="space-y-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Select a Video</h3>
                <p className="text-sm text-muted-foreground">
                  Choose the most suitable video for your topic: "{formData.topic}"
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleBack} data-testid="button-back">
                Back to Search
              </Button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {searchResults.map((video) => (
                <Card
                  key={video.id}
                  className={`cursor-pointer transition-all hover:border-primary ${
                    selectedVideo?.id === video.id ? "border-primary border-2" : ""
                  }`}
                  onClick={() => setSelectedVideo(video)}
                  data-testid={`video-result-${video.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="relative flex-shrink-0">
                        <img
                          src={video.thumbnailUrl}
                          alt={video.title}
                          className="w-32 h-24 object-cover rounded"
                        />
                        {selectedVideo?.id === video.id && (
                          <div className="absolute inset-0 bg-primary/20 rounded flex items-center justify-center">
                            <CheckCircle2 className="h-8 w-8 text-primary" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm mb-1 overflow-hidden text-ellipsis" style={{ 
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}>{video.title}</h4>
                        <p className="text-xs text-muted-foreground mb-2">{video.channelTitle}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Play className="h-3 w-3" />
                            {formatDuration(video.duration)}
                          </span>
                          <span>{new Date(video.publishedAt).toLocaleDateString()}</span>
                        </div>
                        {video.description && (
                          <p className="text-xs text-muted-foreground mt-2 overflow-hidden text-ellipsis" style={{ 
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                          }}>
                            {video.description.substring(0, 150)}...
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating} data-testid="button-cancel-select">
                Cancel
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={!selectedVideo || isGenerating}
                data-testid="button-generate"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Interactions
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "generating" && (
          <div className="space-y-6 py-8">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Generating Interactive Hotspots</h3>
              <p className="text-sm text-muted-foreground">
                Analyzing the video and creating {formData.numberOfHotspots} interactive hotspots...
              </p>
              {selectedVideo && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium">{selectedVideo.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{selectedVideo.channelTitle}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

