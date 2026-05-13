// SprintNote Design Tokens — Indigo/Electric Blue, Light theme only.

export const colors = {
  background: '#FDFCFB',
  surface: '#FFFFFF',
  surfaceMuted: '#F4F4F5',
  primary: '#4F46E5',
  primaryHover: '#4338CA',
  primaryLight: '#EEF2FF',
  primarySoft: '#E0E7FF',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  destructive: '#EF4444',
  success: '#10B981',
  white: '#FFFFFF',
  black: '#000000',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  full: 9999,
} as const;

export const shadows = {
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 10,
  },
} as const;

export const displayFamily: string = 'Georgia, "Times New Roman", serif';

export const bodyFamily: string =
  '-apple-system, BlinkMacSystemFont, "Inter", "SF Pro Display", "Segoe UI", sans-serif';

export const typography = {
  h1: {
    fontFamily: displayFamily,
    fontSize: 40,
    fontWeight: '700' as const,
    lineHeight: 48,
    letterSpacing: -1,
  },
  h2: {
    fontFamily: displayFamily,
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  h3: {
    fontFamily: bodyFamily,
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  bodyLg: {
    fontFamily: bodyFamily,
    fontSize: 18,
    fontWeight: '400' as const,
    lineHeight: 28,
  },
  body: {
    fontFamily: bodyFamily,
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  caption: {
    fontFamily: bodyFamily,
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
    letterSpacing: 0.2,
  },
  small: {
    fontFamily: bodyFamily,
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
    letterSpacing: 0.5,
  },
};

export const ASSETS = {
  onboarding: [
    'https://images.unsplash.com/photo-1776448611495-ae2f69ae521e?crop=entropy&cs=srgb&fm=jpg&w=900&q=80',
    'https://images.unsplash.com/photo-1622579521534-8252f7da47fd?crop=entropy&cs=srgb&fm=jpg&w=900&q=80',
    'https://images.unsplash.com/photo-1666618207644-4de0226a3f85?crop=entropy&cs=srgb&fm=jpg&w=900&q=80',
  ],
};
