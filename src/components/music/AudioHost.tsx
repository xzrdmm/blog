import { useCallback, useEffect, useRef, useState } from 'react';
import { audioStore } from '../../lib/audio-store';

export default function AudioHost() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const lastSrcRef = useRef<string | null>(null);
  const gestureCleanupRef = useRef<(() => void) | null>(null);
  const [state, setState] = useState(audioStore.state);

  useEffect(() => audioStore.subscribe(() => setState(audioStore.state)), []);

  // 自动播放被拦截时，在用户第一次点击/按键后恢复播放
  const registerGestureRetry = useCallback(() => {
    gestureCleanupRef.current?.();
    const audio = audioRef.current;
    if (!audio) return;
    const tryPlay = (event: Event) => {
      const target = event.target as HTMLElement | null;
      // 播放器按钮、链接、输入框等控件交给自己的事件处理，
      // 避免手势续播与按钮点击（播放/暂停/切歌）互相打架
      if (target?.closest('button, a, input, select, textarea, [role="button"]')) return;
      cleanup();
      void audio
        .play()
        .then(() => audioStore.resume())
        .catch(() => audioStore.blocked());
    };
    const cleanup = () => {
      document.removeEventListener('pointerdown', tryPlay);
      document.removeEventListener('touchstart', tryPlay);
    };
    gestureCleanupRef.current = cleanup;
    document.addEventListener('pointerdown', tryPlay);
    document.addEventListener('touchstart', tryPlay);
  }, []);

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
      void audio
        .play()
        .then(() => audioStore.resolveAutoplay())
        .catch((error: unknown) => {
          const name = error instanceof DOMException ? error.name : '';
          if (name === 'NotAllowedError') {
            // 浏览器自动播放策略拦截：等用户首次交互时再播
            audioStore.blocked();
            registerGestureRetry();
            return;
          }
          audioStore.resolveAutoplay();
          audioStore.fail('音频播放失败，请检查文件是否存在');
        });
    } else {
      audio.pause();
    }
  }, [state.track?.src, state.playing, registerGestureRetry]);

  useEffect(() => () => gestureCleanupRef.current?.(), []);

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
        audioStore.fail('音频文件加载失败');
      }}
      onPlay={() => audioStore.setError('')}
      preload="metadata"
    />
  );
}
