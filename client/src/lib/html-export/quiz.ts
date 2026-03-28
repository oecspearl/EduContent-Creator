import type { QuizData } from "@shared/schema";
import { escapeHtml } from "./common";

export function generateQuizHTML(data: QuizData): string {
  if (!data.questions || data.questions.length === 0) {
    return "<p>No questions available.</p>";
  }

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
      questionsHTML += `<label class="quiz-option-label"><input type="radio" name="${questionId}" value="true" data-correct="${correctValue}" id="${questionId}-true"><span>True</span></label>`;
      questionsHTML += `<label class="quiz-option-label"><input type="radio" name="${questionId}" value="false" data-correct="${!correctValue}" id="${questionId}-false"><span>False</span></label>`;
      questionsHTML += `</div>`;
    } else if (question.type === "fill-blank") {
      const correctAnswer = String(question.correctAnswer);
      const acceptableAnswers = question.acceptableAnswers ? JSON.stringify(question.acceptableAnswers) : JSON.stringify([correctAnswer]);
      const caseSensitive = question.caseSensitive || false;
      questionsHTML += `<div class="quiz-fill-blank">`;
      questionsHTML += `<input type="text" class="quiz-fill-input" data-correct="${escapeHtml(correctAnswer)}" data-acceptable="${escapeHtml(acceptableAnswers)}" data-case-sensitive="${caseSensitive}" placeholder="Enter your answer..." id="${questionId}-input">`;
      questionsHTML += `</div>`;
    } else if (question.type === "ordering" && question.items) {
      questionsHTML += `<div class="quiz-ordering" id="${questionId}-ordering">`;
      questionsHTML += `<p class="text-sm text-muted-foreground mb-3">Drag items to arrange them in the correct order</p>`;
      questionsHTML += `<div class="ordering-items" id="${questionId}-items">`;
      const currentOrder = question.items || [];
      currentOrder.forEach((item, itemIndex) => {
        questionsHTML += `<div class="ordering-item" data-item-index="${itemIndex}" draggable="true" id="${questionId}-item-${itemIndex}">`;
        questionsHTML += `<span class="ordering-handle">☰</span>`;
        questionsHTML += `<span class="ordering-content">${escapeHtml(item)}</span>`;
        questionsHTML += `<span class="ordering-position">#${itemIndex + 1}</span>`;
        questionsHTML += `</div>`;
      });
      questionsHTML += `</div>`;
      questionsHTML += `<input type="hidden" id="${questionId}-order" data-correct="${escapeHtml(JSON.stringify(question.correctAnswer || question.items))}">`;
      questionsHTML += `</div>`;
    } else if (question.type === "drag-drop" && question.zones && question.dragItems) {
      questionsHTML += `<div class="quiz-drag-drop" id="${questionId}-dragdrop">`;
      questionsHTML += `<p class="text-sm text-muted-foreground mb-3">Drag items to their correct zones</p>`;
      questionsHTML += `<div class="drag-drop-container"><div class="drag-items-area"><h4>Items to Drag</h4>`;
      questionsHTML += `<div class="drag-items-list" id="${questionId}-items">`;
      question.dragItems.forEach((item: any) => {
        questionsHTML += `<div class="drag-item" draggable="true" data-item-id="${item.id}" id="${questionId}-item-${item.id}">${escapeHtml(item.content)}</div>`;
      });
      questionsHTML += `</div></div><div class="drop-zones-area"><h4>Drop Zones</h4>`;
      questionsHTML += `<div class="drop-zones-grid" id="${questionId}-zones">`;
      question.zones.forEach((zone: any) => {
        questionsHTML += `<div class="drop-zone" data-zone-id="${zone.id}" id="${questionId}-zone-${zone.id}">`;
        questionsHTML += `<div class="zone-label">${escapeHtml(zone.label)}</div>`;
        questionsHTML += `<div class="zone-items" id="${questionId}-zone-${zone.id}-items"></div></div>`;
      });
      questionsHTML += `</div></div></div>`;
      questionsHTML += `<input type="hidden" id="${questionId}-placements" data-correct="${escapeHtml(JSON.stringify(question.correctAnswer || {}))}">`;
      questionsHTML += `</div>`;
    }

    questionsHTML += `<div class="question-feedback" id="${questionId}-feedback" style="display: none;"></div>`;
    if (question.explanation) {
      questionsHTML += `<div class="question-explanation" id="${questionId}-explanation" style="display: none;">`;
      questionsHTML += `<p><em>${escapeHtml(question.explanation)}</em></p></div>`;
    }
    questionsHTML += `</div>`;
  });

  return `
    <div class="quiz-navigation">
      <button id="prev-question-btn" class="nav-btn" onclick="goToQuestion(currentQuestionIndex - 1)" disabled>← Previous</button>
      <span class="question-indicator"><span id="current-question-num">1</span> / <span id="total-questions">${data.questions.length}</span></span>
      <button id="next-question-btn" class="nav-btn" onclick="goToQuestion(currentQuestionIndex + 1)" ${data.questions.length === 1 ? 'disabled' : ''}>Next →</button>
    </div>
    <div class="quiz-questions-container">${questionsHTML}</div>
    <div class="quiz-actions"><button id="submit-quiz-btn" class="submit-btn" onclick="submitQuiz()">Submit Quiz</button></div>
    <div class="quiz-results" id="quiz-results" style="display: none;"></div>
  `;
}

