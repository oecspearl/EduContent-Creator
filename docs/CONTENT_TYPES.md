# Content Types — Implementation Reference

This document describes how each of the 10 educational content types works in the EduContent Creator platform. It covers data schemas, AI generation, storage, progress tracking, and player behavior — everything needed to re-implement these content types in another application.

---

## Architecture Overview

All content types share a unified architecture:

```
Creator Page (teacher UI) → API (Express) → Database (PostgreSQL/Drizzle)
                                                ↓
Player Component (student UI) ← API ← Progress Tracking (learnerProgress, quizAttempts, interactionEvents)
```

**Storage model:** Every content type is stored in a single `h5p_content` table. The `type` column identifies the content type, and the `data` column (JSONB) stores the type-specific payload.

```sql
h5p_content (
  id          VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT,
  type        TEXT NOT NULL,    -- "quiz" | "flashcard" | "interactive-video" | etc.
  data        JSONB NOT NULL,   -- Type-specific data (see schemas below)
  user_id     VARCHAR NOT NULL REFERENCES profiles(id),
  is_published BOOLEAN DEFAULT false,
  is_public   BOOLEAN DEFAULT false,
  subject     TEXT,
  grade_level TEXT,
  age_range   TEXT,
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
)
```

**Progress tracking** uses three tables shared by all content types:

```sql
-- Completion percentage per user per content (upsert on conflict)
learner_progress (
  id                     VARCHAR PRIMARY KEY,
  user_id                VARCHAR NOT NULL REFERENCES profiles(id),
  content_id             VARCHAR NOT NULL REFERENCES h5p_content(id),
  completion_percentage  REAL DEFAULT 0,
  completed_at           TIMESTAMP,
  last_accessed_at       TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, content_id)
)

-- Graded quiz/assessment results
quiz_attempts (
  id               VARCHAR PRIMARY KEY,
  user_id          VARCHAR NOT NULL REFERENCES profiles(id),
  content_id       VARCHAR NOT NULL REFERENCES h5p_content(id),
  score            INTEGER NOT NULL,
  total_questions  INTEGER NOT NULL,
  answers          JSONB NOT NULL,   -- [{ questionId, answer, isCorrect }]
  completed_at     TIMESTAMP DEFAULT NOW()
)

-- Granular interaction events (analytics)
interaction_events (
  id          VARCHAR PRIMARY KEY,
  user_id     VARCHAR NOT NULL REFERENCES profiles(id),
  content_id  VARCHAR NOT NULL REFERENCES h5p_content(id),
  event_type  TEXT NOT NULL,
  event_data  JSONB,
  created_at  TIMESTAMP DEFAULT NOW()
)
```

**AI generation** uses OpenAI's API (gpt-4o) with structured JSON prompts. Each content type has a dedicated generation function that returns the type-specific data structure.

---

## Shared Types

These types are reused across multiple content types:

```typescript
type ContentType = "quiz" | "flashcard" | "interactive-video" | "image-hotspot"
  | "drag-drop" | "fill-blanks" | "memory-game" | "interactive-book"
  | "video-finder" | "presentation";

type QuizQuestion = {
  id: string;
  type: "multiple-choice" | "true-false" | "fill-blank" | "ordering" | "drag-drop";
  question: string;
  imageUrl?: string;
  imageAlt?: string;
  options?: string[];
  correctAnswer: string | number | string[] | Record<string, string>;
  explanation?: string;
  items?: string[];                                          // for ordering
  zones?: Array<{ id: string; label: string }>;              // for drag-drop
  dragItems?: Array<{ id: string; content: string; correctZone: string }>; // for drag-drop
  caseSensitive?: boolean;                                   // for fill-blank
  acceptableAnswers?: string[];                              // for fill-blank
};
```

---

## 1. Quiz

**Type identifier:** `"quiz"`

### Data Schema

```typescript
type QuizData = {
  questions: QuizQuestion[];
  settings: {
    shuffleQuestions: boolean;
    showCorrectAnswers: boolean;
    allowRetry: boolean;
    timeLimit?: number;  // minutes
  };
};
```

### AI Generation

**Input:** topic, difficulty, numberOfItems, gradeLevel, numberOfOptions (2-6), additionalContext

**Prompt behavior:**
- Generates a mix of multiple-choice, true/false, and fill-in-the-blank questions
- Each question includes an explanation for the correct answer
- Multiple-choice questions have a configurable number of options (default 4)

