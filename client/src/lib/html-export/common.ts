// Common utility functions for HTML export modules

export function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Extract YouTube video ID from various URL formats
export function extractVideoIdFromUrl(url: string): string {
  if (!url) return "";

  // Handle direct video ID
  if (!url.includes('http') && !url.includes('/')) {
    return url;
  }

  // Handle youtube.com/watch?v=VIDEO_ID
  const watchMatch = url.match(/[?&]v=([^&]+)/);
  if (watchMatch) return watchMatch[1];

  // Handle youtu.be/VIDEO_ID
  const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
  if (shortMatch) return shortMatch[1];

  // Handle youtube.com/embed/VIDEO_ID
  const embedMatch = url.match(/embed\/([^?&]+)/);
  if (embedMatch) return embedMatch[1];

  return "";
}

// Convert base64 data URI to a format suitable for embedding
export function ensureDataUri(data: string): string {
  if (!data) return "";
  // If already a data URI, return as is
  if (data.startsWith("data:")) return data;
  // If it's a URL, we'll need to fetch it (but for now, return as is for external URLs)
  if (data.startsWith("http://") || data.startsWith("https://")) return data;
  // Assume it's base64 and add data URI prefix
  return `data:image/png;base64,${data}`;
}

// Generate HTML for a single image
export function generateImageHtml(imageUrl: string, alt: string = ""): string {
  const dataUri = ensureDataUri(imageUrl);
  return `<div style="text-align: center; margin: 1.5rem 0;">
    <img src="${dataUri}" alt="${alt}" style="max-width: 100%; max-height: 500px; height: auto; width: auto; display: block; margin: 0 auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />
  </div>`;
}

// Generate HTML for audio player
export function generateAudioHtml(audioUrl: string): string {
  if (!audioUrl) return "";
  const dataUri = ensureDataUri(audioUrl);
  return `
    <div style="margin: 1rem 0; padding: 1rem; background: #f5f5f5; border-radius: 8px;">
      <audio controls style="width: 100%;">
        <source src="${dataUri}" type="audio/webm">
        <source src="${dataUri}" type="audio/mpeg">
        Your browser does not support the audio element.
      </audio>
    </div>
  `;
}

