import OpenAI from "openai";
import type { AIGenerationRequest, QuizQuestion, FlashcardData, VideoHotspot, ImageHotspot, DragAndDropData, FillInBlanksData, MemoryGameData, InteractiveBookData, H5pContent, PresentationGenerationRequest, SlideContent } from "@shared/schema";

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
      timeout: 30000, // 30 second timeout for all requests
    });
  }
  return openai;
}

export async function generateQuizQuestions(request: AIGenerationRequest): Promise<QuizQuestion[]> {
  // Determine question type distribution
  let typeDistribution: string;
  if (request.questionTypeMode === "all-same" && request.questionType) {
    // All questions of the same type
    const typeLabel = {
      "multiple-choice": "Multiple-choice",
      "true-false": "True/False",
      "fill-blank": "Fill-in-the-blank",
      "ordering": "Ordering",
      "drag-drop": "Drag and Drop"
    }[request.questionType] || "Multiple-choice";
    typeDistribution = `All ${request.numberOfItems} questions should be ${typeLabel} type.`;
  } else if (request.questionTypeMode === "mixed" && request.questionTypes && request.questionTypes.length > 0) {
    // Specific types for each question
    const typeCounts: Record<string, number> = {};
    request.questionTypes.forEach(type => {
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });
    const typeList = Object.entries(typeCounts)
      .map(([type, count]) => {
        const typeLabel = {
          "multiple-choice": "Multiple-choice",
          "true-false": "True/False",
          "fill-blank": "Fill-in-the-blank",
          "ordering": "Ordering",
          "drag-drop": "Drag and Drop"
        }[type] || type;
        return `${count} ${typeLabel} question${count > 1 ? 's' : ''}`;
      })
      .join(", ");
    typeDistribution = `Generate exactly: ${typeList}.`;
    
    // Add per-question type specification
    const perQuestionTypes = request.questionTypes.map((type, idx) => {
      const typeLabel = {
        "multiple-choice": "Multiple-choice",
        "true-false": "True/False",
        "fill-blank": "Fill-in-the-blank",
        "ordering": "Ordering",
        "drag-drop": "Drag and Drop"
      }[type] || type;
      return `Question ${idx + 1}: ${typeLabel}`;
    }).join("\n");
    typeDistribution += `\n\nSpecific question types:\n${perQuestionTypes}`;
  } else {
    // Default: mix of types
    typeDistribution = `Mix of question types:
  * Multiple-choice (with 4 options) - ${Math.ceil(request.numberOfItems * 0.4)} questions
  * Fill-in-the-blank - ${Math.ceil(request.numberOfItems * 0.2)} questions
  * Ordering (arrange items in sequence) - ${Math.ceil(request.numberOfItems * 0.2)} questions
  * Drag and Drop (match items to categories) - ${Math.ceil(request.numberOfItems * 0.2)} questions`;
  }

  const prompt = `Generate ${request.numberOfItems} quiz questions about "${request.topic}" at ${request.difficulty} difficulty level${request.gradeLevel ? ` for ${request.gradeLevel}` : ""}.

Requirements:
- ${typeDistribution}
- Each question should have a correct answer and an explanation
- Make questions educational and engaging
${request.additionalContext ? `\nAdditional context: ${request.additionalContext}` : ""}

${request.questionTypeMode === "mixed" && request.questionTypes ? `
IMPORTANT: The questions must be generated in the exact order and types specified above. Question 1 must be ${request.questionTypes[0]}, Question 2 must be ${request.questionTypes[1] || request.questionTypes[0]}, etc.
` : ""}

Respond in JSON format with an array of questions following this structure:
{
  "questions": [
    {
      "id": "unique-id",
      "type": "multiple-choice" | "true-false" | "fill-blank" | "ordering" | "drag-drop",
      "question": "question text",
      // For multiple-choice:
      "options": ["option1", "option2", "option3", "option4"],
      "correctAnswer": 0, // index of correct option
      // For fill-blank:
      "correctAnswer": "answer text",
      "acceptableAnswers": ["answer1", "answer2"], // optional alternative answers
      "caseSensitive": false,
      // For ordering:
      "items": ["item1", "item2", "item3"], // items to be ordered
      "correctAnswer": ["item1", "item2", "item3"], // correct order (same as items)
      // For drag-drop:
      "zones": [{"id": "zone1", "label": "Category 1"}, {"id": "zone2", "label": "Category 2"}],
      "dragItems": [{"id": "item1", "content": "Item text", "correctZone": "zone1"}, {"id": "item2", "content": "Item text", "correctZone": "zone2"}],
      "correctAnswer": {"item1": "zone1", "item2": "zone2"}, // mapping of itemId to zoneId
      "explanation": "why this is the correct answer"
    }
  ]
}`;

  const response = await getOpenAIClient().chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: "You are an expert educator creating quiz questions. Always respond with valid JSON." },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 4096,
    temperature: 0.7,
  }, {
    timeout: 30000, // 30 second timeout
  });

  try {
    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result.questions || [];
  } catch (parseError) {
    console.error("Failed to parse OpenAI response for quiz questions:", parseError);
    throw new Error("Received invalid response from AI. Please try again.");
  }
}

