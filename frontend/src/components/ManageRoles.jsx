import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { Box, Typography, FormControl, InputLabel, Select, MenuItem, Button } from '@mui/material';

const ManageRoles = () => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [newRole, setNewRole] = useState('');
  const { role } = useAuth();
  const { addNotification } = useNotification();

  useEffect(() => {
    if (role === 'admin') fetchUsers();
  }, [role]);

  const fetchUsers = async () => {
    try {
      const response = await axios.get('https://padnis.onrender.com/api/users', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setUsers(response.data);
    } catch (error) {
      addNotification('Error al cargar usuarios: ' + (error.response?.data?.message || error.message), 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(
        `https://padnis.onrender.com/api/users/${selectedUser}/role`,
        { role: newRole },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      addNotification(`Rol de ${selectedUser} actualizado a ${newRole}`, 'success');
      fetchUsers();
    } catch (error) {
      addNotification(`Error al actualizar rol: ${error.response?.data?.message || error.message}`, 'error');
    }
  };

  if (role !== 'admin') return <Typography>Solo los administradores pueden gestionar roles.</Typography>;

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Gestionar Roles</Typography>
      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <FormControl fullWidth>
          <InputLabel>Usuario</InputLabel>
          <Select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}>
            <MenuItem value="">Selecciona un usuario</MenuItem>
            {users.map(user => (
              <MenuItem key={user.username} value={user.username}>
                {user.username} ({user.role})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl fullWidth>
          <InputLabel>Rol</InputLabel>
          <Select value={newRole} onChange={(e) => setNewRole(e.target.value)}>
            <MenuItem value="">Selecciona un rol</MenuItem>
            <MenuItem value="admin">Admin</MenuItem>
            <MenuItem value="coach">Coach</MenuItem>
            <MenuItem value="player">Player</MenuItem>
          </Select>
        </FormControl>
        <Button variant="contained" color="primary" type="submit">Actualizar Rol</Button>
      </Box>
    </Box>
  );
};

export default ManageRoles;