# OECS Content Creator - Create. Engage. Educate.

## Overview

OECS Content Creator is a full-stack web application designed for educators across the Organization of Eastern Caribbean States to create, manage, and share interactive educational content. The platform supports eight content types: quizzes, flashcards, interactive videos, image hotspots, drag and drop, fill in the blanks, memory games, and interactive books with rich text editing. Content creation is enhanced with AI-powered generation capabilities using OpenAI's GPT models.

The application enables educators to build engaging learning materials, preview them in real-time, publish content for public access, and share educational resources with students and other educators.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- React 18+ with TypeScript for type-safe component development
- Vite as the build tool and development server for fast HMR (Hot Module Replacement)
- React Router (Wouter) for client-side routing with protected route patterns
- Material Design 3 principles with Tailwind CSS for consistent, productivity-focused UI

**State Management & Data Fetching**
- TanStack Query (React Query) for server state management, caching, and data synchronization
- Custom auth context provider for global authentication state
- Session-based authentication with automatic token refresh

**Component Library**
- Radix UI primitives for accessible, unstyled components
- shadcn/ui component system built on top of Radix UI with Tailwind styling
- TipTap rich text editor with formatting toolbar and image insertion for Interactive Book
- DOMPurify for HTML sanitization before rendering user-generated content
- Custom content player components for each interactive content type

**Design System**
- Typography: Inter for UI/body text, JetBrains Mono for code
- Consistent spacing using Tailwind's spacing scale (2, 4, 6, 8, 12, 16, 20)
- Theme system supporting light/dark modes with CSS custom properties
- Responsive grid layouts for content library and creator interfaces

### Backend Architecture

**Server Framework**
- Express.js for RESTful API endpoints
- Session-based authentication using express-session
- Custom middleware for request logging and authentication guards

**API Structure**
- `/api/auth/*` - Authentication endpoints (register, login, logout, session verification)
- `/api/content/*` - CRUD operations for educational content
- `/api/content/:id/share` - Content sharing and publication
- `/api/preview/:id` - Public content preview without authentication
- `/api/generate/*` - AI-powered content generation endpoints

**Authentication & Authorization**
- bcrypt for password hashing with salt rounds
- Session-based auth with httpOnly cookies for security
- Role-based access (teacher, student, admin) stored in user profiles
- Protected routes requiring valid session middleware

**Content Management**
- Eight content types with JSON-based data storage: quiz, flashcard, interactive-video, image-hotspot, drag-drop, fill-blanks, memory-game, interactive-book
- Publication workflow: draft → published (public access enabled)
- Share link generation for published content
- Rich text editing for Interactive Book using TipTap with formatting and image support

### Data Storage

**Database System**
- PostgreSQL via Neon serverless driver for scalable cloud database
- Drizzle ORM for type-safe database queries and schema management
- Schema migration support via drizzle-kit

**Database Schema**
- `profiles` - User accounts with authentication credentials and metadata
- `h5p_content` - Educational content with type-specific JSON data structures
- `content_shares` - Share tracking for published content
- `learner_progress` - User completion tracking per content item (completion percentage, time spent, last accessed)
- `quiz_attempts` - Quiz attempt history with scores and answers
- `interaction_events` - Detailed interaction logs (card flips, hotspot views, video playback)

**Data Modeling Approach**
- JSONB columns for flexible content structure (supports different content types without schema changes)
- Foreign key relationships with cascade deletes for data integrity
- UUID primary keys for distributed systems compatibility
- Timestamp tracking for created/updated audit trails

### External Dependencies

**AI Integration**
- OpenAI API (GPT-5 model) for intelligent content generation
- Content types supported: quiz questions, flashcard pairs, video hotspots, image hotspots, drag-drop items, fill-blank sentences, memory card pairs, interactive book pages
- Structured JSON output with response formatting for predictable parsing
- Configurable generation parameters: topic, difficulty, grade level, number of items, language, additional context

**Database Service**
- Neon PostgreSQL serverless database with connection pooling
- Environment-based configuration via DATABASE_URL
- Automatic connection management through Drizzle ORM

**Font Delivery**
- Google Fonts CDN for Inter and JetBrains Mono font families
- Preconnect optimization for faster font loading

**Development Tools**
- Replit-specific plugins for runtime error overlay, cartographer, and dev banner
- TypeScript compiler for type checking across client/server/shared code

**Session Storage**
- In-memory session storage for development
- Configurable for production session stores (Redis, PostgreSQL via connect-pg-simple)

**Build & Deployment**
- esbuild for server-side bundling (ESM format, platform: node)
- Vite for client-side bundling with code splitting
- Support for static hosting platforms (Vercel, Netlify, Cloudflare Pages)

## Progress Tracking Implementation

**Current Status**: Functional for primary use case (authenticated users viewing their own content)

**Implementation Details**:
- Monotonic progress updates (completion percentage only increases, never decreases)
- Pending milestone deduplication prevents duplicate API calls during mutations
- 5-second timeout-based retry mechanism for failed mutations
- Authentication gating: anonymous viewers can view but not track progress
- Query-based initialization prevents mutations before progress data loads
- Auth transition handling: resets state when user logs in mid-session
- Reconciliation: server values can only raise local high-water marks, never lower

**Known Limitations** (edge cases for future refinement):
- React Query cache isolation: Progress data from previous user sessions may leak if multiple users log in/out without page refresh. Workaround: refresh page after logout.
- Cross-account scenarios not fully tested: Switching between user accounts in same browser session may cause stale progress data.
- Suggested future improvements: Per-user query keys, proactive cache clearing on logout, comprehensive e2e testing for auth transition flows.

