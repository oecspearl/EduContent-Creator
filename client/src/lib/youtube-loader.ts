type YouTubeCallback = () => void;

class YouTubeAPILoader {
  private callbacks: YouTubeCallback[] = [];
  private isLoading = false;
  private isLoaded = false;
  private originalHandler: (() => void) | null = null;

  load(callback: YouTubeCallback) {
    // If API is fully loaded and ready, call callback immediately
    if (window.YT && window.YT.Player) {
      if (!this.isLoaded) {
        // Mark as loaded and drain any pending callbacks
        this.isLoaded = true;
        this.isLoading = false;
        const pending = [...this.callbacks];
        this.callbacks = [];
        pending.forEach(cb => cb());
      }
      callback();
      return;
    }

    // Add callback to queue
    this.callbacks.push(callback);

    // If already loading, just wait
    if (this.isLoading) {
      return;
    }

    // Set up the ready handler only once
    this.isLoading = true;
    
    // Preserve any existing handler
    if (window.onYouTubeIframeAPIReady && !this.originalHandler) {
      this.originalHandler = window.onYouTubeIframeAPIReady;
    }

    window.onYouTubeIframeAPIReady = () => {
      this.onReady();
      // Call original handler if it existed with proper context
      if (this.originalHandler) {
        this.originalHandler.call(window);
      }
    };

    // Load the API script if not already loading
    if (!window.YT && !document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }

  private onReady() {
    this.isLoaded = true;
    this.isLoading = false;

    // Execute all queued callbacks
    const callbacks = [...this.callbacks];
    this.callbacks = [];
    callbacks.forEach(cb => cb());
  }
}

export const youtubeLoader = new YouTubeAPILoader();
