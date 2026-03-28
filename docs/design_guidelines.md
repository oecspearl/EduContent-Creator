# Design Guidelines: OECS Content Creator

**Tagline:** "Create. Engage. Educate."

## Brand Identity

**Application Name:** OECS Content Creator
**Mission:** Empowering educators across the Organization of Eastern Caribbean States to create engaging, interactive educational content.

**Color Philosophy:** The color palette is inspired by the vibrant OECS logo, combining the energy of Caribbean education (lime green), the trust and stability of academic excellence (navy blue), and the warmth of learning engagement (amber gold).

## Color Palette

### Primary Colors (from OECS Logo)

**Lime Green (Primary Brand Color):**
- Light mode: `#9DD84E` - Vibrant, energetic, representing growth and learning
- Use for: Primary buttons, active states, brand elements, navigation highlights
- Symbolizes: Innovation, growth, Caribbean vitality

**Navy Blue (Authority Color):**
- `#1B2A4E` - Professional, trustworthy, academic
- Use for: Text, headers, secondary elements, professional accents
- Symbolizes: Knowledge, trust, educational excellence

**Amber Gold (Accent Color):**
- `#FFB74D` - Warm, engaging, approachable
- Use for: Highlights, success states, interactive elements, warmth
- Symbolizes: Achievement, warmth, engagement

### Supporting Colors

**Neutral Backgrounds:**
- Light mode background: `#FAFAFA` - Soft white for reduced eye strain
- Dark mode background: `#0F1419` - Deep charcoal
- Card backgrounds: Slightly elevated from base background

**Text Hierarchy:**
- Primary text: Navy blue in light mode, off-white in dark mode
- Secondary text: Muted variants for supporting information
- Tertiary text: Further muted for labels and metadata

**Semantic Colors:**
- Success: Derived from lime green
- Warning: Amber gold variants
- Error: Coral red `#EF4444`
- Info: Sky blue `#3B82F6`

## Design Approach

**Selected System:** Material Design 3 with Caribbean-inspired vibrant accents, maintaining the productivity focus of tools like Notion while incorporating the energetic OECS brand colors.

**Rationale:** Educational content creation requires clear hierarchy and robust components, enhanced with the vibrant, welcoming OECS brand identity to create an engaging yet professional environment.

## Typography System

**Font Family:** 
- Primary: Inter (via Google Fonts CDN) for UI elements and body text
- Monospace: JetBrains Mono for code snippets or technical content

**Hierarchy:**
- Page Titles: text-3xl font-bold (48px) in navy blue
- Section Headers: text-2xl font-semibold (32px)
- Card/Component Titles: text-xl font-semibold (24px)
- Subheadings: text-lg font-medium (20px)
- Body Text: text-base (16px)
- Helper Text/Labels: text-sm text-gray-600 (14px)
- Micro-copy: text-xs (12px)

## Layout System

**Spacing Primitives:** Use Tailwind units of 2, 4, 6, 8, 12, 16, 20 for consistent rhythm
- Component padding: p-6 or p-8
- Section spacing: space-y-8 or space-y-12
- Card gaps: gap-6
- Form field spacing: space-y-4

**Grid System:**
- Dashboard content library: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6
- Creator layouts: Two-column split (8-4 or 7-5 ratio) for editor + preview
- Form layouts: Single column max-w-2xl for focused input

**Container Widths:**
- Full app wrapper: max-w-7xl mx-auto px-6
- Content creators: Full-width with internal constraints
- Forms and modals: max-w-2xl

## Component Library

### Navigation & App Shell

**Top Navigation Bar:**
- Full-width with max-w-7xl container
- Height: h-16
- OECS logo/brand (left) with lime green accent, user profile menu (right)
- Subtle bottom border in navy blue tint

**Sidebar (for Dashboard):**
- Fixed width: w-64 on desktop, collapsible drawer on mobile
- Content type filters with icons in lime green when active
- Navy blue accents for professional feel

### Dashboard Components

**Content Cards:**
- Elevated containers with rounded-xl borders
- Header area with type icon (h-12 w-12 rounded-lg with lime green background), title, status badge
- Status badge uses lime green for published, amber for draft
- Metadata row: Last modified, completion percentage
- Action buttons row at bottom (Edit, Preview, Share, Delete)
- Hover state: subtle lime green glow

**Empty State:**
- Centered layout with large icon (h-24 w-24) in lime green
- Heading in navy blue + description + prominent lime green CTA button
- Welcoming, Caribbean-inspired messaging

### Content Creator Components

