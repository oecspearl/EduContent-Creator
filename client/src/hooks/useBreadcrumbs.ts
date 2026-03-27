import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { H5pContent } from "@shared/schema";
import type { BreadcrumbItem } from "@/components/Breadcrumbs";
import {
  FileQuestion,
  Layers,
  Video,
  Image as ImageIcon,
  Move,
  PenTool,
  Brain,
  BookOpenCheck,
  Search,
  Presentation,
  Users,
  BarChart3,
  HelpCircle,
  Share2,
  Eye,
} from "lucide-react";

const contentTypeConfig = {
  quiz: { icon: FileQuestion, label: "Quiz" },
  flashcard: { icon: Layers, label: "Flashcard" },
  "interactive-video": { icon: Video, label: "Interactive Video" },
  "image-hotspot": { icon: ImageIcon, label: "Image Hotspot" },
  "drag-drop": { icon: Move, label: "Drag & Drop" },
  "fill-blanks": { icon: PenTool, label: "Fill in the Blanks" },
  "memory-game": { icon: Brain, label: "Memory Game" },
  "interactive-book": { icon: BookOpenCheck, label: "Interactive Book" },
  "video-finder": { icon: Search, label: "Video Finder" },
  "presentation": { icon: Presentation, label: "Presentation" },
};

export function useBreadcrumbs(contentId?: string): BreadcrumbItem[] {
  const [location] = useLocation();
  
  // Fetch content details if we have a content ID
  const { data: content } = useQuery<H5pContent>({
    queryKey: ["/api/content", contentId],
    enabled: !!contentId,
  });

  const segments = location.split("/").filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [];

  // Dashboard is the home, so we start from index 0
  if (segments.length === 0) {
    return breadcrumbs;
  }

  // Handle different routes
  if (segments[0] === "shared-resources") {
    breadcrumbs.push({
      label: "Shared Resources",
      icon: Users,
    });
  } else if (segments[0] === "analytics") {
    breadcrumbs.push({
      label: "Analytics",
      icon: BarChart3,
    });
  } else if (segments[0] === "help") {
    breadcrumbs.push({
      label: "Help",
      icon: HelpCircle,
    });
  } else if (segments[0] === "create" && segments[1]) {
    const contentType = segments[1];
    const config = contentTypeConfig[contentType as keyof typeof contentTypeConfig];
    
    if (config) {
      breadcrumbs.push({
        label: `Create ${config.label}`,
        icon: config.icon,
      });
      
      // If editing existing content (has ID)
      if (segments[2] && content) {
        breadcrumbs.push({
          label: content.title || "Untitled",
        });
      }
    }
  } else if (segments[0] === "preview" && segments[1]) {
    breadcrumbs.push({
      label: "Preview",
      icon: Eye,
      href: `/preview/${segments[1]}`,
    });
    
    if (content) {
      breadcrumbs.push({
        label: content.title || "Untitled",
      });
    }
  } else if (segments[0] === "share" && segments[1]) {
    breadcrumbs.push({
      label: "Share",
      icon: Share2,
      href: `/share/${segments[1]}`,
    });
    
    if (content) {
      breadcrumbs.push({
        label: content.title || "Untitled",
      });
    }
  }

  return breadcrumbs;
}
