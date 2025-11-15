import { google } from 'googleapis';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=youtube',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('YouTube not connected');
  }
  return accessToken;
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
// Always call this function again to get a fresh client.
export async function getUncachableYouTubeClient() {
  const accessToken = await getAccessToken();
  return google.youtube({ version: 'v3', auth: accessToken });
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
    const youtube = await getUncachableYouTubeClient();
    
    // Build search query from educational criteria
    const query = `${params.subject} ${params.topic} ${params.learningOutcome} education tutorial grade ${params.gradeLevel}`;
    
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
    
    // Check if it's an auth issue
    if (error.message && error.message.includes('YouTube not connected')) {
      throw new Error('YouTube integration not set up. Please authorize the YouTube connection in your Replit account settings.');
    }
    
    if (error.message && (error.message.includes('API key') || error.message.includes('credentials'))) {
      throw new Error('YouTube API authorization required. Please complete the YouTube OAuth setup in Replit.');
    }
    
    throw new Error('Failed to search YouTube videos. Please try again.');
  }
}