export async function generateFlashcards(request: AIGenerationRequest): Promise<FlashcardData["cards"]> {
  const prompt = `Generate ${request.numberOfItems} flashcard pairs about "${request.topic}" at ${request.difficulty} difficulty level${request.gradeLevel ? ` for ${request.gradeLevel}` : ""}.

Requirements:
- Front: term, concept, or question
- Back: definition, explanation, or answer
- Include a category for each card
- Make them educational and memorable
${request.additionalContext ? `\nAdditional context: ${request.additionalContext}` : ""}

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

  const response = await getOpenAIClient().chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: "You are an expert educator creating flashcards. Always respond with valid JSON." },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 4096,
    temperature: 0.7,
  }, {
    timeout: 30000, // 30 second timeout
  });

  try {
    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result.cards || [];
  } catch (parseError) {
    console.error("Failed to parse OpenAI response for flashcards:", parseError);
    throw new Error("Received invalid response from AI. Please try again.");
  }
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

  // Calculate intelligent timestamp distribution
  const calculateTimestamps = (count: number, duration: number): number[] => {
    if (count <= 0 || duration <= 0) return [];
    
    const timestamps: number[] = [];
    const segments = count;
    
    // Use a distribution that focuses on key learning moments:
    // - Introduction (first 10-15%)
    // - Main content sections (distributed throughout middle 60-70%)
    // - Summary/Conclusion (last 10-15%)
    
    if (count === 1) {
      timestamps.push(Math.floor(duration * 0.5)); // Middle of video
    } else if (count === 2) {
      timestamps.push(Math.floor(duration * 0.3)); // Early
      timestamps.push(Math.floor(duration * 0.7)); // Late
    } else if (count === 3) {
      timestamps.push(Math.floor(duration * 0.15)); // Introduction
      timestamps.push(Math.floor(duration * 0.5)); // Middle
      timestamps.push(Math.floor(duration * 0.85)); // Conclusion
    } else {
      // For 4+ hotspots, distribute intelligently
      const introEnd = Math.floor(duration * 0.15);
      const conclusionStart = Math.floor(duration * 0.85);
      const middleStart = introEnd;
      const middleEnd = conclusionStart;
      const middleRange = middleEnd - middleStart;
      
      // First hotspot in introduction
      timestamps.push(Math.floor(duration * 0.1));
      
      // Distribute remaining hotspots in middle section
      const middleHotspots = count - 2; // -2 for intro and conclusion
      for (let i = 1; i <= middleHotspots; i++) {
        const position = middleStart + (middleRange * i / (middleHotspots + 1));
        timestamps.push(Math.floor(position));
      }
      
      // Last hotspot near conclusion
      timestamps.push(Math.floor(duration * 0.9));
    }
    
    return timestamps.sort((a, b) => a - b);
  };

  const suggestedTimestamps = calculateTimestamps(request.numberOfItems, totalSeconds);
  const timestampGuidance = suggestedTimestamps.length > 0
    ? `\nSuggested timestamp distribution (in seconds): ${suggestedTimestamps.join(", ")}. Use these as a guide, but adjust based on the actual video content structure.`
    : "";

  // Extract key information from description
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
${request.additionalContext ? `\n- Additional Requirements: ${request.additionalContext}` : ""}${videoInfo}

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
      // For single question hotspots:
      "options": ["option1", "option2", "option3", "option4"], // only for "question" type (3-4 options)
      "correctAnswer": 0, // only for "question" type (0-based index)
      // For quiz hotspots (multiple questions):
      "questions": [ // only for "quiz" type
        {
          "id": "question-id-1",
          "type": "multiple-choice" | "true-false" | "fill-blank",
          "question": "Question text",
          "options": ["option1", "option2", "option3", "option4"], // only for multiple-choice
          "correctAnswer": 0 | "true" | "false" | "answer text", // index for multiple-choice, "true"/"false" for true-false, text for fill-blank
          "explanation": "Optional explanation for the answer"
        }
      ]
    }
  ]
}

IMPORTANT: Ensure all timestamps are valid (0 to ${totalSeconds} seconds) and hotspots are distributed throughout the video duration.`;

  const response = await getOpenAIClient().chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: "You are an expert educator creating interactive video content. Always respond with valid JSON. Ensure all timestamps are within the video duration." },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 4096,
    temperature: 0.7,
  }, {
    timeout: 30000, // 30 second timeout
  });

  try {
    const result = JSON.parse(response.choices[0].message.content || "{}");
    const hotspots = result.hotspots || [];
    
    // Validate and clamp timestamps to video duration
    return hotspots.map((hotspot: VideoHotspot) => ({
      ...hotspot,
      timestamp: Math.min(Math.max(0, hotspot.timestamp), totalSeconds),
    }));
  } catch (parseError) {
    console.error("Failed to parse OpenAI response for video hotspots:", parseError);
    throw new Error("Received invalid response from AI. Please try again.");
  }
}

