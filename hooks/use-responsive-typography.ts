import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

const MIN_VIEWPORT_WIDTH = 320;
const MAX_VIEWPORT_WIDTH = 1440;

type TypographyTokenRange = {
  max: number;
  min: number;
};

const typographyRanges = {
  body: { min: 15, max: 17 },
  bodySmall: { min: 13, max: 15 },
  display: { min: 28, max: 40 },
  headline: { min: 22, max: 30 },
  label: { min: 11, max: 13 },
  labelCaps: { min: 10, max: 12 },
  title: { min: 17, max: 22 },
} satisfies Record<string, TypographyTokenRange>;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function fluidSize({ max, min }: TypographyTokenRange, width: number) {
  const boundedWidth = clamp(width, MIN_VIEWPORT_WIDTH, MAX_VIEWPORT_WIDTH);
  const progress =
    (boundedWidth - MIN_VIEWPORT_WIDTH) / (MAX_VIEWPORT_WIDTH - MIN_VIEWPORT_WIDTH);

  return Math.round((min + (max - min) * progress) * 100) / 100;
}

export function useResponsiveTypography() {
  const { width } = useWindowDimensions();

  return useMemo(() => {
    const display = fluidSize(typographyRanges.display, width);
    const headline = fluidSize(typographyRanges.headline, width);
    const title = fluidSize(typographyRanges.title, width);
    const body = fluidSize(typographyRanges.body, width);
    const bodySmall = fluidSize(typographyRanges.bodySmall, width);
    const label = fluidSize(typographyRanges.label, width);
    const labelCaps = fluidSize(typographyRanges.labelCaps, width);

    return {
      body,
      bodyLineHeight: Math.round(body * 1.5),
      bodySmall,
      bodySmallLineHeight: Math.round(bodySmall * 1.45),
      display,
      displayLineHeight: Math.round(display * 1.18),
      headline,
      headlineLineHeight: Math.round(headline * 1.25),
      label,
      labelCaps,
      labelCapsLineHeight: Math.round(labelCaps * 1.3),
      labelLineHeight: Math.round(label * 1.3),
      title,
      titleLineHeight: Math.round(title * 1.28),
      width,
    };
  }, [width]);
}
