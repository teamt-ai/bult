export interface Theme {
  name: string
  primary: string
  primaryLight: string
  primaryDark: string
  accent: string
  accentGradient: string
  deep: string
}

export const PRESETS: Theme[] = [
  {
    name: 'Google Tech Blue',
    primary: '#1a73e8',
    primaryLight: '#8ab4f8',
    primaryDark: '#174ea6',
    accent: '#a142f4',
    accentGradient: 'linear-gradient(135deg, #1a73e8 0%, #a142f4 100%)',
    deep: '#0b132b',
  },
  {
    name: 'Aurora Mint',
    primary: '#0f9d58',
    primaryLight: '#5ccf96',
    primaryDark: '#0b663b',
    accent: '#00bcd4',
    accentGradient: 'linear-gradient(135deg, #0f9d58 0%, #00bcd4 100%)',
    deep: '#031411',
  },
  {
    name: 'Nebula Dusk',
    primary: '#6366f1',
    primaryLight: '#a5b4fc',
    primaryDark: '#4338ca',
    accent: '#ec4899',
    accentGradient: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)',
    deep: '#0d0721',
  },
  {
    name: 'Google Coral',
    primary: '#ea4335',
    primaryLight: '#f28b82',
    primaryDark: '#c5221f',
    accent: '#fbbc04',
    accentGradient: 'linear-gradient(135deg, #ea4335 0%, #fbbc04 100%)',
    deep: '#1c0a0a',
  },
  {
    name: 'Midnight Royal',
    primary: '#3f51b5',
    primaryLight: '#7986cb',
    primaryDark: '#303f9f',
    accent: '#00bcd4',
    accentGradient: 'linear-gradient(135deg, #3f51b5 0%, #00bcd4 100%)',
    deep: '#070b1e',
  },
  {
    name: 'Vibrant Amber',
    primary: '#d97706',
    primaryLight: '#fbbf24',
    primaryDark: '#b45309',
    accent: '#dc2626',
    accentGradient: 'linear-gradient(135deg, #f59e0b 0%, #dc2626 100%)',
    deep: '#201002',
  },
  {
    name: 'Deep Forest',
    primary: '#059669',
    primaryLight: '#34d399',
    primaryDark: '#047857',
    accent: '#10b981',
    accentGradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
    deep: '#021812',
  }
]

export function getRandomTheme(): Theme {
  const index = Math.floor(Math.random() * PRESETS.length)
  return PRESETS[index]
}

export function applyTheme(theme: Theme) {
  if (typeof window === 'undefined') return
  const root = document.documentElement
  root.style.setProperty('--primary-color', theme.primary)
  root.style.setProperty('--primary-light', theme.primaryLight)
  root.style.setProperty('--primary-dark', theme.primaryDark)
  root.style.setProperty('--accent-color', theme.accent)
  root.style.setProperty('--accent-gradient', theme.accentGradient)
  root.style.setProperty('--deep-color', theme.deep)
}
