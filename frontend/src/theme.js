import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#388e3c' },
    error: { main: '#d32f2f' },
    background: { default: '#f5f5f5', paper: '#fff' },
    text: { primary: '#424242', secondary: '#757575' },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h5: {
      fontSize: '1.5rem',
      '@media (max-width:600px)': { fontSize: '1.25rem' },
    },
    h6: {
      fontSize: '1.25rem',
      '@media (max-width:600px)': { fontSize: '1rem' },
    },
    subtitle1: {
      fontSize: '1rem',
      '@media (max-width:600px)': { fontSize: '0.875rem' },
    },
    body1: {
      fontSize: '0.875rem',
      '@media (max-width:600px)': { fontSize: '0.75rem' },
    },
    button: {
      fontSize: '0.875rem',
      '@media (max-width:600px)': { fontSize: '0.75rem' },
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', minHeight: 40, padding: '6px 12px' },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& input': {
            fontSize: '0.875rem',
            '@media (max-width:600px)': { fontSize: '0.75rem' },
          },
        },
      },
    },
  },
});

export default theme;
