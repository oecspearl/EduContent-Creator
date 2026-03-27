/**
 * Custom error classes for presentation-related operations
 */

export class PresentationError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'PresentationError';
    Object.setPrototypeOf(this, PresentationError.prototype);
  }
}

export class GoogleAuthError extends PresentationError {
  constructor(message: string = 'Please reconnect your Google account to continue creating presentations.') {
    super(message, 'GOOGLE_AUTH_ERROR');
    this.name = 'GoogleAuthError';
    Object.setPrototypeOf(this, GoogleAuthError.prototype);
  }
}

export class TokenExpiredError extends GoogleAuthError {
  constructor() {
    super('Your Google session has expired. Please reconnect your Google account.');
    this.name = 'TokenExpiredError';
    Object.setPrototypeOf(this, TokenExpiredError.prototype);
  }
}

export class TokenRefreshError extends GoogleAuthError {
  constructor() {
    super('Failed to refresh your Google access token. Please reconnect your Google account.');
    this.name = 'TokenRefreshError';
    Object.setPrototypeOf(this, TokenRefreshError.prototype);
  }
}

export class InvalidImageUrlError extends PresentationError {
  constructor(url: string) {
    super(
      `Invalid or inaccessible image URL: ${url}. Please ensure the image is publicly accessible.`,
      'INVALID_IMAGE_URL'
    );
    this.name = 'InvalidImageUrlError';
    Object.setPrototypeOf(this, InvalidImageUrlError.prototype);
  }
}

export class UntrustedImageDomainError extends PresentationError {
  constructor(url: string) {
    super(
      `Image URL from untrusted domain: ${url}. Only images from approved sources are allowed.`,
      'UNTRUSTED_IMAGE_DOMAIN'
    );
    this.name = 'UntrustedImageDomainError';
    Object.setPrototypeOf(this, UntrustedImageDomainError.prototype);
  }
}

export class BatchSizeExceededError extends PresentationError {
  constructor(slideIndex: number, requestCount: number) {
    super(
      `Slide ${slideIndex} has too many elements (${requestCount} requests). Please simplify the slide.`,
      'BATCH_SIZE_EXCEEDED'
    );
    this.name = 'BatchSizeExceededError';
    Object.setPrototypeOf(this, BatchSizeExceededError.prototype);
  }
}

export class SlideCreationError extends PresentationError {
  constructor(slideIndex: number, cause: Error) {
    super(
      `Failed to create slide ${slideIndex}: ${cause.message}`,
      'SLIDE_CREATION_ERROR'
    );
    this.name = 'SlideCreationError';
    this.cause = cause;
    Object.setPrototypeOf(this, SlideCreationError.prototype);
  }
}

export class SpeakerNotesError extends PresentationError {
  constructor(slideIndex: number) {
    super(
      `Failed to add speaker notes to slide ${slideIndex}. Notes may not be available.`,
      'SPEAKER_NOTES_ERROR'
    );
    this.name = 'SpeakerNotesError';
    Object.setPrototypeOf(this, SpeakerNotesError.prototype);
  }
}

export class ImageInsertionError extends PresentationError {
  constructor(slideIndex: number, imageUrl: string, cause: Error) {
    super(
      `Failed to insert image on slide ${slideIndex}: ${cause.message}. Image URL: ${imageUrl}`,
      'IMAGE_INSERTION_ERROR'
    );
    this.name = 'ImageInsertionError';
    this.cause = cause;
    Object.setPrototypeOf(this, ImageInsertionError.prototype);
  }
}

export class RateLimitError extends PresentationError {
  constructor(retryAfter?: number) {
    const message = retryAfter
      ? `Rate limit exceeded. Please try again in ${retryAfter} seconds.`
      : 'Rate limit exceeded. Please try again later.';
    super(message, 'RATE_LIMIT_ERROR');
    this.name = 'RateLimitError';
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}
