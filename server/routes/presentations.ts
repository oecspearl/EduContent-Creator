import type { RouteContext } from "./types";

export function registerPresentationRoutes({ app, storage, requireTeacher }: RouteContext) {
  // Create actual Google Slides presentation (teachers only)
  app.post("/api/presentation/create-presentation", requireTeacher, async (req: any, res) => {
    try {
      const { title, slides, colorTheme } = req.body || {};

      if (!title || !slides || !Array.isArray(slides)) {
        return res.status(400).json({ message: "Missing required fields: title and slides" });
      }

      const user = await storage.getProfileById(req.session.userId!);
      if (!user) return res.status(404).json({ message: "User not found" });

      if (!user.googleAccessToken || !user.googleRefreshToken) {
        return res.status(403).json({
          message: "Please sign in with Google to create presentations in Google Slides.",
        });
      }

      const { createPresentation, addSlidesToPresentation } = await import("../presentation");
      const { searchPhotos, getAltText, generateAttribution } = await import("../unsplash");

      // Fetch images for slides that need them
      const slidesWithImages = await Promise.all(
        slides.map(async (slide: any) => {
          if (slide.imageUrl && typeof slide.imageUrl === "string" && !slide.imageUrl.startsWith("http")) {
            try {
              const photos = await searchPhotos(slide.imageUrl, 1);
              if (photos.length > 0) {
                const photo = photos[0];
                return {
                  ...slide,
                  imageUrl: photo.urls.regular,
                  imageAlt: slide.imageAlt || getAltText(photo),
                  imageAttribution: generateAttribution(photo),
                };
              }
            } catch {
              // Continue without image
            }
          }
          return slide;
        }),
      );

      const { presentationId, url } = await createPresentation(user, title);
      const result = await addSlidesToPresentation(user, presentationId, slidesWithImages, {
        colorTheme: colorTheme || "blue",
        allowUntrustedImages: false,
      });

      res.json({
        presentationId,
        url,
        message: "Presentation created successfully in Google Slides!",
        successCount: result.successCount,
        warnings: result.warnings.length > 0 ? result.warnings : undefined,
        failedSlides: result.failedSlides.length > 0 ? result.failedSlides : undefined,
      });
    } catch (error: any) {
      console.error("Create presentation error:", error);
      if (error.name === "GoogleAuthError" || error.name === "TokenExpiredError") {
        return res.status(403).json({ message: error.message || "Please reconnect your Google account." });
      }
      if (error.name === "BatchSizeExceededError") {
        return res.status(400).json({ message: error.message });
      }
      if (error.message?.includes("not connected their Google account")) {
        return res.status(403).json({ message: "Please sign in with Google to create presentations." });
      }
      res.status(500).json({ message: error.message || "Failed to create presentation." });
    }
  });
}
