import React, { useState } from 'react';
import axios from 'axios';
import { useSelector, useDispatch } from 'react-redux';
import { setPlayers, setPage } from '../store';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { Box, Typography, TextField, Button, Select, MenuItem, FormControl, InputLabel, Table, TableBody, TableCell, TableHead, TableRow, Pagination, Checkbox, FormControlLabel, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import PlayerDetailsModal from './PlayerDetailsModal';

const PlayerForm = ({ onRegisterPlayer, onUpdatePlayer, onPlayerAdded, users }) => { // Agregar prop users
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [photo, setPhoto] = useState('');
  const [dominantHand, setDominantHand] = useState('right');
  const [racketBrand, setRacketBrand] = useState('');
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const { role } = useAuth();
  const { addNotification } = useNotification();
  const dispatch = useDispatch();
  const { list: players, page, perPage } = useSelector(state => state.players);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (firstName && lastName) {
      try {
        const response = await axios.post('https://padnis.onrender.com/api/players', {
          firstName,
          lastName,
          email,
          phone,
          photo,
          dominantHand,
          racketBrand,
          matches: [],
        }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
        onRegisterPlayer(response.data);
        setFirstName('');
        setLastName('');
        setEmail('');
        setPhone('');
        setPhoto('');
        setDominantHand('right');
        setRacketBrand('');
        setOpenModal(false);
        addNotification('Jugador registrado con éxito', 'success');
        if (onPlayerAdded) onPlayerAdded();
      } catch (error) {
        console.error('Error registering player:', error);
        addNotification(error.response?.data?.message || 'Error al registrar jugador', 'error');
      }
    }
  };

  const filteredPlayers = players.filter(player => {
    const fullName = `${player.firstName} ${player.lastName}`.toLowerCase();
    return fullName.includes(search.toLowerCase()) && (showInactive || player.active === 'Yes');
  });

  const paginatedPlayers = filteredPlayers.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.ceil(filteredPlayers.length / perPage);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Jugadores</Typography>
        {(role === 'admin' || role === 'coach') && (
          <Button variant="contained" color="primary" onClick={() => setOpenModal(true)}>
            Agregar Jugador
          </Button>
        )}
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <TextField
          label="Buscar por nombre o apellido"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          fullWidth
          sx={{ mr: 2 }}
        />
        {role === 'admin' && (
          <FormControlLabel
            control={<Checkbox checked={showInactive} onChange={() => setShowInactive(!showInactive)} />}
            label="Mostrar inactivos"
          />
        )}
      </Box>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Nombre</TableCell>
            <TableCell>Apellido</TableCell>
            {role === 'admin' && <TableCell>Activo</TableCell>}
            <TableCell>Acciones</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {paginatedPlayers.map(player => (
            <TableRow 
              key={player.playerId} 
              sx={{ '&:hover': { bgcolor: '#f5f5f5', cursor: 'pointer' } }} 
              onClick={() => setSelectedPlayer(player)}
            >
              <TableCell>{player.firstName}</TableCell>
              <TableCell>{player.lastName}</TableCell>
              {role === 'admin' && <TableCell>{player.active}</TableCell>}
              <TableCell>
                <Button variant="text" color="primary" onClick={(e) => { e.stopPropagation(); setSelectedPlayer(player); }}>
                  Detalles
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
        <Pagination
          count={totalPages}
          page={page}
          onChange={(e, value) => dispatch(setPage(value))}
          color="primary"
        />
      </Box>

      <Dialog open={openModal} onClose={() => setOpenModal(false)}>
        <DialogTitle>Nuevo Jugador</DialogTitle>
        <DialogContent>
          <TextField
            label="Nombre *"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Apellido *"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Teléfono"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            fullWidth
            margin="normal"
          />
          <TextField
            label="URL de Foto"
            value={photo}
            onChange={(e) => setPhoto(e.target.value)}
            fullWidth
            margin="normal"
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Mano Hábil</InputLabel>
            <Select value={dominantHand} onChange={(e) => setDominantHand(e.target.value)}>
              <MenuItem value="right">Derecha</MenuItem>
              <MenuItem value="left">Izquierda</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel>Marca de Raqueta</InputLabel>
            <Select value={racketBrand} onChange={(e) => setRacketBrand(e.target.value)}>
              <MenuItem value="">Ninguna</MenuItem>
              <MenuItem value="Wilson">Wilson</MenuItem>
              <MenuItem value="Babolat">Babolat</MenuItem>
              <MenuItem value="Head">Head</MenuItem>
              <MenuItem value="Tecnifibre">Tecnifibre</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenModal(false)} color="secondary">Cancelar</Button>
          <Button onClick={handleSubmit} color="primary">Guardar</Button>
        </DialogActions>
      </Dialog>

      {selectedPlayer && (
        <PlayerDetailsModal
          player={selectedPlayer}
          users={users || []} // Pasar users o array vacío como fallback
          onUpdate={onUpdatePlayer}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
    </Box>
  );
};

export default PlayerForm;