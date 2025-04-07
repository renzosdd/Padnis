import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem, FormControl, InputLabel, Button, Box, Typography, Table, TableBody, TableCell, TableHead, TableRow, Chip } from '@mui/material';

const PlayerDetailsModal = ({ player, users, onUpdate, onClose }) => {
  const [open, setOpen] = useState(true);
  const [firstName, setFirstName] = useState(player.firstName);
  const [lastName, setLastName] = useState(player.lastName);
  const [email, setEmail] = useState(player.email || '');
  const [phone, setPhone] = useState(player.phone || '');
  const [photo, setPhoto] = useState(player.photo || 'https://via.placeholder.com/100?text=Sin+Foto');
  const [dominantHand, setDominantHand] = useState(player.dominantHand);
  const [racketBrand, setRacketBrand] = useState(player.racketBrand || '');
  const [userId, setUserId] = useState(player.user ? player.user._id : 'none');
  const [active, setActive] = useState(player.active);
  const [searchOpponent, setSearchOpponent] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);
  const { role, user: loggedUser } = useAuth();
  const { addNotification } = useNotification();
  const isEditable = role === 'admin' || role === 'coach' || (player.user && player.user.username === loggedUser);
  const isAdmin = role === 'admin';

  const handleSave = async () => {
    try {
      const response = await axios.put(
        `https://padnis-backend.onrender.com/api/players/${player.playerId}`,
        { firstName, lastName, email, phone, photo, dominantHand, racketBrand, userId, active },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      onUpdate(response.data);
      addNotification('Jugador actualizado con éxito', 'success');
      setOpen(false);
      onClose();
    } catch (error) {
      addNotification(error.response?.data?.message || 'Error al actualizar jugador', 'error');
    }
  };

  const handleDeactivate = async () => {
    try {
      const response = await axios.put(
        `https://padnis-backend.onrender.com/api/players/${player.playerId}`,
        { ...player, active: 'No' },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      onUpdate(response.data);
      addNotification(`Jugador ${player.firstName} ${player.lastName} desactivado`, 'success');
      setConfirmAction(null);
      setOpen(false);
      onClose();
    } catch (error) {
      addNotification(error.response?.data?.message || 'Error al desactivar jugador', 'error');
    }
  };

  const handleRestore = async () => {
    try {
      const response = await axios.put(
        `https://padnis-backend.onrender.com/api/players/${player.playerId}`,
        { ...player, active: 'Yes' },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      onUpdate(response.data);
      addNotification(`Jugador ${player.firstName} ${player.lastName} restaurado`, 'success');
      setConfirmAction(null);
      setOpen(false);
      onClose();
    } catch (error) {
      addNotification(error.response?.data?.message || 'Error al restaurar jugador', 'error');
    }
  };

  const filteredMatches = searchOpponent 
    ? player.matches.filter(m => m.opponent.toLowerCase().includes(searchOpponent.toLowerCase())) 
    : player.matches;

  const handleClose = () => {
    setOpen(false);
    onClose();
  };

  return (
    <>
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>Detalles de {player.firstName} {player.lastName}</DialogTitle>
        <DialogContent sx={{ maxHeight: '80vh', overflowY: 'auto' }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <img src={photo} alt="Foto" style={{ maxWidth: '100px' }} />
          </Box>
          <TextField
            label="Nombre"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            disabled={!isEditable}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Apellido"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            disabled={!isEditable}
            fullWidth
            margin="normal"
          />
          {(role === 'admin' || role === 'coach' || (player.user && player.user.username === loggedUser)) && (
            <>
              <TextField
                label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!isEditable}
                fullWidth
                margin="normal"
              />
              <TextField
                label="Teléfono"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={!isEditable}
                fullWidth
                margin="normal"
              />
            </>
          )}
          <TextField
            label="URL de Foto"
            value={photo}
            onChange={(e) => setPhoto(e.target.value)}
            disabled={!isEditable}
            fullWidth
            margin="normal"
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Mano Hábil</InputLabel>
            <Select value={dominantHand} onChange={(e) => setDominantHand(e.target.value)} disabled={!isEditable}>
              <MenuItem value="right">Derecha</MenuItem>
              <MenuItem value="left">Izquierda</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel>Marca de Raqueta</InputLabel>
            <Select value={racketBrand} onChange={(e) => setRacketBrand(e.target.value)} disabled={!isEditable}>
              <MenuItem value="">Ninguna</MenuItem>
              <MenuItem value="Wilson">Wilson</MenuItem>
              <MenuItem value="Babolat">Babolat</MenuItem>
              <MenuItem value="Head">Head</MenuItem>
              <MenuItem value="Tecnifibre">Tecnifibre</MenuItem>
            </Select>
          </FormControl>
          {isAdmin && (
            <>
              <FormControl fullWidth margin="normal">
                <InputLabel>Asignar Usuario</InputLabel>
                <Select value={userId} onChange={(e) => setUserId(e.target.value)}>
                  <MenuItem value="none">Ningún usuario asignado</MenuItem>
                  {users.map(u => (
                    <MenuItem key={u._id} value={u._id}>{u.username}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth margin="normal">
                <InputLabel>Activo</InputLabel>
                <Select value={active} onChange={(e) => setActive(e.target.value)}>
                  <MenuItem value="Yes">Sí</MenuItem>
                  <MenuItem value="No">No</MenuItem>
                </Select>
              </FormControl>
            </>
          )}
          <Typography variant="h6" sx={{ mt: 2 }}>Historial de Partidos</Typography>
          <TextField
            label="Buscar por rival"
            value={searchOpponent}
            onChange={(e) => setSearchOpponent(e.target.value)}
            fullWidth
            margin="normal"
          />
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Rival</TableCell>
                <TableCell>Resultado</TableCell>
                <TableCell>Fecha</TableCell>
                <TableCell>Torneo</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredMatches.map((match, idx) => (
                <TableRow key={idx}>
                  <TableCell>{match.opponent}</TableCell>
                  <TableCell>
                    <Chip
                      label={match.result === 'win' ? 'Ganó' : match.result === 'loss' ? 'Perdió' : 'Pendiente'}
                      color={match.result === 'win' ? 'success' : match.result === 'loss' ? 'error' : 'default'}
                    />
                  </TableCell>
                  <TableCell>{match.date || '-'}</TableCell>
                  <TableCell>{match.tournamentId || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions>
          {isEditable && (
            <>
              <Button variant="contained" color="primary" onClick={handleSave}>Guardar</Button>
              {isAdmin && active === 'Yes' && (
                <Button variant="contained" color="error" onClick={() => setConfirmAction('deactivate')}>Desactivar</Button>
              )}
              {isAdmin && active === 'No' && (
                <Button variant="contained" color="success" onClick={() => setConfirmAction('restore')}>Restaurar</Button>
              )}
            </>
          )}
          <Button onClick={handleClose} color="secondary">Cerrar</Button>
        </DialogActions>
      </Dialog>

      {isAdmin && (
        <>
          <Dialog open={confirmAction === 'deactivate'} onClose={() => setConfirmAction(null)}>
            <DialogTitle>Confirmar Desactivación</DialogTitle>
            <DialogContent>
              <Typography>¿Estás seguro de que quieres desactivar a {player.firstName} {player.lastName}? Esto lo ocultará de la lista pública.</Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setConfirmAction(null)} color="secondary">No</Button>
              <Button onClick={handleDeactivate} color="error">Sí</Button>
            </DialogActions>
          </Dialog>
          <Dialog open={confirmAction === 'restore'} onClose={() => setConfirmAction(null)}>
            <DialogTitle>Confirmar Restauración</DialogTitle>
            <DialogContent>
              <Typography>¿Estás seguro de que quieres restaurar a {player.firstName} {player.lastName}? Esto lo hará visible en la lista pública.</Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setConfirmAction(null)} color="secondary">No</Button>
              <Button onClick={handleRestore} color="success">Sí</Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </>
  );
};

export default PlayerDetailsModal;