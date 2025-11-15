# OECS Content Creator

## Overview
OECS Content Creator is a full-stack web application for educators in the Organization of Eastern Caribbean States. It enables the creation, management, and sharing of interactive educational content, including quizzes, flashcards, interactive videos, image hotspots, drag and drop exercises, fill in the blanks, memory games, and interactive books. The platform features AI-powered content generation using OpenAI's GPT models, real-time content preview, and public sharing capabilities to enhance learning and collaboration among educators and students.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The frontend is built with React 18+ and TypeScript, utilizing Vite for fast development. Client-side routing is handled by React Router (Wouter). UI development adheres to Material Design 3 principles, implemented with Tailwind CSS and shadcn/ui components, based on Radix UI primitives for accessibility. State management and data fetching are managed by TanStack Query, complemented by a custom authentication context. The design system employs Inter and JetBrains Mono fonts, consistent spacing, and supports light/dark themes. Content players are custom-built for each interactive content type, and the platform includes a TipTap rich text editor with DOMPurify for sanitization.

### Backend Architecture
The backend uses Express.js for RESTful APIs, with session-based authentication via `express-session` and custom middleware for logging and authentication guards. API endpoints are structured for authentication, content CRUD operations, content sharing, public previews, and AI-powered generation. Authentication involves bcrypt for password hashing and httpOnly cookies for session management, supporting role-based access (teacher, student, admin). Content is managed across eight types using JSON-based data storage and includes a publication workflow from draft to published, with share link generation.

### Data Storage
PostgreSQL, accessed via Neon serverless driver and Drizzle ORM, serves as the database. The schema includes tables for `profiles` (user accounts), `h5p_content` (educational content with JSONB for flexible structures), `content_shares`, `learner_progress` (completion tracking), `quiz_attempts`, and `interaction_events`. Data modeling emphasizes JSONB columns for schema flexibility, foreign key relationships, UUID primary keys, and timestamp tracking.

### AI Chat Assistant
A context-aware AI assistant, powered by OpenAI's GPT-5, is available to authenticated users. It offers streaming responses, markdown rendering, and chat history persistence. The assistant's prompts are context-aware, incorporating the current page, content type, and user role.

### Analytics Dashboard
The platform provides an analytics dashboard displaying overview metrics (total content, viewers, completion rates, interaction events) and a sortable content performance table. Individual learner performance views offer detailed insights into student engagement, completion, and quiz attempt history.

### Accessibility Features
The application is designed to comply with WCAG 2.1 AA standards, featuring full keyboard navigation, skip-to-content links, visible focus indicators, and logical tab order. Screen reader support includes ARIA labels, live regions for dynamic announcements, semantic HTML, and proper heading hierarchies. WAI-ARIA compliance is maintained for interactive components. Visual accessibility is ensured through high contrast focus indicators, WCAG-compliant color contrast ratios, light/dark mode support, and clear visual feedback. The system also respects the `prefers-reduced-motion` setting.

## External Dependencies

*   **AI Integration**: OpenAI API (GPT-5 model) for content generation.
*   **Database Service**: Neon PostgreSQL serverless database.
*   **Font Delivery**: Google Fonts CDN for Inter and JetBrains Mono.
*   **Development Tools**: Replit-specific plugins, TypeScript compiler.
*   **Session Storage**: In-memory session storage.
*   **Build & Deployment**: esbuild for server-side, Vite for client-side bundling, support for static hosting platforms.