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

// Generate HTML for YouTube video
function generateVideoHtml(videoId: string, title: string = ""): string {
  // Extract video ID if full URL is provided
  let cleanVideoId = videoId;
  if (videoId.includes('youtube.com/watch?v=')) {
    cleanVideoId = videoId.split('v=')[1]?.split('&')[0] || videoId;
  } else if (videoId.includes('youtu.be/')) {
    cleanVideoId = videoId.split('youtu.be/')[1]?.split('?')[0] || videoId;
  }
  
  return `
    <div style="margin: 1.5rem 0; position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); background: #000;">
      <iframe 
        src="https://www.youtube.com/embed/${cleanVideoId}?enablejsapi=1&rel=0&modestbranding=1" 
        style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; border-radius: 8px;"
        frameborder="0" 
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
        allowfullscreen
        title="${escapeHtml(title)}"
        loading="lazy"
      ></iframe>
    </div>
    <p style="text-align: center; color: #666; font-size: 0.9rem; margin-top: 0.5rem;">
      <em>Note: Video requires internet connection to play</em>
    </p>
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
      padding: 1.5rem;
      border: 1px solid #ddd;
      border-radius: 8px;
      background: #fff;
      page-break-after: always;
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
      .book-navigation {
        display: none;
      }
      .book-page {
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

  let html = "";
  data.slides.forEach((slide: any, index: number) => {
    html += `
      <div class="slide">
        <h2>Slide ${index + 1}</h2>
        ${slide.title ? `<h3>${escapeHtml(slide.title)}</h3>` : ""}
        ${slide.content ? `<div>${slide.content}</div>` : ""}
        ${slide.imageUrl ? generateImageHtml(slide.imageUrl, slide.imageAlt || `Slide ${index + 1} image`) : ""}
      </div>
    `;
  });

  return html;
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
      if (videoId) {
        pagesHTML += generateVideoHtml(videoId, page.videoData.title);
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

  let html = "";
  data.questions.forEach((question, index) => {
    html += `<div class="question">`;
    html += `<h3>Question ${index + 1}</h3>`;
    html += `<p><strong>${escapeHtml(question.question)}</strong></p>`;

    if (question.type === "multiple-choice" && question.options) {
      html += `<div class="options">`;
      question.options.forEach((option, optIndex) => {
        const isCorrect = question.correctAnswer === optIndex;
        html += `<div class="option ${isCorrect ? "correct" : ""}">`;
        html += `${isCorrect ? "✓ " : ""}${escapeHtml(option)}`;
        html += `</div>`;
      });
      html += `</div>`;
    } else if (question.type === "true-false") {
      const isCorrect = String(question.correctAnswer) === "true";
      html += `<div class="options">`;
      html += `<div class="option ${isCorrect ? "correct" : ""}">✓ True</div>`;
      html += `<div class="option ${!isCorrect ? "correct" : ""}">${!isCorrect ? "✓ " : ""}False</div>`;
      html += `</div>`;
    } else if (question.type === "fill-blank") {
      html += `<div class="options">`;
      html += `<div class="option correct">Correct Answer: ${escapeHtml(String(question.correctAnswer))}</div>`;
      html += `</div>`;
    }

    if (question.explanation) {
      html += `<p style="margin-top: 0.5rem; font-style: italic; color: #666;">${escapeHtml(question.explanation)}</p>`;
    }

    html += `</div>`;
  });

  return html;
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

function generateMemoryGameHTML(data: MemoryGameData): string {
  if (!data.cards || data.cards.length === 0) {
    return "<p>No cards available.</p>";
  }

  // Group cards by matchId
  const cardGroups = new Map<string, any[]>();
  data.cards.forEach(card => {
    if (card.matchId) {
      if (!cardGroups.has(card.matchId)) {
        cardGroups.set(card.matchId, []);
      }
      cardGroups.get(card.matchId)!.push(card);
    }
  });

  let html = "<h2>Memory Game Cards</h2>";
  let pairIndex = 1;

  cardGroups.forEach((cards, matchId) => {
    html += `<div class="card">`;
    html += `<h3>Pair ${pairIndex}</h3>`;
    
    cards.forEach((card, index) => {
      html += `<div class="card-${index === 0 ? "front" : "back"}">`;
      if (card.type === "image" && card.imageUrl) {
        html += generateImageHtml(card.imageUrl, card.content || `Card ${index + 1}`);
      } else {
        html += `<p>${escapeHtml(card.content || "")}</p>`;
      }
      html += `</div>`;
    });
    
    html += `</div>`;
    pairIndex++;
  });

  return html;
}

function generateFlashcardHTML(data: FlashcardData): string {
  if (!data.cards || data.cards.length === 0) {
    return "<p>No flashcards available.</p>";
  }

  let html = "";
  data.cards.forEach((card, index) => {
    html += `<div class="card">`;
    html += `<h3>Card ${index + 1}${card.category ? ` - ${escapeHtml(card.category)}` : ""}</h3>`;
    
    html += `<div class="card-front">`;
    html += `<strong>Front:</strong>`;
    if (card.frontImageUrl) {
      html += generateImageHtml(card.frontImageUrl, card.frontImageAlt || "Front image");
    }
    html += `<p>${escapeHtml(card.front)}</p>`;
    html += `</div>`;
    
    html += `<div class="card-back">`;
    html += `<strong>Back:</strong>`;
    if (card.backImageUrl) {
      html += generateImageHtml(card.backImageUrl, card.backImageAlt || "Back image");
    }
    html += `<p>${escapeHtml(card.back)}</p>`;
    html += `</div>`;
    
    html += `</div>`;
  });

  return html;
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

