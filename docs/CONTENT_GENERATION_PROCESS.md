# Content Generation Process

This document describes how educational content is generated, saved, and managed in the EduContent Creator platform — from the teacher's first click to the final database record.

---

## Overview

Content generation follows a three-phase flow:

```
┌─────────────────────────────────────────────────────────────────┐
│  Phase 1: AI Generation                                        │
│  Teacher provides topic/parameters → OpenAI generates content  │
└──────────────────────────┬──────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  Phase 2: Teacher Editing                                      │
│  AI output loaded into creator UI → teacher reviews/edits      │
└──────────────────────────┬──────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  Phase 3: Save & Publish                                       │
│  Content saved to database → optionally published/assigned     │
└─────────────────────────────────────────────────────────────────┘
```

Teachers can also skip Phase 1 and create content manually from scratch.

---

## Phase 1: AI Generation

### Standard Generation (8 content types)

Used by: Quiz, Flashcard, Image Hotspot, Drag & Drop, Fill in the Blanks, Memory Game, Interactive Book, Interactive Video (hotspots only)

**What the teacher provides:**

| Field | Required | Description |
|-------|----------|-------------|
| Topic | Yes | Subject matter (e.g., "The Water Cycle") |
| Difficulty | Yes | beginner, intermediate, or advanced |
| Number of items | Yes | 1-20 items to generate |
| Grade level | No | Pre-K, K-2, 3-5, 6-8, 9-12, Higher Ed |
| Language | No | Defaults to English |
| Additional context | No | Extra instructions for the AI |
| Question type mode | Quiz only | "all-same" or "mixed" |
| Question type | Quiz only | multiple-choice, true-false, fill-blank, ordering, drag-drop |
| Number of options | Quiz only | 2-6 options for multiple choice |

**API flow:**

```
Client                          Server                         OpenAI
──────                          ──────                         ──────
AIGenerationModal
  │
  ├─ POST /api/ai/generate ──► Validate with Zod schema
  │   {contentType, topic,      │
  │    difficulty, ...}         ├─ Route to generator fn
  │                             │   based on contentType
  │                             │
  │                             ├─ Build system message ──────► GPT-4o
  │                             │   + structured prompt         (JSON mode)
  │                             │                               │
  │                             │                               │
  │                             ◄─ Parse JSON response ◄────────┘
  │                             │   Extract key (e.g.,
  │                             │   "questions", "cards")
  │                             │
  ◄─ Return generated data ◄───┘
  │
  ├─ Call onGenerated(data)
  │   → Merges into editor state
  │
  └─ Close modal, show toast
```

**Middleware applied:**
- `requireTeacher` — only teachers/admins can generate
- `aiGenerationRateLimit` — 5 requests per 60 seconds per user
- `withTimeoutMiddleware(25000)` — 25-second timeout
- `asyncHandler` — catches errors

**OpenAI configuration:**
- Model: `gpt-4o`
- Response format: `{ type: "json_object" }` (structured JSON output)
- Temperature: default (not specified)
- Max tokens: 4096 (default) or 6000 (presentations)
- Timeout: 30 seconds

**How `callOpenAIJSON` works:**

```typescript
// server/utils/openai-helper.ts
async function callOpenAIJSON<T>(
  params: { systemMessage: string; prompt: string },
  extractKey: string,  // e.g., "questions", "cards", "hotspots"
): Promise<T> {
  const client = getOpenAIClient();
  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: params.systemMessage },
      { role: "user", content: params.prompt },
    ],
    response_format: { type: "json_object" },
  });
  const json = JSON.parse(response.choices[0].message.content);
  return json[extractKey];  // Extract the relevant array/object
}
```

### What Each Generator Produces

