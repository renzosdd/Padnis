import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { TextField, Button, Box } from '@mui/material';

const LoginForm = ({ onSwitchToRegister, onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const { addNotification } = useNotification();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/login', { username, password }); // Ruta relativa
      localStorage.setItem('token', response.data.token);
      login(response.data.username, response.data.role);
      addNotification('Inicio de sesión exitoso', 'success');
      if (onLoginSuccess) onLoginSuccess();
    } catch (error) {
      console.error('Error logging in from frontend:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Error al iniciar sesión';
      addNotification(errorMessage, 'error');
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
      <TextField
        label="Usuario"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        fullWidth
        margin="normal"
      />
      <TextField
        label="Contraseña"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        fullWidth
        margin="normal"
      />
      <Box sx={{ mt: 2 }}>
        <Button variant="contained" color="primary" type="submit" sx={{ mr: 1 }}>Iniciar sesión</Button>
        <Button variant="text" onClick={onSwitchToRegister}>¿No tienes cuenta? Regístrate</Button>
      </Box>
    </Box>
  );
};

export default LoginForm;