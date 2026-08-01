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
});
