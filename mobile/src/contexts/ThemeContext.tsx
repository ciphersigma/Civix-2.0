import React, { createContext, useContext, useState, useMemo } from 'react';
import { useColorScheme } from 'react-native';

// ── Palette definitions ──

const light = {
  mode: 'light' as const,
  bg: '#F8FAFC',
  card: '#FFFFFF',
  cardAlt: '#F1F5F9',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  text: '#0F172A',
  textSec: '#475569',
  textMuted: '#94A3B8',
  shadow: '#000',
  mapStyle: 'mapbox://styles/mapbox/streets-v12',
  statusBar: 'dark-content' as const,
};

const dark = {
  mode: 'dark' as const,
  bg: '#0F172A',
  card: '#1E293B',
  cardAlt: '#334155',
  border: '#334155',
  borderLight: '#1E293B',
  text: '#F1F5F9',
  textSec: '#94A3B8',
  textMuted: '#64748B',
  shadow: '#000',
  mapStyle: 'mapbox://styles/mapbox/dark-v11',
  statusBar: 'light-content' as const,
};

export type ThemePalette = typeof light;

// ── Context ──

interface ThemeCtx {
  colors: ThemePalette;
  isDark: boolean;
  toggle: () => void;
}

const Ctx = createContext<ThemeCtx>({
  colors: light,
  isDark: false,
  toggle: () => {},
});

export const useTheme = () => useContext(Ctx);

// ── Provider ──

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const system = useColorScheme();
  const [override, setOverride] = useState<'light' | 'dark' | null>('light');

  const isDark = override ? override === 'dark' : system === 'dark';
  const colors = useMemo(() => (isDark ? dark : light), [isDark]);

  const toggle = () => setOverride(isDark ? 'light' : 'dark');

  return <Ctx.Provider value={{ colors, isDark, toggle }}>{children}</Ctx.Provider>;
};
