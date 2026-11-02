/**
 * SFRMR design tokens — one material: obsidian glass on an ink field.
 * Red is for the ONE primary action, the active rail, and PRs. Never for
 * misses, drops, or declines. Everyday progress is bold white.
 * (docs/SFRMR_DESIGN.md, docs/SFRMR_RULES.md)
 */
export const color = {
  ink: '#07070A',
  inkRaised: '#0D0E12',
  red: '#E50914',
  redGlow: 'rgba(229, 9, 20, 0.35)',
  redSoft: 'rgba(229, 9, 20, 0.14)',
  text: '#FFFFFF',
  textDim: 'rgba(255, 255, 255, 0.62)',
  textFaint: 'rgba(255, 255, 255, 0.38)',
  hairline: 'rgba(255, 255, 255, 0.14)',
  hairlineStrong: 'rgba(255, 255, 255, 0.22)',
  glass: 'rgba(14, 15, 19, 0.54)',
  inset: 'rgba(255, 255, 255, 0.05)',
  insetPressed: 'rgba(255, 255, 255, 0.09)',
  track: 'rgba(255, 255, 255, 0.10)',
  fill: '#FFFFFF',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;

export const radius = { sm: 10, md: 16, lg: 22, xl: 28, pill: 999 } as const;

export const font = {
  display: 'BebasNeue_400Regular',
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

/** Minimum touch target (Apple HIG). */
export const HIT = 44;

/** Spring used for every press / appear so the app moves as one thing. */
export const spring = { damping: 18, stiffness: 260, mass: 0.6 } as const;
