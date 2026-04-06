import OpenAI from "openai";
import type { AIGenerationRequest, CurriculumContext, QuizQuestion, FlashcardData, VideoHotspot, ImageHotspot, DragAndDropData, FillInBlanksData, MemoryGameData, InteractiveBookData, PresentationGenerationRequest, SlideContent } from "@shared/schema";
import { callOpenAIJSON } from "./utils/openai-helper";

// This is using OpenAI's API, which points to OpenAI's API servers and requires your own API key.
// Using gpt-4o as the default model (latest and most capable model as of 2024)
let openai: OpenAI | null = null;

export function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set. Please configure it in your environment variables.");
  }
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 30000,
    });
  }
  return openai;
}

const EDUCATOR_SYSTEM = (role: string) =>
  `You are an expert educator creating ${role}. Always respond with valid JSON.`;

function buildCurriculumBlock(ctx?: CurriculumContext): string {
  if (!ctx) return "";
  const lines = [
    "\n\nOECS HARMONISED PRIMARY CURRICULUM ALIGNMENT:",
    `- Subject: ${ctx.subject}`,
    `- Grade: ${ctx.grade}`,
    `- Strand: ${ctx.strand}`,
    `- Essential Learning Outcome (ELO): ${ctx.eloText}`,
  ];
  if (ctx.scoTexts && ctx.scoTexts.length > 0) {
    lines.push("- Specific Curriculum Outcomes (SCOs):");
    ctx.scoTexts.forEach((sco, i) => lines.push(`  ${i + 1}. ${sco}`));
  }
  lines.push(
    "",
    "IMPORTANT: All generated content MUST directly align with the curriculum outcomes listed above.",
    "Ensure questions, activities, and explanations target the specific skills and knowledge described in the ELO and SCOs.",
  );
  return lines.join("\n");
}

export async function generateQuizQuestions(request: AIGenerationRequest): Promise<QuizQuestion[]> {
  const numberOfOptions = request.numberOfOptions || 4;
  const optionPlaceholders = Array.from({ length: numberOfOptions }, (_, i) => `"option${i + 1}"`).join(", ");

  const prompt = `Generate ${request.numberOfItems} quiz questions about "${request.topic}" at ${request.difficulty} difficulty level${request.gradeLevel ? ` for ${request.gradeLevel}` : ""}.

Requirements:
- Mix of multiple-choice (with ${numberOfOptions} options), true/false, and fill-in-the-blank questions
- Each question should have a correct answer and an explanation
- Make questions educational and engaging
${request.additionalContext ? `\nAdditional context: ${request.additionalContext}` : ""}${buildCurriculumBlock(request.curriculumContext)}

Respond in JSON format with an array of questions following this structure:
{
  "questions": [
    {
      "id": "unique-id",
      "type": "multiple-choice" | "true-false" | "fill-blank",
      "question": "question text",
      "options": [${optionPlaceholders}], // only for multiple-choice, exactly ${numberOfOptions} options
      "correctAnswer": 0 | "true" | "false" | "answer text",
      "explanation": "why this is the correct answer"
    }
  ]
}`;

  return callOpenAIJSON<QuizQuestion[]>(
    { systemMessage: EDUCATOR_SYSTEM("quiz questions"), prompt },
    "questions",
  );
}

export async function generateFlashcards(request: AIGenerationRequest): Promise<FlashcardData["cards"]> {
  const prompt = `Generate ${request.numberOfItems} flashcard pairs about "${request.topic}" at ${request.difficulty} difficulty level${request.gradeLevel ? ` for ${request.gradeLevel}` : ""}.

Requirements:
- Front: term, concept, or question
- Back: definition, explanation, or answer
- Include a category for each card
- Make them educational and memorable
${request.additionalContext ? `\nAdditional context: ${request.additionalContext}` : ""}${buildCurriculumBlock(request.curriculumContext)}

Respond in JSON format:
{
  "cards": [
    {
      "id": "unique-id",
      "front": "term or question",
      "back": "definition or answer",
      "category": "category name"
    }
  ]
}`;

  return callOpenAIJSON<FlashcardData["cards"]>(
    { systemMessage: EDUCATOR_SYSTEM("flashcards"), prompt },
    "cards",
  );
}

