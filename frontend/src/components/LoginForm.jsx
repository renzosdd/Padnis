// src/frontend/src/components/LoginForm.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { TextField, Button, Box } from '@mui/material';

const LoginForm = ({ onSwitchToRegister, onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { onLogin } = useAuth();
  const { addNotification } = useNotification();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.post(
        `https://padnis.onrender.com/api/login`,  //|| 'https://padnis.onrender.com'
        { username, password }
      );
      onLogin({ token: data.token, username: data.username, role: data.role });
      addNotification('Inicio de sesión exitoso', 'success');
      if (onLoginSuccess) onLoginSuccess();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Error al iniciar sesión';
      addNotification(msg, 'error');
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 4, maxWidth: 360, mx: 'auto' }}>
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
        <Button type="submit" variant="contained">
          Iniciar sesión
        </Button>
        <Button type="button" onClick={onSwitchToRegister}>
          ¿No tienes cuenta? Regístrate
        </Button>
      </Box>
    </Box>
  );
};

export default LoginForm;