export async function generateImageHotspots(request: AIGenerationRequest): Promise<ImageHotspot[]> {
  const prompt = `Generate ${request.numberOfItems} image hotspot descriptions for "${request.topic}" at ${request.difficulty} difficulty level${request.gradeLevel ? ` for ${request.gradeLevel}` : ""}.

Requirements:
- Each hotspot represents a point of interest on an image
- Include x,y coordinates (as percentages 0-100) that would make sense for a typical educational diagram
- Provide title and detailed description
- Make them educational and informative
${request.additionalContext ? `\nAdditional context: ${request.additionalContext}` : ""}

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

  const response = await getOpenAIClient().chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: "You are an expert educator creating interactive image content. Always respond with valid JSON." },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 4096,
    temperature: 0.7,
  }, {
    timeout: 30000, // 30 second timeout
  });

  try {
    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result.hotspots || [];
  } catch (parseError) {
    console.error("Failed to parse OpenAI response for image hotspots:", parseError);
    throw new Error("Received invalid response from AI. Please try again.");
  }
}

export async function generateDragDropItems(request: AIGenerationRequest): Promise<{ zones: DragAndDropData["zones"], items: DragAndDropData["items"] }> {
  const prompt = `Generate a drag-and-drop activity about "${request.topic}" at ${request.difficulty} difficulty level${request.gradeLevel ? ` for ${request.gradeLevel}` : ""}.

Requirements:
- Create 3-5 drop zones (categories)
- Create ${request.numberOfItems} draggable items that belong to these zones
- Each item should have a clear association with one zone
- Make it educational and intuitive
${request.additionalContext ? `\nAdditional context: ${request.additionalContext}` : ""}

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

  const response = await getOpenAIClient().chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: "You are an expert educator creating interactive drag-and-drop activities. Always respond with valid JSON." },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 4096,
    temperature: 0.7,
  }, {
    timeout: 30000, // 30 second timeout
  });

  try {
    const result = JSON.parse(response.choices[0].message.content || "{}");
    return { zones: result.zones || [], items: result.items || [] };
  } catch (parseError) {
    console.error("Failed to parse OpenAI response for drag-drop items:", parseError);
    throw new Error("Received invalid response from AI. Please try again.");
  }
}