**Output:** `{ questions: QuizQuestion[] }`

### Player Behavior

1. Presents questions one at a time (or all at once depending on UI)
2. Student selects answer for each question type:
   - **Multiple choice**: Radio button selection from options
   - **True/false**: Two-button toggle
   - **Fill-in-blank**: Text input with optional case-insensitive matching and multiple acceptable answers
   - **Ordering**: Drag items into correct sequence
   - **Drag-drop**: Drag items to labeled drop zones
3. On submit: compares answer to `correctAnswer`, shows explanation if enabled
4. Progress = `(currentQuestionIndex + 1) / totalQuestions * 100`
5. On completion: saves a `quiz_attempt` with `{ score, totalQuestions, answers[] }`
6. If `allowRetry`: student can restart with optional shuffle

### Gradebook Integration

Each quiz completion creates a `quiz_attempts` record. The gradebook picks the attempt with the highest `score / totalQuestions` percentage.

---

## 2. Flashcard

**Type identifier:** `"flashcard"`

### Data Schema

```typescript
type FlashcardData = {
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
    autoFlipDelay?: number;  // seconds, undefined = no auto-flip
  };
};
```

### AI Generation

**Input:** topic, difficulty, numberOfItems, gradeLevel

**Output:** `{ cards: [{ id, front, back, category }] }`

Each card has a front (term/question) and back (definition/answer) with an optional category for grouping.

### Player Behavior

1. Shows one card at a time, front side visible
2. Click/tap to flip and reveal back side
3. Optional auto-flip after delay
4. Navigate with previous/next buttons
5. Optional shuffle mode
6. Progress = `(viewedCards.size / totalCards) * 100`
7. No grading — flashcards are for self-study

### Progress Tracking

- Tracks which cards have been viewed (not flipped)
- Logs `card_flipped` interaction events
- Completion at 100% when all cards viewed

---

## 3. Interactive Video

**Type identifier:** `"interactive-video"`

### Data Schema

```typescript
type InteractiveVideoData = {
  videoUrl: string;      // YouTube URL
  hotspots: VideoHotspot[];
};

type VideoHotspot = {
  id: string;
  timestamp: number;     // seconds into video
  type: "question" | "quiz" | "info" | "navigation";
  title: string;
  content: string;
  options?: string[];         // for "question" type
  correctAnswer?: number;     // index into options, for "question" type
  questions?: QuizQuestion[]; // for "quiz" type (multiple questions)
  isGraded?: boolean;         // when true, answer is saved to gradebook
};
```

### Hotspot Types

| Type | Behavior | Grading |
|------|----------|---------|
| `question` | Single multiple-choice question. Pauses video, shows options, student picks answer. Shows correct/incorrect feedback. | Optional (`isGraded`) |
| `quiz` | Multi-question quiz (multiple-choice, true/false, fill-blank). Step-through with prev/next. | Optional (`isGraded`) |
| `info` | Information popup. Pauses video, shows text. Student clicks Continue. | No |
| `navigation` | Same as info. Originally intended for branching (not implemented). | No |

### AI Generation

**Input:** topic, difficulty, numberOfHotspots, videoId, videoTitle, videoDescription, videoDuration (ISO 8601), videoTags, channelTitle

**Prompt behavior:**
- Parses video duration to calculate timestamp distribution
- Distributes hotspots at ~10%, 30%, 50%, 70%, 90% of video length
- Creates mix: question (40-50%), quiz (20-30%), info (15-20%), navigation (0-10%)
- Uses video metadata to make questions relevant to actual video content

**Output:** `{ hotspots: VideoHotspot[] }`

### Player Behavior

1. Embeds YouTube player via YouTube IFrame API
2. Polls playback time every 250ms to detect hotspot timestamps
3. When current time passes a hotspot's timestamp:
   - Pauses video
   - Shows overlay with hotspot content
   - Student interacts (answers question, reads info)
   - On continue: resumes video, seeks past hotspot to avoid re-trigger
4. Tracks `completedHotspots` Set — each hotspot triggers only once per viewing
5. Progress = `(completedHotspots.size / totalHotspots) * 100`

### Grading

