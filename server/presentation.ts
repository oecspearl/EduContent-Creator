/**
 * Presentation API service for creating Google Slides presentations
 * Creates visually polished slides with accent bars, dividers,
 * background shapes, two-column layouts, and themed color palettes.
 */

import { google } from 'googleapis';
import type { Profile } from '@shared/schema';
import { storage } from './storage';
import { refreshGoogleToken, needsTokenRefresh } from './utils/token-manager';
import { validateImageUrl, isPublicUrl } from './utils/url-validator';
import {
  GoogleAuthError,
  TokenExpiredError,
  BatchSizeExceededError,
  InvalidImageUrlError,
  ImageInsertionError,
  SpeakerNotesError,
} from './errors/presentation-errors';
import {
  SLIDE_WIDTH_EMU,
  SLIDE_HEIGHT_EMU,
  GOOGLE_API_BATCH_SIZE,
  MAX_REQUESTS_PER_SLIDE,
  TITLE_SLIDE,
  CONTENT_SLIDE,
  IMAGE_CONTENT_SLIDE,
  QUESTIONS_SLIDE,
  FULL_IMAGE_SLIDE,
  FONT_FAMILY,
  FONT_FAMILY_TITLE,
  COLOR_THEMES,
  WHITE,
  DARK_TEXT,
  BODY_TEXT,
  type ColorTheme,
} from './constants/slides';

const slidesApi = google.slides('v1');

// ─── Helpers ───────────────────────────────────────────────

function shapeProps(pageId: string, x: number, y: number, w: number, h: number) {
  return {
    pageObjectId: pageId,
    size: {
      height: { magnitude: h, unit: 'EMU' },
      width: { magnitude: w, unit: 'EMU' },
    },
    transform: { scaleX: 1, scaleY: 1, translateX: x, translateY: y, unit: 'EMU' },
  };
}

function solidFill(rgb: { red: number; green: number; blue: number }, alpha = 1) {
  return { solidFill: { color: { rgbColor: rgb }, alpha } };
}

function textStyle(
  fontSize: number,
  rgb: { red: number; green: number; blue: number },
  opts: { bold?: boolean; italic?: boolean; fontFamily?: string } = {}
) {
  return {
    fontSize: { magnitude: fontSize, unit: 'PT' },
    foregroundColor: { opaqueColor: { rgbColor: rgb } },
    bold: opts.bold ?? false,
    italic: opts.italic ?? false,
    fontFamily: opts.fontFamily ?? FONT_FAMILY,
  };
}

function fieldsFor(style: Record<string, any>): string {
  const keys: string[] = [];
  if (style.fontSize) keys.push('fontSize');
  if (style.foregroundColor) keys.push('foregroundColor');
  if (style.bold !== undefined) keys.push('bold');
  if (style.italic !== undefined) keys.push('italic');
  if (style.fontFamily) keys.push('fontFamily');
  return keys.join(',');
}

/** Add a filled rectangle (accent bar, background, etc.) */
function addRect(
  requests: any[],
  id: string,
  pageId: string,
  x: number, y: number, w: number, h: number,
  fill: { red: number; green: number; blue: number },
  alpha = 1
) {
  requests.push({
    createShape: {
      objectId: id,
      shapeType: 'RECTANGLE',
      elementProperties: shapeProps(pageId, x, y, w, h),
    },
  });
  requests.push({
    updateShapeProperties: {
      objectId: id,
      shapeProperties: {
        shapeBackgroundFill: solidFill(fill, alpha),
        outline: { propertyState: 'NOT_RENDERED' },
      },
      fields: 'shapeBackgroundFill,outline',
    },
  });
}

/** Add a styled text box and return its object ID */
function addTextBox(
  requests: any[],
  id: string,
  pageId: string,
  layout: { x: number; y: number; width: number; height: number; fontSize: number },
  text: string,
  style: ReturnType<typeof textStyle>
) {
  requests.push({
    createShape: {
      objectId: id,
      shapeType: 'TEXT_BOX',
      elementProperties: shapeProps(pageId, layout.x, layout.y, layout.width, layout.height),
    },
  });
  requests.push({ insertText: { objectId: id, text } });
  requests.push({
    updateTextStyle: {
      objectId: id,
      style,
      fields: fieldsFor(style),
    },
  });
}

