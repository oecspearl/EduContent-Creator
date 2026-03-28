import type { FlashcardData } from "@shared/schema";

export function generateFlashcardHTML(data: FlashcardData): string {
  if (!data.cards || data.cards.length === 0) {
    return "<p>No flashcards available.</p>";
  }

  return `
    <div class="flashcard-container">
      ${data.settings?.showProgress !== false ? `
        <div class="flashcard-progress">
          <div class="progress-info">
            <span class="card-counter">Card <span id="current-card-num">1</span> of ${data.cards.length}</span>
            <span class="progress-percentage" id="progress-percentage">0%</span>
          </div>
          <div class="progress-bar-container"><div class="progress-bar" id="progress-bar"></div></div>
        </div>
      ` : ""}
      <div class="flashcard-wrapper" id="flashcard-wrapper">
        <div class="flashcard" id="flashcard" onclick="toggleFlip()">
          <div class="flashcard-inner" id="flashcard-inner">
            <div class="flashcard-face flashcard-front" id="flashcard-front">
              <div class="flashcard-label">Front</div>
              <div class="flashcard-content" id="flashcard-front-content"></div>
              <div class="flashcard-hint">Click to flip</div>
            </div>
            <div class="flashcard-face flashcard-back" id="flashcard-back">
              <div class="flashcard-label">Back</div>
              <div class="flashcard-content" id="flashcard-back-content"></div>
              <div class="flashcard-hint">Click to flip</div>
            </div>
          </div>
        </div>
      </div>
      <div class="flashcard-controls">
        <button class="control-btn" id="prev-btn" onclick="previousCard()" disabled>← Previous</button>
        <div class="control-actions">
          ${data.settings?.shuffleCards ? `<button class="control-btn secondary" onclick="shuffleCards()">🔀 Shuffle</button>` : ""}
          <button class="control-btn secondary" onclick="restartCards()">↻ Restart</button>
        </div>
        <button class="control-btn" id="next-btn" onclick="nextCard()">Next →</button>
      </div>
    </div>
  `;
}

export function generateFlashcardScript(data: FlashcardData): string {
  const cardsData = JSON.stringify(data.cards || []);
  const settings = JSON.stringify(data.settings || {});

  return `
  <script>
    var flashcardData = ${cardsData};
    var flashcardSettings = ${settings};
    var currentCardIndex = 0;
    var isFlipped = false;
    var shuffledCards = flashcardData.slice();

    function escapeHtml(text) { if (!text) return ""; var d = document.createElement('div'); d.textContent = text; return d.innerHTML; }

    function updateCard() {
      var card = shuffledCards[currentCardIndex];
      if (!card) return;
      var frontContent = document.getElementById('flashcard-front-content');
      var backContent = document.getElementById('flashcard-back-content');
      if (!frontContent || !backContent) return;
      isFlipped = false;
      document.getElementById('flashcard').classList.remove('flipped');
      var frontHtml = "";
      if (card.frontImageUrl) {
        var src = card.frontImageUrl.startsWith('data:') ? card.frontImageUrl : (card.frontImageUrl.startsWith('http') ? card.frontImageUrl : 'data:image/png;base64,' + card.frontImageUrl);
        frontHtml += '<img src="' + src + '" alt="' + escapeHtml(card.frontImageAlt || card.front || 'Front image') + '" style="max-width: 100%; max-height: 200px; margin: 1rem 0; border-radius: 8px; object-fit: contain;" />';
      }
      if (card.front) frontHtml += '<p>' + escapeHtml(card.front) + '</p>';
      if (card.category) frontHtml += '<div style="display: inline-block; padding: 0.25rem 0.75rem; border-radius: 9999px; background: rgba(74, 144, 226, 0.1); color: #4a90e2; font-size: 0.75rem; font-weight: 500; margin-top: 0.5rem;">' + escapeHtml(card.category) + '</div>';
      frontContent.innerHTML = frontHtml;
      var backHtml = "";
      if (card.backImageUrl) {
        var bsrc = card.backImageUrl.startsWith('data:') ? card.backImageUrl : (card.backImageUrl.startsWith('http') ? card.backImageUrl : 'data:image/png;base64,' + card.backImageUrl);
        backHtml += '<img src="' + bsrc + '" alt="' + escapeHtml(card.backImageAlt || card.back || 'Back image') + '" style="max-width: 100%; max-height: 200px; margin: 1rem 0; border-radius: 8px; object-fit: contain;" />';
      }
      if (card.back) backHtml += '<p>' + escapeHtml(card.back) + '</p>';
      if (card.category) backHtml += '<div style="display: inline-block; padding: 0.25rem 0.75rem; border-radius: 9999px; background: rgba(74, 144, 226, 0.1); color: #4a90e2; font-size: 0.75rem; font-weight: 500; margin-top: 0.5rem;">' + escapeHtml(card.category) + '</div>';
      backContent.innerHTML = backHtml;
      var cardNum = document.getElementById('current-card-num');
      var progressBar = document.getElementById('progress-bar');
      var progressPct = document.getElementById('progress-percentage');
      if (cardNum) cardNum.textContent = (currentCardIndex + 1).toString();
      if (progressBar && progressPct) { var pct = ((currentCardIndex + 1) / shuffledCards.length) * 100; progressBar.style.width = pct + '%'; progressPct.textContent = Math.round(pct) + '%'; }
      var prev = document.getElementById('prev-btn'); if (prev) prev.disabled = currentCardIndex === 0;
      var next = document.getElementById('next-btn'); if (next) next.disabled = currentCardIndex === shuffledCards.length - 1;
    }

    function toggleFlip() { isFlipped = !isFlipped; var f = document.getElementById('flashcard'); if (f) { if (isFlipped) f.classList.add('flipped'); else f.classList.remove('flipped'); } }
    function nextCard() { if (currentCardIndex < shuffledCards.length - 1) { currentCardIndex++; updateCard(); } }
    function previousCard() { if (currentCardIndex > 0) { currentCardIndex--; updateCard(); } }
    function shuffleCards() { shuffledCards = flashcardData.slice(); for (var i = shuffledCards.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = shuffledCards[i]; shuffledCards[i] = shuffledCards[j]; shuffledCards[j] = t; } currentCardIndex = 0; updateCard(); }
    function restartCards() { shuffledCards = flashcardData.slice(); currentCardIndex = 0; updateCard(); }

    document.addEventListener('keydown', function(e) {
      if (e.key === 'ArrowLeft') previousCard();
      else if (e.key === 'ArrowRight') nextCard();
      else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggleFlip(); }
    });
    document.addEventListener('DOMContentLoaded', function() { updateCard(); });
  </script>
  `;
}
