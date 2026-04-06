import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { H5pContent, ContentType, CurriculumContext } from "@shared/schema";

/** Route path segment for each content type (used for navigation after first save). */
const ROUTE_SEGMENTS: Record<ContentType, string> = {
  quiz: "quiz",
  flashcard: "flashcard",
  "interactive-video": "interactive-video",
  "image-hotspot": "image-hotspot",
  "drag-drop": "drag-drop",
  "fill-blanks": "fill-blanks",
  "memory-game": "memory-game",
  "interactive-book": "interactive-book",
  "video-finder": "video-finder",
  presentation: "presentation",
};

export interface UseContentEditorOptions<TData> {
  /** The content type identifier (e.g. "flashcard", "quiz"). */
  contentType: ContentType;
  /** Build the content-type-specific data payload for saving. */
  buildData: () => TData;
  /** Populate local state from a loaded content record. Called once when content loads. */
  populateFromContent: (content: H5pContent) => void;
  /** Return true when there is enough content-specific data to save (e.g. at least one item).
   *  The hook already checks that title is non-empty — this only needs to check content data. */
  canSave: () => boolean;
  /** Dependencies that trigger autosave when changed. */
  autosaveDeps: unknown[];
  /** Human-readable content name for toast messages (e.g. "Flashcard set"). */
  contentLabel?: string;
}

export function useContentEditor<TData>(options: UseContentEditorOptions<TData>) {
  const {
    contentType,
    buildData,
    populateFromContent,
    canSave,
    autosaveDeps,
    contentLabel = "Content",
  } = options;

  const params = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const contentId = params.id;
  const breadcrumbs = useBreadcrumbs(contentId);
  const isEditing = !!contentId;

  // ─── Shared metadata state ───────────────────────────────
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [ageRange, setAgeRange] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [autosave, setAutosave] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [curriculumContext, setCurriculumContext] = useState<CurriculumContext | null>(null);

  // Track whether populateFromContent has already run for this content
  const populatedRef = useRef<string | null>(null);

  // ─── Load existing content ───────────────────────────────
  const { data: content } = useQuery<H5pContent>({
    queryKey: ["/api/content", contentId],
    enabled: isEditing,
  });

  useEffect(() => {
    if (content && content.type === contentType && populatedRef.current !== content.id) {
      populatedRef.current = content.id;
      setTitle(content.title);
      setDescription(content.description || "");
      setSubject(content.subject || "");
      setGradeLevel(content.gradeLevel || "");
      setAgeRange(content.ageRange || "");
      setIsPublished(content.isPublished);
      setIsPublic(content.isPublic || false);
      populateFromContent(content);
    }
  }, [content]);

  // ─── Save / Publish ──────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async (publish: boolean) => {
      const data = buildData();
      const payload = {
        title,
        description,
        subject,
        gradeLevel,
        ageRange,
        data,
        isPublished: publish,
        isPublic,
      };

      if (isEditing) {
        const response = await apiRequest("PUT", `/api/content/${contentId}`, payload);
        return await response.json();
      } else {
        const response = await apiRequest("POST", "/api/content", {
          ...payload,
          type: contentType,
        });
        return await response.json();
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/content"] });
      queryClient.invalidateQueries({ queryKey: ["/api/content/public"] });
      if (!isEditing) {
        navigate(`/create/${ROUTE_SEGMENTS[contentType]}/${data.id}`);
      }
      toast({ title: "Saved!", description: `${contentLabel} saved successfully.` });
      setIsSaving(false);
    },
  });

  // Internal combined check: title must be set + content-specific condition
  const isReady = () => !!title && canSave();

  // ─── Autosave ────────────────────────────────────────────
  useEffect(() => {
    if (!autosave) return;
    if (!isReady()) return;

    const timer = setTimeout(() => {
      setIsSaving(true);
      saveMutation.mutate(isPublished);
    }, 2000);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, isPublic, autosave, isPublished, ...autosaveDeps]);

  const handleManualSave = useCallback(() => {
    if (!isReady()) {
      toast({
        title: "Cannot save",
        description: "Please fill in the required fields.",
        variant: "destructive",
      });
      return;
    }
    setIsSaving(true);
    saveMutation.mutate(isPublished);
  }, [title, canSave, isPublished, saveMutation, toast]);

  const handlePublish = useCallback(async () => {
    const newPublished = !isPublished;
    setIsPublished(newPublished);
    await saveMutation.mutateAsync(newPublished);
    toast({
      title: newPublished ? "Published!" : "Unpublished",
      description: newPublished
        ? `${contentLabel} is now publicly accessible via share link.`
        : `${contentLabel} is now private.`,
    });
  }, [isPublished, saveMutation, toast, contentLabel]);

  const setIsPublicWithAutoPublish = useCallback(
    (checked: boolean) => {
      setIsPublic(checked);
      if (checked) {
        setIsPublished(true);
      }
    },
    [],
  );

  return {
    // Identifiers
    contentId,
    isEditing,
    content,
    breadcrumbs,

    // Metadata state + setters
    title, setTitle,
    description, setDescription,
    subject, setSubject,
    gradeLevel, setGradeLevel,
    ageRange, setAgeRange,
    isPublished, setIsPublished,
    isPublic, setIsPublicWithAutoPublish,
    autosave, setAutosave,
    isSaving,
    curriculumContext, setCurriculumContext,

    // Actions
    handleManualSave,
    handlePublish,
    saveMutation,
    navigate,
    toast,
  };
}
