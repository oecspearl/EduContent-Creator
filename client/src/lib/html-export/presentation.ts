import { escapeHtml, generateImageHtml } from "./common";

export function generatePresentationHTML(data: any): string {
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

export function generatePresentationScript(data: any): string {
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
