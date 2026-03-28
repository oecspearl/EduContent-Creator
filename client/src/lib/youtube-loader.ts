type YouTubeCallback = () => void;

const LOAD_TIMEOUT_MS = 15000; // 15 seconds

class YouTubeAPILoader {
  private callbacks: YouTubeCallback[] = [];
  private isLoading = false;
  private isLoaded = false;
  private hasFailed = false;
  private originalHandler: (() => void) | null = null;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  load(callback: YouTubeCallback) {
    // If API is fully loaded and ready, call callback immediately
    if (window.YT && window.YT.Player) {
      if (!this.isLoaded) {
        this.isLoaded = true;
        this.isLoading = false;
        this.clearTimeout();
        const pending = [...this.callbacks];
        this.callbacks = [];
        pending.forEach(cb => cb());
      }
      callback();
      return;
    }

    // If previously failed, retry
    if (this.hasFailed) {
      this.hasFailed = false;
      this.isLoading = false;
    }

    // Add callback to queue
    this.callbacks.push(callback);

    // If already loading, just wait
    if (this.isLoading) return;

    // Set up the ready handler only once
    this.isLoading = true;

    // Preserve any existing handler
    if (window.onYouTubeIframeAPIReady && !this.originalHandler) {
      this.originalHandler = window.onYouTubeIframeAPIReady;
    }

    window.onYouTubeIframeAPIReady = () => {
      this.onReady();
      if (this.originalHandler) {
        this.originalHandler.call(window);
      }
    };

    // Start timeout — if API doesn't load in time, fire callbacks anyway
    // so the UI doesn't hang forever
    this.timeoutId = setTimeout(() => {
      if (!this.isLoaded) {
        console.warn("YouTube IFrame API failed to load within timeout");
        this.hasFailed = true;
        this.isLoading = false;
        // Fire callbacks — they'll check for window.YT and handle gracefully
        const callbacks = [...this.callbacks];
        this.callbacks = [];
        callbacks.forEach(cb => {
          try { cb(); } catch { /* component will handle missing YT */ }
        });
      }
    }, LOAD_TIMEOUT_MS);

    // Load the API script if not already loading
    if (!window.YT && !document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      tag.onerror = () => {
        console.error("Failed to load YouTube IFrame API script");
        this.hasFailed = true;
        this.isLoading = false;
        this.clearTimeout();
        const callbacks = [...this.callbacks];
        this.callbacks = [];
        callbacks.forEach(cb => {
          try { cb(); } catch { /* component handles missing YT */ }
        });
      };
      document.head.appendChild(tag);
    }
  }

  private clearTimeout() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  private onReady() {
    this.isLoaded = true;
    this.isLoading = false;
    this.hasFailed = false;
    this.clearTimeout();

    const callbacks = [...this.callbacks];
    this.callbacks = [];
    callbacks.forEach(cb => cb());
  }
}

export const youtubeLoader = new YouTubeAPILoader();
