declare global {
  interface Window {
    YT: typeof YT;
    onYouTubeIframeAPIReady: () => void;
  }
}

export namespace YT {
  export interface Player {
    playVideo(): void;
    pauseVideo(): void;
    stopVideo(): void;
    seekTo(seconds: number, allowSeekAhead: boolean): void;
    mute(): void;
    unMute(): void;
    isMuted(): boolean;
    setVolume(volume: number): void;
    getVolume(): number;
    getDuration(): number;
    getCurrentTime(): number;
    getPlayerState(): PlayerState;
    destroy(): void;
  }

  export enum PlayerState {
    UNSTARTED = -1,
    ENDED = 0,
    PLAYING = 1,
    PAUSED = 2,
    BUFFERING = 3,
    CUED = 5,
  }

  export interface PlayerOptions {
    videoId?: string;
    width?: number | string;
    height?: number | string;
    playerVars?: PlayerVars;
    events?: PlayerEvents;
  }

  export interface PlayerVars {
    autoplay?: 0 | 1;
    cc_load_policy?: 0 | 1;
    color?: 'red' | 'white';
    controls?: 0 | 1;
    disablekb?: 0 | 1;
    enablejsapi?: 0 | 1;
    end?: number;
    fs?: 0 | 1;
    hl?: string;
    iv_load_policy?: 1 | 3;
    list?: string;
    listType?: 'playlist' | 'search' | 'user_uploads';
    loop?: 0 | 1;
    modestbranding?: 0 | 1;
    origin?: string;
    playlist?: string;
    playsinline?: 0 | 1;
    rel?: 0 | 1;
    showinfo?: 0 | 1;
    start?: number;
    widget_referrer?: string;
  }

  export interface PlayerEvents {
    onReady?: (event: PlayerEvent) => void;
    onStateChange?: (event: OnStateChangeEvent) => void;
    onPlaybackQualityChange?: (event: PlayerEvent) => void;
    onPlaybackRateChange?: (event: PlayerEvent) => void;
    onError?: (event: OnErrorEvent) => void;
    onApiChange?: (event: PlayerEvent) => void;
  }

  export interface PlayerEvent {
    target: Player;
    data: any;
  }

  export interface OnStateChangeEvent extends PlayerEvent {
    data: PlayerState;
  }

  export interface OnErrorEvent extends PlayerEvent {
    data: PlayerError;
  }

  export enum PlayerError {
    INVALID_PARAM = 2,
    HTML5_ERROR = 5,
    NOT_FOUND = 100,
    NOT_EMBEDDABLE = 101,
    CANT_PLAY = 150,
  }

  export class Player {
    constructor(elementId: string | HTMLElement, options: PlayerOptions);
  }
}

export {};