/** Add a horizontal line */
function addLine(
  requests: any[],
  id: string,
  pageId: string,
  x: number, y: number, width: number,
  rgb: { red: number; green: number; blue: number },
  weight = 14000
) {
  requests.push({
    createLine: {
      objectId: id,
      lineCategory: 'STRAIGHT',
      elementProperties: shapeProps(pageId, x, y, width, 0),
    },
  });
  requests.push({
    updateLineProperties: {
      objectId: id,
      lineProperties: {
        lineFill: { solidFill: { color: { rgbColor: rgb } } },
        weight: { magnitude: weight / 12700, unit: 'PT' },
      },
      fields: 'lineFill,weight',
    },
  });
}

// ─── OAuth2 ────────────────────────────────────────────────

async function getOAuth2Client(user: Profile): Promise<{ auth: any; user: Profile }> {
  if (!user.googleAccessToken || !user.googleRefreshToken) {
    throw new GoogleAuthError();
  }

  const baseUrl = process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.APP_URL || 'http://localhost:5000';

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${baseUrl}/api/auth/google/callback`
  );

  oauth2Client.setCredentials({
    access_token: user.googleAccessToken,
    refresh_token: user.googleRefreshToken,
    expiry_date: user.googleTokenExpiry ? new Date(user.googleTokenExpiry).getTime() : undefined,
  });

  let updatedUser = user;
  if (needsTokenRefresh(user.googleTokenExpiry)) {
    try {
      updatedUser = await refreshGoogleToken(user, oauth2Client);
      oauth2Client.setCredentials({
        access_token: updatedUser.googleAccessToken!,
        refresh_token: updatedUser.googleRefreshToken!,
        expiry_date: updatedUser.googleTokenExpiry ? new Date(updatedUser.googleTokenExpiry).getTime() : undefined,
      });
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw new TokenExpiredError();
    }
  }

  return { auth: oauth2Client, user: updatedUser };
}

// ─── Public types ──────────────────────────────────────────

export interface SlideContent {
  type: 'title' | 'content' | 'guiding-questions' | 'reflection' | 'image';
  title?: string;
  subtitle?: string;
  /** Body text — OpenAI generates this as "content" */
  content?: string;
  /** Legacy alias — older data may use "text" instead of "content" */
  text?: string;
  bulletPoints?: string[];
  imageUrl?: string;
  imageAlt?: string;
  imageAttribution?: string;
  questions?: string[];
  notes?: string;
}

export interface CreatePresentationOptions {
  colorTheme?: ColorTheme;
  allowUntrustedImages?: boolean;
}

/** Get body text from either "content" or legacy "text" field */
function getBodyText(slide: SlideContent): string | undefined {
  return slide.content || slide.text;
}

// ─── Create presentation ──────────────────────────────────

export async function createPresentation(
  user: Profile,
  title: string
): Promise<{ presentationId: string; url: string }> {
  const { auth } = await getOAuth2Client(user);

  const response = await slidesApi.presentations.create({
    auth,
    requestBody: { title },
  });

  const presentationId = response.data.presentationId!;
  return {
    presentationId,
    url: `https://docs.google.com/presentation/d/${presentationId}/edit`,
  };
}

// ─── Validation ────────────────────────────────────────────

function validateSlideContent(slideContents: SlideContent[]): void {
  slideContents.forEach((content, index) => {
    let requestCount = 5; // base: createSlide + accent bar (2) + potential divider (2)
    if (content.title) requestCount += 3;
    if (content.subtitle) requestCount += 3;
    if (content.text) requestCount += 3;
    if (content.bulletPoints?.length) requestCount += 3;
    if (content.questions?.length) requestCount += 5; // bg rect + text
    if (content.imageUrl) requestCount += 1;
    if (content.notes) requestCount += 1;
    if (requestCount > MAX_REQUESTS_PER_SLIDE * 2) {
      throw new BatchSizeExceededError(index, requestCount);
    }
  });
}

