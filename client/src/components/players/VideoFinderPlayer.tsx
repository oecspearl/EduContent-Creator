import { Card } from "@/components/ui/card";
import { ExternalLink, Play, Calendar, Search as SearchIcon } from "lucide-react";
import type { VideoFinderData } from "@shared/schema";

interface VideoFinderPlayerProps {
  data: VideoFinderData;
}

export function VideoFinderPlayer({ data }: VideoFinderPlayerProps) {
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 space-y-6">
      {/* Search Criteria Card */}
      <Card className="p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <SearchIcon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-2">Search Criteria</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="font-medium text-muted-foreground">Subject:</span>{" "}
                <span className="text-foreground">{data.searchCriteria.subject}</span>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Topic:</span>{" "}
                <span className="text-foreground">{data.searchCriteria.topic}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="font-medium text-muted-foreground">Learning Outcome:</span>{" "}
                <span className="text-foreground">{data.searchCriteria.learningOutcome}</span>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Grade Level:</span>{" "}
                <span className="text-foreground">{data.searchCriteria.gradeLevel}</span>
              </div>
              {data.searchCriteria.ageRange && (
                <div>
                  <span className="font-medium text-muted-foreground">Age Range:</span>{" "}
                  <span className="text-foreground">{data.searchCriteria.ageRange}</span>
                </div>
              )}
            </div>
            {data.searchDate && (
              <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Searched on {formatDate(data.searchDate)}</span>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Video Results */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">
          Videos Found ({data.searchResults.length})
        </h3>
        {data.searchResults.length === 0 ? (
          <Card className="p-12 text-center">
            <SearchIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" />
            <p className="text-muted-foreground">No videos found for this search</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.searchResults.map((video) => (
              <Card key={video.id} className="overflow-hidden hover-elevate">
                <a
                  href={`https://www.youtube.com/watch?v=${video.videoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                  data-testid={`link-video-${video.id}`}
                >
                  <div className="relative w-full aspect-video bg-muted group">
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="h-16 w-16 rounded-full bg-red-600 flex items-center justify-center">
                        <Play className="h-8 w-8 text-white ml-1" fill="white" />
                      </div>
                    </div>
                  </div>
                  <div className="p-4 space-y-2">
                    <h4 className="font-medium line-clamp-2 leading-snug">
                      {video.title}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {video.channelTitle}
                    </p>
                    {video.duration && (
                      <p className="text-sm text-muted-foreground">
                        Duration: {formatDuration(video.duration)}
                      </p>
                    )}
                    <div className="flex items-center gap-1 text-sm text-primary pt-2">
                      <span>Watch on YouTube</span>
                      <ExternalLink className="h-4 w-4" />
                    </div>
                  </div>
                </a>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
