import { createTheme } from '@mui/material/styles';

const SHARED_COLORS = {
  primary: '#0F4C81',
  primaryLight: '#1E6BC4',
  primaryDark: '#083360',
  secondary: '#00B4D8',
  accent: '#06D6A0',
  sim: '#06D6A0',
  feito: '#1E6BC4',
  pendente: '#F59E0B',
  naoContatar: '#EF4444',
};

const MODE_COLORS = {
  dark: {
    bg: '#0A0E1A',
    surface: '#111827',
    surfaceAlt: '#1A2235',
    border: '#1E2D45',
    text: '#E8EDF5',
    textMuted: '#7A8BA8',
  },
  light: {
    bg: '#F3F7FC',
    surface: '#FFFFFF',
    surfaceAlt: '#F8FBFF',
    border: '#D5E2F0',
    text: '#0F172A',
    textMuted: '#5C6B84',
  },
};

export function getColors(mode = 'dark') {
  return {
    ...SHARED_COLORS,
    ...(MODE_COLORS[mode] || MODE_COLORS.dark),
  };
}

export function createAppTheme(mode = 'dark') {
  const colors = getColors(mode);

  return createTheme({
    palette: {
      mode,
      primary: { main: colors.primaryLight, dark: colors.primaryDark, light: '#4D9FE8' },
      secondary: { main: colors.secondary },
      background: { default: colors.bg, paper: colors.surface },
      text: { primary: colors.text, secondary: colors.textMuted },
      divider: colors.border,
      success: { main: colors.sim },
      warning: { main: colors.pendente },
      info: { main: colors.secondary },
      error: { main: colors.naoContatar },
    },
    typography: {
      fontFamily: '"IBM Plex Sans", "Roboto", sans-serif',
      h1: { fontFamily: '"IBM Plex Sans", sans-serif', fontWeight: 700 },
      h2: { fontFamily: '"IBM Plex Sans", sans-serif', fontWeight: 700 },
      h3: { fontFamily: '"IBM Plex Sans", sans-serif', fontWeight: 600 },
      h4: { fontFamily: '"IBM Plex Sans", sans-serif', fontWeight: 600 },
      h5: { fontFamily: '"IBM Plex Sans", sans-serif', fontWeight: 600 },
      h6: { fontFamily: '"IBM Plex Sans", sans-serif', fontWeight: 600 },
      caption: { fontFamily: '"IBM Plex Mono", monospace', fontSize: '0.7rem' },
    },
    shape: { borderRadius: 8 },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: colors.bg,
            scrollbarWidth: 'thin',
            scrollbarColor: `${colors.border} transparent`,
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: colors.surface,
            borderRight: `1px solid ${colors.border}`,
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: colors.surface,
            borderBottom: `1px solid ${colors.border}`,
            boxShadow: 'none',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundColor: colors.surfaceAlt,
            border: `1px solid ${colors.border}`,
            boxShadow: 'none',
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: { borderColor: colors.border },
          head: {
            backgroundColor: colors.surface,
            color: colors.textMuted,
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: '0.7rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            fontWeight: 600,
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: { textTransform: 'none', fontWeight: 600 },
          containedPrimary: {
            background: `linear-gradient(135deg, ${colors.primaryLight}, ${colors.secondary})`,
            '&:hover': { background: `linear-gradient(135deg, ${colors.primaryDark}, ${colors.primaryLight})` },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { fontFamily: '"IBM Plex Mono", monospace', fontSize: '0.68rem', fontWeight: 600 },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-notchedOutline': { borderColor: colors.border },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.primaryLight },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.primaryLight },
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: { backgroundColor: colors.surfaceAlt, border: `1px solid ${colors.border}`, fontSize: '0.75rem' },
        },
      },
    },
  });
}