function validateSlideImages(
  slideContents: SlideContent[],
  allowUntrusted = false
): SlideContent[] {
  return slideContents.map((slide, index) => {
    if (!slide.imageUrl) return slide;
    try {
      const validatedUrl = validateImageUrl(slide.imageUrl, allowUntrusted);
      if (validatedUrl && !isPublicUrl(validatedUrl)) {
        console.warn(`Slide ${index}: Image may not be publicly accessible: ${validatedUrl}`);
      }
      return { ...slide, imageUrl: validatedUrl };
    } catch {
      return { ...slide, imageUrl: undefined };
    }
  });
}

// ─── Slide builders ────────────────────────────────────────

function buildTitleSlide(content: SlideContent, index: number, theme: typeof COLOR_THEMES.blue): any[] {
  const slideId = `slide_${index}`;
  const requests: any[] = [];
  const L = TITLE_SLIDE;

  // Create blank slide
  requests.push({
    createSlide: {
      objectId: slideId,
      slideLayoutReference: { predefinedLayout: 'BLANK' },
    },
  });

  // Background: light surface colour
  requests.push({
    updatePageProperties: {
      objectId: slideId,
      pageProperties: {
        pageBackgroundFill: solidFill(theme.surface),
      },
      fields: 'pageBackgroundFill',
    },
  });

  // Top accent bar
  addRect(requests, `accent_${index}`, slideId,
    L.accentBar.x, L.accentBar.y, L.accentBar.width, L.accentBar.height,
    theme.primary);

  // Title
  if (content.title) {
    addTextBox(requests, `title_${index}`, slideId, L.title, content.title,
      textStyle(L.title.fontSize, DARK_TEXT, { bold: true, fontFamily: FONT_FAMILY_TITLE }));
  }

  // Decorative divider
  addLine(requests, `div_${index}`, slideId,
    L.divider.x, L.divider.y, L.divider.width,
    theme.primary, L.divider.thickness);

  // Subtitle — check both subtitle field and content/text field (OpenAI often uses "content" for subtitle)
  const subtitleText = content.subtitle || getBodyText(content);
  if (subtitleText) {
    addTextBox(requests, `sub_${index}`, slideId, L.subtitle, subtitleText,
      textStyle(L.subtitle.fontSize, theme.muted, { italic: false }));
  }

  return requests;
}

function buildContentSlide(content: SlideContent, index: number, theme: typeof COLOR_THEMES.blue): any[] {
  const slideId = `slide_${index}`;
  const requests: any[] = [];
  const hasImage = !!content.imageUrl;
  const L = hasImage ? IMAGE_CONTENT_SLIDE : CONTENT_SLIDE;

  requests.push({
    createSlide: {
      objectId: slideId,
      slideLayoutReference: { predefinedLayout: 'BLANK' },
    },
  });

  // White background
  requests.push({
    updatePageProperties: {
      objectId: slideId,
      pageProperties: { pageBackgroundFill: solidFill(WHITE) },
      fields: 'pageBackgroundFill',
    },
  });

  // Left accent bar
  addRect(requests, `accent_${index}`, slideId,
    L.accentBar.x, L.accentBar.y, L.accentBar.width, L.accentBar.height,
    theme.primary);

  // Title
  if (content.title) {
    addTextBox(requests, `title_${index}`, slideId, L.title, content.title,
      textStyle(L.title.fontSize, theme.secondary, { bold: true, fontFamily: FONT_FAMILY_TITLE }));

    // Divider line under title
    addLine(requests, `div_${index}`, slideId,
      L.divider.x, L.divider.y, L.divider.width,
      theme.accent, L.divider.thickness);
  }

  // Body content: combine text + bullet points into one text box
  const bodyText = getBodyText(content);
  const hasBullets = content.bulletPoints && content.bulletPoints.length > 0;

  if (bodyText && hasBullets) {
    // Both text and bullets — show text paragraph followed by bullet list
    const combinedText = bodyText + '\n' + content.bulletPoints!.join('\n');
    const bulletStartIndex = bodyText.length + 1; // after the newline

    addTextBox(requests, `body_${index}`, slideId, L.body, combinedText,
      textStyle(L.body.fontSize, BODY_TEXT));

    // Make only the bullet portion bulleted
    requests.push({
      createParagraphBullets: {
        objectId: `body_${index}`,
        textRange: {
          startIndex: bulletStartIndex,
          endIndex: combinedText.length,
          type: 'FIXED_RANGE',
        },
        bulletPreset: 'BULLET_DISC_CIRCLE_SQUARE',
      },
    });

    requests.push({
      updateParagraphStyle: {
        objectId: `body_${index}`,
        style: { lineSpacing: L.body.lineSpacing, spaceAbove: { magnitude: 4, unit: 'PT' } },
        fields: 'lineSpacing,spaceAbove',
      },
    });
  } else if (bodyText) {
    addTextBox(requests, `body_${index}`, slideId, L.body, bodyText,
      textStyle(L.body.fontSize, BODY_TEXT));

    requests.push({
      updateParagraphStyle: {
        objectId: `body_${index}`,
        style: { lineSpacing: L.body.lineSpacing, spaceAbove: { magnitude: 6, unit: 'PT' } },
        fields: 'lineSpacing,spaceAbove',
      },
    });
  } else if (hasBullets) {
    const bulletText = content.bulletPoints!.join('\n');
    addTextBox(requests, `body_${index}`, slideId, L.body, bulletText,
      textStyle(L.body.bulletFontSize, BODY_TEXT));

    requests.push({
      createParagraphBullets: {
        objectId: `body_${index}`,
        bulletPreset: 'BULLET_DISC_CIRCLE_SQUARE',
      },
    });

    requests.push({
      updateParagraphStyle: {
        objectId: `body_${index}`,
        style: {
          lineSpacing: L.body.lineSpacing,
          spaceAbove: { magnitude: 4, unit: 'PT' },
          spaceBelow: { magnitude: 4, unit: 'PT' },
        },
        fields: 'lineSpacing,spaceAbove,spaceBelow',
      },
    });
  }

  // Image (right column when present)
  if (content.imageUrl && 'image' in L) {
    const img = L.image;
    try {
      requests.push({
        createImage: {
          url: content.imageUrl,
          elementProperties: shapeProps(slideId, img.x, img.y, img.width, img.height),
        },
      });
    } catch (error) {
      console.error(`Failed to add image to slide ${index}:`, error);
    }
  }

  return requests;
}

