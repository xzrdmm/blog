import { useEffect, useRef, useState } from 'react';
import { audioStore } from '../../lib/audio-store';

export default function AudioHost() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const lastSrcRef = useRef<string | null>(null);
  const [state, setState] = useState(audioStore.state);

  useEffect(() => audioStore.subscribe(() => setState(audioStore.state)), []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !state.track) return;
    const src = state.track.src;
    if (!src) return;
    if (lastSrcRef.current !== src) {
      lastSrcRef.current = src;
      audioStore.setLoading(true);
      audio.src = src;
      audio.load();
    }
    if (state.playing) {
      void audio.play().catch(() => {
        audioStore.setError('音频播放失败，请检查文件是否存在');
      });
    } else {
      audio.pause();
    }
  }, [state.track?.src, state.playing]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = state.volume;
  }, [state.volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio && Math.abs(audio.currentTime - state.currentTime) > 0.35) {
      audio.currentTime = state.currentTime;
    }
  }, [state.currentTime]);

  return (
    <audio
      ref={audioRef}
      onTimeUpdate={(e) => audioStore.setTime(e.currentTarget.currentTime)}
      onLoadedMetadata={(e) => {
        audioStore.setDuration(e.currentTarget.duration || 0);
        audioStore.setLoading(false);
      }}
      onEnded={() => audioStore.ended()}
      onError={() => {
        audioStore.setError('音频文件加载失败');
        audioStore.setLoading(false);
      }}
      onPlay={() => audioStore.setError('')}
      preload="metadata"
    />
  );
}
