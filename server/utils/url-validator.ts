/**
 * URL validation utilities to prevent SSRF (Server-Side Request Forgery) attacks
 */

import { TRUSTED_IMAGE_DOMAINS } from '../constants/slides';
import { UntrustedImageDomainError, InvalidImageUrlError } from '../errors/presentation-errors';

/**
 * Validates if a URL is from a trusted domain
 * @param url - URL to validate
 * @returns True if URL is from a trusted domain
 */
export function isUrlTrusted(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();

    // Check if hostname matches any trusted domain (including subdomains)
    return TRUSTED_IMAGE_DOMAINS.some(domain => {
      const normalizedDomain = domain.toLowerCase();
      return hostname === normalizedDomain || hostname.endsWith(`.${normalizedDomain}`);
    });
  } catch (error) {
    return false;
  }
}

/**
 * Validates and normalizes an image URL
 * @param url - URL to validate
 * @param allowUntrusted - Allow URLs from untrusted domains (default: false)
 * @returns Normalized URL
 * @throws {InvalidImageUrlError} If URL is invalid
 * @throws {UntrustedImageDomainError} If URL is from untrusted domain
 */
export function validateImageUrl(url: string | undefined, allowUntrusted: boolean = false): string | undefined {
  if (!url) return undefined;

  // Trim whitespace
  const trimmedUrl = url.trim();
  if (!trimmedUrl) return undefined;

  // Validate URL format
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(trimmedUrl);
  } catch (error) {
    throw new InvalidImageUrlError(trimmedUrl);
  }

  // Only allow HTTP and HTTPS protocols
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new InvalidImageUrlError(trimmedUrl);
  }

  // Upgrade to HTTPS if possible
  if (parsedUrl.protocol === 'http:') {
    parsedUrl.protocol = 'https:';
  }

  // Check if domain is trusted
  if (!allowUntrusted && !isUrlTrusted(parsedUrl.href)) {
    throw new UntrustedImageDomainError(parsedUrl.href);
  }

  return parsedUrl.href;
}

/**
 * Validates multiple image URLs
 * @param urls - Array of URLs to validate
 * @param allowUntrusted - Allow URLs from untrusted domains
 * @returns Array of validated URLs with errors
 */
export function validateImageUrls(
  urls: (string | undefined)[],
  allowUntrusted: boolean = false
): Array<{ url: string | undefined; valid: boolean; error?: string }> {
  return urls.map(url => {
    try {
      const validatedUrl = validateImageUrl(url, allowUntrusted);
      return { url: validatedUrl, valid: true };
    } catch (error) {
      return {
        url,
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });
}

/**
 * Checks if a URL is publicly accessible (basic check)
 * @param url - URL to check
 * @returns True if URL appears to be public
 */
export function isPublicUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();

    // Reject localhost and private IP ranges
    const privatePatterns = [
      /^localhost$/i,
      /^127\.\d+\.\d+\.\d+$/,
      /^10\.\d+\.\d+\.\d+$/,
      /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,
      /^192\.168\.\d+\.\d+$/,
      /^0\.0\.0\.0$/,
      /^\[::/,
      /^::1$/,
    ];

    return !privatePatterns.some(pattern => pattern.test(hostname));
  } catch (error) {
    return false;
  }
}

/**
 * Adds a domain to trusted domains list (runtime only, not persisted)
 * This is useful for testing or dynamic domain trust
 * @param domain - Domain to add
 */
export function addTrustedDomain(domain: string): void {
  const normalizedDomain = domain.toLowerCase().replace(/^https?:\/\//, '');
  if (!TRUSTED_IMAGE_DOMAINS.includes(normalizedDomain)) {
    TRUSTED_IMAGE_DOMAINS.push(normalizedDomain);
  }
}
