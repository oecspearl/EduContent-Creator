# OECS Content Creator

## Overview
OECS Content Creator is a full-stack web application for educators in the Organization of Eastern Caribbean States. It enables the creation, management, and sharing of interactive educational content, including quizzes, flashcards, interactive videos, image hotspots, drag and drop exercises, fill in the blanks, memory games, interactive books, video finders with pedagogical guidance, and AI-generated Google Slides presentations. The platform features AI-powered content generation using OpenAI's GPT models, real-time content preview, and public sharing capabilities to enhance learning and collaboration among educators and students.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The frontend is built with React 18+ and TypeScript, utilizing Vite for fast development. Client-side routing is handled by React Router (Wouter). UI development adheres to Material Design 3 principles, implemented with Tailwind CSS and shadcn/ui components, based on Radix UI primitives for accessibility. State management and data fetching are managed by TanStack Query, complemented by a custom authentication context. The design system employs Inter and JetBrains Mono fonts, consistent spacing, and supports light/dark themes. Content players are custom-built for each interactive content type, and the platform includes a TipTap rich text editor with DOMPurify for sanitization.

### Backend Architecture
The backend uses Express.js for RESTful APIs, with session-based authentication via `express-session` (PostgreSQL-backed for production, with memory fallback for development) and custom middleware for logging and authentication guards. API endpoints are structured for authentication (local and OAuth), content CRUD operations, content sharing, public previews, and AI-powered generation. Authentication supports multiple providers: local email/password (bcrypt hashing), Google OAuth 2.0 (via Passport.js), and Microsoft OAuth 2.0 (via @azure/msal-node). Sessions use httpOnly cookies and support role-based access (teacher, student, admin). OAuth users are created with sentinel password hashes for security. Content is managed across ten types using JSON-based data storage and includes a publication workflow from draft to published, with share link generation.

### Data Storage
PostgreSQL, accessed via Neon serverless driver and Drizzle ORM, serves as the database. The schema includes tables for `profiles` (user accounts with OAuth provider fields), `h5p_content` (educational content with JSONB for flexible structures), `content_shares`, `learner_progress` (completion tracking), `quiz_attempts`, `interaction_events`, and `session` (PostgreSQL-backed session storage). User profiles support multiple authentication providers via `authProvider`, `googleId`, and `microsoftId` fields. Data modeling emphasizes JSONB columns for schema flexibility, foreign key relationships, UUID primary keys, and timestamp tracking.

### AI Chat Assistant
A context-aware AI assistant, powered by OpenAI's GPT-5, is available to authenticated users. It offers streaming responses, markdown rendering, and chat history persistence. The assistant's prompts are context-aware, incorporating the current page, content type, and user role.

### Analytics Dashboard
The platform provides an analytics dashboard displaying overview metrics (total content, viewers, completion rates, interaction events) and a sortable content performance table. Individual learner performance views offer detailed insights into student engagement, completion, and quiz attempt history.

### Accessibility Features
The application is designed to comply with WCAG 2.1 AA standards, featuring full keyboard navigation, skip-to-content links, visible focus indicators, and logical tab order. Screen reader support includes ARIA labels, live regions for dynamic announcements, semantic HTML, and proper heading hierarchies. WAI-ARIA compliance is maintained for interactive components. Visual accessibility is ensured through high contrast focus indicators, WCAG-compliant color contrast ratios, light/dark mode support, and clear visual feedback. The system also respects the `prefers-reduced-motion` setting.

## Content Types

### Google Slides Presentations
The Google Slides content type enables teachers to create AI-generated educational presentations on any topic:

**Creation Process**:
- Teachers specify topic, grade level, age range, and learning outcomes
- Configure number of slides (5-30)
- AI generates pedagogically sound slide content following Universal Design for Learning (UDL) principles

**AI-Generated Content**:
- **Title slides**: Engaging titles and subtitles
- **Learning outcomes slides**: Clear presentation of objectives
- **Content slides**: Structured information with 3-5 bullet points
- **Image slides**: Suggested educational images with detailed alt text for accessibility
- **Guiding questions**: 4-6 thought-provoking questions to check understanding (recall to analysis to application)
- **Reflection questions**: 2-3 deeper thinking prompts for learner engagement
- **Speaker notes**: Pedagogical guidance and teaching tips for educators

**Player Features**:
- **Presentation mode**: Full-screen slide navigation with Previous/Next controls and slide indicators
- **Grid view**: Overview of all slides as clickable thumbnails
- **Keyboard navigation**: Support for arrow key navigation
- **Accessible design**: Speaker notes visible to teachers, proper ARIA labels

**Pedagogical Approach**:
- Age-appropriate language and examples
- Concepts broken into digestible chunks
- Visual variety with suggested images
- Questions range from literal comprehension to deeper analysis
- Culturally relevant and inclusive content
- Follows instructional design best practices

## External Dependencies

*   **AI Integration**: OpenAI API (GPT-5 model) for content generation.
*   **OAuth Providers**: Google OAuth 2.0 (via Passport.js) and Microsoft OAuth 2.0 (via @azure/msal-node) for user authentication.
*   **Database Service**: Neon PostgreSQL serverless database.
*   **Font Delivery**: Google Fonts CDN for Inter and JetBrains Mono.
*   **Development Tools**: Replit-specific plugins, TypeScript compiler.
*   **Session Storage**: PostgreSQL-backed session storage (via connect-pg-simple) with memory fallback for development.
*   **Build & Deployment**: esbuild for server-side, Vite for client-side bundling, support for static hosting platforms.

## OAuth Authentication Setup

The application supports Google and Microsoft OAuth authentication. See `OAUTH_SETUP_GUIDE.md` for detailed setup instructions.

### Required Secrets for Production
- `SESSION_SECRET`: Required for secure session management
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`: Optional, for Google OAuth
- `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, and `MICROSOFT_TENANT_ID`: Optional, for Microsoft OAuth
- `DATABASE_URL`: Recommended for production (enables persistent session storage)

### OAuth Features
- Seamless account creation on first OAuth sign-in
- Account linking for existing users who sign in with OAuth
- Secure sentinel passwords for OAuth-only accounts
- Production-ready session persistence with PostgreSQL
- Graceful fallback to memory sessions in development