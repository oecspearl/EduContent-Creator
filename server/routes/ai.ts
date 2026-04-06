import {
  aiGenerationSchema,
  videoFinderPedagogySchema,
  presentationGenerationSchema,
  interactiveVideoGenerationSchema,
  chatRequestSchema,
  unsplashSearchSchema,
  youtubeSimpleSearchSchema,
  youtubeFullSearchSchema,
  aiImageGenerationSchema,
} from "@shared/schema";
import {
  generateQuizQuestions,
  generateFlashcards,
  generateVideoHotspots,
  generateImageHotspots,
  generateDragDropItems,
  generateFillBlanksBlanks,
  generateMemoryGameCards,
  generateInteractiveBookPages,
  generateVideoFinderPedagogy,
  generatePresentation,
  getOpenAIClient,
} from "../openai";
import { withTimeoutMiddleware } from "../middleware/timeout";
import {
  aiGenerationRateLimit,
  aiImageGenerationRateLimit,
  imageSearchRateLimit,
  presentationCreationRateLimit,
} from "../middleware/rate-limit";
import { asyncHandler } from "../utils/async-handler";
import type { RouteContext } from "./types";
import { generateImageWithOpenRouter } from "../openrouter-image";

function requireOpenRouterKey(res: any): boolean {
  if (!process.env.OPENROUTER_API_KEY?.trim()) {
    res.status(500).json({
      message:
        "OpenRouter API key is not configured. Set OPENROUTER_API_KEY for AI image generation (presentations and image tools).",
    });
    return false;
  }
  return true;
}

function requireOpenAIKey(res: any): boolean {
  if (!process.env.OPENAI_API_KEY) {
    res.status(500).json({ message: "OpenAI API key is not configured. Please set OPENAI_API_KEY in your environment variables." });
    return false;
  }
  return true;
}

