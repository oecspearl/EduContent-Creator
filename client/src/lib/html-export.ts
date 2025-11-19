import type { 
  H5pContent, 
  InteractiveBookData, 
  QuizData, 
  MemoryGameData, 
  FlashcardData 
} from "@shared/schema";

// Convert base64 data URI to a format suitable for embedding
function ensureDataUri(data: string): string {
  if (!data) return "";
  // If already a data URI, return as is
  if (data.startsWith("data:")) return data;
  // If it's a URL, we'll need to fetch it (but for now, return as is for external URLs)
  if (data.startsWith("http://") || data.startsWith("https://")) return data;
  // Assume it's base64 and add data URI prefix
  return `data:image/png;base64,${data}`;
}

// Generate HTML for a single image
function generateImageHtml(imageUrl: string, alt: string = ""): string {
  const dataUri = ensureDataUri(imageUrl);
  return `<div style="text-align: center; margin: 1.5rem 0;">
    <img src="${dataUri}" alt="${alt}" style="max-width: 100%; max-height: 500px; height: auto; width: auto; display: block; margin: 0 auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />
  </div>`;
}

// Generate HTML for audio player
function generateAudioHtml(audioUrl: string): string {
  if (!audioUrl) return "";
  const dataUri = ensureDataUri(audioUrl);
  return `
    <div style="margin: 1rem 0; padding: 1rem; background: #f5f5f5; border-radius: 8px;">
      <audio controls style="width: 100%;">
        <source src="${dataUri}" type="audio/webm">
        <source src="${dataUri}" type="audio/mpeg">
        Your browser does not support the audio element.
      </audio>
    </div>
  `;
}

// Generate HTML for video (YouTube or local file)
function generateVideoHtml(videoId: string, title: string = "", videoUrl?: string, localVideoUrl?: string): string {
  // Check if this is a local video file
  if (localVideoUrl) {
    return `
      <div style="margin: 1.5rem 0; position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); background: #000;">
        <video 
          controls
          style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; border-radius: 8px;"
          title="${escapeHtml(title)}"
        >
          <source src="${escapeHtml(localVideoUrl)}" type="video/mp4">
          <source src="${escapeHtml(localVideoUrl)}" type="video/webm">
          <source src="${escapeHtml(localVideoUrl)}" type="video/ogg">
          Your browser does not support the video tag.
        </video>
      </div>
      <p style="text-align: center; color: #666; font-size: 0.9rem; margin-top: 0.5rem;">
        <em>Local video file</em>
      </p>
    `;
  }
  
  // Check if videoUrl is a local file path
  if (videoUrl && (videoUrl.startsWith('./') || videoUrl.startsWith('../') || videoUrl.startsWith('/') || !videoUrl.includes('youtube.com') && !videoUrl.includes('youtu.be'))) {
    return `
      <div style="margin: 1.5rem 0; position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); background: #000;">
        <video 
          controls
          style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; border-radius: 8px;"
          title="${escapeHtml(title)}"
        >
          <source src="${escapeHtml(videoUrl)}" type="video/mp4">
          <source src="${escapeHtml(videoUrl)}" type="video/webm">
          <source src="${escapeHtml(videoUrl)}" type="video/ogg">
          Your browser does not support the video tag.
        </video>
      </div>
      <p style="text-align: center; color: #666; font-size: 0.9rem; margin-top: 0.5rem;">
        <em>Local video file</em>
      </p>
    `;
  }
  
  // YouTube video - extract video ID if full URL is provided
  let cleanVideoId = videoId;
  if (videoId.includes('youtube.com/watch?v=')) {
    cleanVideoId = videoId.split('v=')[1]?.split('&')[0] || videoId;
  } else if (videoId.includes('youtu.be/')) {
    cleanVideoId = videoId.split('youtu.be/')[1]?.split('?')[0] || videoId;
  } else if (videoUrl && videoUrl.includes('youtube.com/watch?v=')) {
    cleanVideoId = videoUrl.split('v=')[1]?.split('&')[0] || videoId;
  } else if (videoUrl && videoUrl.includes('youtu.be/')) {
    cleanVideoId = videoUrl.split('youtu.be/')[1]?.split('?')[0] || videoId;
  }
  
  // Validate video ID (should be 11 characters for YouTube)
  if (!cleanVideoId || cleanVideoId.length !== 11) {
    return `
      <div style="margin: 1.5rem 0; padding: 2rem; background: #f8d7da; border: 2px solid #dc3545; border-radius: 8px; text-align: center;">
        <p style="color: #721c24; font-weight: bold; margin-bottom: 0.5rem;">Video Error</p>
        <p style="color: #721c24; margin-bottom: 1rem;">Invalid video ID or URL. Please check the video link.</p>
        ${videoUrl ? `<a href="${escapeHtml(videoUrl)}" target="_blank" rel="noopener noreferrer" style="color: #4a90e2; text-decoration: underline;">Open video on YouTube</a>` : ''}
      </div>
    `;
  }
  
  const youtubeUrl = videoUrl || `https://www.youtube.com/watch?v=${cleanVideoId}`;
  
  return `
    <div style="margin: 1.5rem 0; position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); background: #000;">
      <iframe 
        id="youtube-iframe-${cleanVideoId}"
        src="https://www.youtube.com/embed/${cleanVideoId}?enablejsapi=1&rel=0&modestbranding=1" 
        style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; border-radius: 8px;"
        frameborder="0" 
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
        allowfullscreen
        title="${escapeHtml(title)}"
        loading="lazy"
      ></iframe>
    </div>
    <div id="youtube-error-${cleanVideoId}" style="display: none; margin: 1rem 0; padding: 1rem; background: #fff3cd; border: 2px solid #ffc107; border-radius: 8px; text-align: center;">
      <p style="color: #856404; font-weight: bold; margin-bottom: 0.5rem;">Video cannot be embedded</p>
      <p style="color: #856404; margin-bottom: 1rem;">This video may be restricted or unavailable for embedding.</p>
      <a href="${escapeHtml(youtubeUrl)}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 0.5rem 1.5rem; background: #4a90e2; color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">Watch on YouTube</a>
    </div>
    <p style="text-align: center; color: #666; font-size: 0.9rem; margin-top: 0.5rem;">
      <em>Note: Video requires internet connection to play</em>
    </p>
    <script>
      function handleYouTubeError(videoId, videoUrl) {
        const iframe = document.getElementById('youtube-iframe-' + videoId);
        const errorDiv = document.getElementById('youtube-error-' + videoId);
        if (iframe && errorDiv) {
          iframe.style.display = 'none';
          errorDiv.style.display = 'block';
        }
      }
      
      // Check for YouTube iframe errors after load
      window.addEventListener('load', function() {
        const iframes = document.querySelectorAll('iframe[src*="youtube.com/embed"]');
        iframes.forEach(function(iframe) {
          iframe.addEventListener('load', function() {
            // Try to detect error 153 or other embed errors
            try {
              if (iframe.contentWindow) {
                // If we can access contentWindow, check for errors
                setTimeout(function() {
                  // Check if iframe is still visible and has content
                  const rect = iframe.getBoundingClientRect();
                  if (rect.height === 0 || rect.width === 0) {
                    const videoId = iframe.id.replace('youtube-iframe-', '');
                    const errorDiv = document.getElementById('youtube-error-' + videoId);
                    if (errorDiv) {
                      iframe.style.display = 'none';
                      errorDiv.style.display = 'block';
                    }
                  }
                }, 2000);
              }
            } catch (e) {
              // Cross-origin restrictions - can't check, but that's okay
            }
          });
        });
      });
    </script>
  `;
}