export async function generateFillBlanksBlanks(request: AIGenerationRequest): Promise<{ text: string, blanks: FillInBlanksData["blanks"] }> {
  const prompt = `Generate a fill-in-the-blanks exercise about "${request.topic}" at ${request.difficulty} difficulty level${request.gradeLevel ? ` for ${request.gradeLevel}` : ""}.

Requirements:
- Create a passage with ${request.numberOfItems} blanks marked as *blank*
- For each blank, provide correct answers (including acceptable variations)
- Optionally include hints
- Make it educational and clear
${request.additionalContext ? `\nAdditional context: ${request.additionalContext}` : ""}

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

  const response = await getOpenAIClient().chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: "You are an expert educator creating fill-in-the-blanks exercises. Always respond with valid JSON." },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 4096,
    temperature: 0.7,
  }, {
    timeout: 30000, // 30 second timeout
  });

  try {
    const result = JSON.parse(response.choices[0].message.content || "{}");
    return { text: result.text || "", blanks: result.blanks || [] };
  } catch (parseError) {
    console.error("Failed to parse OpenAI response for fill-blanks:", parseError);
    throw new Error("Received invalid response from AI. Please try again.");
  }
}

export async function generateMemoryGameCards(request: AIGenerationRequest): Promise<MemoryGameData["cards"]> {
  const prompt = `Generate ${request.numberOfItems} matching card pairs for a memory game about "${request.topic}" at ${request.difficulty} difficulty level${request.gradeLevel ? ` for ${request.gradeLevel}` : ""}.

Requirements:
- Each pair should have two matching items (term-definition, question-answer, etc.)
- Make the matches clear and educational
- Content should be concise to fit on cards
${request.additionalContext ? `\nAdditional context: ${request.additionalContext}` : ""}

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

  const response = await getOpenAIClient().chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: "You are an expert educator creating memory game cards. Always respond with valid JSON." },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 4096,
    temperature: 0.7,
  }, {
    timeout: 30000, // 30 second timeout
  });

  try {
    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result.cards || [];
  } catch (parseError) {
    console.error("Failed to parse OpenAI response for memory game cards:", parseError);
    throw new Error("Received invalid response from AI. Please try again.");
  }
}

