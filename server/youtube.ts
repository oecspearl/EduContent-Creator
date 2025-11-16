import { google } from 'googleapis';

// Get YouTube client using Google API Key
function getYouTubeClient() {
  // Accept both YOUTUBE_API_KEY and GOOGLE_API_KEY for flexibility
  const apiKey = process.env.YOUTUBE_API_KEY || process.env.GOOGLE_API_KEY;
  
  if (!apiKey) {
    throw new Error('YouTube API key not found. Please set YOUTUBE_API_KEY or GOOGLE_API_KEY in environment variables.');
  }
  
  return google.youtube({
    version: 'v3',
    auth: apiKey,
  });
}

export interface YouTubeSearchParams {
  subject: string;
  topic: string;
  learningOutcome: string;
  gradeLevel: string;
  ageRange: string;
  maxResults: number;
}

export async function searchEducationalVideos(params: YouTubeSearchParams) {
  try {
    const youtube = getYouTubeClient();
    
    // Build search query from educational criteria
    const query = `${params.subject} ${params.topic} ${params.learningOutcome} education tutorial grade ${params.gradeLevel}`;
    
    console.log('[YouTube API] Requesting maxResults:', params.maxResults, 'Type:', typeof params.maxResults);
    
    const searchResponse = await youtube.search.list({
      part: ['snippet'],
      q: query,
      type: ['video'],
      maxResults: params.maxResults,
      order: 'relevance',
      safeSearch: 'strict',
      videoEmbeddable: 'true',
      videoSyndicated: 'true',
      relevanceLanguage: 'en',
    });
    
    console.log('[YouTube API] Search returned', searchResponse.data.items?.length || 0, 'items');

    if (!searchResponse.data.items || searchResponse.data.items.length === 0) {
      return [];
    }

    // Get video IDs for detailed information
    const videoIds = searchResponse.data.items
      .map(item => item.id?.videoId)
      .filter((id): id is string => !!id);

    // Fetch video details including duration
    const videosResponse = await youtube.videos.list({
      part: ['contentDetails', 'snippet'],
      id: videoIds,
    });

    // Format results
    const results = videosResponse.data.items?.map(video => ({
      id: video.id || '',
      videoId: video.id || '',
      title: video.snippet?.title || '',
      description: video.snippet?.description || '',
      thumbnailUrl: video.snippet?.thumbnails?.medium?.url || video.snippet?.thumbnails?.default?.url || '',
      channelTitle: video.snippet?.channelTitle || '',
      publishedAt: video.snippet?.publishedAt || '',
      duration: video.contentDetails?.duration || '',
    })) || [];

    return results;
  } catch (error: any) {
    console.error('YouTube API error:', error);
    
    // Check if it's an auth/key issue
    if (error.message && error.message.includes('GOOGLE_API_KEY')) {
      throw new Error('YouTube API key not configured. Please add GOOGLE_API_KEY to your secrets.');
    }
    
    if (error.message && (error.message.includes('API key') || error.message.includes('invalid') || error.message.includes('credentials'))) {
      throw new Error('Invalid YouTube API key. Please check your GOOGLE_API_KEY secret.');
    }
    
    throw new Error('Failed to search YouTube videos. Please try again.');
  }
}
