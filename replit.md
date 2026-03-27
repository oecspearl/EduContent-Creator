# OECS Content Creator

## Overview
OECS Content Creator is a full-stack web application for educators in the Organization of Eastern Caribbean States. It enables the creation, management, and sharing of interactive educational content, including quizzes, flashcards, interactive videos, image hotspots, drag and drop exercises, fill in the blanks, memory games, interactive books, video finders with pedagogical guidance, and AI-generated Google Slides presentations. The platform features AI-powered content generation using OpenAI's GPT models, real-time content preview, public sharing capabilities, and Google Classroom integration for sharing all content types to enhance learning and collaboration among educators and students.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The frontend is built with React 18+ and TypeScript, utilizing Vite for fast development. Client-side routing is handled by React Router (Wouter). UI development adheres to Material Design 3 principles, implemented with Tailwind CSS and shadcn/ui components, based on Radix UI primitives for accessibility. State management and data fetching are managed by TanStack Query, complemented by a custom authentication context. The design system employs Inter and JetBrains Mono fonts, consistent spacing, and supports light/dark themes. Content players are custom-built for each interactive content type, and the platform includes a TipTap rich text editor with DOMPurify for sanitization. Navigation is enhanced with breadcrumb trails on all major pages, showing the current location hierarchy and enabling quick navigation back to the dashboard.

### Backend Architecture
The backend uses Express.js for RESTful APIs, with session-based authentication via `express-session` (PostgreSQL-backed for production, with memory fallback for development) and custom middleware for logging and authentication guards. API endpoints are structured for authentication (local and OAuth), content CRUD operations, content sharing, public previews, and AI-powered generation. Authentication supports multiple providers: local email/password (bcrypt hashing), Google OAuth 2.0 (via Passport.js), and Microsoft OAuth 2.0 (via @azure/msal-node). Sessions use httpOnly cookies and support role-based access (teacher, student, admin). OAuth users are created with sentinel password hashes for security. Content is managed across ten types using JSON-based data storage and includes a publication workflow from draft to published, with share link generation.

### Data Storage
PostgreSQL, accessed via Neon serverless driver and Drizzle ORM, serves as the database. The schema includes tables for `profiles` (user accounts with OAuth provider fields), `h5p_content` (educational content with JSONB for flexible structures), `content_shares`, `learner_progress` (completion tracking), `quiz_attempts`, `interaction_events`, and `session` (PostgreSQL-backed session storage). User profiles support multiple authentication providers via `authProvider`, `googleId`, and `microsoftId` fields. Data modeling emphasizes JSONB columns for schema flexibility, foreign key relationships, UUID primary keys, and timestamp tracking.

### AI Chat Assistant
A context-aware AI assistant, powered by OpenAI's GPT-5, is available to authenticated users. It offers streaming responses, markdown rendering, and chat history persistence. The assistant's prompts are context-aware, incorporating the current page, content type, and user role.

### Analytics Dashboard
The platform provides an analytics dashboard displaying overview metrics (total content, viewers, completion rates, interaction events) and a sortable content performance table. Individual learner performance views offer detailed insights into student engagement, completion, and quiz attempt history.

### Accessibility Features
The application is designed to comply with WCAG 2.1 AA standards, featuring full keyboard navigation, skip-to-content links, visible focus indicators, and logical tab order. Screen reader support includes ARIA labels, live regions for dynamic announcements, semantic HTML, and proper heading hierarchies. WAI-ARIA compliance is maintained for interactive components. Visual accessibility is ensured through high contrast focus indicators, WCAG-compliant color contrast ratios, light/dark mode support, and clear visual feedback. The system also respects the `prefers-reduced-motion` setting. Breadcrumb navigation provides clear location context with proper ARIA landmarks and keyboard accessibility.

## Content Types

### Google Slides Presentations
The Google Slides content type enables teachers to create AI-generated educational presentations and export them to actual Google Slides presentations:

**Creation Process**:
- Teachers specify topic, grade level, age range, and learning outcomes
- Configure number of slides (5-30)
- AI generates pedagogically sound slide content following Universal Design for Learning (UDL) principles
- **Create in Google Slides**: One-click button to create an actual Google Slides presentation with real images

**AI-Generated Content**:
- **Title slides**: Engaging titles and subtitles
- **Learning outcomes slides**: Clear presentation of objectives
- **Content slides**: Structured information with 3-5 bullet points
- **Image slides**: Educational images via two providers:
  - **Puter.js AI (Default)**: Free browser-based AI image generation, no API key required
  - **Unsplash API**: Stock photos as fallback or alternative option
- **Guiding questions**: 4-6 thought-provoking questions to check understanding (recall to analysis to application)
- **Reflection questions**: 2-3 deeper thinking prompts for learner engagement
- **Speaker notes**: Pedagogical guidance and teaching tips for educators

**Google Slides Integration**:
- **Flexible image sourcing**: 
  - **Puter.js AI (Free, Default)**: Browser-based AI image generation with no API key required
  - **Unsplash Stock Photos**: Alternative option for stock photography
  - **Automatic fallback**: Falls back to Unsplash if Puter.js unavailable
- **Real presentation creation**: Uses Google Slides API to create actual presentations in teacher's Google Drive
- **Persistent links**: Stores presentation ID and URL for future access
- **One-click access**: "Open in Google Slides" button in both creator and player views
- **Full editing capability**: Teachers can edit, share, and present using Google Slides' native features

**Player Features**:
- **Presentation mode**: Full-screen slide navigation with Previous/Next controls and slide indicators
- **Grid view**: Overview of all slides as clickable thumbnails
- **Keyboard navigation**: Support for arrow key navigation
- **Accessible design**: Speaker notes visible to teachers, proper ARIA labels
- **Google Slides link**: Opens the actual presentation in a new tab (when created)
- **Google Classroom sharing**: One-click sharing to Google Classroom as assignment or announcement

