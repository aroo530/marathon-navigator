import { useMemo } from 'react';
import { useMarathon } from '@/context/MarathonContext';

export type MarathonTheme = {
  primary: string;
  tint: string;   // lighter — good for backgrounds, inactive icons
  shade: string;  // darker — good for pressed states, borders
  onPrimary: string; // '#000' or '#fff' depending on luminance
};

const DEFAULT_ACCENT = '#46188F';

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const full = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean;
  const n = parseInt(full, 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
}

function relativeLuminance(r: number, g: number, b: number): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function blend(base: [number, number, number], with_: [number, number, number], amount: number): [number, number, number] {
  return [
    base[0] + (with_[0] - base[0]) * amount,
    base[1] + (with_[1] - base[1]) * amount,
    base[2] + (with_[2] - base[2]) * amount,
  ];
}

function deriveTheme(hex: string): MarathonTheme {
  const rgb = hexToRgb(hex);
  const lum = relativeLuminance(...rgb);

  const tintRgb = blend(rgb, [255, 255, 255], 0.45);
  const shadeRgb = blend(rgb, [0, 0, 0], 0.3);

  return {
    primary: hex,
    tint: rgbToHex(...tintRgb),
    shade: rgbToHex(...shadeRgb),
    onPrimary: lum > 0.179 ? '#000000' : '#FFFFFF',
  };
}

export function useMarathonTheme(): MarathonTheme {
  const { selectedMarathon } = useMarathon();
  const accent = selectedMarathon?.accent_color ?? DEFAULT_ACCENT;

  return useMemo(() => deriveTheme(accent), [accent]);
}
