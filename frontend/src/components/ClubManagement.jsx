import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNotification } from '../contexts/NotificationContext';
import { Box, Typography, Button, Table, TableBody, TableCell, TableHead, TableRow, TextField, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

const ClubManagement = () => {
  const [clubs, setClubs] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editClub, setEditClub] = useState(null);
  const [formData, setFormData] = useState({ name: '', address: '', phone: '' });
  const { addNotification } = useNotification();

  useEffect(() => {
    fetchClubs();
  }, []);

  const fetchClubs = async () => {
    try {
      const response = await axios.get('https://padnis.onrender.com/api/clubs', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setClubs(response.data);
    } catch (error) {
      addNotification('Error al cargar clubes', 'error');
      console.error('Error fetching clubs:', error);
    }
  };

  const handleOpenDialog = (club = null) => {
    setEditClub(club);
    setFormData(club ? { name: club.name, address: club.address, phone: club.phone } : { name: '', address: '', phone: '' });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditClub(null);
    setFormData({ name: '', address: '', phone: '' });
  };

  const handleSubmit = async () => {
    try {
      if (!formData.name) {
        addNotification('El nombre del club es obligatorio', 'error');
        return;
      }
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      if (editClub) {
        await axios.put(`https://padnis.onrender.com/api/clubs/${editClub._id}`, formData, { headers });
        addNotification('Club actualizado correctamente', 'success');
      } else {
        await axios.post('https://padnis.onrender.com/api/clubs', formData, { headers });
        addNotification('Club creado correctamente', 'success');
      }
      fetchClubs();
      handleCloseDialog();
    } catch (error) {
      addNotification(error.response?.data?.message || 'Error al guardar club', 'error');
      console.error('Error saving club:', error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`https://padnis.onrender.com/api/clubs/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      addNotification('Club eliminado correctamente', 'success');
      fetchClubs();
    } catch (error) {
      addNotification(error.response?.data?.message || 'Error al eliminar club', 'error');
      console.error('Error deleting club:', error);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>Gestionar Clubes</Typography>
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() => handleOpenDialog()}
        sx={{ mb: 2 }}
      >
        Crear Club
      </Button>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Nombre</TableCell>
            <TableCell>Dirección</TableCell>
            <TableCell>Teléfono</TableCell>
            <TableCell>Acciones</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {clubs.map(club => (
            <TableRow key={club._id}>
              <TableCell>{club.name}</TableCell>
              <TableCell>{club.address || '-'}</TableCell>
              <TableCell>{club.phone || '-'}</TableCell>
              <TableCell>
                <Button
                  startIcon={<EditIcon />}
                  onClick={() => handleOpenDialog(club)}
                  sx={{ mr: 1 }}
                >
                  Editar
                </Button>
                <Button
                  startIcon={<DeleteIcon />}
                  color="error"
                  onClick={() => handleDelete(club._id)}
                >
                  Eliminar
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>{editClub ? 'Editar Club' : 'Crear Club'}</DialogTitle>
        <DialogContent>
          <TextField
            label="Nombre *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            fullWidth
            sx={{ mt: 2 }}
          />
          <TextField
            label="Dirección"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            fullWidth
            sx={{ mt: 2 }}
          />
          <TextField
            label="Teléfono"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            fullWidth
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSubmit} color="primary">
            {editClub ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ClubManagement;