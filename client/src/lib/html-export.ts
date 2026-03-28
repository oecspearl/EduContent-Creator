import type { H5pContent } from "@shared/schema";

// Import per-content-type generators from split modules
import { escapeHtml } from "./html-export/common";
import { generatePresentationHTML, generatePresentationScript } from "./html-export/presentation";
import { generateInteractiveBookHTML, generateInteractiveBookScript } from "./html-export/interactive-book";
import { generateQuizHTML, generateQuizScript } from "./html-export/quiz";
import { generateMemoryGameHTML, generateMemoryGameScript } from "./html-export/memory-game";
import { generateFlashcardHTML, generateFlashcardScript } from "./html-export/flashcard";
import { generateDragDropHTML, generateDragDropScript } from "./html-export/drag-drop";

// Per-content-type generators have been moved to client/src/lib/html-export/ modules.
// Only generateHTMLExport (with shared CSS) and downloadHTML remain here.

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
      color: #1a1a1a;
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
    .quiz-ordering {
      margin: 1.5rem 0;
    }
    .ordering-items {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .ordering-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem;
      border: 2px solid #ddd;
      border-radius: 8px;
      background: #fff;
      cursor: move;
      transition: all 0.2s;
      font-size: 1.1rem;
    }
    .ordering-item:hover {
      background: #f0f0f0;
      border-color: #4a90e2;
    }
    .ordering-item.dragging {
      opacity: 0.5;
    }
    .ordering-handle {
      font-size: 1.25rem;
      color: #999;
      cursor: grab;
      user-select: none;
    }
    .ordering-handle:active {
      cursor: grabbing;
    }
    .ordering-content {
      flex: 1;
    }
    .ordering-position {
      font-size: 0.875rem;
      color: #666;
      font-weight: 600;
    }
    .quiz-drag-drop {
      margin: 1.5rem 0;
    }
    .quiz-drag-drop .drag-drop-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
      margin: 1.5rem 0;
    }
    .quiz-drag-drop .drag-items-area,
    .quiz-drag-drop .drop-zones-area {
      padding: 1.5rem;
      background: #f9f9f9;
      border-radius: 8px;
    }
    .quiz-drag-drop .drag-items-area h4,
    .quiz-drag-drop .drop-zones-area h4 {
      margin-bottom: 1rem;
      font-size: 1.1rem;
    }
    .quiz-drag-drop .drag-items-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      min-height: 200px;
    }
    .quiz-drag-drop .drag-item {
      padding: 1rem;
      background: #fff;
      border: 2px solid #4a90e2;
      border-radius: 8px;
      cursor: move;
      font-size: 1.1rem;
      transition: all 0.2s;
      user-select: none;
    }
    .quiz-drag-drop .drag-item:hover {
      background: #e7f3ff;
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }
    .quiz-drag-drop .drag-item.dragging {
      opacity: 0.5;
    }
    .quiz-drag-drop .drag-item.placed {
      opacity: 0.6;
      border-color: #999;
    }
    .quiz-drag-drop .drop-zones-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      min-height: 300px;
    }
    .quiz-drag-drop .drop-zone {
      min-height: 150px;
      padding: 1.5rem;
      background: #fff;
      border: 3px dashed #ddd;
      border-radius: 8px;
      transition: all 0.2s;
    }
    .quiz-drag-drop .drop-zone.drag-over {
      border-color: #4a90e2;
      background: #e7f3ff;
    }
    .quiz-drag-drop .drop-zone.correct {
      border-color: #28a745;
      background: #d4edda;
    }
    .quiz-drag-drop .drop-zone.incorrect {
      border-color: #dc3545;
      background: #f8d7da;
    }
    .quiz-drag-drop .zone-label {
      font-weight: bold;
      font-size: 1.1rem;
      margin-bottom: 1rem;
      color: #4a90e2;
    }
    .quiz-drag-drop .zone-items {
      min-height: 100px;
    }
    .quiz-drag-drop .zone-item {
      padding: 0.75rem;
      margin: 0.5rem 0;
      background: #f0f0f0;
      border-radius: 6px;
      font-size: 1rem;
    }
    .quiz-drag-drop .zone-item.correct {
      background: #d4edda;
      border-left: 4px solid #28a745;
    }
    .quiz-drag-drop .zone-item.incorrect {
      background: #f8d7da;
      border-left: 4px solid #dc3545;
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

// All per-content-type generators (escapeHtml, extractVideoIdFromUrl,
// generatePresentationHTML, generateQuizHTML, generateFlashcardHTML,
// generateDragDropHTML, generateMemoryGameHTML, generateInteractiveBookHTML,
// and their corresponding Script generators) have been moved to
// client/src/lib/html-export/ modules.
//
// They are imported at the top of this file and used by generateHTMLExport.

// ───────────────────────────────────────────────────────────────
// REMOVED: ~1900 lines of per-content-type generators that now
// live in html-export/*.ts modules. See:
//   - html-export/common.ts (shared helpers)
//   - html-export/quiz.ts
//   - html-export/flashcard.ts
//   - html-export/presentation.ts
//   - html-export/interactive-book.ts
//   - html-export/memory-game.ts
//   - html-export/drag-drop.ts
// ───────────────────────────────────────────────────────────────

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

