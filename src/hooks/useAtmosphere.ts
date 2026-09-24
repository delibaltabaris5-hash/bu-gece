import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { useEffect, useState } from 'react';

/**
 * Atmosfer soft-loop for the chat room.
 *
 * The design intent was a quiet, pre-crescendo loop of Hans Zimmer’s
 * “Can You Hear the Music”. That recording is copyrighted and is not shipped.
 * `assets/audio/soft-loop.wav` is an original quiet sine pad (no crescendo)
 * used as a placeholder until a licensed loop replaces it.
 *
 * Expo SDK 57’s Expo Go client does not bundle expo-av (see
 * `bundledNativeModules.json`, which ships expo-audio). The behavior below is
 * the expo-av wiring the product asked for, expressed with the SDK 57 player:
 *
 *   Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: false })
 *   Audio.Sound.createAsync(source, { isLooping: true, volume: LOW, shouldPlay: true })
 *   sound.setVolumeAsync(value)   // Atmosfer slider
 *   sound.unloadAsync()            // chat unmount — useAudioPlayer releases it
 */
export const ATMOSPHERE_DEFAULT_VOLUME = 0.16;

const SOFT_LOOP = require('../../assets/audio/soft-loop.wav');

function clampVolume(value: number): number {
  if (Number.isNaN(value)) return ATMOSPHERE_DEFAULT_VOLUME;
  return Math.min(1, Math.max(0, value));
}

export function useAtmosphere() {
  const player = useAudioPlayer(SOFT_LOOP);
  const [volume, setVolumeState] = useState(ATMOSPHERE_DEFAULT_VOLUME);

  useEffect(() => {
    let cancelled = false;
    player.loop = true;
    player.volume = ATMOSPHERE_DEFAULT_VOLUME;
    setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'mixWithOthers',
      shouldPlayInBackground: false,
      allowsRecording: false,
    }).catch(() => undefined);
    try {
      if (!cancelled) player.play();
    } catch {
      // Web autoplay can reject until the first gesture. The slider retries.
    }
    return () => {
      cancelled = true;
      try {
        player.pause();
      } catch {
        // The player is released with the screen.
      }
    };
  }, [player]);

  const setVolume = (value: number) => {
    const next = clampVolume(value);
    setVolumeState(next);
    player.volume = next;
    player.muted = next === 0;
    if (next > 0 && !player.playing) {
      try {
        player.play();
      } catch {
        // Ignore autoplay blocks; the control still reflects the choice.
      }
    }
  };

  return { volume, setVolume };
}
