export interface Track {
  id?: string;
  src: string;
  title: string;
  artist: string;
  cover?: string;
  playlist?: string;
  lyricsSrc?: string;
}

export interface AudioState {
  track: Track | null;
  playing: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  error: string;
  loading: boolean;
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
  };

  play(track: Track): void {
    this.setState({ track, playing: true, error: '', loading: true });
  }

  select(track: Track): void {
    this.setState({ track, playing: false, error: '' });
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

  setLoading(loading: boolean): void {
    this.setState({ loading });
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