export async function generateInteractiveBookPages(request: AIGenerationRequest): Promise<InteractiveBookData["pages"]> {
  const prompt = `Generate ${request.numberOfItems} pages for an interactive educational book about "${request.topic}" at ${request.difficulty} difficulty level${request.gradeLevel ? ` for ${request.gradeLevel}` : ""}.

Requirements:
- Each page should have a title and informative content
- Progress logically from page to page
- Make content engaging and educational
- Keep each page focused on one concept
${request.additionalContext ? `\nAdditional context: ${request.additionalContext}` : ""}

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

  const response = await getOpenAIClient().chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: "You are an expert educator creating interactive educational books. Always respond with valid JSON." },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 4096,
    temperature: 0.7,
  }, {
    timeout: 30000, // 30 second timeout
  });

  try {
    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result.pages || [];
  } catch (parseError) {
    console.error("Failed to parse OpenAI response for interactive book pages:", parseError);
    throw new Error("Received invalid response from AI. Please try again.");
  }
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

  const response = await getOpenAIClient().chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: "You are an expert educator creating video viewing guides. Always respond with valid JSON." },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 2048,
    temperature: 0.7,
  }, {
    timeout: 30000, // 30 second timeout
  });

  try {
    const result = JSON.parse(response.choices[0].message.content || "{}");
    return {
      viewingInstructions: result.viewingInstructions || "",
      guidingQuestions: result.guidingQuestions || [],
    };
  } catch (parseError) {
    console.error("Failed to parse OpenAI response:", parseError);
    throw new Error("Received invalid response from AI. Please try again.");
  }
}

export async function generatePresentation(request: PresentationGenerationRequest): Promise<SlideContent[]> {
  const learningOutcomesText = request.learningOutcomes.map((o, i) => `${i + 1}. ${o}`).join('\n');
  
  const customInstructionsSection = request.customInstructions 
    ? `\n\nAdditional Teacher Instructions:\n${request.customInstructions}\n\nPlease carefully follow these custom instructions from the teacher when creating the presentation.`
    : '';
  
  const prompt = `Create a pedagogically sound presentation about "${request.topic}" for grade ${request.gradeLevel} students (age ${request.ageRange}).

Learning Outcomes:
${learningOutcomesText}${customInstructionsSection}

Create ${request.numberOfSlides} slides that follow best practices for educational presentations:

Slide Structure Requirements:
1. Title Slide: Engaging title and brief subtitle
2. Learning Outcomes Slide: List the learning outcomes clearly
3. Content Slides (${request.numberOfSlides - 5}): Mix of:
   - Text-heavy slides with clear headings and 3-5 bullet points
   - Image-focused slides with descriptive alt text and brief captions
   - Real-world examples and applications
4. Guiding Questions Slide: 4-6 thought-provoking questions that check understanding
5. Reflection Slide: 2-3 reflection questions for deeper thinking

Pedagogical Guidelines:
- Use age-appropriate language and examples
- Break complex concepts into digestible chunks
- Include visual variety (suggest images with descriptive alt text)
- Add speaker notes with teaching tips and explanation guidance
- Questions should range from recall to analysis to application
- Content should be culturally relevant and inclusive

IMPORTANT - Image Requirements:
- AT LEAST 30-40% of slides should include relevant educational images
- For ANY slide that would benefit from a visual (title, content, or image type), include an imageUrl
- The imageUrl should be a short, specific search query (2-4 words) to find a relevant stock photo
- Examples of good image queries: "students learning science", "mathematics geometric shapes", "rainforest ecosystem"
- Always include detailed imageAlt text for accessibility
- Images should enhance understanding and engagement

Respond in JSON format:
{
  "slides": [
    {
      "id": "unique-id",
      "type": "title" | "content" | "guiding-questions" | "reflection" | "image",
      "title": "slide title",
      "content": "main text content (optional)",
      "bulletPoints": ["point 1", "point 2"], // for content slides
      "imageUrl": "concise search query for stock photo", // INCLUDE FOR MOST SLIDES - short query like "happy students learning"
      "imageAlt": "detailed accessibility description",
      "questions": ["question 1", "question 2"], // for question slides
      "notes": "speaker notes with pedagogical guidance"
    }
  ]
}`;

  const response = await getOpenAIClient().chat.completions.create({
    model: "gpt-4o", // Use gpt-4o instead of gpt-5 (which may not exist or be slower)
    messages: [
      { role: "system", content: "You are an expert instructional designer creating educational presentations. Always respond with valid JSON and follow Universal Design for Learning (UDL) principles." },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 4000, // Reduced from 8000 to speed up generation
    temperature: 0.7,
  }, {
    timeout: 20000, // 20 second timeout for OpenAI API call
  });

  try {
    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result.slides || [];
  } catch (parseError) {
    console.error("Failed to parse OpenAI response:", parseError);
    throw new Error("Received invalid response from AI. Please try again.");
  }
}