function buildQuestionsSlide(content: SlideContent, index: number, theme: typeof COLOR_THEMES.blue): any[] {
  const slideId = `slide_${index}`;
  const requests: any[] = [];
  const L = QUESTIONS_SLIDE;

  requests.push({
    createSlide: {
      objectId: slideId,
      slideLayoutReference: { predefinedLayout: 'BLANK' },
    },
  });

  // White background
  requests.push({
    updatePageProperties: {
      objectId: slideId,
      pageProperties: { pageBackgroundFill: solidFill(WHITE) },
      fields: 'pageBackgroundFill',
    },
  });

  // Top accent bar
  addRect(requests, `accent_${index}`, slideId,
    L.accentBar.x, L.accentBar.y, L.accentBar.width, L.accentBar.height,
    theme.primary);

  // Rounded-look background rectangle (accent tint)
  addRect(requests, `bg_${index}`, slideId,
    L.bgRect.x, L.bgRect.y, L.bgRect.width, L.bgRect.height,
    theme.accent);

  // Title
  const titleText = content.title || (content.type === 'guiding-questions' ? 'Guiding Questions' : 'Reflection');
  addTextBox(requests, `title_${index}`, slideId, L.title, titleText,
    textStyle(L.title.fontSize, theme.secondary, { bold: true, fontFamily: FONT_FAMILY_TITLE }));

  // Questions / text content
  const qBodyText = content.questions
    ? content.questions.map((q, i) => `${i + 1}.  ${q}`).join('\n\n')
    : getBodyText(content) || '';

  if (qBodyText) {
    addTextBox(requests, `qbody_${index}`, slideId, L.body, qBodyText,
      textStyle(L.body.fontSize, BODY_TEXT));

    requests.push({
      updateParagraphStyle: {
        objectId: `qbody_${index}`,
        style: {
          lineSpacing: L.body.lineSpacing,
          spaceAbove: { magnitude: 4, unit: 'PT' },
        },
        fields: 'lineSpacing,spaceAbove',
      },
    });
  }

  return requests;
}

// ─── Master builder ────────────────────────────────────────

