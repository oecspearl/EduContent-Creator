import { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Loader2,
  ArrowLeft,
  Plus,
  Trash2,
  Sparkles,
  Globe,
  ExternalLink,
  AlertCircle,
  Palette,
  Edit2,
  Save,
  X,
  GripVertical,
  Download,
  Settings,
  Image as ImageIcon,
} from "lucide-react";
import type { PresentationData, SlideContent, H5pContent } from "@shared/schema";
import ShareToClassroomDialog from "@/components/ShareToClassroomDialog";
import { generateHTMLExport, downloadHTML } from "@/lib/html-export";
import { ContentMetadataFields } from "@/components/ContentMetadataFields";

type PresentationImageProvider = "openrouter" | "unsplash";

function normalizePresentationImageProvider(
  value: PresentationData["imageProvider"] | undefined,
): PresentationImageProvider {
  return value === "unsplash" ? "unsplash" : "openrouter";
}

export default function PresentationCreator() {
  const { id: contentId } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const breadcrumbs = useBreadcrumbs(contentId);
  const isEditing = !!contentId;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [ageRange, setAgeRange] = useState("");
  const [learningOutcomes, setLearningOutcomes] = useState<string[]>([""]);
  const [customInstructions, setCustomInstructions] = useState("");
  const [numberOfSlides, setNumberOfSlides] = useState(10);
  const [slides, setSlides] = useState<SlideContent[]>([]);
  const [generatedDate, setGeneratedDate] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [autosave, setAutosave] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [presentationId, setPresentationId] = useState<string>("");
  const [curriculumContext, setCurriculumContext] = useState<import("@shared/schema").CurriculumContext | null>(null);
  const [presentationUrl, setPresentationUrl] = useState<string>("");
  const [colorScheme, setColorScheme] = useState<string>("blue");
  const [imageProvider, setImageProvider] = useState<PresentationImageProvider>("openrouter");
  const [editingSlideId, setEditingSlideId] = useState<string | null>(null);
  const [editedSlide, setEditedSlide] = useState<SlideContent | null>(null);

  const { data: content, isLoading: isLoadingContent } = useQuery<H5pContent>({
    queryKey: [`/api/content/${contentId}`],
    enabled: isEditing,
  });

  const { data: authProviders, isLoading: isLoadingProviders } = useQuery<{ google: boolean; microsoft: boolean }>({
    queryKey: ["/api/auth/providers"],
  });

  useEffect(() => {
    if (content && content.type === "presentation") {
      setTitle(content.title);
      setDescription(content.description || "");
      const data = content.data as PresentationData;
      setSubject(content.subject || "");
      setGradeLevel(content.gradeLevel || data.gradeLevel || "");
      setAgeRange(content.ageRange || data.ageRange || "");
      setTopic(data.topic);
      setLearningOutcomes(data.learningOutcomes);
      setCustomInstructions(data.customInstructions || "");
      setSlides(data.slides || []);
      setGeneratedDate(data.generatedDate);
      setIsPublished(content.isPublished);
      setIsPublic(content.isPublic || false);
      setPresentationId(data.presentationId || "");
      setPresentationUrl(data.presentationUrl || "");
      setColorScheme(data.colorScheme || "blue");
      setImageProvider(normalizePresentationImageProvider(data.imageProvider));
    }
  }, [content]);

  // Handle return from Google authentication
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('googleAuthSuccess') === 'true') {
      console.log("🔄 OAuth success detected, refreshing user data...");

      // Refresh user data to get updated Google tokens
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });

      // Show success message (wait a bit for query to refresh)
      setTimeout(() => {
        // Check if user data was actually refreshed
        const currentUser = queryClient.getQueryData(["/api/user"]) as any;
        console.log("👤 User after refresh:", currentUser);
        console.log("🔑 Has Google token:", !!currentUser?.googleAccessToken);

        toast({
          title: "Google Account Connected!",
          description: "You can now create presentations.",
        });
      }, 500);

      // Clean up URL
      urlParams.delete('googleAuthSuccess');
      const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
      window.history.replaceState({}, '', newUrl);
    }
  }, [toast]);

  const saveMutation = useMutation({
    mutationFn: async (params: { publish: boolean }) => {
      // Strip data: URLs (base64 images from OpenRouter) to stay under payload limits.
      // Keep http(s) URLs as they're relatively short for storage.
      const saveSafeSlides = slides.map((slide: any) => {
        if (slide.imageUrl && slide.imageUrl.startsWith('data:')) {
          return { ...slide, imageUrl: slide.imageAlt || '' };
        }
        return slide;
      });

      const data: PresentationData = {
        topic,
        gradeLevel,
        ageRange,
        learningOutcomes: learningOutcomes.filter(o => o.trim()),
        ...(customInstructions && { customInstructions }),
        slides: saveSafeSlides,
        generatedDate: generatedDate || new Date().toISOString(),
        colorScheme,
        imageProvider,
        ...(presentationId && { presentationId }),
        ...(presentationUrl && { presentationUrl }),
      };

      if (isEditing) {
        const response = await apiRequest("PUT", `/api/content/${contentId}`, {
          title,
          description,
          subject,
          gradeLevel,
          ageRange,
          data,
          isPublished: params.publish,
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
          type: "presentation",
          data,
          isPublished: params.publish,
          isPublic,
        });
        return await response.json();
      }
    },
    onSuccess: (data) => {
      setIsSaving(false);
      setIsPublished(data.isPublished);
      queryClient.invalidateQueries({ queryKey: ["/api/content"] });
      queryClient.invalidateQueries({ queryKey: ["/api/content/public"] });
      if (!isEditing) {
        navigate(`/create/presentation/${data.id}`);
      }
      toast({ title: "Saved!", description: "Presentation content saved successfully." });
    },
    onError: (error: any) => {
      setIsSaving(false);
      toast({
        title: "Save failed",
        description: error.message || "Failed to save presentation content",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!autosave) return; // Skip autosave if disabled
    if (!title || slides.length === 0) return;
    
    const timer = setTimeout(() => {
      setIsSaving(true);
      saveMutation.mutate({ publish: isPublished });
    }, 2000);

    return () => clearTimeout(timer);
  }, [
    title,
    description,
    subject,
    gradeLevel,
    ageRange,
    topic,
    learningOutcomes,
    customInstructions,
    slides,
    colorScheme,
    imageProvider,
    isPublic,
    autosave,
    isPublished,
  ]);
  
  const handleManualSave = () => {
    if (!title) {
      toast({
        title: "Missing title",
        description: "Please provide a title before saving",
        variant: "destructive",
      });
      return;
    }
    if (slides.length === 0) {
      toast({
        title: "No slides",
        description: "Please generate slides before saving",
        variant: "destructive",
      });
      return;
    }
    setIsSaving(true);
    saveMutation.mutate({ publish: isPublished });
  };

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/presentation/generate", {
        topic,
        gradeLevel,
        ageRange,
        learningOutcomes: learningOutcomes.filter(o => o.trim()),
        numberOfSlides,
        ...(customInstructions && { customInstructions }),
        ...(curriculumContext && { curriculumContext }),
      });
      return await response.json();
    },
    onSuccess: async (data) => {
      console.log("Generate mutation success, received data:", data);
      const slidesData = data.slides || [];
      console.log("Slides data:", slidesData);

      const IMAGE_TIMEOUT_MS = 15_000;
      const CONCURRENCY_LIMIT = 3;

      type ImageTask = {
        index: number;
        slide: SlideContent;
        originalQuery: string;
      };

      // Identify slides that need image resolution
      const tasks: ImageTask[] = [];
      for (let i = 0; i < slidesData.length; i++) {
        const slide = slidesData[i];
        const raw = slide.imageUrl?.trim() ?? "";
        const alreadyImage =
          raw.startsWith("http://") ||
          raw.startsWith("https://") ||
          raw.startsWith("data:image");
        if (raw && !alreadyImage) {
          tasks.push({ index: i, slide, originalQuery: raw });
        }
      }

      // Resolve a single image with timeout
      async function resolveImage(task: ImageTask): Promise<SlideContent> {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS);

        try {
          if (imageProvider === "unsplash") {
            const imageResponse = await apiRequest("POST", "/api/unsplash/search", {
              query: task.originalQuery,
              count: 1,
            }, { signal: controller.signal });
            const imageData = await imageResponse.json();
            const photo = imageData.photos?.[0];
            if (photo?.urls?.regular) {
              return {
                ...task.slide,
                imageUrl: photo.urls.regular,
                imageAlt:
                  task.slide.imageAlt ||
                  photo.alt_description ||
                  photo.description ||
                  task.originalQuery,
              };
            }
            throw new Error("No Unsplash photo returned");
          } else {
            const parts = [
              "Educational illustration for a classroom presentation slide.",
              "Format: landscape orientation, 16:9 aspect ratio.",
              topic ? `Topic: "${topic}".` : "",
              task.slide.title ? `Slide title: "${task.slide.title}".` : "",
              task.slide.imageAlt ? `Scene / accessibility: ${task.slide.imageAlt}.` : "",
              `Visual focus: ${task.originalQuery}.`,
              "Style: clear, age-appropriate for students; minimal or no overlaid text unless essential.",
            ];
            const fullPrompt = parts.filter(Boolean).join(" ");
            const imageResponse = await apiRequest("POST", "/api/ai/generate-image", {
              prompt: fullPrompt,
            }, { signal: controller.signal });
            const body = await imageResponse.json();
            const imageUrl = body.imageUrl as string | undefined;
            if (imageUrl) {
              return {
                ...task.slide,
                imageUrl,
                imageAlt: task.slide.imageAlt || task.originalQuery,
              };
            }
            throw new Error("No image URL returned from OpenRouter");
          }
        } finally {
          clearTimeout(timeout);
        }
      }

      // Run tasks with concurrency limit using worker pool
      async function runWithConcurrency(
        imageTasks: ImageTask[],
        limit: number,
      ): Promise<PromiseSettledResult<{ index: number; slide: SlideContent }>[]> {
        const results: PromiseSettledResult<{ index: number; slide: SlideContent }>[] = [];
        let cursor = 0;

        async function worker(): Promise<void> {
          while (true) {
            const idx = cursor++;
            if (idx >= imageTasks.length) break;
            const task = imageTasks[idx];
            try {
              const slide = await resolveImage(task);
              results[idx] = { status: "fulfilled", value: { index: task.index, slide } };
            } catch (err) {
              results[idx] = { status: "rejected", reason: err };
            }
          }
        }

        const workers: Promise<void>[] = [];
        for (let i = 0; i < Math.min(limit, imageTasks.length); i++) {
          workers.push(worker());
        }
        await Promise.all(workers);
        return results;
      }

      try {
        let successCount = 0;
        let failCount = 0;
        const finalSlides = [...slidesData];

        if (tasks.length > 0) {
          const results = await runWithConcurrency(tasks, CONCURRENCY_LIMIT);

          for (let i = 0; i < tasks.length; i++) {
            const result = results[i];
            if (result?.status === "fulfilled") {
              successCount++;
              finalSlides[result.value.index] = result.value.slide;
            } else {
              failCount++;
              const task = tasks[i];
              console.error("Image generation failed for slide:", result?.reason);
              // Preserve original query as imageQuery for retry, clear imageUrl
              finalSlides[task.index] = {
                ...task.slide,
                imageUrl: "",
                imageAlt: task.slide.imageAlt || task.originalQuery,
                imageQuery: task.originalQuery,
              };
            }
          }
        }

        setSlides(finalSlides);

        const sourceHint =
          imageProvider === "unsplash"
            ? failCount > 0 && successCount === 0
              ? " Check UNSPLASH_ACCESS_KEY on the server."
              : ""
            : failCount > 0 && successCount === 0
              ? " Check OPENROUTER_API_KEY and OPENROUTER_IMAGE_MODEL."
              : "";

        const toastMessage =
          successCount > 0
            ? `${imageProvider === "unsplash" ? "Stock photos" : "AI images"}: ${successCount} ok${
                failCount > 0 ? `, ${failCount} failed` : ""
              }.`
            : failCount > 0
              ? `Slide text generated, but no images were filled in.${sourceHint}`
              : "Slides generated (no image prompts in deck).";

        toast({
          title: successCount > 0 ? "Generated with images" : "Generated",
          description: toastMessage,
          variant: failCount > 0 && successCount === 0 ? "destructive" : "default",
        });
      } catch (err) {
        console.error("Presentation image pass failed:", err);
        setSlides(slidesData);
        toast({
          title: "Image generation failed",
          description: "Slides were created but the image step failed. Check server logs and OpenRouter configuration.",
          variant: "destructive",
        });
      }

      setGeneratedDate(data.generatedDate);
    },
    onError: (error: any) => {
      toast({
        title: "Generation failed",
        description: error.message || "Failed to generate slides. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createPresentationMutation = useMutation({
    mutationFn: async () => {
      console.log("🚀 Creating presentation...");
      console.log("📝 Title:", title);
      console.log("📊 Slides count:", slides.length);
      console.log("🔑 Has Access Token:", !!user?.googleAccessToken);
      console.log("🔑 Has Refresh Token:", !!user?.googleRefreshToken);

      // Strip large data URLs and long Unsplash URLs to stay under Vercel's
      // payload limit. Send only the image search query (imageAlt) so
      // the server can re-fetch images from Unsplash on its side.
      const lightSlides = slides.map((slide: any) => {
        if (!slide.imageUrl) return slide;
        if (slide.imageUrl.startsWith('http') || slide.imageUrl.startsWith('data:')) {
          return { ...slide, imageUrl: slide.imageAlt || slide.imageUrl };
        }
        return slide;
      });

      const payload = {
        title: title || "Untitled Presentation",
        slides: lightSlides,
        colorTheme: colorScheme,
      };
      console.log("📦 Payload size:", JSON.stringify(payload).length, "bytes");

      const response = await apiRequest("POST", "/api/presentation/create-presentation", payload);
      return await response.json();
    },
    onSuccess: async (data) => {
      setPresentationId(data.presentationId);
      setPresentationUrl(data.url);

      // Show success message with warnings if any
      const description = data.warnings && data.warnings.length > 0
        ? `Presentation created with ${data.warnings.length} warning(s). Some features may not be available.`
        : "Your presentation is ready. Click 'Open in Google Slides' to view it.";

      toast({
        title: "Created in Google Slides!",
        description,
        variant: data.warnings && data.warnings.length > 0 ? "default" : "default",
      });

      // Log warnings for debugging
      if (data.warnings && data.warnings.length > 0) {
        console.warn("Presentation creation warnings:", data.warnings);
      }
      
      // Save the presentation URL to content
      if (isEditing && contentId) {
        try {
          const updatedData: PresentationData = {
            topic,
            gradeLevel,
            ageRange,
            learningOutcomes: learningOutcomes.filter(o => o.trim()),
            slides,
            generatedDate: generatedDate || new Date().toISOString(),
            colorScheme,
            imageProvider,
            presentationId: data.presentationId,
            presentationUrl: data.url,
          };
          
          await apiRequest("PUT", `/api/content/${contentId}`, {
            title,
            description,
            subject,
            gradeLevel,
            ageRange,
            data: updatedData,
            isPublished,
          });
          queryClient.invalidateQueries({ queryKey: [`/api/content/${contentId}`] });
        } catch (error: any) {
          toast({
            title: "Warning",
            description: "Presentation created but failed to save URL. Please save manually.",
            variant: "destructive",
          });
        }
      }
    },
    onError: (error: any) => {
      const errorMessage = error.message || "An error occurred";

      // Debug logging
      console.error("Create presentation error:", error);
      console.log("Current user:", user);
      console.log("Error message:", errorMessage);

      if (errorMessage.includes("Google") || errorMessage.includes("OAuth") || errorMessage.includes("connect your account")) {
        // Auto-redirect to Google authentication
        toast({
          title: "Google Authentication Required",
          description: "Redirecting to Google sign-in...",
        });

        // Build return URL with current location (excluding googleAuthSuccess param)
        const urlParams = new URLSearchParams(window.location.search);
        urlParams.delete('googleAuthSuccess');
        const cleanSearch = urlParams.toString() ? '?' + urlParams.toString() : '';
        const returnUrl = window.location.pathname + cleanSearch;

        // Redirect to Google OAuth with return URL
        setTimeout(() => {
          window.location.href = `/api/auth/google?returnTo=${encodeURIComponent(returnUrl)}`;
        }, 1500);
      } else {
        toast({
          title: "Failed to create presentation",
          description: errorMessage,
          variant: "destructive",
        });
      }
    },
  });


  const handlePublish = () => {
    if (!title) {
      toast({
        title: "Missing title",
        description: "Please provide a title before publishing",
        variant: "destructive",
      });
      return;
    }
    if (slides.length === 0) {
      toast({
        title: "No slides",
        description: "Please generate slides before publishing",
        variant: "destructive",
      });
      return;
    }
    setIsSaving(true);
    saveMutation.mutate({ publish: true });
  };

  const handleGenerate = () => {
    if (!topic || !gradeLevel || !ageRange) {
      toast({
        title: "Missing information",
        description: "Please fill in topic, grade level, and age range",
        variant: "destructive",
      });
      return;
    }
    const validOutcomes = learningOutcomes.filter(o => o.trim());
    if (validOutcomes.length === 0) {
      toast({
        title: "Missing learning outcomes",
        description: "Please add at least one learning outcome",
        variant: "destructive",
      });
      return;
    }
    generateMutation.mutate();
  };

  const addLearningOutcome = () => {
    setLearningOutcomes([...learningOutcomes, ""]);
  };

  const removeLearningOutcome = (index: number) => {
    setLearningOutcomes(learningOutcomes.filter((_, i) => i !== index));
  };

  const updateLearningOutcome = (index: number, value: string) => {
    const updated = [...learningOutcomes];
    updated[index] = value;
    setLearningOutcomes(updated);
  };

  const handleEditSlide = (slide: SlideContent) => {
    setEditingSlideId(slide.id);
    setEditedSlide({ ...slide });
  };

  const handleSaveSlide = () => {
    if (!editedSlide || !editingSlideId) return;
    
    const updatedSlides = slides.map(slide => 
      slide.id === editingSlideId ? editedSlide : slide
    );
    setSlides(updatedSlides);
    setEditingSlideId(null);
    setEditedSlide(null);
    toast({
      title: "Slide updated",
      description: "Your changes have been saved.",
    });
  };

  const handleCancelEdit = () => {
    setEditingSlideId(null);
    setEditedSlide(null);
  };

  const handleDeleteSlide = (slideId: string) => {
    const updatedSlides = slides.filter(slide => slide.id !== slideId);
    setSlides(updatedSlides);
    toast({
      title: "Slide deleted",
      description: "The slide has been removed.",
    });
  };

  const handleAddSlide = () => {
    const newSlide: SlideContent = {
      id: `slide-${Date.now()}`,
      type: "content",
      title: "New Slide",
      content: "",
      bulletPoints: [],
      questions: [],
      notes: "",
    };
    setSlides([...slides, newSlide]);
    setEditingSlideId(newSlide.id);
    setEditedSlide(newSlide);
  };

  const handleMoveSlide = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === slides.length - 1) return;
    
    const newIndex = direction === "up" ? index - 1 : index + 1;
    const updatedSlides = [...slides];
    [updatedSlides[index], updatedSlides[newIndex]] = [updatedSlides[newIndex], updatedSlides[index]];
    setSlides(updatedSlides);
  };

  if (isLoadingContent) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" data-testid="loader-content" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card/95 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon" data-testid="button-back" className="cursor-pointer">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold">
                {isEditing ? "Edit Presentation" : "Create Presentation"}
              </h1>
              {isSaving && <span className="text-sm text-muted-foreground">Saving...</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!autosave && (
              <Button
                size="sm"
                onClick={handleManualSave}
                disabled={isSaving || !title || slides.length === 0}
                data-testid="button-save"
                className="cursor-pointer"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                {isSaving ? "Saving..." : "Save"}
              </Button>
            )}
            <Button
              size="sm"
              onClick={handlePublish}
              disabled={isSaving || !title || slides.length === 0}
              variant="default"
              data-testid="button-publish"
              className="cursor-pointer"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              <Globe className="h-4 w-4 mr-1" />
              Publish
            </Button>
          </div>
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="bg-background border-b">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <Breadcrumbs items={breadcrumbs} />
        </div>
      </div>

      {/* Sub-toolbar — actions */}
      <div className="bg-muted/30 border-b">
        <div className="max-w-7xl mx-auto px-6 py-2 flex items-center gap-2 flex-wrap">
          {contentId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (!content) return;
                const html = generateHTMLExport(content, content.data);
                downloadHTML(html, title || "presentation");
                toast({
                  title: "Download started",
                  description: "Your presentation is being downloaded as HTML.",
                });
              }}
              disabled={!contentId || !content}
              data-testid="button-download-html"
              className="cursor-pointer"
            >
              <Download className="h-4 w-4 mr-1" />
              Download HTML
            </Button>
          )}
          {contentId && presentationUrl && (
            <ShareToClassroomDialog
              contentTitle={title}
              contentDescription={description}
              materialLink={presentationUrl}
            />
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Introduction to Photosynthesis"
                  data-testid="input-title"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of this presentation"
                  rows={3}
                  data-testid="input-description"
                />
              </div>
              <ContentMetadataFields
                subject={subject}
                gradeLevel={gradeLevel}
                ageRange={ageRange}
                onSubjectChange={setSubject}
                onGradeLevelChange={setGradeLevel}
                onAgeRangeChange={setAgeRange}
                curriculumContext={curriculumContext}
                onCurriculumChange={setCurriculumContext}
              />
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="isPublic" className="text-base">Share as Public Resource</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow other teachers to discover and use this presentation on the Shared Resources page. Content will be automatically published when shared.
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

          <Card>
            <CardHeader>
              <CardTitle>Presentation Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="topic">Topic *</Label>
                <Input
                  id="topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., Photosynthesis"
                  data-testid="input-topic"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="gradeLevel">Grade Level *</Label>
                  <Select value={gradeLevel} onValueChange={setGradeLevel}>
                    <SelectTrigger id="gradeLevel" data-testid="select-grade">
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
                <div>
                  <Label htmlFor="ageRange">Age Range *</Label>
                  <Input
                    id="ageRange"
                    value={ageRange}
                    onChange={(e) => setAgeRange(e.target.value)}
                    placeholder="e.g., 10-11"
                    data-testid="input-age"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="numberOfSlides">Number of Slides</Label>
                <Input
                  id="numberOfSlides"
                  type="number"
                  min="5"
                  max="30"
                  value={numberOfSlides}
                  onChange={(e) => setNumberOfSlides(parseInt(e.target.value) || 10)}
                  data-testid="input-slide-count"
                />
                <p className="text-xs text-muted-foreground mt-1">Between 5 and 30 slides</p>
              </div>
              <div>
                <Label htmlFor="imageProvider">Slide images</Label>
                <Select
                  value={imageProvider}
                  onValueChange={(value) => setImageProvider(value as PresentationImageProvider)}
                >
                  <SelectTrigger id="imageProvider" data-testid="select-image-provider">
                    <SelectValue placeholder="Choose image source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openrouter" data-testid="select-image-provider-openrouter">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        <span>AI images (OpenRouter)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="unsplash" data-testid="select-image-provider-unsplash">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="h-4 w-4" />
                        <span>Stock photos (Unsplash)</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {imageProvider === "openrouter"
                    ? "Uses OPENROUTER_API_KEY (optional OPENROUTER_IMAGE_MODEL) on the server."
                    : "Uses UNSPLASH_ACCESS_KEY. The AI supplies short search terms per slide."}
                </p>
              </div>
              <div>
                <Label htmlFor="colorScheme" className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Color Theme
                </Label>
                <Select value={colorScheme} onValueChange={setColorScheme}>
                  <SelectTrigger id="colorScheme" data-testid="select-color-scheme">
                    <SelectValue placeholder="Select color theme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blue">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#4285F4' }}></div>
                        <span>Professional Blue</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="green">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#209787' }}></div>
                        <span>Fresh Green</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="purple">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#9B59B6' }}></div>
                        <span>Creative Purple</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="orange">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#F39C12' }}></div>
                        <span>Energetic Orange</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="teal">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#1CA9B4' }}></div>
                        <span>Modern Teal</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="red">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#E74C3C' }}></div>
                        <span>Bold Red</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Applied to titles and headings in your Google Slides presentation
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Learning Outcomes *
                <Button
                  onClick={addLearningOutcome}
                  size="sm"
                  variant="outline"
                  data-testid="button-add-outcome"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {learningOutcomes.map((outcome, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={outcome}
                    onChange={(e) => updateLearningOutcome(index, e.target.value)}
                    placeholder={`Learning outcome ${index + 1}`}
                    data-testid={`input-outcome-${index}`}
                  />
                  {learningOutcomes.length > 1 && (
                    <Button
                      onClick={() => removeLearningOutcome(index)}
                      size="icon"
                      variant="ghost"
                      data-testid={`button-remove-outcome-${index}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                onClick={handleGenerate}
                className="w-full"
                disabled={
                  generateMutation.isPending ||
                  !topic ||
                  !gradeLevel ||
                  !ageRange ||
                  learningOutcomes.filter(o => o.trim()).length === 0
                }
                data-testid="button-generate"
                aria-label={`Generate slides button. Status: ${
                  generateMutation.isPending ? 'Loading' :
                  !topic ? 'Topic required' :
                  !gradeLevel ? 'Grade level required' :
                  !ageRange ? 'Age range required' :
                  learningOutcomes.filter(o => o.trim()).length === 0 ? 'Learning outcomes required' :
                  'Ready'
                }`}
              >
                {generateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Generate Slides with AI
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Custom Instructions (Optional)</CardTitle>
              <p className="text-sm text-muted-foreground">
                Provide additional guidance to help the AI understand exactly what you want in your presentation
              </p>
            </CardHeader>
            <CardContent>
              <Textarea
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="Example: Focus on Caribbean examples and cultural context. Include interactive questions after each main concept. Use simple language appropriate for ESL learners."
                rows={4}
                data-testid="textarea-custom-instructions"
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground mt-2">
                💡 Tip: Be specific about teaching approach, examples to include, cultural context, or any special requirements
              </p>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  Generated Slides
                  {slides.length > 0 && ` (${slides.length} slides)`}
                </CardTitle>
                {slides.length > 0 && !isLoadingProviders && (
                  <div className="flex gap-2">
                    {presentationUrl ? (
                      <Button
                        onClick={() => window.open(presentationUrl, '_blank')}
                        size="sm"
                        variant="outline"
                        data-testid="button-open-slides"
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Open in Google Slides
                      </Button>
                    ) : user?.googleAccessToken ? (
                      <Button
                        onClick={() => createPresentationMutation.mutate()}
                        size="sm"
                        disabled={createPresentationMutation.isPending}
                        data-testid="button-create-slides"
                      >
                        {createPresentationMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <ExternalLink className="h-4 w-4 mr-1" />
                        )}
                        Create in Google Slides
                      </Button>
                    ) : authProviders?.google === true ? (
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        data-testid="button-connect-google"
                      >
                        <a href={`/api/auth/google?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`}>
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Connect Google Account
                        </a>
                      </Button>
                    ) : null}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!isLoadingProviders && authProviders?.google === false && (
                <Alert className="mb-4" variant="destructive" data-testid="alert-google-not-configured">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Google integration is not configured. To use this feature, the administrator needs to set up Google OAuth credentials (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET).
                  </AlertDescription>
                </Alert>
              )}
              {!isLoadingProviders && slides.length > 0 && !presentationUrl && !user?.googleAccessToken && authProviders?.google === true && (
                <Alert className="mb-4" data-testid="alert-google-required">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    To create actual presentations in Google Slides, you need to connect your Google account. 
                    This allows the app to create presentations in your Google Drive with real images.
                    Click "Connect Google Account" above to get started.
                  </AlertDescription>
                </Alert>
              )}
              {slides.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>No slides yet. Fill in the details and click "Generate Slides with AI"</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {slides.map((slide, index) => {
                    const isEditing = editingSlideId === slide.id;
                    const displaySlide = isEditing && editedSlide ? editedSlide : slide;
                    
                    return (
                      <Card key={slide.id} className="overflow-hidden">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2 flex-1">
                              <div className="flex flex-col gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => handleMoveSlide(index, "up")}
                                  disabled={index === 0}
                                  data-testid={`button-move-up-${index}`}
                                >
                                  <GripVertical className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => handleMoveSlide(index, "down")}
                                  disabled={index === slides.length - 1}
                                  data-testid={`button-move-down-${index}`}
                                >
                                  <GripVertical className="h-4 w-4 rotate-90" />
                                </Button>
                              </div>
                              <div className="flex-1">
                                <div className="text-xs text-muted-foreground mb-1">
                                  Slide {index + 1} • {displaySlide.type}
                                </div>
                                {isEditing ? (
                                  <Input
                                    value={displaySlide.title || ""}
                                    onChange={(e) => setEditedSlide({ ...displaySlide, title: e.target.value })}
                                    placeholder="Slide title"
                                    className="font-medium text-sm"
                                    data-testid={`input-slide-title-${index}`}
                                  />
                                ) : (
                                  displaySlide.title && (
                                    <h4 className="font-medium text-sm">{displaySlide.title}</h4>
                                  )
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1">
                              {isEditing ? (
                                <>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={handleSaveSlide}
                                    data-testid={`button-save-slide-${index}`}
                                  >
                                    <Save className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={handleCancelEdit}
                                    data-testid={`button-cancel-slide-${index}`}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => handleEditSlide(slide)}
                                    data-testid={`button-edit-slide-${index}`}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => handleDeleteSlide(slide.id)}
                                    data-testid={`button-delete-slide-${index}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-2 text-sm">
                          {isEditing ? (
                            <>
                              <div>
                                <Label className="text-xs">Content</Label>
                                <Textarea
                                  value={displaySlide.content || ""}
                                  onChange={(e) => setEditedSlide({ ...displaySlide, content: e.target.value })}
                                  placeholder="Slide content"
                                  rows={3}
                                  className="text-sm"
                                  data-testid={`textarea-slide-content-${index}`}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Bullet Points (one per line)</Label>
                                <Textarea
                                  value={(displaySlide.bulletPoints || []).join('\n')}
                                  onChange={(e) => setEditedSlide({ 
                                    ...displaySlide, 
                                    bulletPoints: e.target.value.split('\n').filter(p => p.trim()) 
                                  })}
                                  placeholder="Bullet point 1&#10;Bullet point 2"
                                  rows={4}
                                  className="text-sm font-mono"
                                  data-testid={`textarea-slide-bullets-${index}`}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Questions (one per line)</Label>
                                <Textarea
                                  value={(displaySlide.questions || []).join('\n')}
                                  onChange={(e) => setEditedSlide({ 
                                    ...displaySlide, 
                                    questions: e.target.value.split('\n').filter(q => q.trim()) 
                                  })}
                                  placeholder="Question 1&#10;Question 2"
                                  rows={3}
                                  className="text-sm font-mono"
                                  data-testid={`textarea-slide-questions-${index}`}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Speaker Notes</Label>
                                <Textarea
                                  value={displaySlide.notes || ""}
                                  onChange={(e) => setEditedSlide({ ...displaySlide, notes: e.target.value })}
                                  placeholder="Speaker notes and teaching tips"
                                  rows={3}
                                  className="text-sm"
                                  data-testid={`textarea-slide-notes-${index}`}
                                />
                              </div>
                              <div className="bg-muted rounded overflow-hidden">
                                {displaySlide.imageUrl && (displaySlide.imageUrl.startsWith('http') || displaySlide.imageUrl.startsWith('data:')) && (
                                  <img
                                    src={displaySlide.imageUrl}
                                    alt={displaySlide.imageAlt || "Slide image"}
                                    className="w-full h-auto max-h-48 object-contain"
                                  />
                                )}
                                <div className="p-2 space-y-2">
                                  <div>
                                    <Label className="text-xs flex items-center gap-1">
                                      <ImageIcon className="h-3 w-3" />
                                      Image URL or Search Query
                                    </Label>
                                    <Input
                                      value={displaySlide.imageUrl || ""}
                                      onChange={(e) => setEditedSlide({ ...displaySlide, imageUrl: e.target.value })}
                                      placeholder="Paste an image URL (https://...) or enter a search query"
                                      className="text-xs mt-1"
                                      data-testid={`input-slide-image-${index}`}
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs">Image Description (Alt Text)</Label>
                                    <Input
                                      value={displaySlide.imageAlt || ""}
                                      onChange={(e) => setEditedSlide({ ...displaySlide, imageAlt: e.target.value })}
                                      placeholder="Describe the image for accessibility"
                                      className="text-xs mt-1"
                                      data-testid={`input-slide-image-alt-${index}`}
                                    />
                                  </div>
                                </div>
                              </div>
                            </>
                          ) : (
                            <>
                              {displaySlide.content && (
                                <p className="text-muted-foreground">{displaySlide.content}</p>
                              )}
                              {displaySlide.bulletPoints && displaySlide.bulletPoints.length > 0 && (
                                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                                  {displaySlide.bulletPoints.map((point, i) => (
                                    <li key={i}>{point}</li>
                                  ))}
                                </ul>
                              )}
                              {displaySlide.questions && displaySlide.questions.length > 0 && (
                                <div className="space-y-1">
                                  {displaySlide.questions.map((question, i) => (
                                    <p key={i} className="text-muted-foreground">
                                      {i + 1}. {question}
                                    </p>
                                  ))}
                                </div>
                              )}
                              {displaySlide.imageUrl && (
                                <div className="bg-muted rounded overflow-hidden">
                                  {displaySlide.imageUrl.startsWith('http') || displaySlide.imageUrl.startsWith('data:') ? (
                                    <img 
                                      src={displaySlide.imageUrl} 
                                      alt={displaySlide.imageAlt || "Slide image"}
                                      className="w-full h-auto max-h-48 object-contain"
                                    />
                                  ) : (
                                    <div className="p-2 text-xs">
                                      <div className="font-medium mb-1">Image Search Query:</div>
                                      <div className="text-muted-foreground">{displaySlide.imageUrl}</div>
                                    </div>
                                  )}
                                  {displaySlide.imageAlt && (
                                    <div className="p-2 text-xs border-t">
                                      <span className="font-medium">Alt text:</span> {displaySlide.imageAlt}
                                    </div>
                                  )}
                                </div>
                              )}
                              {displaySlide.notes && (
                                <div className="bg-muted rounded p-2 text-xs">
                                  <div className="font-medium mb-1">Speaker Notes:</div>
                                  <div className="text-muted-foreground">{displaySlide.notes}</div>
                                </div>
                              )}
                            </>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                  <Button
                    onClick={handleAddSlide}
                    variant="outline"
                    className="w-full"
                    data-testid="button-add-slide"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Slide
                  </Button>
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