export async function generateVideoHotspots(
  request: AIGenerationRequest,
  videoMetadata?: {
    videoTitle?: string;
    videoDescription?: string;
    videoDuration?: string;
    videoTags?: string[];
    channelTitle?: string;
  }
): Promise<VideoHotspot[]> {
  // Parse duration to get total seconds
  let totalSeconds = 900; // Default to 15 minutes
  if (videoMetadata?.videoDuration) {
    const match = videoMetadata.videoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (match) {
      const hours = parseInt(match[1] || "0");
      const minutes = parseInt(match[2] || "0");
      const seconds = parseInt(match[3] || "0");
      totalSeconds = hours * 3600 + minutes * 60 + seconds;
    }
  }

  const suggestedTimestamps = calculateTimestamps(request.numberOfItems, totalSeconds);
  const timestampGuidance = suggestedTimestamps.length > 0
    ? `\nSuggested timestamp distribution (in seconds): ${suggestedTimestamps.join(", ")}. Use these as a guide, but adjust based on the actual video content structure.`
    : "";

  const description = videoMetadata?.videoDescription || "";
  const descriptionPreview = description.length > 1000
    ? description.substring(0, 1000) + "... [truncated]"
    : description;

  const tagsInfo = videoMetadata?.videoTags && videoMetadata.videoTags.length > 0
    ? `\n- Tags: ${videoMetadata.videoTags.slice(0, 10).join(", ")}`
    : "";

  const channelInfo = videoMetadata?.channelTitle
    ? `\n- Channel: ${videoMetadata.channelTitle}`
    : "";

  const videoInfo = videoMetadata
    ? `\n\nVIDEO ANALYSIS:
- Title: ${videoMetadata.videoTitle || "Not provided"}${channelInfo}
- Duration: ${Math.floor(totalSeconds / 60)} minutes ${totalSeconds % 60} seconds
- Description: ${descriptionPreview || "Not provided"}${tagsInfo}

ANALYSIS INSTRUCTIONS:
1. Carefully read the video title and description to understand the main topics and learning objectives.
2. Identify key concepts, definitions, examples, or important points mentioned in the description.
3. Use the tags (if available) to understand the video's focus areas.
4. Create hotspots that:
   - Test understanding of main concepts mentioned in the description
   - Provide additional context or information about key topics
   - Guide learners through the video's learning progression
   - Align with the educational topic: "${request.topic}"
5. Place hotspots at logical points where concepts are likely to be introduced or explained.
6. Ensure questions are answerable based on the video content described.`
    : "";

  const prompt = `You are an expert educational content creator. Generate ${request.numberOfItems} high-quality interactive hotspots for an educational video.

CONTEXT:
- Topic: "${request.topic}"
- Difficulty Level: ${request.difficulty}${request.gradeLevel ? `\n- Grade Level: ${request.gradeLevel}` : ""}
- Video Duration: ${Math.floor(totalSeconds / 60)} minutes ${totalSeconds % 60} seconds${timestampGuidance}
${request.additionalContext ? `\n- Additional Requirements: ${request.additionalContext}` : ""}${buildCurriculumBlock(request.curriculumContext)}${videoInfo}

HOTSPOT REQUIREMENTS:
1. **Type Distribution**:
   - ${Math.ceil(request.numberOfItems * 0.4)}-${Math.floor(request.numberOfItems * 0.5)} question hotspots (single question)
   - ${Math.max(1, Math.floor(request.numberOfItems * 0.2))}-${Math.ceil(request.numberOfItems * 0.3)} quiz hotspots (multiple questions - 2-4 questions each)
   - ${Math.floor(request.numberOfItems * 0.15)}-${Math.ceil(request.numberOfItems * 0.2)} information hotspots (provide context)
   - ${Math.max(0, Math.floor(request.numberOfItems * 0.1))} navigation hotspot (if applicable)

2. **Question Hotspots** (single question):
   - Must have 3-4 multiple-choice options
   - Correct answer should be clearly identifiable from the video content
   - Questions should test understanding of key concepts, not trivial details
   - Make questions age-appropriate for ${request.gradeLevel || "the specified grade level"}

3. **Quiz Hotspots** (multiple questions):
   - Each quiz hotspot should contain 2-4 related questions
   - Mix of question types: multiple-choice, true/false, and fill-in-the-blank
   - All questions in a quiz should test understanding of the same concept or related concepts
   - Questions should be progressively challenging or cover different aspects of the topic
   - Each question must have:
     - A clear question text
     - For multiple-choice: 3-4 options with one correct answer
     - For true/false: correct answer ("true" or "false")
     - For fill-blank: correct answer text
     - Optional explanation for the answer
   - Quiz title should describe the topic being tested

4. **Information Hotspots**:
   - Provide relevant context, definitions, or additional information
   - Should enhance understanding of the video content
   - Keep concise but informative

5. **Timestamp Placement**:
   - Place hotspots at natural learning moments (introduction of concepts, examples, summaries)
   - Use the suggested timestamps as a guide, but adjust based on content flow
   - Ensure all timestamps are within 0 to ${totalSeconds} seconds
   - Space hotspots appropriately to avoid clustering

6. **Content Quality**:
   - All content must be directly related to the video's topic and description
   - Questions should be answerable based on what the video likely covers
   - Use clear, age-appropriate language
   - Make content engaging and educational

Respond in JSON format:
{
  "hotspots": [
    {
      "id": "unique-id-1",
      "timestamp": 60,
      "type": "question" | "quiz" | "info" | "navigation",
      "title": "Concise, descriptive title (max 50 chars)",
      "content": "Question text or information description (optional for quiz type)",
      "options": ["option1", "option2", "option3", "option4"],
      "correctAnswer": 0,
      "questions": [
        {
          "id": "question-id-1",
          "type": "multiple-choice" | "true-false" | "fill-blank",
          "question": "Question text",
          "options": ["option1", "option2", "option3", "option4"],
          "correctAnswer": 0,
          "explanation": "Optional explanation for the answer"
        }
      ]
    }
  ]
}

IMPORTANT: Ensure all timestamps are valid (0 to ${totalSeconds} seconds) and hotspots are distributed throughout the video duration.`;

  const hotspots = await callOpenAIJSON<VideoHotspot[]>(
    {
      systemMessage: "You are an expert educator creating interactive video content. Always respond with valid JSON. Ensure all timestamps are within the video duration.",
      prompt,
    },
    "hotspots",
  );

  // Validate and clamp timestamps to video duration
  return hotspots.map((hotspot: VideoHotspot) => ({
    ...hotspot,
    timestamp: Math.min(Math.max(0, hotspot.timestamp), totalSeconds),
  }));
}

