import { setAudioModeAsync, useAudioPlayer, type AudioPlayer } from 'expo-audio';
import { useEffect } from 'react';

import { clampAtmosphereVolume } from '@/lib/atmosphere';
import { useAppStore } from '@/store/useAppStore';

/**
 * App-wide Atmosfer loop: Echoes of Solitude (Discomfuse), Pixabay Content License.
 * https://pixabay.com/music/main-title-echoes-of-solitude-277006/
 *
 * Mounted once from the root layout so home, rooms, DM, chat, and every other
 * screen share the same player. It does not stop when a screen unmounts.
 * Expo SDK 57 ships expo-audio (not expo-av) in Expo Go.
 */
const ECHOES = require('../../assets/audio/echoes-of-solitude.mp3');

let boundPlayer: AudioPlayer | null = null;

function applyVolume(player: AudioPlayer, volume: number) {
  const next = clampAtmosphereVolume(volume);
  player.loop = true;
  player.volume = next;
  player.muted = next === 0;
}

/** Starts playback after a volume gesture if autoplay was blocked. */
export function nudgeAtmospherePlayback() {
  const player = boundPlayer;
  if (!player) return;
  applyVolume(player, useAppStore.getState().atmosphereVolume);
  if (player.muted) return;
  try {
    if (!player.playing) player.play();
  } catch {
    // Web autoplay can reject until this gesture. The button already updated volume.
  }
}

export function AtmosphereHost() {
  const player = useAudioPlayer(ECHOES);
  const volume = useAppStore((state) => state.atmosphereVolume);
  const hydrated = useAppStore((state) => state.hydrated);

  useEffect(() => {
    boundPlayer = player;
    player.loop = true;
    setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'mixWithOthers',
      shouldPlayInBackground: false,
      allowsRecording: false,
    }).catch(() => undefined);
    const subscription = player.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish && !status.loop) {
        player.loop = true;
        void player.seekTo(0).then(() => {
          try {
            player.play();
          } catch {
            // The next volume button retries.
          }
        });
      }
    });
    return () => {
      subscription.remove();
      if (boundPlayer === player) boundPlayer = null;
      try {
        player.pause();
      } catch {
        // The root player is released with the app.
      }
    };
  }, [player]);

  useEffect(() => {
    applyVolume(player, volume);
  }, [player, volume]);

  useEffect(() => {
    if (!hydrated) return;
    nudgeAtmospherePlayback();
  }, [hydrated, player]);

  return null;
}
