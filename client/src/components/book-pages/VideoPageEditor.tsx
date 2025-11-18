import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Search, Loader2, Play } from "lucide-react";
import type { VideoPageData, VideoResult } from "@shared/schema";

type VideoPageEditorProps = {
  videoData?: VideoPageData;
  onSave: (data: VideoPageData) => void;
};

export function VideoPageEditor({ videoData, onSave }: VideoPageEditorProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<VideoResult[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VideoResult | null>(
    videoData ? {
      id: videoData.videoId,
      videoId: videoData.videoId,
      title: videoData.title,
      description: videoData.description || "",
      thumbnailUrl: videoData.thumbnailUrl || "",
      channelTitle: "",
      publishedAt: "",
    } : null
  );
  const [instructions, setInstructions] = useState(videoData?.instructions || "");

  const searchMutation = useMutation({
    mutationFn: async (query: string) => {
      // Simple YouTube search
      const response = await apiRequest("POST", "/api/youtube/search-simple", {
        query,
        maxResults: 10,
      });
      return await response.json();
    },
    onSuccess: (data) => {
      setSearchResults(data.results || []);
      toast({
        title: "Search complete!",
        description: `Found ${data.results?.length || 0} videos`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Search failed",
        description: error.message || "Failed to search YouTube. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Search query required",
        description: "Please enter what you're looking for",
        variant: "destructive",
      });
      return;
    }
    searchMutation.mutate(searchQuery);
  };

  const handleSelectVideo = (video: VideoResult) => {
    setSelectedVideo(video);
    setSearchResults([]);
    setSearchQuery("");
  };

  const handleSave = () => {
    if (!selectedVideo) {
      toast({
        title: "No video selected",
        description: "Please select a video to add to this page",
        variant: "destructive",
      });
      return;
    }

    const videoPageData: VideoPageData = {
      videoId: selectedVideo.videoId,
      videoUrl: `https://www.youtube.com/watch?v=${selectedVideo.videoId}`,
      title: selectedVideo.title,
      description: selectedVideo.description,
      thumbnailUrl: selectedVideo.thumbnailUrl,
      instructions: instructions.trim() || undefined,
    };

    onSave(videoPageData);
    toast({
      title: "Video page saved!",
      description: "The video has been added to this page.",
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Search for YouTube Videos</Label>
        <div className="flex gap-2 mt-2">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Type what you're looking for (e.g., 'math tutorial for kids')"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSearch();
              }
            }}
          />
          <Button
            onClick={handleSearch}
            disabled={searchMutation.isPending}
            data-testid="button-search-videos"
          >
            {searchMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {searchResults.length > 0 && (
        <div>
          <Label>Select a Video</Label>
          <div className="grid grid-cols-1 gap-3 mt-2 max-h-96 overflow-y-auto">
            {searchResults.map((video) => (
              <Card
                key={video.id}
                className={`cursor-pointer hover-elevate ${
                  selectedVideo?.videoId === video.videoId ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => handleSelectVideo(video)}
              >
                <CardContent className="p-4 flex gap-4">
                  <div className="flex-shrink-0">
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      className="w-32 h-24 object-cover rounded"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium line-clamp-2">{video.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {video.channelTitle}
                    </p>
                    {video.duration && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Duration: {video.duration}
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0 flex items-center">
                    <Play className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {selectedVideo && (
        <div className="space-y-4">
          <Card className="bg-accent/10">
            <CardContent className="p-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <img
                    src={selectedVideo.thumbnailUrl}
                    alt={selectedVideo.title}
                    className="w-32 h-24 object-cover rounded"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium">{selectedVideo.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedVideo.channelTitle}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div>
            <Label htmlFor="instructions">Instructions (Optional)</Label>
            <Textarea
              id="instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Add instructions for viewing this video..."
              rows={3}
              className="mt-2"
            />
          </div>

          <Button onClick={handleSave} className="w-full" data-testid="button-save-video-page">
            Save Video Page
          </Button>
        </div>
      )}
    </div>
  );
}

