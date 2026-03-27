/**
 * Google Slides API Constants
 *
 * EMU (English Metric Units) conversion:
 * 1 inch = 914,400 EMU
 * 1 point = 12,700 EMU
 *
 * Standard 16:9 slide: 10" x 5.625" (9,144,000 x 5,143,500 EMU)
 */

// Slide dimensions (standard 16:9 presentation)
export const SLIDE_WIDTH_EMU = 9144000; // 10 inches
export const SLIDE_HEIGHT_EMU = 5143500; // 5.625 inches

// ─── LAYOUT: Title slide ───
export const TITLE_SLIDE = {
  // Accent bar at top
  accentBar: {
    x: 0,
    y: 0,
    width: SLIDE_WIDTH_EMU,
    height: 120000, // thin strip ~0.13"
  },
  // Title: large, centred vertically
  title: {
    x: 572000,   // 0.625"
    y: 1600000,  // ~1.75"
    width: 8000000,
    height: 900000,
    fontSize: 40,
  },
  // Subtitle: below title
  subtitle: {
    x: 572000,
    y: 2600000,
    width: 8000000,
    height: 600000,
    fontSize: 22,
  },
  // Decorative line between title and subtitle
  divider: {
    x: 572000,
    y: 2500000,
    width: 1800000,
    height: 0,
    thickness: 28000, // ~2pt
  },
};

// ─── LAYOUT: Content slide (text only) ───
export const CONTENT_SLIDE = {
  // Accent bar left edge
  accentBar: {
    x: 0,
    y: 0,
    width: 80000, // ~0.09" left edge stripe
    height: SLIDE_HEIGHT_EMU,
  },
  // Title area
  title: {
    x: 572000,
    y: 280000,
    width: 8000000,
    height: 700000,
    fontSize: 30,
  },
  // Divider under title
  divider: {
    x: 572000,
    y: 920000,
    width: 8000000,
    height: 0,
    thickness: 14000, // ~1pt
  },
  // Body text / bullets
  body: {
    x: 572000,
    y: 1100000,
    width: 8000000,
    height: 3600000,
    fontSize: 18,
    bulletFontSize: 17,
    lineSpacing: 150, // percent
  },
};

// ─── LAYOUT: Content slide with image (two-column) ───
export const IMAGE_CONTENT_SLIDE = {
  accentBar: CONTENT_SLIDE.accentBar,
  title: CONTENT_SLIDE.title,
  divider: CONTENT_SLIDE.divider,
  // Left column: text
  body: {
    x: 572000,
    y: 1100000,
    width: 4400000,  // ~4.8"
    height: 3600000,
    fontSize: 16,
    bulletFontSize: 15,
    lineSpacing: 145,
  },
  // Right column: image
  image: {
    x: 5200000,
    y: 1100000,
    width: 3500000,  // ~3.8"
    height: 3200000,
  },
};

// ─── LAYOUT: Questions / reflection slide ───
export const QUESTIONS_SLIDE = {
  accentBar: {
    x: 0,
    y: 0,
    width: SLIDE_WIDTH_EMU,
    height: 80000,
  },
  // Coloured background rectangle behind content
  bgRect: {
    x: 400000,
    y: 400000,
    width: 8344000,
    height: 4343500,
    cornerRadius: 80000,
  },
  title: {
    x: 700000,
    y: 550000,
    width: 7744000,
    height: 700000,
    fontSize: 28,
  },
  body: {
    x: 700000,
    y: 1350000,
    width: 7744000,
    height: 3100000,
    fontSize: 18,
    lineSpacing: 180,
  },
};

// ─── LAYOUT: Full-bleed image slide ───
export const FULL_IMAGE_SLIDE = {
  image: {
    x: 0,
    y: 0,
    width: SLIDE_WIDTH_EMU,
    height: SLIDE_HEIGHT_EMU,
  },
  // Semi-transparent overlay bar at bottom for caption
  captionBar: {
    x: 0,
    y: 3800000,
    width: SLIDE_WIDTH_EMU,
    height: 1343500,
  },
  caption: {
    x: 572000,
    y: 3950000,
    width: 8000000,
    height: 400000,
    fontSize: 20,
  },
};

// Font family
export const FONT_FAMILY = 'Roboto';
export const FONT_FAMILY_TITLE = 'Roboto';

// Batch processing
export const GOOGLE_API_BATCH_SIZE = 100;
export const MAX_REQUESTS_PER_SLIDE = 15;