// Generate complete HTML document
export function generateHTMLExport(
  content: H5pContent,
  contentData: any
): string {
  const title = content.title || "Exported Content";
  const description = content.description || "";
  
  let bodyContent = "";

  switch (content.type) {
    case "presentation":
      bodyContent = generatePresentationHTML(contentData);
      break;
    case "interactive-book":
      bodyContent = generateInteractiveBookHTML(contentData);
      break;
    case "quiz":
      bodyContent = generateQuizHTML(contentData);
      break;
    case "memory-game":
      bodyContent = generateMemoryGameHTML(contentData);
      break;
    case "flashcard":
      bodyContent = generateFlashcardHTML(contentData);
      break;
    case "drag-drop":
      bodyContent = generateDragDropHTML(contentData);
      break;
    default:
      bodyContent = `<p>Content type "${content.type}" export not yet implemented.</p>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.8;
      color: #333;
      background: #fff;
      padding: 1rem;
      max-width: 900px;
      margin: 0 auto;
      font-size: 16px;
    }
    h1 {
      font-size: 2.5rem;
      margin-bottom: 1rem;
      color: #1a1a1a;
      line-height: 1.2;
    }
    h2 {
      font-size: 2rem;
      margin-top: 1.5rem;
      margin-bottom: 1rem;
      color: #2a2a2a;
      border-bottom: 2px solid #e0e0e0;
      padding-bottom: 0.5rem;
      line-height: 1.3;
    }
    h3 {
      font-size: 1.5rem;
      margin-top: 1.5rem;
      margin-bottom: 1rem;
      color: #3a3a3a;
      line-height: 1.4;
    }
    h4 {
      font-size: 1.25rem;
      margin-top: 1rem;
      margin-bottom: 0.75rem;
      color: #4a4a4a;
    }
    p {
      font-size: 1.1rem;
      margin-bottom: 1rem;
      line-height: 1.8;
    }
    .description {
      color: #666;
      margin-bottom: 2rem;
      font-style: italic;
      font-size: 1.1rem;
    }
    .page {
      margin-bottom: 3rem;
      padding: 1.5rem;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      background: #fafafa;
    }
    .slide {
      margin-bottom: 2rem;
      padding: 2rem;
      border: 1px solid #ddd;
      border-radius: 8px;
      background: #fff;
      page-break-after: always;
    }
    .presentation-navigation {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      background: #f5f5f5;
      border-radius: 8px;
      margin-bottom: 2rem;
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .presentation-slides-container {
      min-height: 400px;
    }
    .presentation-slide {
      animation: fadeIn 0.3s;
      padding: 2rem;
      border: 1px solid #ddd;
      border-radius: 8px;
      background: #fff;
      margin-bottom: 2rem;
      max-width: 100%;
      overflow-x: hidden;
    }
    .slide-indicator {
      font-weight: bold;
      font-size: 1.1rem;
    }
    .slide-content {
      font-size: 1.1rem;
      line-height: 1.8;
      margin: 1rem 0;
    }
    .slide-content p {
      font-size: 1.1rem;
      margin-bottom: 1rem;
      line-height: 1.8;
    }
    .bullet-points {
      margin: 1.5rem 0;
      padding-left: 2rem;
      font-size: 1.1rem;
      line-height: 1.8;
    }
    .bullet-points li {
      margin-bottom: 0.75rem;
      list-style-type: disc;
    }
    .slide-questions {
      margin: 1.5rem 0;
      padding: 1.5rem;
      background: #e7f3ff;
      border-left: 4px solid #4a90e2;
      border-radius: 4px;
    }
    .slide-questions h4 {
      margin-bottom: 1rem;
      color: #4a90e2;
    }
    .question-list {
      margin: 0;
      padding-left: 2rem;
      font-size: 1.1rem;
      line-height: 1.8;
    }
    .question-list li {
      margin-bottom: 0.75rem;
      list-style-type: disc;
    }
    .speaker-notes {
      margin-top: 1.5rem;
      padding: 1rem;
      background: #f9f9f9;
      border-left: 3px solid #999;
      border-radius: 4px;
      font-size: 0.95rem;
      color: #666;
      font-style: italic;
    }
    .question {
      margin-bottom: 1.5rem;
      padding: 1.5rem;
      background: #f9f9f9;
      border-left: 4px solid #4a90e2;
      border-radius: 4px;
      font-size: 1.1rem;
    }
    .question p {
      font-size: 1.1rem;
      margin-bottom: 1rem;
    }
    .options {
      margin-left: 1.5rem;
      margin-top: 0.5rem;
    }
    .option {
      padding: 0.5rem;
      margin: 0.25rem 0;
    }
    .correct {
      background: #d4edda;
      border-left: 3px solid #28a745;
    }
    .card {
      margin-bottom: 1rem;
      padding: 1rem;
      border: 1px solid #ddd;
      border-radius: 8px;
      background: #fff;
    }
    .card-front, .card-back {
      padding: 0.75rem;
      margin: 0.5rem 0;
    }
    .card-front {
      background: #e3f2fd;
      border-left: 3px solid #2196f3;
    }
    .card-back {
      background: #f1f8e9;
      border-left: 3px solid #8bc34a;
    }
    .flashcard-container {
      max-width: 800px;
      margin: 2rem auto;
    }
    .flashcard-progress {
      margin-bottom: 2rem;
    }
    .progress-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
      font-size: 1rem;
    }
    .card-counter {
      font-weight: 600;
      color: #333;
    }
    .progress-percentage {
      font-weight: 600;
      color: #4a90e2;
    }
    .progress-bar-container {
      width: 100%;
      height: 8px;
      background: #e0e0e0;
      border-radius: 4px;
      overflow: hidden;
    }
    .progress-bar {
      height: 100%;
      background: #4a90e2;
      transition: width 0.3s ease;
      width: 0%;
    }
    .flashcard-wrapper {
      margin: 2rem 0;
      min-height: 400px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .flashcard {
      width: 100%;
      max-width: 600px;
      aspect-ratio: 3/2;
      min-height: 300px;
      cursor: pointer;
      perspective: 1000px;
      -webkit-perspective: 1000px;
    }
    .flashcard-inner {
      position: relative;
      width: 100%;
      height: 100%;
      transition: transform 0.5s;
      transform-style: preserve-3d;
      -webkit-transform-style: preserve-3d;
    }
    .flashcard.flipped .flashcard-inner {
      transform: rotateY(180deg);
      -webkit-transform: rotateY(180deg);
    }
    .flashcard-face {
      position: absolute;
      width: 100%;
      height: 100%;
      backface-visibility: hidden;
      -webkit-backface-visibility: hidden;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      overflow: hidden;
    }
    .flashcard-front {
      background: #fff;
      border: 2px solid #4a90e2;
    }
    .flashcard-back {
      background: #f0f7ff;
      border: 2px solid #8bc34a;
      transform: rotateY(180deg);
      -webkit-transform: rotateY(180deg);
    }
    .flashcard-label {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #666;
      margin-bottom: 1rem;
      font-weight: 600;
    }
    .flashcard-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      width: 100%;
    }
    .flashcard-content img {
      max-width: 100%;
      max-height: 200px;
      margin: 1rem 0;
      border-radius: 8px;
      object-fit: contain;
    }
    .flashcard-content p {
      font-size: 1.5rem;
      font-weight: 600;
      margin: 1rem 0;
      line-height: 1.6;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    .flashcard-hint {
      font-size: 0.875rem;
      color: #999;
      margin-top: 1rem;
      font-style: italic;
    }
    .flashcard-controls {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      margin-top: 2rem;
      padding: 1rem;
      background: #f5f5f5;
      border-radius: 8px;
    }
    .control-btn {
      padding: 0.75rem 1.5rem;
      background: #4a90e2;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 1rem;
      font-weight: 600;
      transition: background 0.2s;
    }
    .control-btn:hover:not(:disabled) {
      background: #357abd;
    }
    .control-btn:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
    .control-btn.secondary {
      background: #6c757d;
    }
    .control-btn.secondary:hover {
      background: #5a6268;
    }
    .control-actions {
      display: flex;
      gap: 0.5rem;
    }
    .instructions {
      background: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 4px;
      padding: 1.25rem;
      margin: 1.5rem 0;
      font-size: 1.1rem;
      line-height: 1.8;
    }
    .instructions strong {
      font-size: 1.15rem;
    }
    .book-navigation {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      background: #f5f5f5;
      border-radius: 8px;
      margin-bottom: 2rem;
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .nav-btn {
      padding: 0.5rem 1rem;
      background: #4a90e2;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 1rem;
    }
    .nav-btn:hover:not(:disabled) {
      background: #357abd;
    }
    .nav-btn:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
    .page-indicator {
      font-weight: bold;
      font-size: 1.1rem;
    }
    .book-pages-container {
      min-height: 400px;
    }
    .book-page {
      animation: fadeIn 0.3s;
      padding: 2rem 1rem;
      max-width: 100%;
      overflow-x: hidden;
    }
    .page-content {
      font-size: 1.1rem;
      line-height: 1.8;
      max-width: 100%;
      overflow-wrap: break-word;
      word-wrap: break-word;
    }
    .page-content p {
      font-size: 1.1rem;
      margin-bottom: 1rem;
      line-height: 1.8;
    }
    .page-content img {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 1.5rem auto;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .page-content iframe {
      max-width: 100%;
      width: 100%;
      height: auto;
      aspect-ratio: 16 / 9;
      margin: 1.5rem 0;
      border-radius: 8px;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .interactive-quiz {
      border: 2px solid #4a90e2;
      border-radius: 8px;
      padding: 2rem;
      margin: 1.5rem 0;
      background: #f9f9f9;
      max-width: 100%;
      overflow-x: hidden;
    }
    .interactive-quiz h3 {
      font-size: 1.75rem;
      margin-bottom: 1rem;
    }
    .interactive-question {
      font-size: 1.1rem;
    }
    .interactive-question p {
      font-size: 1.1rem;
      margin-bottom: 1rem;
    }
    .quiz-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 2px solid #ddd;
    }
    .check-btn {
      padding: 0.5rem 1.5rem;
      background: #28a745;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 1rem;
      font-weight: bold;
    }
    .check-btn:hover {
      background: #218838;
    }
    .interactive-options {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .option-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem;
      border: 2px solid #ddd;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .option-label:hover {
      background: #f0f0f0;
      border-color: #4a90e2;
    }
    .option-label input[type="radio"] {
      cursor: pointer;
    }
    .option-label input[type="radio"]:checked + span {
      font-weight: bold;
      color: #4a90e2;
    }
    .option-label.correct {
      background: #d4edda;
      border-color: #28a745;
    }
    .option-label.incorrect {
      background: #f8d7da;
      border-color: #dc3545;
    }
    .fill-blank-answer {
      margin: 1rem 0;
    }
    .fill-blank-input {
      width: 100%;
      padding: 0.75rem;
      border: 2px solid #ddd;
      border-radius: 4px;
      font-size: 1rem;
    }
    .fill-blank-input.correct {
      border-color: #28a745;
      background: #d4edda;
    }
    .fill-blank-input.incorrect {
      border-color: #dc3545;
      background: #f8d7da;
    }
    .question-feedback {
      margin-top: 1rem;
      padding: 1rem;
      border-radius: 4px;
    }
    .question-feedback.correct {
      background: #d4edda;
      color: #155724;
      border: 1px solid #28a745;
    }
    .question-feedback.incorrect {
      background: #f8d7da;
      color: #721c24;
      border: 1px solid #dc3545;
    }
    .question-explanation {
      margin-top: 0.5rem;
      padding: 0.75rem;
      background: #e7f3ff;
      border-left: 4px solid #4a90e2;
      border-radius: 4px;
    }
    .quiz-results {
      margin-top: 2rem;
      padding: 1.5rem;
      background: #e7f3ff;
      border: 2px solid #4a90e2;
      border-radius: 8px;
      text-align: center;
    }
    .quiz-results h3 {
      margin-bottom: 1rem;
      color: #4a90e2;
    }
    .quiz-navigation {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      background: #f5f5f5;
      border-radius: 8px;
      margin-bottom: 2rem;
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .quiz-questions-container {
      min-height: 400px;
    }
    .quiz-question {
      animation: fadeIn 0.3s;
      padding: 2rem;
      border: 1px solid #ddd;
      border-radius: 8px;
      background: #fff;
      margin-bottom: 2rem;
      max-width: 100%;
      overflow-x: hidden;
    }
    .question-text {
      font-size: 1.2rem;
      margin-bottom: 1.5rem;
      line-height: 1.8;
    }
    .quiz-options {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin: 1.5rem 0;
    }
    .quiz-option-label {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem;
      border: 2px solid #ddd;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 1.1rem;
    }
    .quiz-option-label:hover {
      background: #f0f0f0;
      border-color: #4a90e2;
    }
    .quiz-option-label input[type="radio"] {
      cursor: pointer;
      width: 20px;
      height: 20px;
    }
    .quiz-option-label input[type="radio"]:checked + span {
      font-weight: bold;
      color: #4a90e2;
    }
    .quiz-option-label.correct {
      background: #d4edda;
      border-color: #28a745;
    }
    .quiz-option-label.incorrect {
      background: #f8d7da;
      border-color: #dc3545;
    }
    .quiz-fill-blank {
      margin: 1.5rem 0;
    }
    .quiz-fill-input {
      width: 100%;
      padding: 1rem;
      border: 2px solid #ddd;
      border-radius: 8px;
      font-size: 1.1rem;
    }
    .quiz-fill-input.correct {
      border-color: #28a745;
      background: #d4edda;
    }
    .quiz-fill-input.incorrect {
      border-color: #dc3545;
      background: #f8d7da;
    }
    .question-indicator {
      font-weight: bold;
      font-size: 1.1rem;
    }
    .quiz-actions {
      text-align: center;
      margin: 2rem 0;
    }
    .submit-btn {
      padding: 1rem 2rem;
      background: #28a745;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 1.1rem;
      font-weight: bold;
    }
    .submit-btn:hover {
      background: #218838;
    }
    .submit-btn:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
    .quiz-results {
      margin-top: 2rem;
      padding: 2rem;
      background: #e7f3ff;
      border: 2px solid #4a90e2;
      border-radius: 8px;
      text-align: center;
    }
    .quiz-results h2 {
      margin-bottom: 1rem;
      color: #4a90e2;
      font-size: 2rem;
    }
    .quiz-results .score {
      font-size: 2.5rem;
      font-weight: bold;
      margin: 1.5rem 0;
      color: #28a745;
    }
    .quiz-results .percentage {
      font-size: 1.5rem;
      margin-bottom: 1.5rem;
      color: #666;
    }
    .quiz-results .summary {
      text-align: left;
      margin-top: 2rem;
      padding: 1.5rem;
      background: white;
      border-radius: 8px;
    }
    .quiz-results .summary-item {
      padding: 0.75rem;
      margin: 0.5rem 0;
      border-left: 4px solid #4a90e2;
      background: #f9f9f9;
      border-radius: 4px;
    }
    .quiz-results .summary-item.correct {
      border-left-color: #28a745;
      background: #d4edda;
    }
    .quiz-results .summary-item.incorrect {
      border-left-color: #dc3545;
      background: #f8d7da;
    }
    .drag-drop-activity {
      margin: 2rem 0;
    }
    .drag-drop-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 2px solid #ddd;
    }
    .drag-drop-actions {
      display: flex;
      gap: 1rem;
    }
    .reset-btn {
      padding: 0.5rem 1.5rem;
      background: #6c757d;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 1rem;
      font-weight: bold;
    }
    .reset-btn:hover {
      background: #5a6268;
    }
    .drag-drop-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
      margin: 2rem 0;
    }
    .drag-items-area, .drop-zones-area {
      padding: 1.5rem;
      background: #f9f9f9;
      border-radius: 8px;
    }
    .drag-items-area h3, .drop-zones-area h3 {
      margin-bottom: 1rem;
      font-size: 1.25rem;
    }
    .drag-items-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      min-height: 200px;
    }
    .drag-item {
      padding: 1rem;
      background: #fff;
      border: 2px solid #4a90e2;
      border-radius: 8px;
      cursor: move;
      font-size: 1.1rem;
      transition: all 0.2s;
      user-select: none;
    }
    .drag-item:hover {
      background: #e7f3ff;
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }
    .drag-item.dragging {
      opacity: 0.5;
    }
    .drag-item.placed {
      opacity: 0.6;
      border-color: #999;
    }
    .drop-zones-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      min-height: 300px;
    }
    .drop-zone {
      min-height: 150px;
      padding: 1.5rem;
      background: #fff;
      border: 3px dashed #ddd;
      border-radius: 8px;
      transition: all 0.2s;
    }
    .drop-zone.drag-over {
      border-color: #4a90e2;
      background: #e7f3ff;
    }
    .drop-zone.correct {
      border-color: #28a745;
      background: #d4edda;
    }
    .drop-zone.incorrect {
      border-color: #dc3545;
      background: #f8d7da;
    }
    .zone-label {
      font-weight: bold;
      font-size: 1.1rem;
      margin-bottom: 1rem;
      color: #4a90e2;
    }
    .zone-items {
      min-height: 100px;
    }
    .zone-item {
      padding: 0.75rem;
      margin: 0.5rem 0;
      background: #f0f0f0;
      border-radius: 6px;
      font-size: 1rem;
    }
    .zone-item.correct {
      background: #d4edda;
      border-left: 4px solid #28a745;
    }
    .zone-item.incorrect {
      background: #f8d7da;
      border-left: 4px solid #dc3545;
    }
    .drag-drop-results {
      margin-top: 2rem;
      padding: 2rem;
      background: #e7f3ff;
      border: 2px solid #4a90e2;
      border-radius: 8px;
    }
    .results-header {
      text-align: center;
      margin-bottom: 2rem;
    }
    .results-header h2 {
      margin-bottom: 1.5rem;
      color: #4a90e2;
      font-size: 2rem;
    }
    .score-display {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 2rem;
      margin-bottom: 1rem;
    }
    .score-item {
      text-align: center;
    }
    .score-value {
      font-size: 3rem;
      font-weight: bold;
      line-height: 1;
    }
    .score-label {
      font-size: 0.875rem;
      color: #666;
      margin-top: 0.5rem;
    }
    .score-divider {
      width: 1px;
      height: 4rem;
      background: #ddd;
    }
    .grade-message {
      font-size: 1.25rem;
      font-weight: 600;
      margin-top: 1rem;
    }
    .score-breakdown {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin: 2rem 0;
      padding-top: 2rem;
      border-top: 2px solid #ddd;
    }
    .breakdown-item {
      text-align: center;
      padding: 1.5rem;
      border-radius: 8px;
    }
    .breakdown-correct {
      background: #d4edda;
    }
    .breakdown-incorrect {
      background: #f8d7da;
    }
    .breakdown-value {
      font-size: 2.5rem;
      font-weight: bold;
      margin-bottom: 0.5rem;
    }
    .breakdown-correct .breakdown-value {
      color: #28a745;
    }
    .breakdown-incorrect .breakdown-value {
      color: #dc3545;
    }
    .breakdown-label {
      font-size: 0.875rem;
      color: #666;
    }
    .detailed-feedback {
      margin-top: 2rem;
      padding-top: 2rem;
      border-top: 2px solid #ddd;
    }
    .detailed-feedback h3 {
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 1rem;
      color: #333;
    }
    .feedback-list {
      max-height: 300px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .feedback-item {
      display: flex;
      align-items: start;
      gap: 0.75rem;
      padding: 0.75rem;
      border-radius: 6px;
      font-size: 0.875rem;
    }
    .feedback-correct {
      background: #d4edda;
      border: 1px solid #c3e6cb;
    }
    .feedback-incorrect {
      background: #f8d7da;
      border: 1px solid #f5c6cb;
    }
    .feedback-icon {
      font-size: 1.25rem;
      font-weight: bold;
      flex-shrink: 0;
      margin-top: 0.125rem;
    }
    .feedback-correct .feedback-icon {
      color: #28a745;
    }
    .feedback-incorrect .feedback-icon {
      color: #dc3545;
    }
    .feedback-content {
      flex: 1;
      min-width: 0;
    }
    .feedback-item-text {
      font-weight: 500;
      margin-bottom: 0.25rem;
      word-wrap: break-word;
    }
    .feedback-detail {
      font-size: 0.75rem;
      color: #666;
    }
    .memory-game-container {
      margin: 2rem 0;
      max-width: 900px;
    }
    .memory-game-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 2px solid #ddd;
    }
    .memory-game-stats {
      display: flex;
      gap: 1rem;
    }
    .memory-game-stat {
      padding: 0.5rem 1rem;
      background: #f0f0f0;
      border-radius: 6px;
      font-weight: 600;
      font-size: 0.9rem;
    }
    .memory-game-reset-btn {
      padding: 0.5rem 1.5rem;
      background: #6c757d;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 1rem;
      font-weight: bold;
    }
    .memory-game-reset-btn:hover {
      background: #5a6268;
    }
    .memory-game-grid {
      display: grid;
      gap: 1rem;
      margin: 2rem 0;
    }
    .memory-card {
      aspect-ratio: 1;
      cursor: pointer;
      perspective: 1000px;
    }
    .memory-card-inner {
      position: relative;
      width: 100%;
      height: 100%;
      transition: transform 0.6s;
      transform-style: preserve-3d;
    }
    .memory-card.flipped .memory-card-inner {
      transform: rotateY(180deg);
    }
    .memory-card.matched {
      opacity: 0.6;
      cursor: default;
    }
    .memory-card.matched .memory-card-inner {
      transform: rotateY(180deg);
    }
    .memory-card-front,
    .memory-card-back {
      position: absolute;
      width: 100%;
      height: 100%;
      backface-visibility: hidden;
      -webkit-backface-visibility: hidden;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid #ddd;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .memory-card-front {
      background: #4a90e2;
      color: white;
    }
    .memory-card-back {
      background: #fff;
      transform: rotateY(180deg);
      padding: 1rem;
    }
    .memory-card-question {
      font-size: 3rem;
      font-weight: bold;
    }
    .memory-card-image {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      border-radius: 4px;
    }
    .memory-card-text {
      font-size: 1.1rem;
      font-weight: 500;
      text-align: center;
      word-wrap: break-word;
      padding: 0.5rem;
    }
    .memory-game-completion {
      margin: 2rem 0;
      padding: 2rem;
      background: #e7f3ff;
      border: 2px solid #4a90e2;
      border-radius: 8px;
      text-align: center;
    }
    .completion-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }
    .completion-icon {
      font-size: 4rem;
    }
    .completion-content h2 {
      margin: 0;
      color: #4a90e2;
      font-size: 2rem;
    }
    .completion-content p {
      font-size: 1.1rem;
      color: #666;
      margin: 0;
    }
    @media (max-width: 768px) {
      .drag-drop-container {
        grid-template-columns: 1fr;
      }
      .memory-game-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
      }
    }
    .audio-narration {
      margin: 1.5rem 0;
      font-size: 1.1rem;
    }
    .audio-narration strong {
      font-size: 1.15rem;
    }
    audio {
      width: 100%;
      max-width: 600px;
      margin: 1rem 0;
    }
    @media print {
      body {
        padding: 1rem;
      }
      .slide {
        page-break-after: always;
      }
      .book-navigation, .presentation-navigation {
        display: none;
      }
      .book-page, .presentation-slide {
        display: block !important;
        page-break-after: always;
      }
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  ${description ? `<div class="description">${escapeHtml(description)}</div>` : ""}
  ${bodyContent}
  ${content.type === "interactive-book" ? generateInteractiveBookScript(contentData) : ""}
  ${content.type === "presentation" ? generatePresentationScript(contentData) : ""}
  ${content.type === "quiz" ? generateQuizScript(contentData) : ""}
  ${content.type === "drag-drop" ? generateDragDropScript(contentData) : ""}
  ${content.type === "memory-game" ? generateMemoryGameScript(contentData) : ""}
  ${content.type === "flashcard" ? generateFlashcardScript(contentData) : ""}
</body>
</html>`;
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Extract YouTube video ID from various URL formats
function extractVideoIdFromUrl(url: string): string {
  if (!url) return "";
  
  // Handle direct video ID
  if (!url.includes('http') && !url.includes('/')) {
    return url;
  }
  
  // Handle youtube.com/watch?v=VIDEO_ID
  const watchMatch = url.match(/[?&]v=([^&]+)/);
  if (watchMatch) return watchMatch[1];
  
  // Handle youtu.be/VIDEO_ID
  const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
  if (shortMatch) return shortMatch[1];
  
  // Handle youtube.com/embed/VIDEO_ID
  const embedMatch = url.match(/embed\/([^?&]+)/);
  if (embedMatch) return embedMatch[1];
  
  return "";
}

function generatePresentationHTML(data: any): string {
  if (!data.slides || !Array.isArray(data.slides)) {
    return "<p>No slides available.</p>";
  }

  // Generate all slides as hidden divs (only first one visible)
  let slidesHTML = "";
  data.slides.forEach((slide: any, index: number) => {
    slidesHTML += `<div class="presentation-slide" data-slide-index="${index}" ${index === 0 ? '' : 'style="display: none;"'}>`;
    slidesHTML += `<h2>Slide ${index + 1}</h2>`;
    
    // Slide title
    if (slide.title) {
      slidesHTML += `<h3>${escapeHtml(slide.title)}</h3>`;
    }
    
    // Slide content (can be HTML or plain text)
    if (slide.content) {
      // Check if content is HTML (contains tags)
      if (slide.content.includes('<') && slide.content.includes('>')) {
        // It's HTML, include it directly but sanitize
        slidesHTML += `<div class="slide-content">${slide.content}</div>`;
      } else {
        // It's plain text, escape and format
        slidesHTML += `<div class="slide-content"><p>${escapeHtml(slide.content)}</p></div>`;
      }
    }
    
    // Bullet points
    if (slide.bulletPoints && Array.isArray(slide.bulletPoints) && slide.bulletPoints.length > 0) {
      slidesHTML += `<ul class="bullet-points">`;
      slide.bulletPoints.forEach((point: string) => {
        if (point && point.trim()) {
          slidesHTML += `<li>${escapeHtml(point)}</li>`;
        }
      });
      slidesHTML += `</ul>`;
    }
    
    // Questions (for guiding-questions slide type)
    if (slide.questions && Array.isArray(slide.questions) && slide.questions.length > 0) {
      slidesHTML += `<div class="slide-questions">`;
      slidesHTML += `<h4>Questions:</h4>`;
      slidesHTML += `<ul class="question-list">`;
      slide.questions.forEach((question: string) => {
        if (question && question.trim()) {
          slidesHTML += `<li>${escapeHtml(question)}</li>`;
        }
      });
      slidesHTML += `</ul>`;
      slidesHTML += `</div>`;
    }
    
    // Image (display after content)
    if (slide.imageUrl) {
      slidesHTML += generateImageHtml(slide.imageUrl, slide.imageAlt || slide.title || `Slide ${index + 1} image`);
    }
    
    // Speaker notes (optional, shown in smaller text)
    if (slide.notes) {
      slidesHTML += `<div class="speaker-notes">`;
      slidesHTML += `<strong>Notes:</strong> ${escapeHtml(slide.notes)}`;
      slidesHTML += `</div>`;
    }
    
    slidesHTML += `</div>`;
  });

  // Navigation controls
  const navHTML = `
    <div class="presentation-navigation">
      <button id="prev-slide-btn" class="nav-btn" onclick="goToSlide(currentSlideIndex - 1)" disabled>← Previous</button>
      <span class="slide-indicator">
        <span id="current-slide-num">1</span> / <span id="total-slides">${data.slides.length}</span>
      </span>
      <button id="next-slide-btn" class="nav-btn" onclick="goToSlide(currentSlideIndex + 1)" ${data.slides.length === 1 ? 'disabled' : ''}>Next →</button>
    </div>
    <div class="presentation-slides-container">
      ${slidesHTML}
    </div>
  `;

  return navHTML;
}

function generateInteractiveBookHTML(data: InteractiveBookData): string {
  if (!data.pages || data.pages.length === 0) {
    return "<p>No pages available.</p>";
  }

  // Generate all pages as hidden divs
  let pagesHTML = "";
  data.pages.forEach((page, index) => {
    pagesHTML += `<div class="book-page" data-page-index="${index}" ${index === 0 ? '' : 'style="display: none;"'}>`;
    pagesHTML += `<h2>${escapeHtml(page.title || `Page ${index + 1}`)}</h2>`;

    // Page content based on type
    if (!page.pageType || page.pageType === "content") {
      if (page.content) {
        pagesHTML += `<div class="page-content">${page.content}</div>`;
      }
    } else if (page.pageType === "video" && page.videoData) {
      pagesHTML += `<h3>Video: ${escapeHtml(page.videoData.title)}</h3>`;
      // Use videoId or extract from videoUrl
      const videoId = page.videoData.videoId || extractVideoIdFromUrl(page.videoData.videoUrl || "");
      const videoUrl = page.videoData.videoUrl || "";
      const localVideoUrl = page.videoData.localVideoUrl || "";
      
      if (videoId || videoUrl || localVideoUrl) {
        pagesHTML += generateVideoHtml(
          videoId || "", 
          page.videoData.title || "", 
          videoUrl,
          localVideoUrl
        );
      } else {
        pagesHTML += `<p style="color: #dc3545; padding: 1rem; background: #f8d7da; border-radius: 4px;">Error: Invalid video ID. Please check the video URL.</p>`;
      }
      if (page.videoData.instructions) {
        pagesHTML += `<div class="instructions"><strong>Instructions:</strong> ${escapeHtml(page.videoData.instructions)}</div>`;
      }
    } else if (page.pageType === "quiz" && page.quizData) {
      pagesHTML += generateInteractiveQuizHTML(page.quizData, index);
    } else if (page.pageType === "image" && page.imageData) {
      pagesHTML += generateImageHtml(page.imageData.imageUrl, page.imageData.imageAlt || "Page image");
      if (page.imageData.instructions) {
        pagesHTML += `<div class="instructions"><strong>Instructions:</strong> ${escapeHtml(page.imageData.instructions)}</div>`;
      }
    }

    // Audio narration
    if (page.audioUrl) {
      pagesHTML += `<div class="audio-narration"><strong>Narration:</strong></div>`;
      pagesHTML += generateAudioHtml(page.audioUrl);
    }

    pagesHTML += `</div>`;
  });

  // Navigation controls
  const navHTML = `
    <div class="book-navigation">
      <button id="prev-page-btn" class="nav-btn" onclick="goToPage(currentPageIndex - 1)" disabled>← Previous</button>
      <span class="page-indicator">
        <span id="current-page-num">1</span> / <span id="total-pages">${data.pages.length}</span>
      </span>
      <button id="next-page-btn" class="nav-btn" onclick="goToPage(currentPageIndex + 1)" ${data.pages.length === 1 ? 'disabled' : ''}>Next →</button>
    </div>
    <div class="book-pages-container">
      ${pagesHTML}
    </div>
  `;

  return navHTML;
}

function generateQuizHTML(data: QuizData): string {
  if (!data.questions || data.questions.length === 0) {
    return "<p>No questions available.</p>";
  }

  // Generate all questions as hidden divs (only first one visible)
  let questionsHTML = "";
  data.questions.forEach((question, index) => {
    const questionId = `q-${index}`;
    questionsHTML += `<div class="quiz-question" data-question-index="${index}" ${index === 0 ? '' : 'style="display: none;"'}>`;
    questionsHTML += `<h3>Question ${index + 1} of ${data.questions.length}</h3>`;
    questionsHTML += `<p class="question-text"><strong>${escapeHtml(question.question)}</strong></p>`;

    if (question.type === "multiple-choice" && question.options) {
      questionsHTML += `<div class="quiz-options">`;
      question.options.forEach((option, optIndex) => {
        const optionId = `${questionId}-opt-${optIndex}`;
        questionsHTML += `<label class="quiz-option-label">`;
        questionsHTML += `<input type="radio" name="${questionId}" value="${optIndex}" data-correct="${question.correctAnswer === optIndex}" id="${optionId}">`;
        questionsHTML += `<span>${escapeHtml(option)}</span>`;
        questionsHTML += `</label>`;
      });
      questionsHTML += `</div>`;
    } else if (question.type === "true-false") {
      const correctValue = String(question.correctAnswer) === "true";
      questionsHTML += `<div class="quiz-options">`;
      questionsHTML += `<label class="quiz-option-label">`;
      questionsHTML += `<input type="radio" name="${questionId}" value="true" data-correct="${correctValue}" id="${questionId}-true">`;
      questionsHTML += `<span>True</span>`;
      questionsHTML += `</label>`;
      questionsHTML += `<label class="quiz-option-label">`;
      questionsHTML += `<input type="radio" name="${questionId}" value="false" data-correct="${!correctValue}" id="${questionId}-false">`;
      questionsHTML += `<span>False</span>`;
      questionsHTML += `</label>`;
      questionsHTML += `</div>`;
    } else if (question.type === "fill-blank") {
      questionsHTML += `<div class="quiz-fill-blank">`;
      questionsHTML += `<input type="text" class="quiz-fill-input" data-correct="${escapeHtml(String(question.correctAnswer))}" placeholder="Enter your answer..." id="${questionId}-input">`;
      questionsHTML += `</div>`;
    }

    questionsHTML += `<div class="question-feedback" id="${questionId}-feedback" style="display: none;"></div>`;
    if (question.explanation) {
      questionsHTML += `<div class="question-explanation" id="${questionId}-explanation" style="display: none;">`;
      questionsHTML += `<p><em>${escapeHtml(question.explanation)}</em></p>`;
      questionsHTML += `</div>`;
    }

    questionsHTML += `</div>`;
  });

  // Navigation and submit button
  const navHTML = `
    <div class="quiz-navigation">
      <button id="prev-question-btn" class="nav-btn" onclick="goToQuestion(currentQuestionIndex - 1)" disabled>← Previous</button>
      <span class="question-indicator">
        <span id="current-question-num">1</span> / <span id="total-questions">${data.questions.length}</span>
      </span>
      <button id="next-question-btn" class="nav-btn" onclick="goToQuestion(currentQuestionIndex + 1)" ${data.questions.length === 1 ? 'disabled' : ''}>Next →</button>
    </div>
    <div class="quiz-questions-container">
      ${questionsHTML}
    </div>
    <div class="quiz-actions">
      <button id="submit-quiz-btn" class="submit-btn" onclick="submitQuiz()">Submit Quiz</button>
    </div>
    <div class="quiz-results" id="quiz-results" style="display: none;"></div>
  `;

  return navHTML;
}

function generateInteractiveQuizHTML(data: QuizData, quizId: number): string {
  if (!data.questions || data.questions.length === 0) {
    return "<p>No questions available.</p>";
  }

  let html = `<div class="interactive-quiz" data-quiz-id="${quizId}">`;
  html += `<div class="quiz-header"><h3>Quiz</h3><button onclick="checkQuiz(${quizId})" class="check-btn">Check Answers</button></div>`;
  
  data.questions.forEach((question, index) => {
    const questionId = `quiz-${quizId}-q-${index}`;
    html += `<div class="question interactive-question" data-question-id="${questionId}">`;
    html += `<h4>Question ${index + 1}</h4>`;
    html += `<p><strong>${escapeHtml(question.question)}</strong></p>`;

    if (question.type === "multiple-choice" && question.options) {
      html += `<div class="options interactive-options">`;
      question.options.forEach((option, optIndex) => {
        const optionId = `${questionId}-opt-${optIndex}`;
        const isCorrect = question.correctAnswer === optIndex;
        html += `<label class="option-label">`;
        html += `<input type="radio" name="${questionId}" value="${optIndex}" data-correct="${isCorrect}" id="${optionId}">`;
        html += `<span>${escapeHtml(option)}</span>`;
        html += `</label>`;
      });
      html += `</div>`;
    } else if (question.type === "true-false") {
      const correctValue = String(question.correctAnswer) === "true" ? "true" : "false";
      html += `<div class="options interactive-options">`;
      html += `<label class="option-label">`;
      html += `<input type="radio" name="${questionId}" value="true" data-correct="${correctValue === 'true'}" id="${questionId}-true">`;
      html += `<span>True</span>`;
      html += `</label>`;
      html += `<label class="option-label">`;
      html += `<input type="radio" name="${questionId}" value="false" data-correct="${correctValue === 'false'}" id="${questionId}-false">`;
      html += `<span>False</span>`;
      html += `</label>`;
      html += `</div>`;
    } else if (question.type === "fill-blank") {
      html += `<div class="fill-blank-answer">`;
      html += `<input type="text" class="fill-blank-input" data-correct="${escapeHtml(String(question.correctAnswer))}" placeholder="Enter your answer">`;
      html += `</div>`;
    }

    html += `<div class="question-feedback" id="${questionId}-feedback" style="display: none;"></div>`;
    if (question.explanation) {
      html += `<div class="question-explanation" id="${questionId}-explanation" style="display: none;">`;
      html += `<p><em>${escapeHtml(question.explanation)}</em></p>`;
      html += `</div>`;
    }

    html += `</div>`;
  });

  html += `<div class="quiz-results" id="quiz-${quizId}-results" style="display: none;"></div>`;
  html += `</div>`;

  return html;
}

function generateMemoryGameHTML(data: any): string {
  if (!data.cards || data.cards.length === 0) {
    return "<p>No cards available.</p>";
  }

  const columns = data.settings?.columns || 4;
  const showTimer = data.settings?.showTimer || false;
  const showMoves = data.settings?.showMoves || false;

  // Generate card HTML
  let cardsHTML = "";
  data.cards.forEach((card: any, index: number) => {
    const cardId = `memory-card-${index}`;
    cardsHTML += `
      <div 
        class="memory-card" 
        id="${cardId}"
        data-card-index="${index}"
        data-match-id="${escapeHtml(card.matchId || '')}"
        onclick="handleMemoryCardClick(${index})"
      >
        <div class="memory-card-inner">
          <div class="memory-card-front">
            <span class="memory-card-question">?</span>
          </div>
          <div class="memory-card-back">
            ${card.type === "image" && card.imageUrl
              ? `<img src="${escapeHtml(card.imageUrl)}" alt="${escapeHtml(card.content || 'Memory card')}" class="memory-card-image" />`
              : `<div class="memory-card-text">${escapeHtml(card.content || "")}</div>`
            }
          </div>
        </div>
      </div>
    `;
  });

  const html = `
    <div class="memory-game-container">
      <div class="memory-game-header">
        <div class="memory-game-stats">
          ${showTimer ? `<div class="memory-game-stat" id="memory-timer">Time: <span id="timer-value">0:00</span></div>` : ""}
          ${showMoves ? `<div class="memory-game-stat" id="memory-moves">Moves: <span id="moves-value">0</span></div>` : ""}
        </div>
        <button class="memory-game-reset-btn" onclick="resetMemoryGame()">Reset</button>
      </div>
      
      <div class="memory-game-completion" id="memory-completion" style="display: none;">
        <div class="completion-content">
          <div class="completion-icon">🏆</div>
          <h2>Congratulations!</h2>
          <p>You completed the game in <span id="completion-moves">0</span> moves and <span id="completion-time">0:00</span></p>
        </div>
      </div>
      
      <div class="memory-game-grid" id="memory-game-grid" style="grid-template-columns: repeat(${columns}, minmax(0, 1fr));">
        ${cardsHTML}
      </div>
    </div>
  `;

  return html;
}

// Generate JavaScript for flashcard functionality
function generateFlashcardScript(data: FlashcardData): string {
  const cardsData = JSON.stringify(data.cards || []);
  const settings = JSON.stringify(data.settings || {});
  
  return `
  <script>
    const flashcardData = ${cardsData};
    const flashcardSettings = ${settings};
    let currentCardIndex = 0;
    let isFlipped = false;
    let shuffledCards = [...flashcardData];
    
    function escapeHtml(text) {
      if (!text) return "";
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
    
    function updateCard() {
      const card = shuffledCards[currentCardIndex];
      if (!card) return;
      
      const frontContent = document.getElementById('flashcard-front-content');
      const backContent = document.getElementById('flashcard-back-content');
      const cardNum = document.getElementById('current-card-num');
      const progressBar = document.getElementById('progress-bar');
      const progressPercentage = document.getElementById('progress-percentage');
      const prevBtn = document.getElementById('prev-btn');
      const nextBtn = document.getElementById('next-btn');
      
      if (!frontContent || !backContent) return;
      
      // Reset flip state
      isFlipped = false;
      document.getElementById('flashcard').classList.remove('flipped');
      
      // Update front
      let frontHtml = "";
      if (card.frontImageUrl) {
        const imageSrc = card.frontImageUrl.startsWith('data:') 
          ? card.frontImageUrl 
          : (card.frontImageUrl.startsWith('http') ? card.frontImageUrl : 'data:image/png;base64,' + card.frontImageUrl);
        frontHtml += \`<img src="\${imageSrc}" alt="\${escapeHtml(card.frontImageAlt || card.front || 'Front image')}" style="max-width: 100%; max-height: 200px; margin: 1rem 0; border-radius: 8px; object-fit: contain;" />\`;
      }
      if (card.front) {
        frontHtml += \`<p>\${escapeHtml(card.front)}</p>\`;
      }
      frontContent.innerHTML = frontHtml;
      
      // Update back
      let backHtml = "";
      if (card.backImageUrl) {
        const imageSrc = card.backImageUrl.startsWith('data:') 
          ? card.backImageUrl 
          : (card.backImageUrl.startsWith('http') ? card.backImageUrl : 'data:image/png;base64,' + card.backImageUrl);
        backHtml += \`<img src="\${imageSrc}" alt="\${escapeHtml(card.backImageAlt || card.back || 'Back image')}" style="max-width: 100%; max-height: 200px; margin: 1rem 0; border-radius: 8px; object-fit: contain;" />\`;
      }
      if (card.back) {
        backHtml += \`<p>\${escapeHtml(card.back)}</p>\`;
      }
      backContent.innerHTML = backHtml;
      
      // Update counter
      if (cardNum) {
        cardNum.textContent = (currentCardIndex + 1).toString();
      }
      
      // Update progress
      if (progressBar && progressPercentage) {
        const progress = ((currentCardIndex + 1) / shuffledCards.length) * 100;
        progressBar.style.width = progress + '%';
        progressPercentage.textContent = Math.round(progress) + '%';
      }
      
      // Update buttons
      if (prevBtn) {
        prevBtn.disabled = currentCardIndex === 0;
      }
      if (nextBtn) {
        nextBtn.disabled = currentCardIndex === shuffledCards.length - 1;
      }
    }
    
    function toggleFlip() {
      isFlipped = !isFlipped;
      const flashcard = document.getElementById('flashcard');
      if (flashcard) {
        if (isFlipped) {
          flashcard.classList.add('flipped');
        } else {
          flashcard.classList.remove('flipped');
        }
      }
    }
    
    function nextCard() {
      if (currentCardIndex < shuffledCards.length - 1) {
        currentCardIndex++;
        updateCard();
      }
    }
    
    function previousCard() {
      if (currentCardIndex > 0) {
        currentCardIndex--;
        updateCard();
      }
    }
    
    function shuffleCards() {
      // Fisher-Yates shuffle
      shuffledCards = [...flashcardData];
      for (let i = shuffledCards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledCards[i], shuffledCards[j]] = [shuffledCards[j], shuffledCards[i]];
      }
      currentCardIndex = 0;
      updateCard();
    }
    
    function restartCards() {
      shuffledCards = [...flashcardData];
      currentCardIndex = 0;
      updateCard();
    }
    
    // Keyboard navigation
    document.addEventListener('keydown', function(e) {
      if (e.key === 'ArrowLeft') {
        previousCard();
      } else if (e.key === 'ArrowRight') {
        nextCard();
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        toggleFlip();
      }
    });
    
    // Initialize on load
    document.addEventListener('DOMContentLoaded', function() {
      updateCard();
    });
  </script>
  `;
}

function generateFlashcardHTML(data: FlashcardData): string {
  if (!data.cards || data.cards.length === 0) {
    return "<p>No flashcards available.</p>";
  }

  const cardsData = JSON.stringify(data.cards);
  const settings = JSON.stringify(data.settings || {});
  
  const html = `
    <div class="flashcard-container">
      ${data.settings?.showProgress !== false ? `
        <div class="flashcard-progress">
          <div class="progress-info">
            <span class="card-counter">Card <span id="current-card-num">1</span> of ${data.cards.length}</span>
            <span class="progress-percentage" id="progress-percentage">0%</span>
          </div>
          <div class="progress-bar-container">
            <div class="progress-bar" id="progress-bar"></div>
          </div>
        </div>
      ` : ""}
      
      <div class="flashcard-wrapper" id="flashcard-wrapper">
        <div class="flashcard" id="flashcard" onclick="toggleFlip()">
          <div class="flashcard-inner" id="flashcard-inner">
            <!-- Front -->
            <div class="flashcard-face flashcard-front" id="flashcard-front">
              <div class="flashcard-label">Front</div>
              <div class="flashcard-content" id="flashcard-front-content"></div>
              <div class="flashcard-hint">Click to flip</div>
            </div>
            <!-- Back -->
            <div class="flashcard-face flashcard-back" id="flashcard-back">
              <div class="flashcard-label">Back</div>
              <div class="flashcard-content" id="flashcard-back-content"></div>
              <div class="flashcard-hint">Click to flip</div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="flashcard-controls">
        <button class="control-btn" id="prev-btn" onclick="previousCard()" disabled>
          ← Previous
        </button>
        <div class="control-actions">
          ${data.settings?.shuffleCards ? `
            <button class="control-btn secondary" onclick="shuffleCards()">
              🔀 Shuffle
            </button>
          ` : ""}
          <button class="control-btn secondary" onclick="restartCards()">
            ↻ Restart
          </button>
        </div>
        <button class="control-btn" id="next-btn" onclick="nextCard()">
          Next →
        </button>
      </div>
    </div>
  `;

  return html;
}

function generateDragDropHTML(data: any): string {
  if (!data.items || data.items.length === 0 || !data.zones || data.zones.length === 0) {
    return "<p>No drag and drop items available.</p>";
  }

  // Generate draggable items
  let itemsHTML = "";
  data.items.forEach((item: any) => {
    itemsHTML += `
      <div 
        class="drag-item" 
        draggable="true" 
        data-item-id="${item.id}"
        data-correct-zone="${item.correctZone}"
        id="item-${item.id}"
      >
        ${escapeHtml(item.content)}
      </div>
    `;
  });

  // Generate drop zones
  let zonesHTML = "";
  data.zones.forEach((zone: any) => {
    zonesHTML += `
      <div 
        class="drop-zone ${zone.allowMultiple ? 'allow-multiple' : ''}"
        data-zone-id="${zone.id}"
        id="zone-${zone.id}"
      >
        <div class="zone-label">${escapeHtml(zone.label)}</div>
        <div class="zone-items" id="zone-items-${zone.id}"></div>
      </div>
    `;
  });

  const html = `
    <div class="drag-drop-activity">
      <div class="drag-drop-header">
        <h2>Drag and Drop Activity</h2>
        <div class="drag-drop-actions">
          <button id="check-answers-btn" class="check-btn" onclick="checkDragDropAnswers()">Check Answers</button>
          <button id="reset-btn" class="reset-btn" onclick="resetDragDrop()">Reset</button>
        </div>
      </div>
      
      <div class="drag-drop-container">
        <div class="drag-items-area">
          <h3>Items to Drag</h3>
          <div class="drag-items-list" id="drag-items-list">
            ${itemsHTML}
          </div>
        </div>
        
        <div class="drop-zones-area">
          <h3>Drop Zones</h3>
          <div class="drop-zones-grid">
            ${zonesHTML}
          </div>
        </div>
      </div>
      
      <div class="drag-drop-results" id="drag-drop-results" style="display: none;"></div>
    </div>
  `;

  return html;
}

// Generate JavaScript for drag-and-drop functionality
function generateDragDropScript(data: any): string {
  const itemsData = JSON.stringify(data.items || []);
  const zonesData = JSON.stringify(data.zones || []);
  const settings = JSON.stringify(data.settings || {});
  
  return `
  <script>
    const items = ${itemsData};
    const zones = ${zonesData};
    const settings = ${settings};
    let placements = {};
    let feedback = {};
    let draggedItemId = null;
    let activitySubmitted = false;
    
    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
    
    function handleDragStart(e, itemId) {
      draggedItemId = itemId;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/html', itemId);
      e.currentTarget.classList.add('dragging');
    }
    
    function handleDragEnd(e) {
      e.currentTarget.classList.remove('dragging');
      draggedItemId = null;
    }
    
    function handleDragOver(e) {
      if (e.preventDefault) {
        e.preventDefault();
      }
      e.dataTransfer.dropEffect = 'move';
      return false;
    }
    
    function handleDragEnter(e) {
      e.currentTarget.classList.add('drag-over');
    }
    
    function handleDragLeave(e) {
      e.currentTarget.classList.remove('drag-over');
    }
    
    function handleDrop(e, zoneId) {
      if (e.stopPropagation) {
        e.stopPropagation();
      }
      e.preventDefault();
      
      e.currentTarget.classList.remove('drag-over');
      
      if (!draggedItemId) return;
      
      const zone = zones.find(z => z.id === zoneId);
      if (!zone) return;
      
      // Check if zone allows multiple items
      if (!zone.allowMultiple) {
        // Remove any existing item in this zone
        const existingItem = Object.entries(placements).find(([_, z]) => z === zoneId);
        if (existingItem && existingItem[0] !== draggedItemId) {
          removeItemFromZone(existingItem[0]);
        }
      }
      
      // Place the item
      placeItem(draggedItemId, zoneId);
      
      draggedItemId = null;
      return false;
    }
    
    function placeItem(itemId, zoneId) {
      // Remove item from items list
      const itemElement = document.getElementById(\`item-\${itemId}\`);
      if (itemElement) {
        itemElement.classList.add('placed');
        itemElement.style.display = 'none';
      }
      
      // Add to zone
      const zoneItemsContainer = document.getElementById(\`zone-items-\${zoneId}\`);
      if (zoneItemsContainer) {
        const item = items.find(i => i.id === itemId);
        if (item) {
          const zoneItem = document.createElement('div');
          zoneItem.className = 'zone-item';
          zoneItem.id = \`placed-\${itemId}\`;
          zoneItem.textContent = item.content;
          zoneItem.setAttribute('data-item-id', itemId);
          zoneItem.setAttribute('data-zone-id', zoneId);
          zoneItem.onclick = () => removeItemFromZone(itemId);
          zoneItem.style.cursor = 'pointer';
          zoneItem.title = 'Click to remove';
          zoneItemsContainer.appendChild(zoneItem);
        }
      }
      
      placements[itemId] = zoneId;
      
      // Instant feedback if enabled
      if (settings.instantFeedback) {
        const item = items.find(i => i.id === itemId);
        if (item) {
          const isCorrect = item.correctZone === zoneId;
          feedback[itemId] = isCorrect;
          updateItemFeedback(itemId, zoneId, isCorrect);
        }
      }
    }
    
    function removeItemFromZone(itemId) {
      if (activitySubmitted) return;
      
      const zoneId = placements[itemId];
      if (!zoneId) return;
      
      // Remove from zone
      const zoneItem = document.getElementById(\`placed-\${itemId}\`);
      if (zoneItem) {
        zoneItem.remove();
      }
      
      // Show in items list again
      const itemElement = document.getElementById(\`item-\${itemId}\`);
      if (itemElement) {
        itemElement.classList.remove('placed');
        itemElement.style.display = 'block';
      }
      
      // Remove from placements
      delete placements[itemId];
      delete feedback[itemId];
      
      // Clear zone feedback
      const zone = document.getElementById(\`zone-\${zoneId}\`);
      if (zone) {
        zone.classList.remove('correct', 'incorrect');
      }
    }
    
    function updateItemFeedback(itemId, zoneId, isCorrect) {
      const zoneItem = document.getElementById(\`placed-\${itemId}\`);
      const zone = document.getElementById(\`zone-\${zoneId}\`);
      
      if (zoneItem) {
        zoneItem.classList.remove('correct', 'incorrect');
        zoneItem.classList.add(isCorrect ? 'correct' : 'incorrect');
      }
      
      if (zone && settings.instantFeedback) {
        // Update zone color based on all items in it
        const allCorrect = items.filter(i => placements[i.id] === zoneId)
          .every(i => i.correctZone === zoneId);
        zone.classList.remove('correct', 'incorrect');
        if (allCorrect && Object.keys(placements).some(id => placements[id] === zoneId)) {
          zone.classList.add('correct');
        }
      }
    }
    
    function checkDragDropAnswers() {
      if (activitySubmitted) return;
      
      activitySubmitted = true;
      
      // Calculate feedback for all items
      items.forEach(item => {
        const placedZone = placements[item.id];
        const isCorrect = placedZone === item.correctZone;
        feedback[item.id] = isCorrect;
        if (placedZone) {
          updateItemFeedback(item.id, placedZone, isCorrect);
        }
      });
      
      // Update zone colors
      zones.forEach(zone => {
        const zoneElement = document.getElementById(\`zone-\${zone.id}\`);
        if (zoneElement) {
          const itemsInZone = items.filter(i => placements[i.id] === zone.id);
          if (itemsInZone.length > 0) {
            const allCorrect = itemsInZone.every(i => i.correctZone === zone.id);
            zoneElement.classList.add(allCorrect ? 'correct' : 'incorrect');
          }
        }
      });
      
      // Calculate score
      const correctCount = Object.values(feedback).filter(Boolean).length;
      const totalItems = items.length;
      const percentage = Math.round((correctCount / totalItems) * 100);
      
      // Calculate grade
      function getGrade(pct) {
        if (pct >= 90) return { grade: 'A+', color: '#16a34a', message: 'Excellent! Outstanding work!' };
        if (pct >= 80) return { grade: 'A', color: '#16a34a', message: 'Great job! Well done!' };
        if (pct >= 70) return { grade: 'B', color: '#2563eb', message: 'Good work! Keep it up!' };
        if (pct >= 60) return { grade: 'C', color: '#ca8a04', message: 'Not bad! Review and try again.' };
        if (pct >= 50) return { grade: 'D', color: '#ea580c', message: 'Keep practicing! You can do better.' };
        return { grade: 'F', color: '#dc2626', message: 'Don\\'t give up! Review the material and try again.' };
      }
      
      const gradeInfo = getGrade(percentage);
      
      // Generate detailed feedback HTML
      let feedbackHTML = '';
      items.forEach(item => {
        const isCorrect = feedback[item.id] === true;
        const placedZone = placements[item.id];
        const placedZoneLabel = zones.find(z => z.id === placedZone)?.label || 'Unknown';
        const correctZone = zones.find(z => z.id === item.correctZone);
        const correctZoneLabel = correctZone?.label || 'Unknown';
        
        feedbackHTML += \`
          <div class="feedback-item \${isCorrect ? 'feedback-correct' : 'feedback-incorrect'}">
            <div class="feedback-icon">\${isCorrect ? '✓' : '✗'}</div>
            <div class="feedback-content">
              <div class="feedback-item-text">\${escapeHtml(item.content)}</div>
              <div class="feedback-detail">
                \${isCorrect 
                  ? \`✓ Correctly placed in "\${escapeHtml(placedZoneLabel)}"\`
                  : \`✗ Placed in "\${escapeHtml(placedZoneLabel)}" (should be "\${escapeHtml(correctZoneLabel)}")\`
                }
              </div>
            </div>
          </div>
        \`;
      });
      
      // Show results
      const resultsDiv = document.getElementById('drag-drop-results');
      if (resultsDiv) {
        resultsDiv.style.display = 'block';
        resultsDiv.innerHTML = \`
          <div class="results-header">
            <h2>Activity Results</h2>
            <div class="score-display">
              <div class="score-item">
                <div class="score-value">\${correctCount}/\${totalItems}</div>
                <div class="score-label">Correct</div>
              </div>
              <div class="score-divider"></div>
              <div class="score-item">
                <div class="score-value" style="color: \${gradeInfo.color}">\${percentage}%</div>
                <div class="score-label">Score</div>
              </div>
              <div class="score-divider"></div>
              <div class="score-item">
                <div class="score-value" style="color: \${gradeInfo.color}">\${gradeInfo.grade}</div>
                <div class="score-label">Grade</div>
              </div>
            </div>
            <div class="grade-message" style="color: \${gradeInfo.color}">\${gradeInfo.message}</div>
          </div>
          <div class="score-breakdown">
            <div class="breakdown-item breakdown-correct">
              <div class="breakdown-value">\${correctCount}</div>
              <div class="breakdown-label">Correct</div>
            </div>
            <div class="breakdown-item breakdown-incorrect">
              <div class="breakdown-value">\${totalItems - correctCount}</div>
              <div class="breakdown-label">Incorrect</div>
            </div>
          </div>
          <div class="detailed-feedback">
            <h3>Item Feedback:</h3>
            <div class="feedback-list">
              \${feedbackHTML}
            </div>
          </div>
        \`;
        resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      
      // Disable buttons
      const checkBtn = document.getElementById('check-answers-btn');
      if (checkBtn) checkBtn.disabled = true;
    }
    
    function resetDragDrop() {
      if (activitySubmitted) return;
      
      // Clear all placements
      Object.keys(placements).forEach(itemId => {
        removeItemFromZone(itemId);
      });
      
      placements = {};
      feedback = {};
    }
    
    // Initialize drag events for all items and drop zones
    document.addEventListener('DOMContentLoaded', function() {
      // Set up drag events for items
      items.forEach(item => {
        const itemElement = document.getElementById(\`item-\${item.id}\`);
        if (itemElement) {
          itemElement.addEventListener('dragstart', (e) => handleDragStart(e, item.id));
          itemElement.addEventListener('dragend', handleDragEnd);
        }
      });
      
      // Set up drop events for zones
      zones.forEach(zone => {
        const zoneElement = document.getElementById(\`zone-\${zone.id}\`);
        if (zoneElement) {
          zoneElement.addEventListener('drop', (e) => handleDrop(e, zone.id));
          zoneElement.addEventListener('dragover', handleDragOver);
          zoneElement.addEventListener('dragenter', handleDragEnter);
          zoneElement.addEventListener('dragleave', handleDragLeave);
        }
      });
    });
  </script>
  `;
}

// Generate JavaScript for memory game functionality
function generateMemoryGameScript(data: any): string {
  const cardsData = JSON.stringify(data.cards || []);
  const settings = JSON.stringify(data.settings || {});
  
  return `
  <script>
    const memoryCards = ${cardsData};
    const memorySettings = ${settings};
    let shuffledCards = [];
    let flippedIndices = [];
    let matchedPairs = new Set();
    let moves = 0;
    let startTime = Date.now();
    let elapsedTime = 0;
    let timerInterval = null;
    let isComplete = false;
    
    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
    
    function shuffleArray(array) {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    }
    
    function formatTime(seconds) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return \`\${mins}:\${secs.toString().padStart(2, '0')}\`;
    }
    
    function updateTimer() {
      if (!memorySettings.showTimer || isComplete) return;
      elapsedTime = Math.floor((Date.now() - startTime) / 1000);
      const timerEl = document.getElementById('timer-value');
      if (timerEl) {
        timerEl.textContent = formatTime(elapsedTime);
      }
    }
    
    function updateMoves() {
      const movesEl = document.getElementById('moves-value');
      if (movesEl) {
        movesEl.textContent = moves;
      }
    }
    
    function handleMemoryCardClick(index) {
      if (isComplete) return;
      if (flippedIndices.length === 2) return;
      if (flippedIndices.includes(index)) return;
      if (matchedPairs.has(shuffledCards[index].matchId)) return;
      
      const card = document.getElementById(\`memory-card-\${index}\`);
      if (!card) return;
      
      card.classList.add('flipped');
      flippedIndices.push(index);
      
      if (flippedIndices.length === 2) {
        moves++;
        updateMoves();
        
        const [first, second] = flippedIndices;
        const firstCard = shuffledCards[first];
        const secondCard = shuffledCards[second];
        
        if (firstCard.matchId === secondCard.matchId) {
          // Match found
          matchedPairs.add(firstCard.matchId);
          
          // Mark cards as matched
          const firstCardEl = document.getElementById(\`memory-card-\${first}\`);
          const secondCardEl = document.getElementById(\`memory-card-\${second}\`);
          if (firstCardEl) firstCardEl.classList.add('matched');
          if (secondCardEl) secondCardEl.classList.add('matched');
          
          flippedIndices = [];
          
          // Check if game is complete
          if (matchedPairs.size === shuffledCards.length / 2) {
            isComplete = true;
            if (timerInterval) {
              clearInterval(timerInterval);
            }
            showCompletion();
          }
        } else {
          // No match - flip back after delay
          setTimeout(() => {
            const firstCardEl = document.getElementById(\`memory-card-\${first}\`);
            const secondCardEl = document.getElementById(\`memory-card-\${second}\`);
            if (firstCardEl) firstCardEl.classList.remove('flipped');
            if (secondCardEl) secondCardEl.classList.remove('flipped');
            flippedIndices = [];
          }, 1000);
        }
      }
    }
    
    function showCompletion() {
      const completionEl = document.getElementById('memory-completion');
      const completionMovesEl = document.getElementById('completion-moves');
      const completionTimeEl = document.getElementById('completion-time');
      
      if (completionEl) {
        completionEl.style.display = 'block';
        if (completionMovesEl) completionMovesEl.textContent = moves;
        if (completionTimeEl) completionTimeEl.textContent = formatTime(elapsedTime);
        completionEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
    
    function resetMemoryGame() {
      // Shuffle cards
      shuffledCards = shuffleArray(memoryCards);
      
      // Reset state
      flippedIndices = [];
      matchedPairs = new Set();
      moves = 0;
      startTime = Date.now();
      elapsedTime = 0;
      isComplete = false;
      
      // Reset UI
      const completionEl = document.getElementById('memory-completion');
      if (completionEl) {
        completionEl.style.display = 'none';
      }
      
      // Remove all card classes and re-render
      const grid = document.getElementById('memory-game-grid');
      if (grid) {
        grid.innerHTML = '';
        shuffledCards.forEach((card, index) => {
          const cardId = \`memory-card-\${index}\`;
          const cardEl = document.createElement('div');
          cardEl.className = 'memory-card';
          cardEl.id = cardId;
          cardEl.setAttribute('data-card-index', index);
          cardEl.setAttribute('data-match-id', card.matchId || '');
          cardEl.onclick = () => handleMemoryCardClick(index);
          
          cardEl.innerHTML = \`
            <div class="memory-card-inner">
              <div class="memory-card-front">
                <span class="memory-card-question">?</span>
              </div>
              <div class="memory-card-back">
                \${card.type === "image" && card.imageUrl
                  ? \`<img src="\${escapeHtml(card.imageUrl)}" alt="\${escapeHtml(card.content || 'Memory card')}" class="memory-card-image" />\`
                  : \`<div class="memory-card-text">\${escapeHtml(card.content || "")}</div>\`
                }
              </div>
            </div>
          \`;
          
          grid.appendChild(cardEl);
        });
      }
      
      updateMoves();
      
      // Restart timer
      if (timerInterval) {
        clearInterval(timerInterval);
      }
      if (memorySettings.showTimer) {
        timerInterval = setInterval(updateTimer, 1000);
      }
    }
    
    // Initialize game on load
    document.addEventListener('DOMContentLoaded', function() {
      shuffledCards = shuffleArray(memoryCards);
      
      // Re-render cards in shuffled order
      const grid = document.getElementById('memory-game-grid');
      if (grid) {
        grid.innerHTML = '';
        shuffledCards.forEach((card, index) => {
          const cardId = \`memory-card-\${index}\`;
          const cardEl = document.createElement('div');
          cardEl.className = 'memory-card';
          cardEl.id = cardId;
          cardEl.setAttribute('data-card-index', index);
          cardEl.setAttribute('data-match-id', card.matchId || '');
          cardEl.onclick = () => handleMemoryCardClick(index);
          
          cardEl.innerHTML = \`
            <div class="memory-card-inner">
              <div class="memory-card-front">
                <span class="memory-card-question">?</span>
              </div>
              <div class="memory-card-back">
                \${card.type === "image" && card.imageUrl
                  ? \`<img src="\${escapeHtml(card.imageUrl)}" alt="\${escapeHtml(card.content || 'Memory card')}" class="memory-card-image" />\`
                  : \`<div class="memory-card-text">\${escapeHtml(card.content || "")}</div>\`
                }
              </div>
            </div>
          \`;
          
          grid.appendChild(cardEl);
        });
      }
      
      // Start timer if enabled
      if (memorySettings.showTimer) {
        timerInterval = setInterval(updateTimer, 1000);
      }
      
      updateMoves();
    });
  </script>
  `;
}

// Generate JavaScript for quiz functionality
function generateQuizScript(data: QuizData): string {
  const totalQuestions = data.questions?.length || 0;
  const questionsData = JSON.stringify(data.questions || []);
  
  return `
  <script>
    let currentQuestionIndex = 0;
    const totalQuestions = ${totalQuestions};
    const questions = ${questionsData};
    let answers = {};
    let quizSubmitted = false;
    
    function goToQuestion(index) {
      if (quizSubmitted || index < 0 || index >= totalQuestions) return;
      
      // Save current answer before navigating
      saveCurrentAnswer();
      
      // Hide current question
      const currentQuestion = document.querySelector(\`.quiz-question[data-question-index="\${currentQuestionIndex}"]\`);
      if (currentQuestion) {
        currentQuestion.style.display = 'none';
      }
      
      // Show new question
      currentQuestionIndex = index;
      const newQuestion = document.querySelector(\`.quiz-question[data-question-index="\${currentQuestionIndex}"]\`);
      if (newQuestion) {
        newQuestion.style.display = 'block';
        newQuestion.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      
      // Load saved answer
      loadSavedAnswer();
      
      // Update navigation buttons
      updateQuestionNavigation();
    }
    
    function saveCurrentAnswer() {
      const question = questions[currentQuestionIndex];
      if (!question) return;
      
      const questionId = \`q-\${currentQuestionIndex}\`;
      
      if (question.type === "multiple-choice" || question.type === "true-false") {
        const selected = document.querySelector(\`input[name="\${questionId}"]:checked\`);
        if (selected) {
          answers[currentQuestionIndex] = selected.value;
        }
      } else if (question.type === "fill-blank") {
        const input = document.getElementById(\`\${questionId}-input\`);
        if (input) {
          answers[currentQuestionIndex] = input.value;
        }
      }
    }
    
    function loadSavedAnswer() {
      const question = questions[currentQuestionIndex];
      if (!question) return;
      
      const savedAnswer = answers[currentQuestionIndex];
      if (savedAnswer === undefined) return;
      
      const questionId = \`q-\${currentQuestionIndex}\`;
      
      if (question.type === "multiple-choice" || question.type === "true-false") {
        const radio = document.querySelector(\`input[name="\${questionId}"][value="\${savedAnswer}"]\`);
        if (radio) {
          radio.checked = true;
        }
      } else if (question.type === "fill-blank") {
        const input = document.getElementById(\`\${questionId}-input\`);
        if (input) {
          input.value = savedAnswer;
        }
      }
    }
    
    function updateQuestionNavigation() {
      const prevBtn = document.getElementById('prev-question-btn');
      const nextBtn = document.getElementById('next-question-btn');
      const currentQuestionNum = document.getElementById('current-question-num');
      const submitBtn = document.getElementById('submit-quiz-btn');
      
      if (prevBtn) prevBtn.disabled = currentQuestionIndex === 0 || quizSubmitted;
      if (nextBtn) nextBtn.disabled = currentQuestionIndex === totalQuestions - 1 || quizSubmitted;
      if (currentQuestionNum) currentQuestionNum.textContent = currentQuestionIndex + 1;
      if (submitBtn) submitBtn.disabled = quizSubmitted;
    }
    
    function submitQuiz() {
      if (quizSubmitted) return;
      
      // Save current answer
      saveCurrentAnswer();
      
      quizSubmitted = true;
      
      // Hide all questions and show results
      document.querySelectorAll('.quiz-question').forEach(q => {
        q.style.display = 'none';
      });
      
      // Calculate results
      let correctCount = 0;
      let totalAnswered = 0;
      const results = [];
      
      questions.forEach((question, index) => {
        const userAnswer = answers[index];
        let isCorrect = false;
        
        if (question.type === "multiple-choice") {
          const correctIndex = question.correctAnswer;
          isCorrect = userAnswer !== undefined && parseInt(userAnswer) === correctIndex;
        } else if (question.type === "true-false") {
          const correctValue = String(question.correctAnswer);
          isCorrect = userAnswer === correctValue;
        } else if (question.type === "fill-blank") {
          const correctAnswer = String(question.correctAnswer).toLowerCase().trim();
          isCorrect = userAnswer && userAnswer.toLowerCase().trim() === correctAnswer;
        }
        
        if (userAnswer !== undefined) {
          totalAnswered++;
          if (isCorrect) correctCount++;
        }
        
        results.push({
          question: question.question,
          userAnswer: userAnswer || "Not answered",
          correctAnswer: question.correctAnswer,
          isCorrect: isCorrect,
          explanation: question.explanation
        });
      });
      
      const percentage = totalAnswered > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
      
      // Display results
      const resultsDiv = document.getElementById('quiz-results');
      if (resultsDiv) {
        resultsDiv.style.display = 'block';
        
        let resultsHTML = \`
          <h2>Quiz Results</h2>
          <div class="score">\${correctCount} / \${totalQuestions}</div>
          <div class="percentage">\${percentage}% Correct</div>
          <div class="summary">
            <h3>Question Review</h3>
        \`;
        
        results.forEach((result, index) => {
          const resultClass = result.isCorrect ? 'correct' : 'incorrect';
          const icon = result.isCorrect ? '✓' : '✗';
          resultsHTML += \`
            <div class="summary-item \${resultClass}">
              <strong>\${icon} Question \${index + 1}:</strong> \${escapeHtml(result.question)}<br>
              <strong>Your Answer:</strong> \${escapeHtml(String(result.userAnswer))}<br>
              <strong>Correct Answer:</strong> \${escapeHtml(String(result.correctAnswer))}
              \${result.explanation ? '<br><em>' + escapeHtml(result.explanation) + '</em>' : ''}
            </div>
          \`;
        });
        
        resultsHTML += \`</div>\`;
        resultsDiv.innerHTML = resultsHTML;
      }
      
      // Hide navigation and submit button
      document.querySelector('.quiz-navigation').style.display = 'none';
      document.querySelector('.quiz-actions').style.display = 'none';
      
      // Scroll to results
      resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    function escapeHtml(text) {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    }
    
    // Keyboard navigation
    document.addEventListener('keydown', function(e) {
      if (quizSubmitted) return;
      if (e.key === 'ArrowLeft') {
        goToQuestion(currentQuestionIndex - 1);
      } else if (e.key === 'ArrowRight') {
        goToQuestion(currentQuestionIndex + 1);
      }
    });
    
    // Initialize
    updateQuestionNavigation();
  </script>
  `;
}

// Generate JavaScript for presentation functionality
function generatePresentationScript(data: any): string {
  const totalSlides = data.slides?.length || 0;
  
  return `
  <script>
    let currentSlideIndex = 0;
    const totalSlides = ${totalSlides};
    
    function goToSlide(index) {
      if (index < 0 || index >= totalSlides) return;
      
      // Hide current slide
      const currentSlide = document.querySelector(\`.presentation-slide[data-slide-index="\${currentSlideIndex}"]\`);
      if (currentSlide) {
        currentSlide.style.display = 'none';
      }
      
      // Show new slide
      currentSlideIndex = index;
      const newSlide = document.querySelector(\`.presentation-slide[data-slide-index="\${currentSlideIndex}"]\`);
      if (newSlide) {
        newSlide.style.display = 'block';
        newSlide.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      
      // Update navigation buttons
      updateSlideNavigation();
    }
    
    function updateSlideNavigation() {
      const prevBtn = document.getElementById('prev-slide-btn');
      const nextBtn = document.getElementById('next-slide-btn');
      const currentSlideNum = document.getElementById('current-slide-num');
      
      if (prevBtn) prevBtn.disabled = currentSlideIndex === 0;
      if (nextBtn) nextBtn.disabled = currentSlideIndex === totalSlides - 1;
      if (currentSlideNum) currentSlideNum.textContent = currentSlideIndex + 1;
    }
    
    // Keyboard navigation
    document.addEventListener('keydown', function(e) {
      if (e.key === 'ArrowLeft') {
        goToSlide(currentSlideIndex - 1);
      } else if (e.key === 'ArrowRight') {
        goToSlide(currentSlideIndex + 1);
      }
    });
    
    // Initialize
    updateSlideNavigation();
  </script>
  `;
}

// Generate JavaScript for interactive book functionality
function generateInteractiveBookScript(data: InteractiveBookData): string {
  const totalPages = data.pages.length;
  
  return `
  <script>
    let currentPageIndex = 0;
    const totalPages = ${totalPages};
    
    function goToPage(index) {
      if (index < 0 || index >= totalPages) return;
      
      // Hide current page
      const currentPage = document.querySelector(\`.book-page[data-page-index="\${currentPageIndex}"]\`);
      if (currentPage) {
        currentPage.style.display = 'none';
      }
      
      // Show new page
      currentPageIndex = index;
      const newPage = document.querySelector(\`.book-page[data-page-index="\${currentPageIndex}"]\`);
      if (newPage) {
        newPage.style.display = 'block';
        newPage.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      
      // Update navigation buttons
      updateNavigation();
      
      // Stop any playing audio
      stopAllAudio();
    }
    
    function updateNavigation() {
      const prevBtn = document.getElementById('prev-page-btn');
      const nextBtn = document.getElementById('next-page-btn');
      const currentPageNum = document.getElementById('current-page-num');
      
      if (prevBtn) prevBtn.disabled = currentPageIndex === 0;
      if (nextBtn) nextBtn.disabled = currentPageIndex === totalPages - 1;
      if (currentPageNum) currentPageNum.textContent = currentPageIndex + 1;
    }
    
    function stopAllAudio() {
      const audios = document.querySelectorAll('audio');
      audios.forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
      });
    }
    
    // Quiz checking functions
    function checkQuiz(quizId) {
      const quiz = document.querySelector(\`.interactive-quiz[data-quiz-id="\${quizId}"]\`);
      if (!quiz) return;
      
      const questions = quiz.querySelectorAll('.interactive-question');
      let correctCount = 0;
      let totalQuestions = questions.length;
      
      questions.forEach((question, index) => {
        const questionId = question.getAttribute('data-question-id');
        const feedback = document.getElementById(\`\${questionId}-feedback\`);
        const explanation = document.getElementById(\`\${questionId}-explanation\`);
        
        let isCorrect = false;
        
        // Check multiple choice or true/false
        const selectedRadio = question.querySelector('input[type="radio"]:checked');
        if (selectedRadio) {
          isCorrect = selectedRadio.getAttribute('data-correct') === 'true';
          
          // Mark options
          const options = question.querySelectorAll('.option-label');
          options.forEach(opt => {
            const radio = opt.querySelector('input[type="radio"]');
            if (radio) {
              const isOptionCorrect = radio.getAttribute('data-correct') === 'true';
              if (radio.checked) {
                opt.classList.add(isOptionCorrect ? 'correct' : 'incorrect');
              } else if (isOptionCorrect) {
                opt.classList.add('correct');
              }
            }
          });
        }
        
        // Check fill in the blank
        const fillInput = question.querySelector('.fill-blank-input');
        if (fillInput) {
          const userAnswer = fillInput.value.trim().toLowerCase();
          const correctAnswer = fillInput.getAttribute('data-correct').toLowerCase();
          isCorrect = userAnswer === correctAnswer;
          
          fillInput.classList.add(isCorrect ? 'correct' : 'incorrect');
        }
        
        // Show feedback
        if (feedback) {
          feedback.style.display = 'block';
          feedback.className = 'question-feedback ' + (isCorrect ? 'correct' : 'incorrect');
          feedback.textContent = isCorrect ? '✓ Correct!' : '✗ Incorrect';
        }
        
        // Show explanation if available
        if (explanation && !isCorrect) {
          explanation.style.display = 'block';
        }
        
        if (isCorrect) correctCount++;
      });
      
      // Show results
      const resultsDiv = document.getElementById(\`quiz-\${quizId}-results\`);
      if (resultsDiv) {
        resultsDiv.style.display = 'block';
        const percentage = Math.round((correctCount / totalQuestions) * 100);
        resultsDiv.innerHTML = \`
          <h3>Quiz Results</h3>
          <p style="font-size: 1.5rem; font-weight: bold; margin: 1rem 0;">
            \${correctCount} / \${totalQuestions} Correct (\${percentage}%)
          </p>
        \`;
      }
    }
    
    // Keyboard navigation
    document.addEventListener('keydown', function(e) {
      if (e.key === 'ArrowLeft') {
        goToPage(currentPageIndex - 1);
      } else if (e.key === 'ArrowRight') {
        goToPage(currentPageIndex + 1);
      }
    });
    
    // Initialize
    updateNavigation();
  </script>
  `;
}

// Download function
export function downloadHTML(html: string, filename: string): void {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".html") ? filename : `${filename}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

