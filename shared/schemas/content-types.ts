/**
 * Domain type definitions for all content types.
 */

// Content type definitions
export type ContentType = "quiz" | "flashcard" | "interactive-video" | "image-hotspot" | "drag-drop" | "fill-blanks" | "memory-game" | "interactive-book" | "video-finder" | "presentation";

export type QuizQuestion = {
  id: string;
  type: "multiple-choice" | "true-false" | "fill-blank" | "ordering" | "drag-drop";
  question: string;
  imageUrl?: string;
  imageAlt?: string;
  options?: string[];
  correctAnswer: string | number | string[] | Record<string, string>;
  explanation?: string;
  items?: string[];
  zones?: Array<{ id: string; label: string }>;
  dragItems?: Array<{ id: string; content: string; correctZone: string }>;
  caseSensitive?: boolean;
  acceptableAnswers?: string[];
};

export type QuizData = {
  questions: QuizQuestion[];
  settings: {
    shuffleQuestions: boolean;
    showCorrectAnswers: boolean;
    allowRetry: boolean;
    timeLimit?: number;
  };
};

export type FlashcardData = {
  cards: Array<{
    id: string;
    front: string;
    back: string;
    category?: string;
    frontImageUrl?: string;
    backImageUrl?: string;
    frontImageAlt?: string;
    backImageAlt?: string;
  }>;
  settings: {
    shuffleCards: boolean;
    showProgress: boolean;
    autoFlipDelay?: number;
  };
};

export type VideoHotspot = {
  id: string;
  timestamp: number;
  type: "question" | "quiz" | "info" | "navigation";
  title: string;
  content: string;
  options?: string[];
  correctAnswer?: number;
  questions?: QuizQuestion[];
  /** When true, the answer is saved as a quiz attempt and appears in the gradebook. */
  isGraded?: boolean;
};

export type InteractiveVideoData = {
  videoUrl: string;
  hotspots: VideoHotspot[];
};

export type ImageHotspot = {
  id: string;
  x: number;
  y: number;
  title: string;
  description: string;
};

export type ImageHotspotData = {
  imageUrl: string;
  hotspots: ImageHotspot[];
};

// Drag and Drop types
export type DragItem = {
  id: string;
  content: string;
  correctZone: string;
};

export type DropZone = {
  id: string;
  label: string;
  allowMultiple: boolean;
};

export type DragAndDropData = {
  items: DragItem[];
  zones: DropZone[];
  settings: {
    showZoneLabels: boolean;
    instantFeedback: boolean;
    allowRetry: boolean;
  };
};

// Fill in the Blanks types
export type BlankItem = {
  id: string;
  correctAnswers: string[];
  caseSensitive: boolean;
  showHint?: string;
};

export type FillInBlanksData = {
  text: string;
  blanks: BlankItem[];
  settings: {
    caseSensitive: boolean;
    showHints: boolean;
    allowRetry: boolean;
  };
};

// Memory Game types
export type MemoryCard = {
  id: string;
  content: string;
  matchId: string;
  type: "text" | "image";
  imageUrl?: string;
};

export type MemoryGameData = {
  cards: MemoryCard[];
  settings: {
    rows: number;
    columns: number;
    showTimer: boolean;
    showMoves: boolean;
  };
};

// Interactive Book types
export type BookPageType = "content" | "video" | "quiz" | "image";

export type VideoPageData = {
  videoId: string;
  videoUrl: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  instructions?: string;
};

export type QuizPageData = {
  questions: QuizQuestion[];
  settings: {
    shuffleQuestions: boolean;
    showCorrectAnswers: boolean;
    allowRetry: boolean;
    timeLimit?: number;
  };
};

export type ImagePageData = {
  imageUrl: string;
  imageAlt?: string;
  instructions?: string;
  source?: "upload" | "url" | "puterjs" | "dalle";
};

export type BookPage = {
  id: string;
  title: string;
  pageType?: BookPageType;
  content: string;
  videoData?: VideoPageData;
  quizData?: QuizPageData;
  imageData?: ImagePageData;
  audioUrl?: string;
  embeddedContentId?: string;
  embeddedContent?: {
    type: ContentType;
    data: QuizData | FlashcardData | InteractiveVideoData | ImageHotspotData | DragAndDropData | FillInBlanksData | MemoryGameData;
  };
};

export type InteractiveBookData = {
  pages: BookPage[];
  subject?: string;
  gradeLevel?: string;
  settings: {
    showNavigation: boolean;
    showProgress: boolean;
    requireCompletion: boolean;
  };
};

// Video Finder types
export type VideoResult = {
  id: string;
  videoId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  channelTitle: string;
  publishedAt: string;
  duration?: string;
};

export type VideoFinderData = {
  searchCriteria: {
    subject: string;
    topic: string;
    learningOutcome: string;
    gradeLevel: string;
    ageRange: string;
    videoCount: number;
  };
  searchResults: VideoResult[];
  searchDate: string;
  viewingInstructions?: string;
  guidingQuestions?: string[];
};

// Presentation types
export type SlideContent = {
  id: string;
  type: "title" | "content" | "guiding-questions" | "reflection" | "image"
    | "learning-outcomes" | "vocabulary" | "comparison" | "activity" | "summary" | "closing";
  title?: string;
  subtitle?: string;
  content?: string;
  bulletPoints?: string[];
  imageUrl?: string;
  imageAlt?: string;
  questions?: string[];
  notes?: string;
  emoji?: string;
  teacherName?: string;
  institution?: string;
  date?: string;
  gradeLevel?: string;
  subject?: string;
  leftHeading?: string;
  leftPoints?: string[];
  rightHeading?: string;
  rightPoints?: string[];
  terms?: Array<{ term: string; definition: string }>;
};

export type PresentationData = {
  topic: string;
  gradeLevel: string;
  ageRange: string;
  learningOutcomes: string[];
  customInstructions?: string;
  slides: SlideContent[];
  presentationId?: string;
  presentationUrl?: string;
  generatedDate: string;
  colorScheme?: string;
  imageProvider?: "puterjs" | "unsplash";
};