function calculateTimestamps(count: number, duration: number): number[] {
  if (count <= 0 || duration <= 0) return [];

  const timestamps: number[] = [];

  if (count === 1) {
    timestamps.push(Math.floor(duration * 0.5));
  } else if (count === 2) {
    timestamps.push(Math.floor(duration * 0.3));
    timestamps.push(Math.floor(duration * 0.7));
  } else if (count === 3) {
    timestamps.push(Math.floor(duration * 0.15));
    timestamps.push(Math.floor(duration * 0.5));
    timestamps.push(Math.floor(duration * 0.85));
  } else {
    const introEnd = Math.floor(duration * 0.15);
    const conclusionStart = Math.floor(duration * 0.85);
    const middleRange = conclusionStart - introEnd;

    timestamps.push(Math.floor(duration * 0.1));
    const middleHotspots = count - 2;
    for (let i = 1; i <= middleHotspots; i++) {
      timestamps.push(Math.floor(introEnd + (middleRange * i / (middleHotspots + 1))));
    }
    timestamps.push(Math.floor(duration * 0.9));
  }

  return timestamps.sort((a, b) => a - b);
}

export async function generateImageHotspots(request: AIGenerationRequest): Promise<ImageHotspot[]> {
  const prompt = `Generate ${request.numberOfItems} image hotspot descriptions for "${request.topic}" at ${request.difficulty} difficulty level${request.gradeLevel ? ` for ${request.gradeLevel}` : ""}.

Requirements:
- Each hotspot represents a point of interest on an image
- Include x,y coordinates (as percentages 0-100) that would make sense for a typical educational diagram
- Provide title and detailed description
- Make them educational and informative
${request.additionalContext ? `\nAdditional context: ${request.additionalContext}` : ""}${buildCurriculumBlock(request.curriculumContext)}

Respond in JSON format:
{
  "hotspots": [
    {
      "id": "unique-id",
      "x": 25,
      "y": 30,
      "title": "hotspot title",
      "description": "detailed description"
    }
  ]
}`;

  return callOpenAIJSON<ImageHotspot[]>(
    { systemMessage: EDUCATOR_SYSTEM("interactive image content"), prompt },
    "hotspots",
  );
}

