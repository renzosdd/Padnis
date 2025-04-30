// src/frontend/src/components/NavBar.jsx
import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material'
import { useAuth } from '../contexts/AuthContext'

const NavBar = () => {
  const { user, role, onLogout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    onLogout()
    navigate('/login', { replace: true })
  }

  return (
    <AppBar position="static">
      <Toolbar>
        {/* Logo / Home Link */}
        <Typography
          variant="h6"
          component={Link}
          to="/"
          sx={{
            flexGrow: 1,
            color: 'inherit',
            textDecoration: 'none',
            '&:hover': { textDecoration: 'underline' }
          }}
        >
          Padnis
        </Typography>

        {user ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* User info */}
            <Typography variant="body1" sx={{ whiteSpace: 'nowrap' }}>
              {user} ({role})
            </Typography>
            {/* Logout button */}
            <Button color="inherit" onClick={handleLogout}>
              Cerrar sesión
            </Button>
          </Box>
        ) : (
          <Box>
            {/* Login & Register links when not authenticated */}
            <Button
              color="inherit"
              component={Link}
              to="/login"
              sx={{ textTransform: 'none' }}
            >
              Iniciar sesión
            </Button>
            <Button
              color="inherit"
              component={Link}
              to="/register"
              sx={{ textTransform: 'none' }}
            >
              Registrarse
            </Button>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  )
}

export default NavBar