## Accessibility Features

The platform implements comprehensive accessibility features to ensure educational content is usable by all learners, including those with disabilities. All improvements comply with WCAG 2.1 AA standards:

**Keyboard Navigation**:
- Full keyboard support for all interactive elements
- Skip-to-content links on all pages (Dashboard, Analytics, Preview, Public Preview, Help) for quick navigation
- Visible focus indicators (2px ring with offset) on interactive elements only (buttons, inputs, links, form controls)
- Logical tab order throughout the application
- Focus management: Quiz completion automatically shifts focus to restart button

**Screen Reader Support**:
- ARIA labels for all icon-only buttons and interactive elements (back buttons, logout, theme toggle, etc.)
- ARIA live regions for dynamic content announcements with proper politeness levels (polite/assertive)
- Screen reader announcements for quiz interactions:
  - Answer selection feedback (correct/incorrect with explanations)
  - Question navigation ("Question X of Y")
  - Quiz completion with score announcement
  - Validation messages (e.g., "Please select an answer before continuing")
- Semantic HTML with proper landmark roles (banner, main, region)
- Proper heading hierarchy for content structure
- Unique keys for repeated announcements to ensure screen readers don't suppress duplicate messages

**WAI-ARIA Compliance**:
- Quiz Player uses semantic RadioGroup/RadioGroupItem components (not buttons with role="radio")
- RadioGroup properly linked to question text via aria-labelledby
- Proper aria-checked states for radio buttons
- aria-required on form controls where applicable
- No conflicting roles that violate WAI-ARIA 1.2 specifications

**Visual Accessibility**:
- High contrast focus indicators (2px ring with offset) only on interactive elements
- Consistent color contrast ratios meeting WCAG AA standards
- Support for both light and dark modes with proper color tokens
- Clear visual feedback for all interactive states
- Answer feedback shown visually with colors and icons (green check for correct, red X for incorrect)

**Motion & Animation**:
- Respects `prefers-reduced-motion` system setting
- Animations and transitions disabled for users who prefer reduced motion
- Smooth scrolling disabled when reduced motion is preferred

**Content Player Accessibility**:
- Quiz Player: 
  - Proper RadioGroup implementation for multiple-choice questions
  - Screen reader announcements at every interaction
  - Keyboard-accessible controls with arrow key navigation
  - Focus management on completion
  - Answer validation before advancing
- Progress indicators with ARIA labels for completion status
- All icon buttons include descriptive aria-labels
- Form inputs include proper labels and associations

**Implementation Details**:
- Custom CSS utilities for focus states, skip links, and screen reader-only text in index.css
- ScreenReaderAnnouncer component with unique keys for reliable repeated announcements
- Politeness level support (polite for informational, assertive for critical feedback)
- Role attributes on all major sections (banner, main, region)
- ARIA attributes properly applied (aria-label, aria-labelledby, aria-checked, aria-live, aria-atomic)

## AI Chat Assistant

**Overview**:
- Context-aware AI assistant using OpenAI's GPT-5 model
- Floating chat button in bottom-right corner (only for authenticated users)
- Helps educators with content creation, platform guidance, and educational best practices

**Features**:
- Streaming responses for real-time interaction
- Chat history persistence in database
- Markdown rendering with code syntax highlighting
- Context-aware prompts (knows current page, content type, user role)
- Responsive design (full-screen on mobile, floating card on desktop)

**Technical Implementation**:
- Backend: Server-Sent Events (SSE) for streaming responses
- Frontend: React component with markdown rendering (react-markdown, remark-gfm)
- Database: chat_messages table for history storage
- Context: Automatic injection of user role, institution, current page, and content being edited
- Accessibility: ARIA roles (dialog), focus management, keyboard shortcuts (ESC to close, Enter to send)

**API Endpoints**:
- `POST /api/chat` - Send message with streaming response
- `GET /api/chat/history` - Retrieve chat history
- `DELETE /api/chat/history` - Clear chat history

**Privacy**:
- Chat history is user-specific and not shared
- Context includes only non-sensitive metadata (page, content type, role)
- Messages stored for continuity across sessions

## Analytics Dashboard

**Overview Metrics**:
- Total content count with published/draft breakdown
- Total unique viewers across all content
- Average completion rate across all content
- Total interaction events (card flips, hotspot views, video playback)

**Content Performance Table**:
- Lists all created content with title, type, status, viewers, completion rate, interactions, and creation date
- Sortable columns for data analysis
- "View Learners" action button for each content item

**Individual Learner Performance View**:
- Displays authenticated users who have accessed specific content
- Shows learner profile (name, email, role)
- Completion percentage with completion date if finished
- Total interaction count for engagement tracking
- Quiz attempt history with scores and timestamps (last 5 attempts)
- First access date and last access date for time tracking
- Best quiz score highlighted for quick assessment

**Technical Implementation**:
- Backend API endpoint: `GET /api/analytics/overview` for aggregate statistics
- Backend API endpoint: `GET /api/analytics/content/:contentId/learners` for individual learner data
- Optimized batch queries to prevent N+1 query patterns
- Authorization: Only content creator can view learner analytics
- Real-time updates via React Query caching
- Visualizations using recharts (bar chart for top content)
- Responsive design with cards and tables

**Privacy & Authorization**:
- Only authenticated user progress is tracked and displayed
- Content creators can only view analytics for their own content
- Email addresses visible only to content creator for their learners
- Anonymous viewers can view content but are not tracked