export async function generateDragDropItems(request: AIGenerationRequest): Promise<{ zones: DragAndDropData["zones"], items: DragAndDropData["items"] }> {
  const prompt = `Generate a drag-and-drop activity about "${request.topic}" at ${request.difficulty} difficulty level${request.gradeLevel ? ` for ${request.gradeLevel}` : ""}.

Requirements:
- Create 3-5 drop zones (categories)
- Create ${request.numberOfItems} draggable items that belong to these zones
- Each item should have a clear association with one zone
- Make it educational and intuitive
${request.additionalContext ? `\nAdditional context: ${request.additionalContext}` : ""}${buildCurriculumBlock(request.curriculumContext)}

Respond in JSON format:
{
  "zones": [
    {
      "id": "unique-id",
      "label": "zone label"
    }
  ],
  "items": [
    {
      "id": "unique-id",
      "content": "item text",
      "correctZone": "zone-id"
    }
  ]
}`;

  return callOpenAIJSON<{ zones: DragAndDropData["zones"]; items: DragAndDropData["items"] }>(
    { systemMessage: EDUCATOR_SYSTEM("interactive drag-and-drop activities"), prompt },
  );
}

export async function generateFillBlanksBlanks(request: AIGenerationRequest): Promise<{ text: string, blanks: FillInBlanksData["blanks"] }> {
  const prompt = `Generate a fill-in-the-blanks exercise about "${request.topic}" at ${request.difficulty} difficulty level${request.gradeLevel ? ` for ${request.gradeLevel}` : ""}.

Requirements:
- Create a passage with ${request.numberOfItems} blanks marked as *blank*
- For each blank, provide correct answers (including acceptable variations)
- Optionally include hints
- Make it educational and clear
${request.additionalContext ? `\nAdditional context: ${request.additionalContext}` : ""}${buildCurriculumBlock(request.curriculumContext)}

Respond in JSON format:
{
  "text": "The capital of France is *blank*. It is known for the *blank* Tower.",
  "blanks": [
    {
      "id": "1",
      "correctAnswers": ["Paris", "paris"],
      "caseSensitive": false,
      "showHint": "Starts with P"
    }
  ]
}`;

  return callOpenAIJSON<{ text: string; blanks: FillInBlanksData["blanks"] }>(
    { systemMessage: EDUCATOR_SYSTEM("fill-in-the-blanks exercises"), prompt },
  );
}

export async function generateMemoryGameCards(request: AIGenerationRequest): Promise<MemoryGameData["cards"]> {
  const prompt = `Generate ${request.numberOfItems} matching card pairs for a memory game about "${request.topic}" at ${request.difficulty} difficulty level${request.gradeLevel ? ` for ${request.gradeLevel}` : ""}.

Requirements:
- Each pair should have two matching items (term-definition, question-answer, etc.)
- Make the matches clear and educational
- Content should be concise to fit on cards
${request.additionalContext ? `\nAdditional context: ${request.additionalContext}` : ""}${buildCurriculumBlock(request.curriculumContext)}

Respond in JSON format:
{
  "cards": [
    {
      "id": "1-a",
      "content": "H2O",
      "matchId": "pair-1",
      "type": "text"
    },
    {
      "id": "1-b",
      "content": "Water",
      "matchId": "pair-1",
      "type": "text"
    }
  ]
}`;

  return callOpenAIJSON<MemoryGameData["cards"]>(
    { systemMessage: EDUCATOR_SYSTEM("memory game cards"), prompt },
    "cards",
  );
}

export async function generateInteractiveBookPages(request: AIGenerationRequest): Promise<InteractiveBookData["pages"]> {
  const prompt = `Generate ${request.numberOfItems} pages for an interactive educational book about "${request.topic}" at ${request.difficulty} difficulty level${request.gradeLevel ? ` for ${request.gradeLevel}` : ""}.

Requirements:
- Each page should have a title and informative content
- Progress logically from page to page
- Make content engaging and educational
- Keep each page focused on one concept
${request.additionalContext ? `\nAdditional context: ${request.additionalContext}` : ""}${buildCurriculumBlock(request.curriculumContext)}

Respond in JSON format:
{
  "pages": [
    {
      "id": "unique-id",
      "title": "page title",
      "content": "page content - can be multiple paragraphs"
    }
  ]
}`;

  return callOpenAIJSON<InteractiveBookData["pages"]>(
    { systemMessage: EDUCATOR_SYSTEM("interactive educational books"), prompt },
    "pages",
  );
}

