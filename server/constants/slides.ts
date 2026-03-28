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

// ─── LAYOUT: Title slide (enhanced with metadata area) ───
export const TITLE_SLIDE = {
  accentBar: {
    x: 0,
    y: 0,
    width: SLIDE_WIDTH_EMU,
    height: 140000,
  },
  // Bottom accent strip for visual framing
  bottomBar: {
    x: 0,
    y: SLIDE_HEIGHT_EMU - 100000,
    width: SLIDE_WIDTH_EMU,
    height: 100000,
  },
  title: {
    x: 572000,
    y: 1300000,
    width: 8000000,
    height: 1000000,
    fontSize: 42,
  },
  subtitle: {
    x: 572000,
    y: 2500000,
    width: 8000000,
    height: 500000,
    fontSize: 22,
  },
  divider: {
    x: 572000,
    y: 2400000,
    width: 2000000,
    height: 0,
    thickness: 32000,
  },
  // Metadata line: teacher name, institution, date, grade
  metadata: {
    x: 572000,
    y: 3200000,
    width: 8000000,
    height: 350000,
    fontSize: 13,
  },
};

// ─── LAYOUT: Content slide (text only) ───
export const CONTENT_SLIDE = {
  accentBar: {
    x: 0,
    y: 0,
    width: 80000,
    height: SLIDE_HEIGHT_EMU,
  },
  title: {
    x: 572000,
    y: 280000,
    width: 8000000,
    height: 700000,
    fontSize: 28,
  },
  divider: {
    x: 572000,
    y: 920000,
    width: 8000000,
    height: 0,
    thickness: 14000,
  },
  body: {
    x: 572000,
    y: 1100000,
    width: 8000000,
    height: 3600000,
    fontSize: 17,
    bulletFontSize: 16,
    lineSpacing: 155,
  },
  // Slide number area (bottom-right)
  slideNumber: {
    x: 8200000,
    y: 4900000,
    width: 600000,
    height: 200000,
    fontSize: 10,
  },
};

// ─── LAYOUT: Content slide with image (two-column) ───
export const IMAGE_CONTENT_SLIDE = {
  accentBar: CONTENT_SLIDE.accentBar,
  title: CONTENT_SLIDE.title,
  divider: CONTENT_SLIDE.divider,
  body: {
    x: 572000,
    y: 1100000,
    width: 4400000,
    height: 3600000,
    fontSize: 15,
    bulletFontSize: 14,
    lineSpacing: 145,
  },
  image: {
    x: 5200000,
    y: 1100000,
    width: 3500000,
    height: 3200000,
  },
  slideNumber: CONTENT_SLIDE.slideNumber,
};

// ─── LAYOUT: Learning outcomes slide ───
export const OUTCOMES_SLIDE = {
  accentBar: {
    x: 0,
    y: 0,
    width: SLIDE_WIDTH_EMU,
    height: 80000,
  },
  // Icon area (top-left, for emoji/icon)
  iconArea: {
    x: 572000,
    y: 350000,
    width: 600000,
    height: 600000,
    fontSize: 36,
  },
  title: {
    x: 1200000,
    y: 380000,
    width: 7400000,
    height: 600000,
    fontSize: 28,
  },
  divider: {
    x: 572000,
    y: 1000000,
    width: 8000000,
    height: 0,
    thickness: 14000,
  },
  body: {
    x: 572000,
    y: 1200000,
    width: 8000000,
    height: 3500000,
    fontSize: 18,
    bulletFontSize: 17,
    lineSpacing: 180,
  },
  slideNumber: CONTENT_SLIDE.slideNumber,
};

// ─── LAYOUT: Vocabulary / key terms slide ───
export const VOCABULARY_SLIDE = {
  accentBar: {
    x: 0,
    y: 0,
    width: SLIDE_WIDTH_EMU,
    height: 80000,
  },
  bgRect: {
    x: 350000,
    y: 350000,
    width: 8444000,
    height: 4443500,
  },
  title: {
    x: 600000,
    y: 450000,
    width: 7944000,
    height: 600000,
    fontSize: 26,
  },
  // Vocabulary items area (two-column definition list)
  body: {
    x: 600000,
    y: 1150000,
    width: 7944000,
    height: 3400000,
    fontSize: 16,
    lineSpacing: 170,
  },
  slideNumber: CONTENT_SLIDE.slideNumber,
};

