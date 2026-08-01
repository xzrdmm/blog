export interface Track {
  id?: string;
  src: string;
  title: string;
  artist: string;
  cover?: string;
  playlist?: string;
  lyricsSrc?: string;
  lyricsText?: string;
}

export type PlayMode = 'order' | 'shuffle' | 'repeat-one';

export interface AudioState {
  track: Track | null;
  playing: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  error: string;
  loading: boolean;
  mode: PlayMode;
  queue: Track[];
}

type Listener = () => void;

export class AudioStore {
  private listeners = new Set<Listener>();
  private endedListeners = new Set<() => void>();

  state: AudioState = {
    track: null,
    playing: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    error: '',
    loading: false,
    mode: 'order',
    queue: [],
  };

  play(track: Track): void {
    this.setState({ track, playing: true, error: '', loading: true, currentTime: 0, duration: 0 });
  }

  select(track: Track): void {
    this.setState({ track, playing: false, error: '', currentTime: 0, duration: 0 });
  }

  toggle(): void {
    if (this.state.track) {
      this.setState({ playing: !this.state.playing });
    }
  }

  ended(): void {
    this.setState({ playing: false });
    this.endedListeners.forEach((listener) => listener());
  }

  stop(): void {
    this.setState({ track: null, playing: false, currentTime: 0, duration: 0 });
  }

  setTime(time: number): void {
    this.setState({ currentTime: time });
  }

  setDuration(duration: number): void {
    this.setState({ duration });
  }

  setVolume(volume: number): void {
    this.setState({ volume: Math.min(1, Math.max(0, volume)) });
  }

  setError(error: string): void {
    this.setState({ error });
  }

  fail(error: string): void {
    this.setState({ playing: false, loading: false, error });
  }

  setLoading(loading: boolean): void {
    this.setState({ loading });
  }

  setMode(mode: PlayMode): void {
    this.setState({ mode });
  }

  addToQueue(track: Track): void {
    this.setState({ queue: [...this.state.queue, track] });
  }

  takeFromQueue(): Track | null {
    const [next, ...rest] = this.state.queue;
    this.setState({ queue: rest });
    return next ?? null;
  }

  removeFromQueue(index: number): void {
    const queue = this.state.queue.filter((_, i) => i !== index);
    this.setState({ queue });
  }

  clearQueue(): void {
    this.setState({ queue: [] });
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  onEnded(listener: () => void): () => void {
    this.endedListeners.add(listener);
    return () => {
      this.endedListeners.delete(listener);
    };
  }

  private setState(patch: Partial<AudioState>): void {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener());
  }
}

export const audioStore = new AudioStore();
