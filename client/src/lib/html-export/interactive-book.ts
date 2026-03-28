import type { InteractiveBookData } from "@shared/schema";
import { escapeHtml, generateImageHtml, generateAudioHtml, generateVideoHtml, extractVideoIdFromUrl } from "./common";
import { generateInteractiveQuizHTML } from "./quiz";

export function generateInteractiveBookHTML(data: InteractiveBookData): string {
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

export function generateInteractiveBookScript(data: InteractiveBookData): string {
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