| Content Type | Generator Function | Extract Key | Output Shape |
|---|---|---|---|
| Quiz | `generateQuizQuestions()` | `"questions"` | `QuizQuestion[]` |
| Flashcard | `generateFlashcards()` | `"cards"` | `{ id, front, back, category }[]` |
| Interactive Video | `generateVideoHotspots()` | `"hotspots"` | `VideoHotspot[]` |
| Image Hotspot | `generateImageHotspots()` | `"hotspots"` | `{ id, x, y, title, description }[]` |
| Drag & Drop | `generateDragDropItems()` | Root object | `{ zones: DropZone[], items: DragItem[] }` |
| Fill in Blanks | `generateFillBlanksBlanks()` | Root object | `{ text, blanks: BlankItem[] }` |
| Memory Game | `generateMemoryGameCards()` | `"cards"` | `MemoryCard[]` (pairs) |
| Interactive Book | `generateInteractiveBookPages()` | `"pages"` | `{ id, title, content }[]` |

---

### Interactive Video Generation (Two-Step)

Interactive video generation is different — it involves searching YouTube first, then generating hotspots for the selected video.

**Step 1: Find a video**

```
InteractiveVideoAIGenerator
  │
  ├─ POST /api/youtube/search-simple ──► YouTube Data API v3
  │   { query, maxResults: 10 }          search.list()
  │                                      videos.list()
  │                                          │
  ◄─ VideoResult[] ◄────────────────────────┘
  │   { videoId, title, description,
  │     thumbnailUrl, duration, ... }
  │
  └─ User selects a video from results
```

**Step 2: Generate hotspots for selected video**

```
  │
  ├─ POST /api/ai/generate-interactive-video ──► Enrich metadata
  │   { videoId, videoTitle, videoDuration,       (fetch tags from
  │     topic, difficulty, numberOfHotspots }      YouTube API if
  │                                                missing)
  │                                                    │
  │                                                    ▼
  │                                              generateVideoHotspots()
  │                                                    │
  │                                              Build prompt with:
  │                                              - Video title/desc/tags
  │                                              - Duration in seconds
  │                                              - Suggested timestamps
  │                                                (10%, 30%, 50%, 70%, 90%)
  │                                              - Type distribution:
  │                                                40-50% question
  │                                                20-30% quiz
  │                                                15-20% info
  │                                                ~10% navigation
  │                                                    │
  │                                                    ▼
  │                                              GPT-4o generates hotspots
  │                                              with timestamps clamped
  │                                              to video duration
  │                                                    │
  ◄─ { videoUrl, hotspots[] } ◄────────────────────────┘
  │
  └─ Sets videoUrl + hotspots in editor state
```

---

### Presentation Generation

Presentations have the most complex generation process — they produce structured slide decks with multiple slide types.

**What the teacher provides:**

| Field | Required | Description |
|-------|----------|-------------|
| Topic | Yes | Lesson subject |
| Grade level | Yes | Target grade |
| Age range | Yes | Student age range |
| Learning outcomes | Yes | 1-10 outcomes as bullet points |
| Number of slides | No | 5-30, defaults to 10 |
| Custom instructions | No | Extra guidance for the AI |

**API flow:**

```
PresentationCreator
  │
  ├─ POST /api/presentation/generate ──► Validate with Zod
  │   { topic, gradeLevel, ageRange,     │
  │     learningOutcomes[], ...}         ├─ generatePresentation()
  │                                      │   GPT-4o, 6000 max tokens
  │                                      │
  │                                      │   REQUIRED SLIDE SEQUENCE:
  │                                      │   1. title
  │                                      │   2. learning-outcomes
  │                                      │   3..N-4: content mix
  │                                      │   N-3. guiding-questions
  │                                      │   N-2. reflection
  │                                      │   N-1. summary
  │                                      │   N. closing
  │                                      │
  ◄─ { slides: SlideContent[] } ◄────────┘
  │
  ├─ For each slide with imageUrl:
  │   ├─ Try Puter.js AI image generation
  │   └─ Fallback: Unsplash search
  │
  └─ Load slides into editor
```

**Slide types generated:**

