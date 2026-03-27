import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { X } from "lucide-react";
import type { ImageHotspotData } from "@shared/schema";
import { useProgressTracker } from "@/hooks/use-progress-tracker";

type ImageHotspotPlayerProps = {
  data: ImageHotspotData;
  contentId: string;
};

export function ImageHotspotPlayer({ data, contentId }: ImageHotspotPlayerProps) {
  const [selectedHotspot, setSelectedHotspot] = useState<number | null>(null);
  const [viewedHotspots, setViewedHotspots] = useState<Set<string>>(new Set());

  const { progress: savedProgress, isProgressFetched, updateProgress, logInteraction, isAuthenticated } = useProgressTracker(contentId);
  const [lastSentProgress, setLastSentProgress] = useState<number>(-1);
  const [isProgressInitialized, setIsProgressInitialized] = useState(false);
  const pendingMilestoneRef = useRef<number | null>(null);
  const pendingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousAuthRef = useRef<boolean>(isAuthenticated);

  // Reset initialization when auth changes from false → true
  useEffect(() => {
    if (!previousAuthRef.current && isAuthenticated) {
      // User just logged in - reset to wait for progress fetch
      setIsProgressInitialized(false);
      setLastSentProgress(-1);
      pendingMilestoneRef.current = null;
      if (pendingTimeoutRef.current) {
        clearTimeout(pendingTimeoutRef.current);
        pendingTimeoutRef.current = null;
      }
    }
    previousAuthRef.current = isAuthenticated;
  }, [isAuthenticated]);

  // Initialize from persisted progress and reconcile when savedProgress updates
  useEffect(() => {
    if (!isProgressInitialized) {
      if (!isAuthenticated) {
        setIsProgressInitialized(true);
      } else if (isProgressFetched) {
        if (savedProgress) {
          setLastSentProgress(savedProgress.completionPercentage);
        }
        setIsProgressInitialized(true);
      }
    } else if (savedProgress) {
      // After initialization, reconcile: server can only raise, never lower
      // Only update if savedProgress is truthy (skip null refetches)
      setLastSentProgress(prev => Math.max(prev, savedProgress.completionPercentage));
      // Clear pending milestone if it's been saved
      if (pendingMilestoneRef.current !== null && savedProgress.completionPercentage >= pendingMilestoneRef.current) {
        pendingMilestoneRef.current = null;
        if (pendingTimeoutRef.current) {
          clearTimeout(pendingTimeoutRef.current);
          pendingTimeoutRef.current = null;
        }
      }
    }
  }, [savedProgress, isProgressFetched, isAuthenticated, isProgressInitialized]);

  // Track hotspot views and update progress (monotonic, only after initialization)
  useEffect(() => {
    if (!isProgressInitialized || !isAuthenticated) return;
    
    if (selectedHotspot !== null) {
      const hotspot = data.hotspots[selectedHotspot];
      if (!viewedHotspots.has(hotspot.id)) {
        const newViewedHotspots = new Set(viewedHotspots).add(hotspot.id);
        setViewedHotspots(newViewedHotspots);

        // Update progress based on hotspots viewed (only if higher and not pending)
        const completionPercentage = Math.round((newViewedHotspots.size / data.hotspots.length) * 100);
        if (completionPercentage > lastSentProgress && completionPercentage !== pendingMilestoneRef.current) {
          pendingMilestoneRef.current = completionPercentage;
          updateProgress(completionPercentage);
          // Clear pending after 5 seconds to allow retry on failure
          if (pendingTimeoutRef.current) {
            clearTimeout(pendingTimeoutRef.current);
          }
          pendingTimeoutRef.current = setTimeout(() => {
            pendingMilestoneRef.current = null;
            pendingTimeoutRef.current = null;
          }, 5000);
        }

        // Log interaction
        logInteraction("hotspot_viewed", {
          hotspotId: hotspot.id,
          hotspotTitle: hotspot.id,
        });
      }
    }
  }, [selectedHotspot, lastSentProgress, isProgressInitialized, isAuthenticated]);

  return (
    <div className="space-y-6">
      {/* Image with Hotspots */}
      <Card>
        <CardContent className="p-0">
          <div className="relative bg-muted" style={{ aspectRatio: "16/9" }}>
            <img
              src={data.imageUrl}
              alt="Interactive image"
              className="w-full h-full object-contain"
              data-testid="hotspot-image"
            />

            {/* Hotspot Points */}
            {data.hotspots.map((hotspot, index) => (
              <div
                key={hotspot.id}
                className="absolute w-8 h-8 bg-primary rounded-full border-4 border-primary-foreground cursor-pointer transform -translate-x-1/2 -translate-y-1/2 hover-elevate transition-all z-10"
                style={{
                  left: `${hotspot.x}%`,
                  top: `${hotspot.y}%`,
                }}
                onClick={() => setSelectedHotspot(selectedHotspot === index ? null : index)}
                data-testid={`hotspot-point-${index}`}
              >
                <div className="absolute inset-0 flex items-center justify-center text-primary-foreground font-bold text-sm">
                  {index + 1}
                </div>
              </div>
            ))}

            {/* Hotspot Popup */}
            {selectedHotspot !== null && (
              <div
                className="absolute bg-card border rounded-lg shadow-lg p-4 max-w-xs z-20"
                style={{
                  left: `${data.hotspots[selectedHotspot].x}%`,
                  top: `${data.hotspots[selectedHotspot].y}%`,
                  transform: "translate(20px, -50%)",
                }}
                data-testid={`hotspot-popup-${selectedHotspot}`}
              >
                <button
                  className="absolute top-2 right-2 p-1 rounded hover-elevate"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedHotspot(null);
                  }}
                  data-testid="button-close-popup"
                >
                  <X className="h-4 w-4" />
                </button>
                <h4 className="font-semibold mb-2">{data.hotspots[selectedHotspot].title}</h4>
                <p className="text-sm text-muted-foreground">{data.hotspots[selectedHotspot].description}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Hotspot List */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-4">Hotspots ({data.hotspots.length})</h3>
          <div className="space-y-3">
            {data.hotspots.map((hotspot, index) => (
              <div
                key={hotspot.id}
                className={`p-4 rounded-lg border cursor-pointer transition-all hover-elevate ${
                  selectedHotspot === index ? "border-primary bg-primary/5" : ""
                }`}
                onClick={() => setSelectedHotspot(selectedHotspot === index ? null : index)}
                data-testid={`hotspot-list-${index}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xs font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium mb-1">{hotspot.title}</h4>
                    <p className="text-sm text-muted-foreground">{hotspot.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