export async function generateVideoFinderPedagogy(params: {
  subject: string;
  topic: string;
  learningOutcome: string;
  gradeLevel: string;
  ageRange?: string;
  videoCount: number;
}): Promise<{ viewingInstructions: string; guidingQuestions: string[] }> {
  const prompt = `Generate pedagogical guidance for a video viewing activity about "${params.topic}" in ${params.subject}.

Activity Details:
- Subject: ${params.subject}
- Topic: ${params.topic}
- Learning Outcome: ${params.learningOutcome}
- Grade Level: ${params.gradeLevel}
${params.ageRange ? `- Age Range: ${params.ageRange}` : ""}
- Number of Videos: ${params.videoCount}

Generate:
1. Viewing Instructions: A paragraph (3-5 sentences) explaining:
   - The purpose of watching these videos
   - What learners should focus on while watching
   - How to actively engage with the content
   - Any preparation or follow-up activities

2. Guiding Questions: 4-6 thought-provoking questions that:
   - Help learners focus on key concepts
   - Encourage critical thinking
   - Connect to the learning outcome
   - Range from literal comprehension to deeper analysis

Make the guidance age-appropriate, clear, and actionable.

Respond in JSON format:
{
  "viewingInstructions": "clear, concise paragraph of guidance",
  "guidingQuestions": ["question 1", "question 2", "question 3", "question 4"]
}`;

  const result = await callOpenAIJSON<{ viewingInstructions: string; guidingQuestions: string[] }>(
    { systemMessage: EDUCATOR_SYSTEM("video viewing guides"), prompt, maxTokens: 2048 },
  );
  return {
    viewingInstructions: result.viewingInstructions || "",
    guidingQuestions: result.guidingQuestions || [],
  };
}