| Type | Purpose | Key Fields |
|------|---------|------------|
| `title` | Opening slide | title, subtitle, teacherName, institution, date |
| `learning-outcomes` | Lists outcomes | bulletPoints (numbered with target emoji) |
| `content` | General content | title, bulletPoints, imageUrl |
| `vocabulary` | Key terms | terms: [{ term, definition }] |
| `comparison` | Two-column | leftHeading, leftPoints, rightHeading, rightPoints |
| `activity` | Student task | title, content, bulletPoints |
| `image` | Image-focused | imageUrl, imageAlt, content |
| `guiding-questions` | Discussion | questions[] |
| `reflection` | Deeper thinking | questions[] |
| `summary` | Key takeaways | bulletPoints |
| `closing` | Final slide | title, content |

**Speaker notes format:** Every slide includes structured notes:
```
⏱ Timing: 2 min | 💡 Key point: ... | 🗣 Say: "..." | ❓ Ask: "..." | 🔄 Differentiation: ...
```

**Google Slides export (optional):** After generation, the teacher can export to Google Slides via `POST /api/presentations/create-google-slides`, which:
1. Creates a Google Slides presentation via Drive API
2. Adds slides with shapes, text boxes, images, accent bars via batch requests
3. Applies a color theme (blue, green, purple, orange, teal, red)
4. Returns the Google Slides URL

---

### Video Finder Pedagogy Generation

The Video Finder generates pedagogical guidance for a set of YouTube videos.

**Flow:**

```
VideoFinderCreator
  │
  ├─ POST /api/youtube/search ──────────► YouTube Data API v3
  │   { subject, topic, learningOutcome,    Returns VideoResult[]
  │     gradeLevel, ageRange, videoCount }
  │
  ├─ Teacher reviews/selects videos
  │
  ├─ POST /api/video-finder/generate-pedagogy ──► GPT-4o
  │   { subject, topic, learningOutcome,           │
  │     gradeLevel, ageRange, videoCount }         ▼
  │                                           Generates:
  │                                           - viewingInstructions (paragraph)
  │                                           - guidingQuestions (4-6 items)
  │
  ◄─ { viewingInstructions, guidingQuestions }
  │
  └─ Merges into editor state with selected videos
```

---

## Phase 2: Teacher Editing

After AI generation, the content loads into a type-specific creator page. The teacher can:

1. **Edit metadata** — title, description, subject, grade level, age range
2. **Modify generated content** — edit questions, reorder items, add/remove elements
3. **Add images** — via URL, file upload, or AI image generation
4. **Configure settings** — shuffle, feedback, time limits, grading options
5. **Preview** — test the content as a student would see it

All creator pages use the `useContentEditor` hook which provides:
- Shared metadata state (title, description, subject, gradeLevel, ageRange)
- Autosave with 2-second debounce
- Manual save button
- Publish/unpublish toggle
- Public sharing toggle

---

## Phase 3: Save & Publish

### Saving

```
useContentEditor hook
  │
  ├─ buildData() ──► Type-specific data builder
  │                   (e.g., { questions, settings } for quiz)
  │
  ├─ Build payload:
  │   { title, description, subject, gradeLevel, ageRange,
  │     type, data, isPublished, isPublic }
  │
  ├─ If NEW content:
  │   POST /api/content ──► ContentService.create()
  │                              │
  │                              ├─ Validate: title, type, data required
  │                              ├─ storage.createContent(payload)
  │                              ├─ INSERT INTO h5p_content
  │                              └─ Return created record with ID
  │
  ├─ If EDITING existing:
  │   PUT /api/content/{id} ──► ContentService.update()
  │                                  │
  │                                  ├─ Verify ownership
  │                                  ├─ storage.updateContent(id, updates)
  │                                  ├─ UPDATE h5p_content SET ...
  │                                  └─ Return updated record
  │
  ├─ Invalidate React Query cache
  ├─ Navigate to /create/{type}/{id} (if new)
  └─ Show success toast
```