**Google Classroom Integration** (Universal for All Content Types):
- **Share as Assignment**: Create coursework assignments with due dates and instructions for any published content
- **Share as Announcement**: Post announcements with content links for any published content
- **Course Selection**: Automatic listing of teacher's active Google Classroom courses
- **Direct Integration**: All published content can be shared from creator pages and preview pages
- **OAuth Scopes**: Requires Google Classroom API permissions (courses.readonly, coursework.students, announcements)
- **Availability**: Share to Classroom button appears in:
  - Creator toolbars (for all 10 content types when content is published)
  - Preview page header (for all published content)

**Pedagogical Approach**:
- Age-appropriate language and examples
- Concepts broken into digestible chunks
- Visual variety with real, relevant images
- Questions range from literal comprehension to deeper analysis
- Culturally relevant and inclusive content
- Follows instructional design best practices

### Interactive Books
The Interactive Books content type enables teachers to create multi-page educational books with rich text content and embedded interactive elements:

**Creation Process**:
- Manual creation: Add pages one at a time with custom titles and content
- **AI Generation**: One-click AI-powered book creation from natural language prompts
- Rich text editor with formatting, images, and media support
- **Image Options**: Three ways to add images to book pages:
  - **Upload**: Local image files up to 2MB (JPG, PNG, GIF, WebP, SVG, BMP)
  - **URL**: Embed images from external URLs
  - **AI Generate**: Create custom images from text prompts with two provider options:
    - **Puter.js** (Free, Recommended): Unlimited free image generation via browser-based AI, no API key required
    - **OpenAI DALL-E 3** (Premium): High-quality images requiring OPENAI_API_KEY
- Embed other content types (quizzes, flashcards, videos, etc.) within pages
- Manual save button (removed auto-save per user preference)

**AI-Generated Books**:
Teachers can prompt the AI to generate complete books on any topic:
- **Story prompts**: "Create a Caribbean adventure story for Grade 3 students"
- **Guided lessons**: "Explain photosynthesis step-by-step for middle school"
- **Historical narratives**: "Tell the story of Caribbean independence movements"
- **Concept explorations**: "Teach fractions through real-world examples"
- AI generates multiple pages with titles and educational content
- Content follows pedagogical best practices
- Age-appropriate language based on grade level
- Logical progression from page to page

**Interactive Features**:
- Page-by-page navigation with progress tracking
- Embed quizzes, flashcards, or other activities within specific pages
- Rich text formatting with images and media
- Configurable settings (show navigation, show progress, require completion)
- Manual save with visual feedback

**AI Generation Safety**:
- Robust validation of AI responses
- Automatic fallbacks for missing or malformed data
- Error handling with user-friendly feedback
- Unique ID generation for all pages
- Content sanitization and normalization

**Player Features**:
- Sequential page navigation
- Progress indicators
- Embedded content plays inline
- Responsive design for all devices
- Google Classroom sharing for published books

## External Dependencies

*   **AI Integration**: 
    - OpenAI GPT-5 model for text content generation
    - OpenAI DALL-E 3 for premium AI image generation in Interactive Books
    - Puter.js for free, browser-based AI image generation in Interactive Books and Google Slides (no API key required)
*   **OAuth Providers**: Google OAuth 2.0 (via Passport.js) and Microsoft OAuth 2.0 (via @azure/msal-node) for user authentication.
*   **Google Slides API**: Google Slides API (via googleapis npm package) for creating actual presentations.
*   **Google Classroom API**: Google Classroom API (via googleapis npm package) for sharing presentations to courses.
*   **Unsplash API**: Unsplash API for fetching educational stock photos for presentations.
*   **Database Service**: Neon PostgreSQL serverless database.
*   **Font Delivery**: Google Fonts CDN for Inter and JetBrains Mono.
*   **Development Tools**: Replit-specific plugins, TypeScript compiler.
*   **Session Storage**: PostgreSQL-backed session storage (via connect-pg-simple) with memory fallback for development.
*   **Build & Deployment**: esbuild for server-side, Vite for client-side bundling, support for static hosting platforms.

## OAuth Authentication Setup

The application supports Google and Microsoft OAuth authentication. See `OAUTH_SETUP_GUIDE.md` for detailed setup instructions.

### Required Secrets for Production
- `SESSION_SECRET`: Required for secure session management
- `OPENAI_API_KEY`: Required for AI text content generation. Optional for image generation (Puter.js provides free alternative)
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`: Optional, for Google OAuth (required for Google Slides API access)
- `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, and `MICROSOFT_TENANT_ID`: Optional, for Microsoft OAuth
- `UNSPLASH_ACCESS_KEY`: Optional for Google Slides presentations (Puter.js AI provides free alternative)
- `DATABASE_URL`: Recommended for production (enables persistent session storage)

### OAuth Features
- Seamless account creation on first OAuth sign-in
- Account linking for existing users who sign in with OAuth
- Secure sentinel passwords for OAuth-only accounts
- Production-ready session persistence with PostgreSQL
- Graceful fallback to memory sessions in development
- **Google OAuth token storage**: Access tokens and refresh tokens stored for Google Slides API and Classroom API access
- **OAuth scope management**: Requests multiple Google API scopes:
  - `https://www.googleapis.com/auth/presentations` - Google Slides API for presentation creation
  - `https://www.googleapis.com/auth/classroom.courses.readonly` - List teacher's Classroom courses
  - `https://www.googleapis.com/auth/classroom.coursework.students` - Create assignments
  - `https://www.googleapis.com/auth/classroom.announcements` - Create announcements