When `isGraded: true`:
- Answers accumulate in a Map (keyed by questionId, preventing duplicates on rewatch)
- When ALL graded hotspots are completed, one aggregated `quiz_attempt` is saved:
  - `score` = total correct across all graded hotspots
  - `totalQuestions` = total graded questions (single questions + quiz sub-questions)
- When video reaches ENDED state, a performance summary overlay shows results
- State resets on video end, allowing a new attempt on rewatch

### YouTube Integration

Requires:
- YouTube IFrame API loaded dynamically
- `extractVideoId(url)` utility to parse YouTube URLs
- Player events: `onReady`, `onStateChange` (PLAYING, PAUSED, ENDED)
- Methods: `playVideo()`, `pauseVideo()`, `seekTo()`, `getDuration()`, `getCurrentTime()`

---

## 4. Image Hotspot

**Type identifier:** `"image-hotspot"`

### Data Schema

```typescript
type ImageHotspotData = {
  imageUrl: string;
  hotspots: ImageHotspot[];
};

type ImageHotspot = {
  id: string;
  x: number;          // percentage 0-100 from left
  y: number;          // percentage 0-100 from top
  title: string;
  description: string;
};
```

### AI Generation

**Input:** topic, difficulty, numberOfItems

**Output:** `{ hotspots: [{ id, x, y, title, description }] }`

Coordinates are percentages (0-100) placed on typical educational diagram positions.

### Player Behavior

1. Displays image with positioned hotspot markers (circles at x%, y%)
2. Click marker to reveal title and description in popup/modal
3. Track which hotspots have been viewed
4. Progress = `(viewedHotspots.size / totalHotspots) * 100`
5. No grading — informational only

---

## 5. Drag and Drop

**Type identifier:** `"drag-drop"`

### Data Schema

```typescript
type DragAndDropData = {
  items: DragItem[];
  zones: DropZone[];
  settings: {
    showZoneLabels: boolean;
    instantFeedback: boolean;
    allowRetry: boolean;
  };
};

type DragItem = {
  id: string;
  content: string;
  correctZone: string;  // ID of the correct DropZone
};

type DropZone = {
  id: string;
  label: string;
  allowMultiple: boolean;
};
```

### AI Generation

**Input:** topic, difficulty, numberOfItems

**Output:** `{ zones: DropZone[], items: DragItem[] }`

Creates 3-5 category zones with items that belong to each.

### Player Behavior

1. Shows draggable items and labeled drop zones
2. Student drags items to zones
3. If `instantFeedback`: shows correct/incorrect on each drop
4. "Check" button evaluates all placements
5. Progress = `(correctPlacements / totalItems) * 100`
6. Logs `item_placed` interaction events
7. If `allowRetry`: clears all placements for another attempt

---

## 6. Fill in the Blanks

**Type identifier:** `"fill-blanks"`

### Data Schema

```typescript
type FillInBlanksData = {
  text: string;           // Contains *blank* markers
  blanks: BlankItem[];
  settings: {
    caseSensitive: boolean;
    showHints: boolean;
    allowRetry: boolean;
  };
};

type BlankItem = {
  id: string;
  correctAnswers: string[];  // Multiple acceptable answers
  caseSensitive: boolean;
  showHint?: string;
};
```

### AI Generation

**Input:** topic, difficulty, numberOfItems

**Output:** `{ text: "passage with *blank* markers", blanks: BlankItem[] }`

### Player Behavior

1. Renders text passage with text input fields replacing each `*blank*` marker
2. Student types answers in each blank
3. Optional hints shown via help icon
4. "Check" button evaluates: compares input against `correctAnswers` array
5. Case sensitivity controlled by settings
6. Progress = `(correctCount / totalBlanks) * 100`
7. Saves quiz attempt with score

---

## 7. Memory Game

**Type identifier:** `"memory-game"`

### Data Schema

```typescript
type MemoryGameData = {
  cards: MemoryCard[];
  settings: {
    rows: number;
    columns: number;
    showTimer: boolean;
    showMoves: boolean;
  };
};

type MemoryCard = {
  id: string;
  content: string;
  matchId: string;    // Two cards with same matchId are a pair
  type: "text" | "image";
  imageUrl?: string;
};
```

Cards come in pairs — two cards share the same `matchId`. The game shuffles all cards face-down.

### AI Generation

**Input:** topic, difficulty, numberOfItems (number of pairs)