export function generateInteractiveQuizHTML(data: QuizData, quizId: number): string {
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
        const isCorrect = question.correctAnswer === optIndex;
        html += `<label class="option-label"><input type="radio" name="${questionId}" value="${optIndex}" data-correct="${isCorrect}" id="${questionId}-opt-${optIndex}"><span>${escapeHtml(option)}</span></label>`;
      });
      html += `</div>`;
    } else if (question.type === "true-false") {
      const correctValue = String(question.correctAnswer) === "true" ? "true" : "false";
      html += `<div class="options interactive-options">`;
      html += `<label class="option-label"><input type="radio" name="${questionId}" value="true" data-correct="${correctValue === 'true'}" id="${questionId}-true"><span>True</span></label>`;
      html += `<label class="option-label"><input type="radio" name="${questionId}" value="false" data-correct="${correctValue === 'false'}" id="${questionId}-false"><span>False</span></label>`;
      html += `</div>`;
    } else if (question.type === "fill-blank") {
      html += `<div class="fill-blank-answer"><input type="text" class="fill-blank-input" data-correct="${escapeHtml(String(question.correctAnswer))}" placeholder="Enter your answer"></div>`;
    }

    html += `<div class="question-feedback" id="${questionId}-feedback" style="display: none;"></div>`;
    if (question.explanation) {
      html += `<div class="question-explanation" id="${questionId}-explanation" style="display: none;"><p><em>${escapeHtml(question.explanation)}</em></p></div>`;
    }
    html += `</div>`;
  });

  html += `<div class="quiz-results" id="quiz-${quizId}-results" style="display: none;"></div></div>`;
  return html;
}

