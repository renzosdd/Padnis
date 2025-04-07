import React, { useState } from 'react';
import axios from 'axios';
import { useNotification } from '../contexts/NotificationContext';
import { TextField, Button, Box } from '@mui/material';

const RegisterForm = ({ onSwitchToLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { addNotification } = useNotification();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5001/api/auth/register', { username, password });
      addNotification('Usuario registrado con éxito', 'success');
      onSwitchToLogin();
    } catch (error) {
      console.error('Error registering user from frontend:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Error al registrar usuario';
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
        <Button variant="contained" color="primary" type="submit" sx={{ mr: 1 }}>Registrarse</Button>
        <Button variant="text" onClick={onSwitchToLogin}>¿Ya tienes cuenta? Inicia sesión</Button>
      </Box>
    </Box>
  );
};

export default RegisterForm;