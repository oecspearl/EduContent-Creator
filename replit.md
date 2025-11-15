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