// ─── Color themes (RGB 0-1 range) ───
export const COLOR_THEMES = {
  blue: {
    primary:   { red: 0.16, green: 0.38, blue: 0.76 }, // #2961C2
    secondary: { red: 0.09, green: 0.24, blue: 0.53 }, // #173D87
    accent:    { red: 0.91, green: 0.94, blue: 0.99 }, // #E8F0FD
    surface:   { red: 0.96, green: 0.97, blue: 1.0  }, // #F5F8FF
    onPrimary: { red: 1.0, green: 1.0, blue: 1.0 },
    muted:     { red: 0.45, green: 0.50, blue: 0.58 }, // #738094
  },
  green: {
    primary:   { red: 0.10, green: 0.55, blue: 0.44 }, // #1A8C70
    secondary: { red: 0.06, green: 0.36, blue: 0.30 }, // #105C4C
    accent:    { red: 0.89, green: 0.97, blue: 0.94 }, // #E3F8F0
    surface:   { red: 0.95, green: 0.99, blue: 0.97 }, // #F2FDF8
    onPrimary: { red: 1.0, green: 1.0, blue: 1.0 },
    muted:     { red: 0.42, green: 0.53, blue: 0.50 }, // #6B8780
  },
  purple: {
    primary:   { red: 0.45, green: 0.24, blue: 0.66 }, // #733DA8
    secondary: { red: 0.31, green: 0.14, blue: 0.49 }, // #4F247D
    accent:    { red: 0.95, green: 0.91, blue: 0.99 }, // #F2E8FD
    surface:   { red: 0.97, green: 0.95, blue: 1.0  }, // #F8F2FF
    onPrimary: { red: 1.0, green: 1.0, blue: 1.0 },
    muted:     { red: 0.52, green: 0.45, blue: 0.60 }, // #857399
  },
  orange: {
    primary:   { red: 0.85, green: 0.48, blue: 0.10 }, // #D97A1A
    secondary: { red: 0.62, green: 0.33, blue: 0.05 }, // #9E540D
    accent:    { red: 1.0,  green: 0.95, blue: 0.88 }, // #FFF2E0
    surface:   { red: 1.0,  green: 0.98, blue: 0.95 }, // #FFFAF2
    onPrimary: { red: 1.0, green: 1.0, blue: 1.0 },
    muted:     { red: 0.58, green: 0.50, blue: 0.42 }, // #94806B
  },
  teal: {
    primary:   { red: 0.07, green: 0.55, blue: 0.60 }, // #128C99
    secondary: { red: 0.04, green: 0.38, blue: 0.42 }, // #0A616B
    accent:    { red: 0.88, green: 0.97, blue: 0.98 }, // #E0F8FA
    surface:   { red: 0.94, green: 0.99, blue: 0.99 }, // #F0FCFD
    onPrimary: { red: 1.0, green: 1.0, blue: 1.0 },
    muted:     { red: 0.40, green: 0.53, blue: 0.55 }, // #66878C
  },
  red: {
    primary:   { red: 0.80, green: 0.20, blue: 0.18 }, // #CC332E
    secondary: { red: 0.56, green: 0.12, blue: 0.10 }, // #8F1F1A
    accent:    { red: 0.99, green: 0.92, blue: 0.91 }, // #FCEAE8
    surface:   { red: 1.0,  green: 0.96, blue: 0.96 }, // #FFF5F5
    onPrimary: { red: 1.0, green: 1.0, blue: 1.0 },
    muted:     { red: 0.58, green: 0.44, blue: 0.43 }, // #94706E
  },
};

export type ColorTheme = keyof typeof COLOR_THEMES;

// Color helpers
export const WHITE = { red: 1.0, green: 1.0, blue: 1.0 };
export const DARK_TEXT = { red: 0.15, green: 0.16, blue: 0.18 }; // #26292E
export const BODY_TEXT = { red: 0.27, green: 0.29, blue: 0.33 }; // #454A54

// Trusted image domains for SSRF protection
export const TRUSTED_IMAGE_DOMAINS = [
  'images.unsplash.com',
  'unsplash.com',
  'plus.unsplash.com',
  'cdn.openai.com',
  'oaidalleapiprodscus.blob.core.windows.net',
  'puter.com',
  'api.puter.com',
  'storage.googleapis.com',
  'drive.google.com',
];