export function registerAIRoutes({ app, storage, requireAuth, requireTeacher }: RouteContext) {
  // AI content generation (teachers only)
  app.post("/api/ai/generate", requireTeacher, aiGenerationRateLimit, withTimeoutMiddleware(25000), asyncHandler(async (req: any, res) => {
    try {
      if (!requireOpenAIKey(res)) return;

      const parsed = aiGenerationSchema.parse(req.body);
      let result: any;

      switch (parsed.contentType) {
        case "quiz":
          result = { questions: await generateQuizQuestions(parsed) };
          break;
        case "flashcard":
          result = { cards: await generateFlashcards(parsed) };
          break;
        case "interactive-video":
          result = { hotspots: await generateVideoHotspots(parsed) };
          break;
        case "image-hotspot":
          result = { hotspots: await generateImageHotspots(parsed) };
          break;
        case "drag-drop":
          result = await generateDragDropItems(parsed);
          break;
        case "fill-blanks":
          result = await generateFillBlanksBlanks(parsed);
          break;
        case "memory-game":
          result = { cards: await generateMemoryGameCards(parsed) };
          break;
        case "interactive-book":
          result = { pages: await generateInteractiveBookPages(parsed) };
          break;
        default:
          return res.status(400).json({ message: "Invalid content type" });
      }

      if (!res.headersSent) res.json(result);
    } catch (error: any) {
      console.error("AI generation error:", error);
      if (error.name === "ZodError") return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      if (error.message?.includes("API key") || error.message?.includes("authentication")) {
        return res.status(401).json({ message: "OpenAI API authentication failed. Please check your OPENAI_API_KEY." });
      }
      if (error.message?.includes("timeout") || error.code === "ETIMEDOUT") {
        return res.status(504).json({ message: "Request timeout - The AI generation took too long. Please try again with fewer items." });
      }
      if (error.message?.includes("rate limit")) {
        return res.status(429).json({ message: "Rate limit exceeded. Please wait a moment and try again." });
      }
      throw error;
    }
  }));

  // Enhanced AI interactive video generation (teachers only)
  app.post("/api/ai/generate-interactive-video", requireTeacher, aiGenerationRateLimit, withTimeoutMiddleware(25000), asyncHandler(async (req: any, res) => {
    try {
      if (!requireOpenAIKey(res)) return;

      const parsed = interactiveVideoGenerationSchema.parse(req.body);

      let enhancedMetadata = {
        videoTitle: parsed.videoTitle,
        videoDescription: parsed.videoDescription,
        videoDuration: parsed.videoDuration,
        videoTags: parsed.videoTags || [],
        channelTitle: parsed.channelTitle || "",
      };

      if (parsed.videoId && (!parsed.videoTags || parsed.videoTags.length === 0 || !parsed.channelTitle)) {
        try {
          const { getYouTubeClient } = await import("../youtube");
          const youtube = getYouTubeClient();
          const videoResponse = await youtube.videos.list({ part: ["snippet"], id: [parsed.videoId] });
          if (videoResponse.data.items && videoResponse.data.items.length > 0) {
            const video = videoResponse.data.items[0];
            enhancedMetadata = {
              videoTitle: video.snippet?.title || parsed.videoTitle,
              videoDescription: video.snippet?.description || parsed.videoDescription,
              videoDuration: parsed.videoDuration,
              videoTags: video.snippet?.tags || parsed.videoTags || [],
              channelTitle: video.snippet?.channelTitle || parsed.channelTitle || "",
            };
          }
        } catch {
          // Continue with provided metadata
        }
      }

      const request = {
        contentType: "interactive-video" as const,
        topic: parsed.topic,
        difficulty: parsed.difficulty,
        numberOfItems: parsed.numberOfHotspots,
        gradeLevel: parsed.gradeLevel || "",
        additionalContext: parsed.additionalContext || "",
        language: "English",
      };

      const hotspots = await generateVideoHotspots(request, enhancedMetadata);
      if (!res.headersSent) res.json({ videoUrl: `https://www.youtube.com/watch?v=${parsed.videoId}`, hotspots });
    } catch (error: any) {
      console.error("Interactive video AI generation error:", error);
      if (error.name === "ZodError") return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      if (error.message?.includes("API key") || error.message?.includes("authentication")) {
        return res.status(401).json({ message: "OpenAI API authentication failed. Please check your OPENAI_API_KEY." });
      }
      if (error.message?.includes("timeout") || error.code === "ETIMEDOUT") {
        return res.status(504).json({ message: "Request timeout - The AI generation took too long. Please try again with fewer items." });
      }
      if (error.message?.includes("rate limit")) {
        return res.status(429).json({ message: "Rate limit exceeded. Please wait a moment and try again." });
      }
      throw error;
    }
  }));

  // Chat assistant with streaming
  app.post("/api/chat", requireAuth, asyncHandler(async (req: any, res) => {
    try {
      const parsed = chatRequestSchema.parse(req.body);
      const userId = req.session.userId!;

      const user = await storage.getProfileById(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const history = await storage.getChatHistory(userId, 10);
      const recentMessages = history.reverse().slice(-10);

      let systemMessage = `You are a helpful AI assistant for the OECS Content Creator platform, an educational content creation tool for teachers in the Organization of Eastern Caribbean States.

Your role is to help educators:
- Create engaging educational content (quizzes, flashcards, interactive videos, etc.)
- Get guidance on using the platform features
- Answer questions about educational best practices
- Provide support with content creation

User Information:
- Name: ${user.fullName}
- Role: ${user.role}
- Institution: ${user.institution || "Not specified"}

Platform Features:
- 8 content types: Quiz, Flashcard, Interactive Video, Image Hotspot, Drag & Drop, Fill in the Blanks, Memory Game, Interactive Book
- AI-powered content generation
- Progress tracking and analytics
- Public sharing and preview links
- Full accessibility support (WCAG 2.1 AA compliant)

Be conversational, friendly, and educational. Provide specific, actionable advice.`;

      if (parsed.context) {
        systemMessage += `\n\nCurrent Context:\n${JSON.stringify(parsed.context, null, 2)}`;
      }

      const messages: any[] = [
        { role: "system", content: systemMessage },
        ...recentMessages.map((msg) => ({ role: msg.role, content: msg.content })),
        { role: "user", content: parsed.message },
      ];

      await storage.createChatMessage({ userId, role: "user", content: parsed.message, context: parsed.context || null });

      await new Promise<void>((resolve, reject) => {
        req.session.save((err: any) => (err ? reject(err) : resolve()));
      });

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const openai = getOpenAIClient();
      const stream = await openai.chat.completions.create(
        { model: "gpt-4o", messages, stream: true, max_completion_tokens: 2048, temperature: 0.7 },
        { timeout: 60000 },
      );

      let fullResponse = "";
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          fullResponse += content;
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      await storage.createChatMessage({ userId, role: "assistant", content: fullResponse, context: null });
      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error: any) {
      console.error("Chat error:", error);
      if (!res.headersSent) {
        if (error.name === "ZodError") return res.status(400).json({ message: "Invalid request data", errors: error.errors });
        throw error;
      } else {
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
      }
    }
  }));

  // Chat history
  app.get("/api/chat/history", requireAuth, asyncHandler(async (req: any, res) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const history = await storage.getChatHistory(req.session.userId!, limit);
    res.json(history.reverse());
  }));

  app.delete("/api/chat/history", requireAuth, asyncHandler(async (req: any, res) => {
    await storage.deleteChatHistory(req.session.userId!);
    res.json({ message: "Chat history cleared" });
  }));

  // Video Finder pedagogy generation
  app.post("/api/video-finder/generate-pedagogy", requireAuth, asyncHandler(async (req, res) => {
    try {
      const parsed = videoFinderPedagogySchema.parse(req.body);
      const result = await generateVideoFinderPedagogy(parsed);
      res.json(result);
    } catch (error: any) {
      console.error("Video Finder pedagogy generation error:", error);
      if (error.name === "ZodError") return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      throw error;
    }
  }));

  // Presentation AI generation (teachers only)
  app.post("/api/presentation/generate", requireTeacher, presentationCreationRateLimit, withTimeoutMiddleware(55000), asyncHandler(async (req, res) => {
    try {
      const parsed = presentationGenerationSchema.parse(req.body);
      const slides = await generatePresentation(parsed);
      if (!res.headersSent) res.json({ slides, generatedDate: new Date().toISOString() });
    } catch (error: any) {
      console.error("Presentation generation error:", error);
      if (res.headersSent) return;
      if (error.name === "ZodError") return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      if (error.message?.includes("timeout") || error.code === "ETIMEDOUT") {
        return res.status(504).json({ message: "Request timeout - Please try again with fewer slides." });
      }
      throw error;
    }
  }));

  // Unsplash image search (teachers only)
  app.post("/api/unsplash/search", requireTeacher, imageSearchRateLimit, asyncHandler(async (req, res) => {
    try {
      const parsed = unsplashSearchSchema.parse(req.body);
      const { searchPhotos } = await import("../unsplash");
      const photos = await searchPhotos(parsed.query, parsed.count);
      res.json({ photos });
    } catch (error: any) {
      console.error("Unsplash search error:", error);
      if (error.name === "ZodError") return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      throw error;
    }
  }));

  // AI image generation via OpenRouter (teachers only)
  app.post("/api/ai/generate-image", requireTeacher, aiImageGenerationRateLimit, asyncHandler(async (req, res) => {
    try {
      const parsed = aiImageGenerationSchema.parse(req.body);
      if (!requireOpenRouterKey(res)) return;

      const imageUrl = await generateImageWithOpenRouter(parsed.prompt.trim());
      res.json({ imageUrl, prompt: parsed.prompt });
    } catch (error: any) {
      console.error("OpenRouter image generation error:", error);
      if (error.name === "ZodError") return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      throw error;
    }
  }));

  // YouTube search (teachers only)
  app.post("/api/youtube/search-simple", requireTeacher, asyncHandler(async (req, res) => {
    try {
      const parsed = youtubeSimpleSearchSchema.parse(req.body);
      const { searchEducationalVideos } = await import("../youtube");
      const results = await searchEducationalVideos({
        subject: "", topic: parsed.query.trim(), learningOutcome: "", gradeLevel: "", ageRange: "", maxResults: parsed.maxResults,
      });
      res.json({ results, searchDate: new Date().toISOString() });
    } catch (error: any) {
      console.error("YouTube search error:", error);
      if (error.name === "ZodError") return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      throw error;
    }
  }));

  // YouTube search (teachers only)
  app.post("/api/youtube/search", requireTeacher, asyncHandler(async (req, res) => {
    try {
      const parsed = youtubeFullSearchSchema.parse(req.body);
      const { searchEducationalVideos } = await import("../youtube");
      const results = await searchEducationalVideos({
        subject: parsed.subject, topic: parsed.topic, learningOutcome: parsed.learningOutcome,
        gradeLevel: parsed.gradeLevel, ageRange: parsed.ageRange || "", maxResults: parsed.videoCount,
      });
      res.json({ results, searchDate: new Date().toISOString() });
    } catch (error: any) {
      console.error("YouTube search error:", error);
      if (error.name === "ZodError") return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      throw error;
    }
  }));
}
