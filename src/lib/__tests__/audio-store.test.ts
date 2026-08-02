import { describe, expect, it } from 'vitest';
import { AudioStore } from '../audio-store';

const track = { src: '/music/a.mp3', title: 'A', artist: 'X', playlist: '电子' };

describe('AudioStore', () => {
  it('starts empty and paused', () => {
    const store = new AudioStore();
    expect(store.state.track).toBeNull();
    expect(store.state.playing).toBe(false);
  });

  it('play sets the track and playing state', () => {
    const store = new AudioStore();
    store.play(track);
    expect(store.state.track).toEqual(track);
    expect(store.state.playing).toBe(true);
  });

  it('select sets the track without playing', () => {
    const store = new AudioStore();
    store.select(track);
    expect(store.state.track).toEqual(track);
    expect(store.state.playing).toBe(false);
  });

  it('play resets currentTime and duration', () => {
    const store = new AudioStore();
    store.play(track);
    store.setTime(50);
    store.setDuration(180);
    store.play({ ...track, src: '/music/b.mp3' });
    expect(store.state.currentTime).toBe(0);
    expect(store.state.duration).toBe(0);
  });

  it('select resets currentTime and duration', () => {
    const store = new AudioStore();
    store.play(track);
    store.setTime(50);
    store.setDuration(180);
    store.select({ ...track, src: '/music/b.mp3' });
    expect(store.state.currentTime).toBe(0);
    expect(store.state.duration).toBe(0);
  });

  it('fail marks playing false with error and does not notify ended listeners', () => {
    const store = new AudioStore();
    let endedCount = 0;
    store.onEnded(() => endedCount++);
    store.play(track);
    store.fail('播放失败');
    expect(store.state.playing).toBe(false);
    expect(store.state.error).toBe('播放失败');
    expect(store.state.loading).toBe(false);
    expect(endedCount).toBe(0);
  });

  it('toggle flips playing when a track exists', () => {
    const store = new AudioStore();
    store.play(track);
    store.toggle();
    expect(store.state.playing).toBe(false);
    store.toggle();
    expect(store.state.playing).toBe(true);
  });

  it('toggle does nothing without a track', () => {
    const store = new AudioStore();
    store.toggle();
    expect(store.state.playing).toBe(false);
  });

  it('ended marks playing false and keeps the track', () => {
    const store = new AudioStore();
    store.play(track);
    store.ended();
    expect(store.state.playing).toBe(false);
    expect(store.state.track).toEqual(track);
  });

  it('notifies ended listeners and supports unsubscribe', () => {
    const store = new AudioStore();
    let count = 0;
    const off = store.onEnded(() => count++);
    store.ended();
    expect(count).toBe(1);
    off();
    store.ended();
    expect(count).toBe(1);
  });

  it('stop clears the track and pauses', () => {
    const store = new AudioStore();
    store.play(track);
    store.stop();
    expect(store.state.track).toBeNull();
    expect(store.state.playing).toBe(false);
  });

  it('play clears previous errors and setError records them', () => {
    const store = new AudioStore();
    store.setError('音频加载失败');
    expect(store.state.error).toBe('音频加载失败');
    store.play(track);
    expect(store.state.error).toBe('');
  });

  it('play marks loading and setLoading updates it', () => {
    const store = new AudioStore();
    store.play(track);
    expect(store.state.loading).toBe(true);
    store.setLoading(false);
    expect(store.state.loading).toBe(false);
  });

  it('notifies subscribers on state changes', () => {
    const store = new AudioStore();
    const seen: string[] = [];
    store.subscribe(() => seen.push(store.state.track?.title ?? ''));
    store.play(track);
    store.setTime(12);
    expect(seen).toEqual(['A', 'A']);
  });

  it('unsubscribe stops notifications', () => {
    const store = new AudioStore();
    let count = 0;
    const off = store.subscribe(() => count++);
    store.play(track);
    off();
    store.toggle();
    expect(count).toBe(1);
  });

  it('clamps volume to 0..1', () => {
    const store = new AudioStore();
    store.setVolume(2);
    expect(store.state.volume).toBe(1);
    store.setVolume(-1);
    expect(store.state.volume).toBe(0);
  });

  it('sets play mode', () => {
    const store = new AudioStore();
    store.setMode('shuffle');
    expect(store.state.mode).toBe('shuffle');
    store.setMode('repeat-one');
    expect(store.state.mode).toBe('repeat-one');
  });

  it('queues tracks in FIFO order and clears', () => {
    const store = new AudioStore();
    const a = { ...track, src: '/a.mp3' };
    const b = { ...track, src: '/b.mp3' };
    store.addToQueue(a);
    store.addToQueue(b);
    expect(store.takeFromQueue()).toEqual(a);
    expect(store.takeFromQueue()).toEqual(b);
    expect(store.takeFromQueue()).toBeNull();
    store.addToQueue(a);
    store.clearQueue();
    expect(store.takeFromQueue()).toBeNull();
  });

  it('removes a track from the queue by index', () => {
    const store = new AudioStore();
    store.addToQueue({ ...track, src: '/a.mp3' });
    store.addToQueue({ ...track, src: '/b.mp3' });
    store.removeFromQueue(0);
    expect(store.state.queue[0].src).toBe('/b.mp3');
  });

  it('blocked pauses playback and marks pending autoplay', () => {
    const store = new AudioStore();
    store.play(track);
    store.blocked();
    expect(store.state.playing).toBe(false);
    expect(store.state.pendingAutoplay).toBe(true);
    expect(store.state.loading).toBe(false);
  });

  it('resume restores playback and clears pending autoplay', () => {
    const store = new AudioStore();
    store.play(track);
    store.blocked();
    store.resume();
    expect(store.state.playing).toBe(true);
    expect(store.state.pendingAutoplay).toBe(false);
  });

  it('play and select reset pending autoplay', () => {
    const store = new AudioStore();
    store.play(track);
    store.blocked();
    store.select({ ...track, src: '/b.mp3' });
    expect(store.state.pendingAutoplay).toBe(false);
    store.blocked();
    store.play({ ...track, src: '/c.mp3' });
    expect(store.state.pendingAutoplay).toBe(false);
  });
});
