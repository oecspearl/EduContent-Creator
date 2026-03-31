/**
 * Low-level Google Slides API helper functions for building batch requests.
 *
 * These are pure functions that construct request objects — they have no
 * side effects and do not call the Google API directly.
 */

import { FONT_FAMILY } from '../constants/slides';

export function shapeProps(pageId: string, x: number, y: number, w: number, h: number) {
  return {
    pageObjectId: pageId,
    size: {
      height: { magnitude: h, unit: 'EMU' },
      width: { magnitude: w, unit: 'EMU' },
    },
    transform: { scaleX: 1, scaleY: 1, translateX: x, translateY: y, unit: 'EMU' },
  };
}

export function solidFill(rgb: { red: number; green: number; blue: number }, alpha = 1) {
  return { solidFill: { color: { rgbColor: rgb }, alpha } };
}

export function textStyle(
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

export function fieldsFor(style: Record<string, any>): string {
  const keys: string[] = [];
  if (style.fontSize) keys.push('fontSize');
  if (style.foregroundColor) keys.push('foregroundColor');
  if (style.bold !== undefined) keys.push('bold');
  if (style.italic !== undefined) keys.push('italic');
  if (style.fontFamily) keys.push('fontFamily');
  return keys.join(',');
}

/** Add a filled rectangle (accent bar, background, etc.) */
export function addRect(
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
export function addTextBox(
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
export function addLine(
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
