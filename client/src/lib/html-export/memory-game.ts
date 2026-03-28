import { escapeHtml } from "./common";

export function generateMemoryGameHTML(data: any): string {
  if (!data.cards || data.cards.length === 0) {
    return "<p>No cards available.</p>";
  }

  const columns = data.settings?.columns || 4;
  const showTimer = data.settings?.showTimer || false;
  const showMoves = data.settings?.showMoves || false;

  let cardsHTML = "";
  data.cards.forEach((card: any, index: number) => {
    const cardId = `memory-card-${index}`;
    cardsHTML += `
      <div class="memory-card" id="${cardId}" data-card-index="${index}" data-match-id="${escapeHtml(card.matchId || '')}" onclick="handleMemoryCardClick(${index})">
        <div class="memory-card-inner">
          <div class="memory-card-front"><span class="memory-card-question">?</span></div>
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

  return `
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
}

export function generateMemoryGameScript(data: any): string {
  const cardsData = JSON.stringify(data.cards || []);
  const settings = JSON.stringify(data.settings || {});

  return `
  <script>
    var memoryCards = ${cardsData};
    var memorySettings = ${settings};
    var shuffledCards = [];
    var flippedIndices = [];
    var matchedPairs = new Set();
    var moves = 0;
    var startTime = Date.now();
    var elapsedTime = 0;
    var timerInterval = null;
    var isComplete = false;

    function escapeHtml(text) { var d = document.createElement('div'); d.textContent = text; return d.innerHTML; }
    function shuffleArray(array) { var s = array.slice(); for (var i = s.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = s[i]; s[i] = s[j]; s[j] = t; } return s; }
    function formatTime(seconds) { var m = Math.floor(seconds / 60); var s = seconds % 60; return m + ':' + (s < 10 ? '0' : '') + s; }
    function updateTimer() { if (!memorySettings.showTimer || isComplete) return; elapsedTime = Math.floor((Date.now() - startTime) / 1000); var el = document.getElementById('timer-value'); if (el) el.textContent = formatTime(elapsedTime); }
    function updateMoves() { var el = document.getElementById('moves-value'); if (el) el.textContent = moves; }

    function handleMemoryCardClick(index) {
      if (isComplete || flippedIndices.length === 2 || flippedIndices.includes(index)) return;
      if (matchedPairs.has(shuffledCards[index].matchId)) return;
      var card = document.getElementById('memory-card-' + index);
      if (!card) return;
      card.classList.add('flipped');
      flippedIndices.push(index);
      if (flippedIndices.length === 2) {
        moves++; updateMoves();
        var first = flippedIndices[0], second = flippedIndices[1];
        if (shuffledCards[first].matchId === shuffledCards[second].matchId) {
          matchedPairs.add(shuffledCards[first].matchId);
          var f = document.getElementById('memory-card-' + first); if (f) f.classList.add('matched');
          var s = document.getElementById('memory-card-' + second); if (s) s.classList.add('matched');
          flippedIndices = [];
          if (matchedPairs.size === shuffledCards.length / 2) { isComplete = true; if (timerInterval) clearInterval(timerInterval); showCompletion(); }
        } else {
          setTimeout(function() {
            var f = document.getElementById('memory-card-' + first); if (f) f.classList.remove('flipped');
            var s = document.getElementById('memory-card-' + second); if (s) s.classList.remove('flipped');
            flippedIndices = [];
          }, 1000);
        }
      }
    }

    function showCompletion() {
      var el = document.getElementById('memory-completion');
      if (el) { el.style.display = 'block'; var m = document.getElementById('completion-moves'); if (m) m.textContent = moves; var t = document.getElementById('completion-time'); if (t) t.textContent = formatTime(elapsedTime); el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    }

    function renderCards() {
      var grid = document.getElementById('memory-game-grid');
      if (!grid) return;
      grid.innerHTML = '';
      shuffledCards.forEach(function(card, index) {
        var el = document.createElement('div');
        el.className = 'memory-card'; el.id = 'memory-card-' + index;
        el.setAttribute('data-card-index', index);
        el.setAttribute('data-match-id', card.matchId || '');
        el.onclick = function() { handleMemoryCardClick(index); };
        el.innerHTML = '<div class="memory-card-inner"><div class="memory-card-front"><span class="memory-card-question">?</span></div><div class="memory-card-back">' +
          (card.type === "image" && card.imageUrl ? '<img src="' + escapeHtml(card.imageUrl) + '" alt="' + escapeHtml(card.content || 'Memory card') + '" class="memory-card-image" />' : '<div class="memory-card-text">' + escapeHtml(card.content || "") + '</div>') +
          '</div></div>';
        grid.appendChild(el);
      });
    }

    function resetMemoryGame() {
      shuffledCards = shuffleArray(memoryCards);
      flippedIndices = []; matchedPairs = new Set(); moves = 0; startTime = Date.now(); elapsedTime = 0; isComplete = false;
      var c = document.getElementById('memory-completion'); if (c) c.style.display = 'none';
      renderCards(); updateMoves();
      if (timerInterval) clearInterval(timerInterval);
      if (memorySettings.showTimer) timerInterval = setInterval(updateTimer, 1000);
    }

    document.addEventListener('DOMContentLoaded', function() {
      shuffledCards = shuffleArray(memoryCards);
      renderCards(); updateMoves();
      if (memorySettings.showTimer) timerInterval = setInterval(updateTimer, 1000);
    });
  </script>
  `;
}