// Generate HTML for video (YouTube or local file)
export function generateVideoHtml(videoId: string, title: string = "", videoUrl?: string, localVideoUrl?: string): string {
  // Check if this is a local video file
  if (localVideoUrl) {
    return `
      <div style="margin: 1.5rem 0; position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); background: #000;">
        <video
          controls
          style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; border-radius: 8px;"
          title="${escapeHtml(title)}"
        >
          <source src="${escapeHtml(localVideoUrl)}" type="video/mp4">
          <source src="${escapeHtml(localVideoUrl)}" type="video/webm">
          <source src="${escapeHtml(localVideoUrl)}" type="video/ogg">
          Your browser does not support the video tag.
        </video>
      </div>
      <p style="text-align: center; color: #666; font-size: 0.9rem; margin-top: 0.5rem;">
        <em>Local video file</em>
      </p>
    `;
  }

  // Check if videoUrl is a local file path
  if (videoUrl && (videoUrl.startsWith('./') || videoUrl.startsWith('../') || videoUrl.startsWith('/') || !videoUrl.includes('youtube.com') && !videoUrl.includes('youtu.be'))) {
    return `
      <div style="margin: 1.5rem 0; position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); background: #000;">
        <video
          controls
          style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; border-radius: 8px;"
          title="${escapeHtml(title)}"
        >
          <source src="${escapeHtml(videoUrl)}" type="video/mp4">
          <source src="${escapeHtml(videoUrl)}" type="video/webm">
          <source src="${escapeHtml(videoUrl)}" type="video/ogg">
          Your browser does not support the video tag.
        </video>
      </div>
      <p style="text-align: center; color: #666; font-size: 0.9rem; margin-top: 0.5rem;">
        <em>Local video file</em>
      </p>
    `;
  }

  // YouTube video - extract video ID if full URL is provided
  let cleanVideoId = videoId;
  if (videoId.includes('youtube.com/watch?v=')) {
    cleanVideoId = videoId.split('v=')[1]?.split('&')[0] || videoId;
  } else if (videoId.includes('youtu.be/')) {
    cleanVideoId = videoId.split('youtu.be/')[1]?.split('?')[0] || videoId;
  } else if (videoUrl && videoUrl.includes('youtube.com/watch?v=')) {
    cleanVideoId = videoUrl.split('v=')[1]?.split('&')[0] || videoId;
  } else if (videoUrl && videoUrl.includes('youtu.be/')) {
    cleanVideoId = videoUrl.split('youtu.be/')[1]?.split('?')[0] || videoId;
  }

  // Validate video ID (should be 11 characters for YouTube)
  if (!cleanVideoId || cleanVideoId.length !== 11) {
    return `
      <div style="margin: 1.5rem 0; padding: 2rem; background: #f8d7da; border: 2px solid #dc3545; border-radius: 8px; text-align: center;">
        <p style="color: #721c24; font-weight: bold; margin-bottom: 0.5rem;">Video Error</p>
        <p style="color: #721c24; margin-bottom: 1rem;">Invalid video ID or URL. Please check the video link.</p>
        ${videoUrl ? `<a href="${escapeHtml(videoUrl)}" target="_blank" rel="noopener noreferrer" style="color: #4a90e2; text-decoration: underline;">Open video on YouTube</a>` : ''}
      </div>
    `;
  }

  const youtubeUrl = videoUrl || `https://www.youtube.com/watch?v=${cleanVideoId}`;

  return `
    <div style="margin: 1.5rem 0; position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); background: #000;">
      <iframe
        id="youtube-iframe-${cleanVideoId}"
        src="https://www.youtube.com/embed/${cleanVideoId}?enablejsapi=1&rel=0&modestbranding=1"
        style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; border-radius: 8px;"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowfullscreen
        title="${escapeHtml(title)}"
        loading="lazy"
      ></iframe>
    </div>
    <div id="youtube-error-${cleanVideoId}" style="display: none; margin: 1rem 0; padding: 1rem; background: #fff3cd; border: 2px solid #ffc107; border-radius: 8px; text-align: center;">
      <p style="color: #856404; font-weight: bold; margin-bottom: 0.5rem;">Video cannot be embedded</p>
      <p style="color: #856404; margin-bottom: 1rem;">This video may be restricted or unavailable for embedding.</p>
      <a href="${escapeHtml(youtubeUrl)}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 0.5rem 1.5rem; background: #4a90e2; color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">Watch on YouTube</a>
    </div>
    <p style="text-align: center; color: #666; font-size: 0.9rem; margin-top: 0.5rem;">
      <em>Note: Video requires internet connection to play</em>
    </p>
    <script>
      function handleYouTubeError(videoId, videoUrl) {
        const iframe = document.getElementById('youtube-iframe-' + videoId);
        const errorDiv = document.getElementById('youtube-error-' + videoId);
        if (iframe && errorDiv) {
          iframe.style.display = 'none';
          errorDiv.style.display = 'block';
        }
      }

      // Check for YouTube iframe errors after load
      window.addEventListener('load', function() {
        const iframes = document.querySelectorAll('iframe[src*="youtube.com/embed"]');
        iframes.forEach(function(iframe) {
          iframe.addEventListener('load', function() {
            // Try to detect error 153 or other embed errors
            try {
              if (iframe.contentWindow) {
                // If we can access contentWindow, check for errors
                setTimeout(function() {
                  // Check if iframe is still visible and has content
                  const rect = iframe.getBoundingClientRect();
                  if (rect.height === 0 || rect.width === 0) {
                    const videoId = iframe.id.replace('youtube-iframe-', '');
                    const errorDiv = document.getElementById('youtube-error-' + videoId);
                    if (errorDiv) {
                      iframe.style.display = 'none';
                      errorDiv.style.display = 'block';
                    }
                  }
                }, 2000);
              }
            } catch (e) {
              // Cross-origin restrictions - can't check, but that's okay
            }
          });
        });
      });
    </script>
  `;
}
