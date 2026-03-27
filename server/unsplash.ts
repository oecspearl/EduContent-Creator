/**
 * Unsplash API service for fetching educational stock photos
 */

const UNSPLASH_API_URL = 'https://api.unsplash.com';
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

export interface UnsplashPhoto {
  id: string;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  alt_description: string | null;
  description: string | null;
  user: {
    name: string;
    username: string;
    profile_image: {
      small: string;
    };
  };
  links: {
    html: string;
  };
}

/**
 * Search for educational photos on Unsplash
 * @param query Search query (e.g., "classroom", "science experiment")
 * @param perPage Number of results to return (default: 1, max: 30)
 * @returns Array of photo objects
 */
export async function searchPhotos(query: string, perPage: number = 1): Promise<UnsplashPhoto[]> {
  if (!UNSPLASH_ACCESS_KEY) {
    console.warn('Unsplash API key not configured');
    return [];
  }

  try {
    const params = new URLSearchParams({
      query,
      per_page: perPage.toString(),
      orientation: 'landscape',
      content_filter: 'high', // PG-13 content
    });

    const response = await fetch(`${UNSPLASH_API_URL}/search/photos?${params}`, {
      headers: {
        'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`,
      },
    });

    if (!response.ok) {
      console.error('Unsplash API error:', response.status, response.statusText);
      return [];
    }

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('Error fetching photos from Unsplash:', error);
    return [];
  }
}

/**
 * Get a random educational photo based on a query
 * @param query Search query
 * @returns Single photo object or null
 */
export async function getRandomPhoto(query: string): Promise<UnsplashPhoto | null> {
  if (!UNSPLASH_ACCESS_KEY) {
    console.warn('Unsplash API key not configured');
    return null;
  }

  try {
    const params = new URLSearchParams({
      query,
      orientation: 'landscape',
      content_filter: 'high',
    });

    const response = await fetch(`${UNSPLASH_API_URL}/photos/random?${params}`, {
      headers: {
        'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`,
      },
    });

    if (!response.ok) {
      console.error('Unsplash API error:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching random photo from Unsplash:', error);
    return null;
  }
}

/**
 * Generate attribution text for an Unsplash photo
 * @param photo Unsplash photo object
 * @returns Attribution string (e.g., "Photo by John Doe on Unsplash")
 */
export function generateAttribution(photo: UnsplashPhoto): string {
  return `Photo by ${photo.user.name} on Unsplash`;
}

/**
 * Get the alt text for an image (description or alt_description)
 * @param photo Unsplash photo object
 * @returns Alt text string
 */
export function getAltText(photo: UnsplashPhoto): string {
  return photo.alt_description || photo.description || 'Educational image';
}

/**
 * Trigger a download event to support Unsplash API guidelines
 * (required by Unsplash when using images in production)
 * @param photo Unsplash photo object
 */
export async function triggerDownload(photo: UnsplashPhoto): Promise<void> {
  if (!UNSPLASH_ACCESS_KEY) {
    return;
  }

  try {
    await fetch(`${photo.links.html}/download`, {
      headers: {
        'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`,
      },
    });
  } catch (error) {
    console.error('Error triggering Unsplash download event:', error);
  }
}