**Toolbar:**
- Sticky top position (sticky top-0 z-10)
- Height: h-14
- Contains: Back button, auto-save indicator (amber when saving), publish toggle (lime green when on), AI generate button (lime green accent), settings icon
- Background with backdrop blur and navy blue text

**Editor Panels:**
- Left panel (w-2/3): Main editing area with form inputs
- Right panel (w-1/3): Live preview or settings
- Resizable divider with navy blue accent

**Question/Card Items:**
- Each item in bordered container with rounded-lg
- Drag handle icon in muted navy, content (center), action buttons (right)
- Active state uses lime green accent
- Spacing: space-y-4 between items

**Form Inputs:**
- Labels above inputs (text-sm font-medium in navy)
- Inputs with rounded-lg borders, focus ring in lime green
- Helper text below (text-xs text-gray-500)
- Consistent height: h-10 for single-line, h-24 for textareas

### Modals & Overlays

**AI Generation Modal:**
- Centered overlay (max-w-2xl)
- Header with title in navy + close button (h-16)
- Content area with form fields (space-y-6 p-6)
- Footer with cancel (outlined) + generate button (lime green solid) (h-16)

**Share Modal:**
- Similar structure to AI modal (max-w-lg)
- Shareable link with lime green copy button
- Share options as icon buttons in row

### Buttons & Actions

**Primary CTA:** Lime green background, rounded-lg, px-6 py-3, font-medium, white text
**Secondary:** Navy blue outlined variant with same sizing
**Tertiary/Ghost:** Text only with hover background in lime green tint
**Icon Buttons:** Square (h-10 w-10), rounded-lg, centered icon, lime green on hover

### Content Players

**Quiz Player:**
- Question card centered (max-w-2xl)
- Options as selectable cards (lime green border when selected)
- Navigation: Previous/Next at bottom
- Progress indicator at top (lime green progress bar, thin h-1)

**Flashcard Player:**
- Card centered (aspect-ratio-[3/2], max-w-xl)
- Flip animation on click with lime green accent on active side
- Card counter below in navy (e.g., "5 / 20")
- Shuffle and restart controls with lime green icons

**Interactive Video:**
- YouTube embed full-width in container
- Hotspot overlays with lime green pulsing indicators
- Timeline scrubber below video with lime green hotspot markers

**Image Hotspot:**
- Image container with relative positioning
- Clickable hotspot dots (lime green circles with pulse animation)
- Tooltip/popup on click with navy blue headers and descriptions

### Status & Feedback

**Loading States:** Skeleton screens with lime green pulse animation
**Toasts:** Top-right corner, rounded-xl, auto-dismiss, max-w-sm
  - Success: Lime green background
  - Warning: Amber background
  - Error: Coral red background
**Error States:** Alert boxes with icon, rounded-lg, appropriate color treatment
**Success States:** Lime green checkmark icon with confirmation message

## Animations

Use sparingly and purposefully:
- Page transitions: Fade (200ms)
- Modal enter/exit: Scale + fade (150ms)
- Drag and drop: Visual lift with lime green shadow
- Card hovers: Subtle lime green glow (100ms)
- Button interactions: Lime green ripple effect
**NO:** Scroll-triggered animations, decorative motion, auto-playing effects

## Images

**Dashboard Empty State:**
- Illustration of content creation tools (quiz, flashcards, video) in Caribbean-inspired style with lime green and amber accents
- Placement: Center of empty content grid
- Size: max-w-md

**OECS Logo:**
- Use official OECS logo in navigation header
- Always maintain proper spacing and sizing
- Logo should be prominently displayed with lime green accent

**Content Type Icons:**
- Use Lucide icons consistently with lime green coloring: FileQuestion (quiz), Layers (flashcard), Video (video), Image (image hotspot)
- Size: h-5 w-5 in cards, h-6 w-6 in headers

## Responsive Behavior

- Mobile (< 768px): Single column, collapsible navigation with lime green active states, stacked creator panels
- Tablet (768-1024px): Two columns for dashboard, maintain split for creators
- Desktop (1024px+): Full three-column dashboard grid, side-by-side creator layout

## Accessibility Notes

- All interactive elements keyboard navigable
- Focus indicators with 2px lime green ring
- ARIA labels for icon-only buttons
- Color contrast minimum WCAG AA (lime green text only on dark backgrounds)
- Form validation messages with icons + text
- Never use lime green for body text on white backgrounds (contrast issue)

## Brand Voice

- Professional yet approachable
- Caribbean warmth combined with educational excellence
- Empowering and inclusive
- Innovation-focused

This design system creates a vibrant, professional educational content creation environment that reflects the OECS mission of excellence in Caribbean education while maintaining usability and accessibility standards.
