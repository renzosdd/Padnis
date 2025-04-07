import React, { Component } from 'react';
import { Box, Typography } from '@mui/material';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h5">Algo salió mal</Typography>
          <Typography>Por favor, recarga la página.</Typography>
        </Box>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;