import type { ImageSourcePropType } from 'react-native';

import type { RoomId } from '@/types';

export const BUBBLE_ART: Record<RoomId, ImageSourcePropType> = {
  felsefe: require('../../assets/bubbles/felsefe.png'),
  tarih: require('../../assets/bubbles/tarih.png'),
  edebiyat: require('../../assets/bubbles/edebiyat.png'),
  astronomi: require('../../assets/bubbles/astronomi.png'),
  sanat: require('../../assets/bubbles/sanat.png'),
  muzik: require('../../assets/bubbles/muzik.png'),
  sinema: require('../../assets/bubbles/sinema.png'),
  bilim: require('../../assets/bubbles/bilim.png'),
  psikoloji: require('../../assets/bubbles/psikoloji.png'),
  mitoloji: require('../../assets/bubbles/mitoloji.png'),
};