// ─── LAYOUT: Comparison / two-column slide ───
export const COMPARISON_SLIDE = {
  accentBar: CONTENT_SLIDE.accentBar,
  title: {
    x: 572000,
    y: 280000,
    width: 8000000,
    height: 600000,
    fontSize: 26,
  },
  divider: {
    x: 572000,
    y: 850000,
    width: 8000000,
    height: 0,
    thickness: 14000,
  },
  // Left column
  leftHeader: {
    x: 572000,
    y: 1050000,
    width: 3800000,
    height: 400000,
    fontSize: 20,
  },
  leftBody: {
    x: 572000,
    y: 1500000,
    width: 3800000,
    height: 3200000,
    fontSize: 15,
    bulletFontSize: 14,
    lineSpacing: 150,
  },
  // Center divider
  centerLine: {
    x: 4572000,
    y: 1050000,
    height: 3650000,
  },
  // Right column
  rightHeader: {
    x: 4800000,
    y: 1050000,
    width: 3800000,
    height: 400000,
    fontSize: 20,
  },
  rightBody: {
    x: 4800000,
    y: 1500000,
    width: 3800000,
    height: 3200000,
    fontSize: 15,
    bulletFontSize: 14,
    lineSpacing: 150,
  },
  slideNumber: CONTENT_SLIDE.slideNumber,
};

// ─── LAYOUT: Activity / task slide ───
export const ACTIVITY_SLIDE = {
  accentBar: {
    x: 0,
    y: 0,
    width: SLIDE_WIDTH_EMU,
    height: 80000,
  },
  bgRect: {
    x: 300000,
    y: 300000,
    width: 8544000,
    height: 4543500,
  },
  iconArea: {
    x: 600000,
    y: 450000,
    width: 500000,
    height: 500000,
    fontSize: 32,
  },
  title: {
    x: 1150000,
    y: 480000,
    width: 7444000,
    height: 500000,
    fontSize: 24,
  },
  body: {
    x: 600000,
    y: 1100000,
    width: 7944000,
    height: 3400000,
    fontSize: 17,
    bulletFontSize: 16,
    lineSpacing: 170,
  },
  slideNumber: CONTENT_SLIDE.slideNumber,
};

// ─── LAYOUT: Questions / reflection slide ───
export const QUESTIONS_SLIDE = {
  accentBar: {
    x: 0,
    y: 0,
    width: SLIDE_WIDTH_EMU,
    height: 80000,
  },
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
  slideNumber: CONTENT_SLIDE.slideNumber,
};

// ─── LAYOUT: Summary / recap slide ───
export const SUMMARY_SLIDE = {
  accentBar: {
    x: 0,
    y: 0,
    width: SLIDE_WIDTH_EMU,
    height: 120000,
  },
  title: {
    x: 572000,
    y: 400000,
    width: 8000000,
    height: 600000,
    fontSize: 30,
  },
  divider: {
    x: 572000,
    y: 1000000,
    width: 3000000,
    height: 0,
    thickness: 20000,
  },
  body: {
    x: 572000,
    y: 1200000,
    width: 8000000,
    height: 3500000,
    fontSize: 17,
    bulletFontSize: 16,
    lineSpacing: 165,
  },
  slideNumber: CONTENT_SLIDE.slideNumber,
};

