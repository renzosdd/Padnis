import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AppBar, Toolbar, Typography, Button } from '@mui/material';

const NavBar = () => {
  const { user, role, logout } = useAuth();

  const handleLogout = () => {
    localStorage.removeItem('token');
    logout();
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>Padnis</Typography>
        {user && (
          <Button color="inherit" onClick={handleLogout}>
            Cerrar sesión ({user} - {role})
          </Button>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default NavBar;