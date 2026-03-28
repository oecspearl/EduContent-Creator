/**
 * HTML Export — modular entry point.
 *
 * The main `generateHTMLExport` function and all CSS live in the original
 * `html-export.ts` file (which this module re-exports from).  Per-content-type
 * HTML generators and their JavaScript have been extracted into dedicated files
 * under `client/src/lib/html-export/`.
 *
 * This barrel file exists so that future consumers can import from
 * `@/lib/html-export` and pick up the split modules if needed.
 */

// Re-export individual generators for direct use
export { escapeHtml, generateImageHtml, generateAudioHtml, generateVideoHtml, extractVideoIdFromUrl, ensureDataUri } from "./common";
export { generatePresentationHTML, generatePresentationScript } from "./presentation";
export { generateInteractiveBookHTML, generateInteractiveBookScript } from "./interactive-book";
export { generateQuizHTML, generateInteractiveQuizHTML, generateQuizScript } from "./quiz";
export { generateMemoryGameHTML, generateMemoryGameScript } from "./memory-game";
export { generateFlashcardHTML, generateFlashcardScript } from "./flashcard";
export { generateDragDropHTML, generateDragDropScript } from "./drag-drop";

// The main generateHTMLExport and downloadHTML still live in the parent file
// (../html-export.ts) because they contain 1300 lines of inline CSS that
// hasn't been extracted yet.  This is the recommended Horizon 3 follow-up.