// ─── LAYOUT: Closing / thank-you slide ───
export const CLOSING_SLIDE = {
  accentBar: {
    x: 0,
    y: 0,
    width: SLIDE_WIDTH_EMU,
    height: 140000,
  },
  bottomBar: {
    x: 0,
    y: SLIDE_HEIGHT_EMU - 100000,
    width: SLIDE_WIDTH_EMU,
    height: 100000,
  },
  title: {
    x: 572000,
    y: 1500000,
    width: 8000000,
    height: 800000,
    fontSize: 38,
  },
  subtitle: {
    x: 572000,
    y: 2500000,
    width: 8000000,
    height: 500000,
    fontSize: 20,
  },
  divider: {
    x: 3500000,
    y: 2400000,
    width: 2144000,
    height: 0,
    thickness: 28000,
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

// Fonts — modern, education-friendly pairing
export const FONT_FAMILY = 'Open Sans';
export const FONT_FAMILY_TITLE = 'Poppins';

// Batch processing
export const GOOGLE_API_BATCH_SIZE = 100;
export const MAX_REQUESTS_PER_SLIDE = 20;

// ─── Color themes (RGB 0-1 range) ───
export const COLOR_THEMES = {
  blue: {
    primary:   { red: 0.16, green: 0.38, blue: 0.76 },
    secondary: { red: 0.09, green: 0.24, blue: 0.53 },
    accent:    { red: 0.91, green: 0.94, blue: 0.99 },
    surface:   { red: 0.96, green: 0.97, blue: 1.0  },
    onPrimary: { red: 1.0, green: 1.0, blue: 1.0 },
    muted:     { red: 0.45, green: 0.50, blue: 0.58 },
  },
  green: {
    primary:   { red: 0.10, green: 0.55, blue: 0.44 },
    secondary: { red: 0.06, green: 0.36, blue: 0.30 },
    accent:    { red: 0.89, green: 0.97, blue: 0.94 },
    surface:   { red: 0.95, green: 0.99, blue: 0.97 },
    onPrimary: { red: 1.0, green: 1.0, blue: 1.0 },
    muted:     { red: 0.42, green: 0.53, blue: 0.50 },
  },
  purple: {
    primary:   { red: 0.45, green: 0.24, blue: 0.66 },
    secondary: { red: 0.31, green: 0.14, blue: 0.49 },
    accent:    { red: 0.95, green: 0.91, blue: 0.99 },
    surface:   { red: 0.97, green: 0.95, blue: 1.0  },
    onPrimary: { red: 1.0, green: 1.0, blue: 1.0 },
    muted:     { red: 0.52, green: 0.45, blue: 0.60 },
  },
  orange: {
    primary:   { red: 0.85, green: 0.48, blue: 0.10 },
    secondary: { red: 0.62, green: 0.33, blue: 0.05 },
    accent:    { red: 1.0,  green: 0.95, blue: 0.88 },
    surface:   { red: 1.0,  green: 0.98, blue: 0.95 },
    onPrimary: { red: 1.0, green: 1.0, blue: 1.0 },
    muted:     { red: 0.58, green: 0.50, blue: 0.42 },
  },
  teal: {
    primary:   { red: 0.07, green: 0.55, blue: 0.60 },
    secondary: { red: 0.04, green: 0.38, blue: 0.42 },
    accent:    { red: 0.88, green: 0.97, blue: 0.98 },
    surface:   { red: 0.94, green: 0.99, blue: 0.99 },
    onPrimary: { red: 1.0, green: 1.0, blue: 1.0 },
    muted:     { red: 0.40, green: 0.53, blue: 0.55 },
  },
  red: {
    primary:   { red: 0.80, green: 0.20, blue: 0.18 },
    secondary: { red: 0.56, green: 0.12, blue: 0.10 },
    accent:    { red: 0.99, green: 0.92, blue: 0.91 },
    surface:   { red: 1.0,  green: 0.96, blue: 0.96 },
    onPrimary: { red: 1.0, green: 1.0, blue: 1.0 },
    muted:     { red: 0.58, green: 0.44, blue: 0.43 },
  },
};

export type ColorTheme = keyof typeof COLOR_THEMES;

// Color helpers
export const WHITE = { red: 1.0, green: 1.0, blue: 1.0 };
export const DARK_TEXT = { red: 0.15, green: 0.16, blue: 0.18 };
export const BODY_TEXT = { red: 0.27, green: 0.29, blue: 0.33 };

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
