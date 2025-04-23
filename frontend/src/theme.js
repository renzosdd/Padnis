import { createTheme } from '@mui/material/styles';

// Create a custom Material-UI theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2', // Blue color used in your app (e.g., for tabs, buttons)
    },
    secondary: {
      main: '#388e3c', // Green color used for success states (e.g., saved match borders)
    },
    error: {
      main: '#d32f2f', // Default Material-UI error color
    },
    background: {
      default: '#f5f5f5', // Light grey background used in tables
      paper: '#fff', // White background for cards and tables
    },
    text: {
      primary: '#424242', // Dark grey text used for most content
      secondary: '#757575', // Lighter grey for secondary text (e.g., icons)
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h5: {
      fontSize: '1.5rem',
      '@media (max-width:600px)': {
        fontSize: '1.25rem', // Responsive font size for xs screens
      },
    },
    h6: {
      fontSize: '1.25rem',
      '@media (max-width:600px)': {
        fontSize: '1rem',
      },
    },
    subtitle1: {
      fontSize: '1rem',
      '@media (max-width:600px)': {
        fontSize: '0.875rem',
      },
    },
    body1: {
      fontSize: '0.875rem',
      '@media (max-width:600px)': {
        fontSize: '0.75rem',
      },
    },
    button: {
      fontSize: '0.875rem',
      '@media (max-width:600px)': {
        fontSize: '0.75rem',
      },
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none', // Avoid uppercase text in buttons
          minHeight: 40, // Consistent button height
          padding: '6px 12px',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& input': {
            fontSize: '0.875rem',
            '@media (max-width:600px)': {
              fontSize: '0.75rem',
            },
          },
        },
      },
    },
  },
});

export default theme;