export function generateQuizScript(data: QuizData): string {
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
      saveCurrentAnswer();
      const currentQuestion = document.querySelector('.quiz-question[data-question-index="' + currentQuestionIndex + '"]');
      if (currentQuestion) currentQuestion.style.display = 'none';
      currentQuestionIndex = index;
      const newQuestion = document.querySelector('.quiz-question[data-question-index="' + currentQuestionIndex + '"]');
      if (newQuestion) { newQuestion.style.display = 'block'; newQuestion.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      loadSavedAnswer();
      updateQuestionNavigation();
      setTimeout(initializeCurrentQuestion, 100);
    }

    function saveCurrentAnswer() {
      const question = questions[currentQuestionIndex];
      if (!question) return;
      const questionId = 'q-' + currentQuestionIndex;
      if (question.type === "multiple-choice" || question.type === "true-false") {
        const selected = document.querySelector('input[name="' + questionId + '"]:checked');
        if (selected) answers[currentQuestionIndex] = selected.value;
      } else if (question.type === "fill-blank") {
        const input = document.getElementById(questionId + '-input');
        if (input) answers[currentQuestionIndex] = input.value;
      } else if (question.type === "ordering") {
        const itemsContainer = document.getElementById(questionId + '-items');
        if (itemsContainer) {
          const items = Array.from(itemsContainer.children);
          answers[currentQuestionIndex] = items.map(function(item) { var s = item.querySelector('.ordering-content'); return s ? s.textContent : ''; }).filter(Boolean);
        }
      } else if (question.type === "drag-drop") {
        var placements = {};
        if (question.dragItems) {
          question.dragItems.forEach(function(item) {
            var zoneItems = document.querySelectorAll('[data-zone-id] .zone-item[data-item-id="' + item.id + '"]');
            if (zoneItems.length > 0) { var ze = zoneItems[0].closest('.drop-zone'); if (ze) placements[item.id] = ze.getAttribute('data-zone-id'); }
          });
        }
        answers[currentQuestionIndex] = placements;
      }
    }

    function loadSavedAnswer() {
      var question = questions[currentQuestionIndex];
      if (!question) return;
      var savedAnswer = answers[currentQuestionIndex];
      if (savedAnswer === undefined) return;
      var questionId = 'q-' + currentQuestionIndex;
      if (question.type === "multiple-choice" || question.type === "true-false") {
        var radio = document.querySelector('input[name="' + questionId + '"][value="' + savedAnswer + '"]');
        if (radio) radio.checked = true;
      } else if (question.type === "fill-blank") {
        var input = document.getElementById(questionId + '-input');
        if (input) input.value = savedAnswer;
      }
    }

    function updateQuestionNavigation() {
      var prevBtn = document.getElementById('prev-question-btn');
      var nextBtn = document.getElementById('next-question-btn');
      var currentQuestionNum = document.getElementById('current-question-num');
      var submitBtn = document.getElementById('submit-quiz-btn');
      if (prevBtn) prevBtn.disabled = currentQuestionIndex === 0 || quizSubmitted;
      if (nextBtn) nextBtn.disabled = currentQuestionIndex === totalQuestions - 1 || quizSubmitted;
      if (currentQuestionNum) currentQuestionNum.textContent = currentQuestionIndex + 1;
      if (submitBtn) submitBtn.disabled = quizSubmitted;
    }

    function submitQuiz() {
      if (quizSubmitted) return;
      saveCurrentAnswer();
      quizSubmitted = true;
      document.querySelectorAll('.quiz-question').forEach(function(q) { q.style.display = 'none'; });
      var correctCount = 0, totalAnswered = 0, results = [];
      questions.forEach(function(question, index) {
        var userAnswer = answers[index], isCorrect = false, answerDisplay = "Not answered";
        if (question.type === "multiple-choice") {
          isCorrect = userAnswer !== undefined && parseInt(userAnswer) === question.correctAnswer;
          if (userAnswer !== undefined && question.options) answerDisplay = question.options[parseInt(userAnswer)] || userAnswer;
        } else if (question.type === "true-false") {
          isCorrect = userAnswer === String(question.correctAnswer);
          answerDisplay = userAnswer || "Not answered";
        } else if (question.type === "fill-blank") {
          var correctAns = String(question.correctAnswer).toLowerCase().trim();
          var userAnsLower = userAnswer ? userAnswer.toLowerCase().trim() : "";
          var acceptable = question.acceptableAnswers || [correctAns];
          isCorrect = acceptable.some(function(acc) { return userAnsLower === acc.toLowerCase().trim(); });
          answerDisplay = userAnswer || "Not answered";
        } else if (question.type === "ordering") {
          var correctOrder = Array.isArray(question.correctAnswer) ? question.correctAnswer : question.items || [];
          var userOrder = Array.isArray(userAnswer) ? userAnswer : [];
          isCorrect = JSON.stringify(userOrder) === JSON.stringify(correctOrder);
          answerDisplay = userOrder.length > 0 ? userOrder.join(" → ") : "Not answered";
        } else if (question.type === "drag-drop") {
          var userPlacements = typeof userAnswer === 'object' ? userAnswer : {};
          if (question.dragItems) {
            isCorrect = question.dragItems.every(function(item) { return userPlacements[item.id] === item.correctZone; });
            answerDisplay = Object.keys(userPlacements).length > 0
              ? question.dragItems.map(function(item) { var z = question.zones.find(function(z) { return z.id === userPlacements[item.id]; }); return z ? item.content + ' → ' + z.label : ''; }).filter(Boolean).join(", ")
              : "Not answered";
          }
        }
        if (userAnswer !== undefined && userAnswer !== null && (typeof userAnswer !== 'object' || Object.keys(userAnswer).length > 0 || Array.isArray(userAnswer))) {
          totalAnswered++;
          if (isCorrect) correctCount++;
        }
        results.push({ question: question.question, userAnswer: answerDisplay, correctAnswer: String(question.correctAnswer), isCorrect: isCorrect, explanation: question.explanation });
      });
      var percentage = totalAnswered > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
      var resultsDiv = document.getElementById('quiz-results');
      if (resultsDiv) {
        resultsDiv.style.display = 'block';
        var resultsHTML = '<h2>Quiz Results</h2><div class="score">' + correctCount + ' / ' + totalQuestions + '</div><div class="percentage">' + percentage + '% Correct</div><div class="summary"><h3>Question Review</h3>';
        results.forEach(function(result, index) {
          var resultClass = result.isCorrect ? 'correct' : 'incorrect';
          var icon = result.isCorrect ? '✓' : '✗';
          resultsHTML += '<div class="summary-item ' + resultClass + '"><strong>' + icon + ' Question ' + (index + 1) + ':</strong> ' + escapeHtmlInline(result.question) + '<br><strong>Your Answer:</strong> ' + escapeHtmlInline(String(result.userAnswer)) + '<br><strong>Correct Answer:</strong> ' + escapeHtmlInline(String(result.correctAnswer)) + (result.explanation ? '<br><em>' + escapeHtmlInline(result.explanation) + '</em>' : '') + '</div>';
        });
        resultsHTML += '</div>';
        resultsDiv.innerHTML = resultsHTML;
      }
      document.querySelector('.quiz-navigation').style.display = 'none';
      document.querySelector('.quiz-actions').style.display = 'none';
      resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function escapeHtmlInline(text) { var div = document.createElement("div"); div.textContent = text; return div.innerHTML; }

    function initializeOrderingQuestion(questionIndex) {
      var question = questions[questionIndex];
      if (question.type !== "ordering" || !question.items) return;
      var questionId = 'q-' + questionIndex;
      var itemsContainer = document.getElementById(questionId + '-items');
      if (!itemsContainer) return;
      var draggedIndex = null;
      Array.from(itemsContainer.children).forEach(function(item, index) {
        item.setAttribute('draggable', 'true');
        item.addEventListener('dragstart', function() { draggedIndex = index; item.classList.add('dragging'); });
        item.addEventListener('dragend', function() { item.classList.remove('dragging'); draggedIndex = null; });
        item.addEventListener('dragover', function(e) { e.preventDefault(); if (draggedIndex !== null && draggedIndex !== index) item.style.borderColor = '#4a90e2'; });
        item.addEventListener('dragleave', function() { item.style.borderColor = '#ddd'; });
        item.addEventListener('drop', function(e) {
          e.preventDefault(); item.style.borderColor = '#ddd';
          if (draggedIndex === null || draggedIndex === index) return;
          var arr = Array.from(itemsContainer.children);
          var dragged = arr[draggedIndex]; arr.splice(draggedIndex, 1); arr.splice(index, 0, dragged);
          arr.forEach(function(it, idx) { var ps = it.querySelector('.ordering-position'); if (ps) ps.textContent = '#' + (idx + 1); });
          itemsContainer.innerHTML = ''; arr.forEach(function(it) { itemsContainer.appendChild(it); });
          initializeOrderingQuestion(questionIndex); saveCurrentAnswer();
        });
      });
    }

    function initializeDragDropQuestion(questionIndex) {
      var question = questions[questionIndex];
      if (question.type !== "drag-drop" || !question.zones || !question.dragItems) return;
      var questionId = 'q-' + questionIndex;
      var draggedItemId = null;
      question.dragItems.forEach(function(item) {
        var itemEl = document.getElementById(questionId + '-item-' + item.id);
        if (!itemEl) return;
        itemEl.addEventListener('dragstart', function() { draggedItemId = item.id; itemEl.classList.add('dragging'); });
        itemEl.addEventListener('dragend', function() { itemEl.classList.remove('dragging'); draggedItemId = null; });
      });
      question.zones.forEach(function(zone) {
        var zoneEl = document.getElementById(questionId + '-zone-' + zone.id);
        if (!zoneEl) return;
        var zoneItems = zoneEl.querySelector('.zone-items');
        if (!zoneItems) return;
        zoneEl.addEventListener('dragover', function(e) { e.preventDefault(); if (draggedItemId) zoneEl.classList.add('drag-over'); });
        zoneEl.addEventListener('dragleave', function() { zoneEl.classList.remove('drag-over'); });
        zoneEl.addEventListener('drop', function(e) {
          e.preventDefault(); zoneEl.classList.remove('drag-over');
          if (!draggedItemId) return;
          var itemEl = document.getElementById(questionId + '-item-' + draggedItemId);
          if (!itemEl) return;
          itemEl.remove(); itemEl.classList.add('placed');
          var zi = document.createElement('div'); zi.className = 'zone-item'; zi.setAttribute('data-item-id', draggedItemId); zi.textContent = itemEl.textContent; zoneItems.appendChild(zi);
          initializeDragDropQuestion(questionIndex); saveCurrentAnswer();
        });
      });
    }

    function initializeCurrentQuestion() {
      var question = questions[currentQuestionIndex];
      if (question.type === "ordering") initializeOrderingQuestion(currentQuestionIndex);
      else if (question.type === "drag-drop") initializeDragDropQuestion(currentQuestionIndex);
    }

    document.addEventListener('DOMContentLoaded', function() { initializeCurrentQuestion(); });
    document.addEventListener('keydown', function(e) {
      if (quizSubmitted) return;
      if (e.key === 'ArrowLeft') goToQuestion(currentQuestionIndex - 1);
      else if (e.key === 'ArrowRight') goToQuestion(currentQuestionIndex + 1);
    });
    updateQuestionNavigation();
  </script>
  `;
}