**Output:** `{ cards: MemoryCard[] }` — generates pairs (2 cards per pair)

### Player Behavior

1. Cards laid out in grid (rows x columns), face down
2. Click to flip a card (reveal content)
3. Click second card — if `matchId` matches first card, both stay face up
4. If no match, both flip back after brief delay
5. Track moves (flips / 2) and elapsed time
6. Progress = `(matchedPairs.size / totalPairs) * 100`
7. Victory screen shows moves and time on completion

---

## 8. Interactive Book

**Type identifier:** `"interactive-book"`

### Data Schema

```typescript
type InteractiveBookData = {
  pages: BookPage[];
  settings: {
    showNavigation: boolean;
    showProgress: boolean;
    requireCompletion: boolean;
  };
};

type BookPage = {
  id: string;
  title: string;
  pageType?: "content" | "video" | "quiz" | "image";
  content: string;              // Rich HTML content
  videoData?: VideoPageData;    // For video pages
  quizData?: QuizPageData;      // For quiz pages
  imageData?: ImagePageData;    // For image pages
  audioUrl?: string;            // Optional narration audio
  embeddedContentId?: string;   // ID of another h5p_content to embed
  embeddedContent?: {           // Resolved embedded content
    type: ContentType;
    data: any;                  // The embedded content's data
  };
};

type VideoPageData = {
  videoId: string;
  videoUrl: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  instructions?: string;
};

type QuizPageData = {
  questions: QuizQuestion[];
  settings: { shuffleQuestions: boolean; showCorrectAnswers: boolean; allowRetry: boolean };
};

type ImagePageData = {
  imageUrl: string;
  imageAlt?: string;
  instructions?: string;
};
```

### AI Generation

**Input:** topic, difficulty, numberOfItems (pages)

**Output:** `{ pages: [{ id, title, content }] }` — generates text content pages

Teachers can then add video, quiz, and image pages manually, and embed other content types within pages.

### Player Behavior

1. Multi-page reader with previous/next navigation
2. Each page rendered based on `pageType`:
   - **content**: Rich HTML text (sanitized with DOMPurify)
   - **video**: YouTube embedded player
   - **quiz**: Inline quiz player (nested QuizPlayer component)
   - **image**: Full-width image with alt text and instructions
3. Can embed any other content type within a page via `embeddedContentId`
4. Optional audio narration per page
5. Progress = `(viewedPages.size / totalPages) * 100`
6. Page jump via dropdown or sidebar

---

## 9. Video Finder

**Type identifier:** `"video-finder"`

### Data Schema

```typescript
type VideoFinderData = {
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
  viewingInstructions?: string;   // AI-generated pedagogical guidance
  guidingQuestions?: string[];     // AI-generated discussion questions
};

type VideoResult = {
  id: string;
  videoId: string;       // YouTube video ID
  title: string;
  description: string;
  thumbnailUrl: string;
  channelTitle: string;
  publishedAt: string;
  duration?: string;     // ISO 8601 (e.g., "PT5M30S")
};
```

### AI Generation

The teacher provides search criteria. Two API calls happen:

1. **YouTube Search API** — finds videos matching subject + topic + learning outcome
2. **AI Pedagogy Generation** — generates viewing instructions and guiding questions based on the search criteria

**Output:** `{ viewingInstructions: string, guidingQuestions: string[] }`

### Player Behavior

1. Displays search context (subject, topic, learning outcome)
2. Shows viewing instructions and guiding questions
3. Lists video cards with thumbnail, title, description, duration, channel, date
4. Click video to open/watch (external YouTube link or embedded player)
5. Progress = `(viewedVideos.size / totalVideos) * 100`
6. No grading

---

## 10. Presentation

**Type identifier:** `"presentation"`

### Data Schema

```typescript
type PresentationData = {
  topic: string;
  gradeLevel: string;
  ageRange: string;
  learningOutcomes: string[];
  customInstructions?: string;
  slides: SlideContent[];
  presentationId?: string;    // Google Slides presentation ID (if exported)
  presentationUrl?: string;   // Google Slides URL (if exported)
  generatedDate: string;
  colorScheme?: string;       // "blue" | "green" | "purple" | "orange" | "teal" | "red"
  imageProvider?: "openrouter" | "unsplash";  // teacher picks after outline: AI vs stock photos
};

// Slide images: OpenRouter (POST /api/ai/generate-image) or Unsplash (POST /api/unsplash/search) per imageProvider.

type SlideContent = {
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
  notes?: string;            // Speaker notes (structured with emoji markers)
  emoji?: string;
  // Title slide specific:
  teacherName?: string;
  institution?: string;
  date?: string;
  gradeLevel?: string;
  subject?: string;
  // Comparison slide specific:
  leftHeading?: string;
  leftPoints?: string[];
  rightHeading?: string;
  rightPoints?: string[];
  // Vocabulary slide specific:
  terms?: Array<{ term: string; definition: string }>;
};
```