### Autosave

The `useContentEditor` hook implements autosave:

1. Dependencies monitored: title, description, isPublic, isPublished, + content-specific data (via `autosaveDeps`)
2. On any change: 2-second debounce timer starts
3. After 2 seconds of no changes: `saveMutation.mutate(isPublished)` fires
4. "Saving..." badge shown in header
5. On success: badge clears, cache invalidated

### Publishing

Two visibility levels:

| State | isPublished | isPublic | Who Can See |
|-------|-------------|----------|-------------|
| Draft | false | false | Only the creator |
| Published | true | false | Creator + assigned students (via share link) |
| Public | true | true | Everyone on Shared Resources page |

Publishing flow:
1. Teacher clicks "Publish" button
2. Toggles `isPublished` state
3. Saves immediately via `saveMutation.mutateAsync(newPublished)`
4. Toast confirms publish/unpublish

Making public:
1. Teacher toggles "Share as Public Resource" switch
2. `setIsPublic(true)` also sets `setIsPublished(true)` automatically
3. Content appears on Shared Resources page for other teachers

### Assigning

After saving, content can be assigned to:

1. **Classes** — via `POST /api/content/{id}/assignments` with classId, optional dueDate, instructions. All enrolled students see it.
2. **Individual students** — via `POST /api/content/{id}/student-assignments` with studentIds[], optional dueDate, instructions.

Notifications are sent to assigned students via WebSocket (real-time) and the notifications table (persistent).

---

## Database Record

All content types store in the same table:

```sql
INSERT INTO h5p_content (
  id,              -- auto-generated UUID
  title,           -- "The Water Cycle Quiz"
  description,     -- "Test your knowledge..."
  type,            -- "quiz"
  data,            -- JSONB: { questions: [...], settings: {...} }
  user_id,         -- teacher's profile ID
  is_published,    -- false (draft)
  is_public,       -- false
  subject,         -- "Science"
  grade_level,     -- "Grade 5"
  age_range,       -- "10-11"
  created_at,      -- auto timestamp
  updated_at       -- auto timestamp
) VALUES (...);
```

The `data` column shape varies by content type — see [CONTENT_TYPES.md](./CONTENT_TYPES.md) for each type's schema.

---

## Error Handling

| Error | HTTP Status | Cause |
|-------|-------------|-------|
| Invalid request data | 400 | Zod validation fails (missing/malformed fields) |
| Unauthorized | 401 | Not logged in |
| Forbidden | 403 | Student trying to create content |
| API key missing | 500 | `OPENAI_API_KEY` not configured |
| Rate limited | 429 | Too many AI generation requests |
| Timeout | 504 | AI generation took > 25 seconds |
| Generation failed | 500 | OpenAI API error or malformed response |

All errors surface in the UI via toast notifications. The AI generation modal shows a loading spinner during generation and disables the submit button to prevent double-submission.

---

## File Reference

| File | Purpose |
|------|---------|
| `client/src/components/AIGenerationModal.tsx` | Standard AI generation modal (8 content types) |
| `client/src/components/InteractiveVideoAIGenerator.tsx` | Two-step video search + hotspot generation |
| `client/src/pages/PresentationCreator.tsx` | Presentation generation + Google Slides export |
| `client/src/pages/VideoFinderCreator.tsx` | Video search + pedagogy generation |
| `client/src/hooks/useContentEditor.ts` | Shared save/autosave/publish hook |
| `server/routes/ai.ts` | All AI generation endpoints |
| `server/routes/content.ts` | CRUD endpoints for content |
| `server/openai.ts` | OpenAI generation functions per content type |
| `server/utils/openai-helper.ts` | `callOpenAIJSON` utility |
| `server/services/content-service.ts` | Business logic for content CRUD |
| `server/youtube.ts` | YouTube Data API v3 search |
| `server/presentation.ts` | Google Slides API export |