export async function generatePresentation(request: PresentationGenerationRequest): Promise<SlideContent[]> {
  const learningOutcomesText = request.learningOutcomes.map((o, i) => `${i + 1}. ${o}`).join('\n');

  const customInstructionsSection = request.customInstructions
    ? `\n\nAdditional Teacher Instructions:\n${request.customInstructions}\n\nPlease carefully follow these custom instructions from the teacher when creating the presentation.`
    : '';

  const curriculumSection = buildCurriculumBlock(request.curriculumContext);

  const contentSlideCount = request.numberOfSlides - 6; // title + outcomes + questions + reflection + summary + closing

  const prompt = `Create a pedagogically sound, visually varied presentation about "${request.topic}" for grade ${request.gradeLevel} students (age ${request.ageRange}).

Learning Outcomes:
${learningOutcomesText}${customInstructionsSection}${curriculumSection}

Create exactly ${request.numberOfSlides} slides using a MIX of these slide types for visual variety:

REQUIRED SLIDE SEQUENCE:
1. **title** — Engaging title, brief subtitle. Add emoji to the title (e.g. "🌊 The Water Cycle").
2. **learning-outcomes** — List learning outcomes as numbered bullet points. Use emoji "🎯".
3-${request.numberOfSlides - 4}. **CONTENT SLIDES** (${contentSlideCount} slides) — Mix these types:
   - **content** — Standard slide with title, body text, and/or bullet points. Include emoji in titles.
   - **vocabulary** — Key terms with definitions (use "terms" array). Use for introducing new terminology.
   - **comparison** — Two-column comparison (leftHeading/leftPoints vs rightHeading/rightPoints). Great for compare/contrast.
   - **activity** — Student task or exercise. Use emoji "✏️" or "🤔". Frame as clear instructions.
   - **image** — Image-focused content slide.
${request.numberOfSlides - 3}. **guiding-questions** — 4-6 thought-provoking questions (recall → analysis → application).
${request.numberOfSlides - 2}. **reflection** — 2-3 deeper reflection questions.
${request.numberOfSlides - 1}. **summary** — Key takeaways as bullet points. Summarize main concepts.
${request.numberOfSlides}. **closing** — Thank you / questions slide.

IMPORTANT RULES:
- Use AT LEAST 3 different slide types among the content slides (don't use only "content")
- Include at least 1 "vocabulary" slide if the topic has key terms
- Include at least 1 "activity" slide with a student task
- Add a relevant emoji at the start of EVERY slide title (e.g. "🔬 The Scientific Method", "📖 Key Vocabulary")
- At least 40% of content slides should have an imageUrl (a 2-4 word search query for stock photos)

CARIBBEAN CONTEXT:
This is for teachers in the Organisation of Eastern Caribbean States (OECS). Where appropriate:
- Use examples from Caribbean geography, culture, and daily life
- Reference Caribbean ecosystems (coral reefs, rainforests, volcanic islands)
- Include examples from Caribbean industries (tourism, agriculture, fishing)
- Use relatable scenarios for Caribbean students
- This is a suggestion — only apply when it naturally fits the topic

SPEAKER NOTES FORMAT:
Every slide MUST have detailed speaker notes structured as:
"⏱ Timing: X minutes | 💡 Key point: [main takeaway] | 🗣 Say: [suggested talking point] | ❓ Ask: [discussion prompt] | 🔄 Differentiation: [tip for different learners]"

IMAGE REQUIREMENTS:
- imageUrl should be a short search query (2-4 words): "coral reef ecosystem", "volcanic island", "students laboratory"
- Always include imageAlt with detailed accessibility description
- Images should enhance understanding, not just decorate

Respond in JSON format:
{
  "slides": [
    {
      "id": "slide-1",
      "type": "title",
      "title": "🌊 The Water Cycle",
      "subtitle": "Understanding Earth's most important process",
      "emoji": "🌊",
      "notes": "⏱ Timing: 1 min | 💡 Key point: Set the stage | 🗣 Say: Welcome to today's lesson..."
    },
    {
      "id": "slide-2",
      "type": "learning-outcomes",
      "title": "🎯 Learning Outcomes",
      "emoji": "🎯",
      "bulletPoints": ["Outcome 1", "Outcome 2"],
      "notes": "..."
    },
    {
      "id": "slide-3",
      "type": "vocabulary",
      "title": "📚 Key Vocabulary",
      "emoji": "📚",
      "terms": [
        { "term": "Evaporation", "definition": "The process of water turning from liquid to gas" }
      ],
      "notes": "..."
    },
    {
      "id": "slide-4",
      "type": "content",
      "title": "🔬 How It Works",
      "emoji": "🔬",
      "bulletPoints": ["point 1", "point 2"],
      "imageUrl": "water cycle diagram",
      "imageAlt": "Diagram showing the stages of the water cycle",
      "notes": "..."
    },
    {
      "id": "slide-5",
      "type": "comparison",
      "title": "⚖️ Evaporation vs Condensation",
      "emoji": "⚖️",
      "leftHeading": "Evaporation",
      "leftPoints": ["Liquid to gas", "Happens at surface"],
      "rightHeading": "Condensation",
      "rightPoints": ["Gas to liquid", "Forms clouds"],
      "notes": "..."
    },
    {
      "id": "slide-6",
      "type": "activity",
      "title": "✏️ Class Activity",
      "emoji": "✏️",
      "bulletPoints": ["Step 1: ...", "Step 2: ..."],
      "notes": "..."
    },
    {
      "id": "slide-N-3",
      "type": "guiding-questions",
      "title": "❓ Guiding Questions",
      "questions": ["Question 1?", "Question 2?"],
      "notes": "..."
    },
    {
      "id": "slide-N-2",
      "type": "reflection",
      "title": "💭 Reflection",
      "questions": ["Reflection question 1?"],
      "notes": "..."
    },
    {
      "id": "slide-N-1",
      "type": "summary",
      "title": "📝 Summary",
      "bulletPoints": ["Key takeaway 1", "Key takeaway 2"],
      "notes": "..."
    },
    {
      "id": "slide-N",
      "type": "closing",
      "title": "🙏 Thank You!",
      "subtitle": "Any questions? Let's discuss!",
      "notes": "..."
    }
  ]
}`;

  return callOpenAIJSON<SlideContent[]>(
    {
      systemMessage: "You are an expert Caribbean instructional designer creating visually engaging educational presentations for OECS schools. Always respond with valid JSON. Follow Universal Design for Learning (UDL) principles. Create varied, impactful slides that keep students engaged.",
      prompt,
      maxTokens: 6000,
      timeout: 50000,
    },
    "slides",
  );
}