### Slide Types

| Type | Description |
|------|-------------|
| `title` | Opening slide with topic, subtitle, teacher name, institution, date |
| `learning-outcomes` | Lists the learning outcomes for the lesson |
| `content` | General content with bullet points and optional image |
| `vocabulary` | Term-definition pairs |
| `comparison` | Two-column layout with left/right headings and points |
| `activity` | Interactive activity instructions |
| `image` | Full-width image with caption |
| `guiding-questions` | Discussion questions for students |
| `reflection` | Reflection prompts |
| `summary` | Key takeaways |
| `closing` | Final slide with next steps |

### AI Generation

**Input:** topic, gradeLevel, ageRange, learningOutcomes[], numberOfSlides, customInstructions

**Prompt behavior:**
- Creates pedagogically structured presentation
- Required sequence: title → learning outcomes → content slides → guiding questions → reflection → summary → closing
- Content slides are a mix of types (content, vocabulary, comparison, activity, image)
- Every slide has an emoji in the title
- At least 40% of content slides include an image search query
- Speaker notes for every slide with structured format: timing, key point, what to say, question to ask, differentiation tip

**Output:** `{ slides: SlideContent[] }`

### Google Slides Export

The presentation can be exported to Google Slides via the Google Slides API. The server-side `presentation.ts` module:
1. Creates a new Google Slides presentation via Drive API
2. Adds slides with shapes, text boxes, images, and styling via batch requests
3. Uses a color theme system (6 themes with bg, accent, text colors)
4. Returns the Google Slides presentation URL

### Player Behavior

1. Slide-by-slide presentation viewer
2. Navigate with previous/next buttons
3. Grid view (slide sorter) for jumping to any slide
4. Color scheme applied based on `colorScheme` setting
5. Speaker notes visible to teachers (hidden from students)
6. Progress = `(viewedSlides.size / totalSlides) * 100`
7. No grading

---

## Common AI Generation Schema

All content types that support AI generation use this shared request schema:

```typescript
{
  contentType: ContentType,         // which type to generate
  topic: string,                    // subject matter
  difficulty: "beginner" | "intermediate" | "advanced",
  gradeLevel?: string,              // e.g., "Grade 5"
  numberOfItems: number,            // items to generate (1-20)
  language?: string,                // default "English"
  additionalContext?: string,       // extra instructions
  // Quiz-specific:
  questionTypeMode?: "all-same" | "mixed",
  questionType?: "multiple-choice" | "true-false" | "fill-blank" | "ordering" | "drag-drop",
  numberOfOptions?: number,         // 2-6 for multiple choice
}
```

The AI generation endpoint is `POST /api/ai/generate` with rate limiting (5 requests per 60 seconds per user) and a 25-second timeout.

---

## Progress Tracking Hook

The client-side `useProgressTracker(contentId)` hook provides a unified interface:

```typescript
const {
  progress,           // Current saved progress (or null)
  isProgressFetched,  // Has initial progress been loaded
  updateProgress,     // (completionPercentage: number) => void
  saveQuizAttempt,    // (score, totalQuestions, answers[], skipProgressUpdate?) => void
  logInteraction,     // (eventType: string, eventData?: object) => void
  isAuthenticated,    // Is user logged in
} = useProgressTracker(contentId);
```

**API endpoints used:**
- `POST /api/progress` — upsert learner progress
- `POST /api/quiz-attempts` — save graded attempt
- `POST /api/interaction-events` — log interaction
- `GET /api/progress/:contentId` — fetch current progress

**Behavior:**
- Only tracks for authenticated users
- `saveQuizAttempt` automatically sets progress to 100% unless `skipProgressUpdate: true`
- Progress is monotonic — only updates if new value exceeds stored value (implemented per-player, not in the hook)
