/**
 * Extract a YouTube video ID from any common URL format.
 *
 * Supports:
 *   youtube.com/watch?v=ID
 *   youtube.com/watch?v=ID&t=30s
 *   youtu.be/ID
 *   youtube.com/embed/ID
 *   youtube.com/v/ID
 *   youtube.com/shorts/ID
 *   youtube.com/live/ID
 *   Plain video ID (11 chars)
 */
export function extractVideoId(url: string): string | null {
  if (!url) return null;

  // Already a bare video ID (11 alphanumeric + dash/underscore)
  if (/^[a-zA-Z0-9_-]{11}$/.test(url.trim())) {
    return url.trim();
  }

  const patterns = [
    /(?:youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube-nocookie\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

/**
 * Validate that a string is a valid YouTube URL or video ID.
 */
export function isValidYouTubeUrl(url: string): boolean {
  return extractVideoId(url) !== null;
}
