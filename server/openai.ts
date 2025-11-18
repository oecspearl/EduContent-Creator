import OpenAI from "openai";
import type { AIGenerationRequest, QuizQuestion, FlashcardData, VideoHotspot, ImageHotspot, DragAndDropData, FillInBlanksData, MemoryGameData, InteractiveBookData, H5pContent, GoogleSlidesGenerationRequest, SlideContent } from "@shared/schema";

// This is using OpenAI's API, which points to OpenAI's API servers and requires your own API key.
// Using gpt-4o as the default model (latest and most capable model as of 2024)
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 30000, // 30 second timeout for all requests
});

export function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set. Please configure it in your environment variables.");
  }
  return openai;
}

export async function generateQuizQuestions(request: AIGenerationRequest): Promise<QuizQuestion[]> {
  const prompt = `Generate ${request.numberOfItems} quiz questions about "${request.topic}" at ${request.difficulty} difficulty level${request.gradeLevel ? ` for ${request.gradeLevel}` : ""}.

Requirements:
- Mix of multiple-choice (with 4 options), true/false, and fill-in-the-blank questions
- Each question should have a correct answer and an explanation
- Make questions educational and engaging
${request.additionalContext ? `\nAdditional context: ${request.additionalContext}` : ""}

Respond in JSON format with an array of questions following this structure:
{
  "questions": [
    {
      "id": "unique-id",
      "type": "multiple-choice" | "true-false" | "fill-blank",
      "question": "question text",
      "options": ["option1", "option2", "option3", "option4"], // only for multiple-choice
      "correctAnswer": 0 | "true" | "false" | "answer text",
      "explanation": "why this is the correct answer"
    }
  ]
}`;

  const response = await openai.chat.completions.create({
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

  const response = await openai.chat.completions.create({
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

  const result = JSON.parse(response.choices[0].message.content || "{}");
  return result.cards || [];
}

export async function generateVideoHotspots(request: AIGenerationRequest): Promise<VideoHotspot[]> {
  const prompt = `Generate ${request.numberOfItems} interactive hotspots for a video about "${request.topic}" at ${request.difficulty} difficulty level${request.gradeLevel ? ` for ${request.gradeLevel}` : ""}.

Requirements:
- Mix of question, information, and navigation hotspots
- Each hotspot should have a timestamp (in seconds), title, and content
- Question hotspots should include options and correct answer
- Distribute timestamps evenly throughout a typical educational video (assume 10-15 minutes)
${request.additionalContext ? `\nAdditional context: ${request.additionalContext}` : ""}

Respond in JSON format:
{
  "hotspots": [
    {
      "id": "unique-id",
      "timestamp": 60,
      "type": "question" | "info" | "navigation",
      "title": "hotspot title",
      "content": "description or question",
      "options": ["option1", "option2", "option3"], // only for questions
      "correctAnswer": 0 // only for questions
    }
  ]
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: "You are an expert educator creating interactive video content. Always respond with valid JSON." },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 4096,
    temperature: 0.7,
  }, {
    timeout: 30000, // 30 second timeout
  });

  const result = JSON.parse(response.choices[0].message.content || "{}");
  return result.hotspots || [];
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

  const response = await openai.chat.completions.create({
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

  const response = await openai.chat.completions.create({
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

  const response = await openai.chat.completions.create({
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

  const response = await openai.chat.completions.create({
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

  const response = await openai.chat.completions.create({
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

  const response = await openai.chat.completions.create({
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

export async function generateGoogleSlides(request: GoogleSlidesGenerationRequest): Promise<SlideContent[]> {
  const learningOutcomesText = request.learningOutcomes.map((o, i) => `${i + 1}. ${o}`).join('\n');
  
  const customInstructionsSection = request.customInstructions 
    ? `\n\nAdditional Teacher Instructions:\n${request.customInstructions}\n\nPlease carefully follow these custom instructions from the teacher when creating the presentation.`
    : '';
  
  const prompt = `Create a pedagogically sound Google Slides presentation about "${request.topic}" for grade ${request.gradeLevel} students (age ${request.ageRange}).

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

  const response = await openai.chat.completions.create({
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