function createSlideRequests(
  content: SlideContent,
  index: number,
  colorTheme: ColorTheme = 'blue'
): any[] {
  const theme = COLOR_THEMES[colorTheme];

  switch (content.type) {
    case 'title':
      return buildTitleSlide(content, index, theme);
    case 'guiding-questions':
    case 'reflection':
      return buildQuestionsSlide(content, index, theme);
    case 'content':
    case 'image':
    default:
      return buildContentSlide(content, index, theme);
  }
}

// ─── Add slides to presentation ────────────────────────────

export async function addSlidesToPresentation(
  user: Profile,
  presentationId: string,
  slideContents: SlideContent[],
  options: CreatePresentationOptions = {}
): Promise<{ successCount: number; failedSlides: number[]; warnings: string[] }> {
  const { auth } = await getOAuth2Client(user);
  const warnings: string[] = [];
  const failedSlides: number[] = [];

  validateSlideContent(slideContents);
  const validatedSlides = validateSlideImages(slideContents, options.allowUntrustedImages);

  // Get presentation to find the default blank slide
  const presentation = await slidesApi.presentations.get({ auth, presentationId });
  const firstSlideId = presentation.data.slides?.[0]?.objectId;
  const allRequests: any[] = [];

  // Delete the default blank slide
  if (firstSlideId) {
    allRequests.push({ deleteObject: { objectId: firstSlideId } });
  }

  // Build and execute requests per slide so one failure doesn't kill all slides
  let successCount = 0;

  for (let index = 0; index < validatedSlides.length; index++) {
    const content = validatedSlides[index];
    try {
      const slideRequests = createSlideRequests(content, index, options.colorTheme);

      // Combine the delete-default-slide request with the first slide's requests
      const requests = index === 0 && firstSlideId
        ? [{ deleteObject: { objectId: firstSlideId } }, ...slideRequests]
        : slideRequests;

      await slidesApi.presentations.batchUpdate({
        auth,
        presentationId,
        requestBody: { requests },
      });
      successCount++;
    } catch (error: any) {
      // Extract detailed Google API error
      const apiErrors = error?.errors || error?.response?.data?.error?.details || [];
      const detail = apiErrors.length > 0
        ? JSON.stringify(apiErrors[0])
        : (error?.response?.data?.error?.message || error?.message || 'Unknown error');

      console.error(`Slide ${index} failed:`, detail);
      console.error(`Slide ${index} content type:`, content.type, 'title:', content.title);
      failedSlides.push(index);
      warnings.push(`Slide ${index}: ${detail}`);
    }
  }

  // If first slide failed and we didn't delete the default blank, try deleting it now
  if (firstSlideId && failedSlides.includes(0)) {
    try {
      await slidesApi.presentations.batchUpdate({
        auth,
        presentationId,
        requestBody: { requests: [{ deleteObject: { objectId: firstSlideId } }] },
      });
    } catch { /* ignore */ }
  }

  // Speaker notes (best-effort)
  for (let i = 0; i < validatedSlides.length; i++) {
    if (validatedSlides[i].notes) {
      try {
        await addSpeakerNotes(auth, presentationId, `slide_${i}`, validatedSlides[i].notes!);
      } catch {
        warnings.push(`Slide ${i}: Speaker notes could not be added`);
      }
    }
  }

  return {
    successCount: validatedSlides.length - failedSlides.length,
    failedSlides,
    warnings,
  };
}

// ─── Speaker notes ─────────────────────────────────────────

async function addSpeakerNotes(
  auth: any,
  presentationId: string,
  slideId: string,
  notes: string
): Promise<void> {
  try {
    const presentation = await slidesApi.presentations.get({ auth, presentationId });
    const slide = presentation.data.slides?.find(s => s.objectId === slideId);
    if (!slide?.slideProperties?.notesPage) throw new Error('Notes page not found');

    const notesShape = slide.slideProperties.notesPage.pageElements?.find(
      el => el.shape?.placeholder?.type === 'BODY'
    );
    if (!notesShape?.objectId) throw new Error('Notes shape not found');

    await slidesApi.presentations.batchUpdate({
      auth,
      presentationId,
      requestBody: {
        requests: [{ insertText: { objectId: notesShape.objectId, text: notes } }],
      },
    });
  } catch (error) {
    throw new SpeakerNotesError(parseInt(slideId.replace('slide_', '')));
  }
}
