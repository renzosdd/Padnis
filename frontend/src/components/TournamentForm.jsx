import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { Box, Stepper, Step, StepLabel, Button, Typography, FormControl, InputLabel, Select, MenuItem, Autocomplete, TextField, Chip, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

const TournamentForm = ({ players, onCreateTournament }) => {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    type: 'RoundRobin',
    sport: 'Tenis',
    format: { mode: 'Singles', sets: 1, gamesPerSet: 6, tiebreakSet: 7, tiebreakMatch: 10 },
    participants: [],
    groups: [],
    rounds: [],
    schedule: { group: null, matches: [] },
    groupSize: 4, // Default para Round Robin
    autoGenerate: true,
  });
  const [pairDialog, setPairDialog] = useState({ open: false, player1: null, player2: null });
  const [newPlayerDialog, setNewPlayerDialog] = useState({ open: false, firstName: '', lastName: '' });
  const { user } = useAuth();
  const { addNotification } = useNotification();

  const handleNext = () => {
    if (step === 0 && (!formData.type || !formData.sport || !formData.format.mode)) {
      addNotification('Completa todos los campos básicos', 'error');
      return;
    }
    if (step === 1 && formData.participants.length < (formData.format.mode === 'Singles' ? 2 : 1)) {
      addNotification(`Selecciona al menos ${formData.format.mode === 'Singles' ? 2 : 1} participantes`, 'error');
      return;
    }
    setStep(step + 1);
  };

  const handleSubmit = async (draft = true) => {
    try {
      const tournament = {
        type: formData.type,
        sport: formData.sport,
        format: formData.format,
        participants: formData.participants,
        groups: formData.groups,
        rounds: formData.rounds,
        schedule: formData.schedule,
        draft,
      };
      const response = await axios.post('https://padnis.onrender.com/api/tournaments', tournament, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!draft) onCreateTournament(response.data);
      addNotification(draft ? 'Borrador guardado' : 'Torneo creado', 'success');
      resetForm();
    } catch (error) {
      addNotification(error.response?.data?.message || 'Error al guardar torneo', 'error');
    }
  };

  const resetForm = () => {
    setStep(0);
    setFormData({
      type: 'RoundRobin',
      sport: 'Tenis',
      format: { mode: 'Singles', sets: 1, gamesPerSet: 6, tiebreakSet: 7, tiebreakMatch: 10 },
      participants: [],
      groups: [],
      rounds: [],
      schedule: { group: null, matches: [] },
      groupSize: 4,
      autoGenerate: true,
    });
  };

  const Step1 = () => (
    <Box sx={{ maxWidth: 400, mx: 'auto' }}>
      <FormControl fullWidth sx={{ mt: 2 }}>
        <InputLabel>Tipo de Torneo</InputLabel>
        <Select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
          <MenuItem value="RoundRobin">Round Robin</MenuItem>
          <MenuItem value="Eliminatorio">Eliminatorio</MenuItem>
        </Select>
      </FormControl>
      <FormControl fullWidth sx={{ mt: 2 }}>
        <InputLabel>Deporte</InputLabel>
        <Select value={formData.sport} onChange={(e) => setFormData({ ...formData, sport: e.target.value })}>
          <MenuItem value="Tenis">Tenis</MenuItem>
          <MenuItem value="Pádel">Pádel</MenuItem>
        </Select>
      </FormControl>
      <FormControl fullWidth sx={{ mt: 2 }}>
        <InputLabel>Modalidad</InputLabel>
        <Select value={formData.format.mode} onChange={(e) => setFormData({ ...formData, format: { ...formData.format, mode: e.target.value }, participants: [] })}>
          <MenuItem value="Singles">Singles</MenuItem>
          <MenuItem value="Dobles">Dobles</MenuItem>
        </Select>
      </FormControl>
    </Box>
  );

  const Step2 = () => {
    const addParticipant = (player) => {
      if (!player) return;
      if (formData.format.mode === 'Singles') {
        if (formData.participants.some(p => p.player1 === player._id)) {
          addNotification('Jugador ya seleccionado', 'error');
          return;
        }
        setFormData({ ...formData, participants: [...formData.participants, { player1: player._id, player2: null, seed: false }] });
      }
    };

    const removeParticipant = (playerId) => {
      setFormData({ ...formData, participants: formData.participants.filter(p => p.player1 !== playerId) });
    };

    const addPair = () => {
      if (!pairDialog.player1 || !pairDialog.player2) {
        addNotification('Selecciona dos jugadores', 'error');
        return;
      }
      if (pairDialog.player1 === pairDialog.player2) {
        addNotification('No puedes seleccionar el mismo jugador', 'error');
        return;
      }
      if (formData.participants.some(p => p.player1 === pairDialog.player1 || p.player2 === pairDialog.player1 || p.player1 === pairDialog.player2 || p.player2 === pairDialog.player2)) {
        addNotification('Jugador ya asignado a una pareja', 'error');
        return;
      }
      setFormData({
        ...formData,
        participants: [...formData.participants, { player1: pairDialog.player1, player2: pairDialog.player2, seed: false }],
      });
      setPairDialog({ open: false, player1: null, player2: null });
    };

    const removePair = (pair) => {
      setFormData({
        ...formData,
        participants: formData.participants.filter(p => !(p.player1 === pair.player1 && p.player2 === pair.player2)),
      });
    };

    const addNewPlayer = async () => {
      if (!newPlayerDialog.firstName || !newPlayerDialog.lastName) {
        addNotification('Nombre y apellido son obligatorios', 'error');
        return;
      }
      try {
        const lastPlayer = await axios.get('https://padnis.onrender.com/api/players', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        const playerId = lastPlayer.data.length > 0 ? Math.max(...lastPlayer.data.map(p => p.playerId)) + 1 : 1;
        const response = await axios.post('https://padnis.onrender.com/api/players', {
          playerId,
          firstName: newPlayerDialog.firstName,
          lastName: newPlayerDialog.lastName,
          dominantHand: 'right',
          racketBrand: '',
          matches: [],
        }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
        addParticipant(response.data);
        setNewPlayerDialog({ open: false, firstName: '', lastName: '' });
        addNotification('Jugador creado y agregado', 'success');
      } catch (error) {
        addNotification(error.response?.data?.message || 'Error al crear jugador', 'error');
      }
    };

    return (
      <Box sx={{ maxWidth: 600, mx: 'auto' }}>
        {formData.format.mode === 'Singles' ? (
          <>
            <Autocomplete
              options={players}
              getOptionLabel={(option) => `${option.firstName} ${option.lastName}`}
              onChange={(e, value) => addParticipant(value)}
              renderInput={(params) => <TextField {...params} label="Agregar Jugador" sx={{ mt: 2 }} />}
              noOptionsText={<Button onClick={() => setNewPlayerDialog({ ...newPlayerDialog, open: true })}>Crear nuevo jugador</Button>}
            />
            <Box sx={{ mt: 2 }}>
              {formData.participants.map(part => (
                <Chip
                  key={part.player1}
                  label={`${players.find(p => p._id === part.player1)?.firstName} ${players.find(p => p._id === part.player1)?.lastName}`}
                  onDelete={() => removeParticipant(part.player1)}
                  sx={{ m: 0.5 }}
                />
              ))}
            </Box>
          </>
        ) : (
          <>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setPairDialog({ open: true, player1: null, player2: null })} sx={{ mt: 2 }}>
              Agregar Pareja
            </Button>
            <Box sx={{ mt: 2 }}>
              {formData.participants.map((pair, idx) => (
                <Chip
                  key={idx}
                  label={`${players.find(p => p._id === pair.player1)?.firstName} ${players.find(p => p._id === pair.player1)?.lastName} / ${players.find(p => p._id === pair.player2)?.firstName} ${players.find(p => p._id === pair.player2)?.lastName}`}
                  onDelete={() => removePair(pair)}
                  sx={{ m: 0.5 }}
                />
              ))}
            </Box>
            <Dialog open={pairDialog.open} onClose={() => setPairDialog({ open: false, player1: null, player2: null })}>
              <DialogTitle>Crear Pareja</DialogTitle>
              <DialogContent>
                <Autocomplete
                  options={players.filter(p => !formData.participants.some(part => part.player1 === p._id || part.player2 === p._id))}
                  getOptionLabel={(option) => `${option.firstName} ${option.lastName}`}
                  onChange={(e, value) => setPairDialog({ ...pairDialog, player1: value?._id || null })}
                  renderInput={(params) => <TextField {...params} label="Jugador 1" sx={{ mt: 2 }} />}
                  noOptionsText={<Button onClick={() => setNewPlayerDialog({ ...newPlayerDialog, open: true })}>Crear nuevo jugador</Button>}
                />
                <Autocomplete
                  options={players.filter(p => !formData.participants.some(part => part.player1 === p._id || part.player2 === p._id))}
                  getOptionLabel={(option) => `${option.firstName} ${option.lastName}`}
                  onChange={(e, value) => setPairDialog({ ...pairDialog, player2: value?._id || null })}
                  renderInput={(params) => <TextField {...params} label="Jugador 2" sx={{ mt: 2 }} />}
                  noOptionsText={<Button onClick={() => setNewPlayerDialog({ ...newPlayerDialog, open: true })}>Crear nuevo jugador</Button>}
                />
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setPairDialog({ open: false, player1: null, player2: null })}>Cancelar</Button>
                <Button onClick={addPair}>Agregar</Button>
              </DialogActions>
            </Dialog>
          </>
        )}
        <Dialog open={newPlayerDialog.open} onClose={() => setNewPlayerDialog({ open: false, firstName: '', lastName: '' })}>
          <DialogTitle>Crear Nuevo Jugador</DialogTitle>
          <DialogContent>
            <TextField
              label="Nombre"
              value={newPlayerDialog.firstName}
              onChange={(e) => setNewPlayerDialog({ ...newPlayerDialog, firstName: e.target.value })}
              fullWidth
              sx={{ mt: 2 }}
            />
            <TextField
              label="Apellido"
              value={newPlayerDialog.lastName}
              onChange={(e) => setNewPlayerDialog({ ...newPlayerDialog, lastName: e.target.value })}
              fullWidth
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setNewPlayerDialog({ open: false, firstName: '', lastName: '' })}>Cancelar</Button>
            <Button onClick={addNewPlayer}>Crear</Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  };

  const Step3 = () => {
    const generateAutoGroups = () => {
      const shuffled = [...formData.participants].sort(() => 0.5 - Math.random());
      const groups = [];
      for (let i = 0; i < shuffled.length; i += formData.groupSize) {
        const groupPlayers = shuffled.slice(i, i + formData.groupSize);
        const matches = groupPlayers.flatMap((p1, idx) =>
          groupPlayers.slice(idx + 1).map(p2 => ({
            player1: p1,
            player2: p2,
            result: { sets: [], winner: null },
            date: formData.schedule.group || null,
          }))
        );
        groups.push({ name: `Grupo ${groups.length + 1}`, players: groupPlayers, matches, standings: [] });
      }
      return groups;
    };

    const generateAutoRounds = () => {
      const seeded = formData.participants.filter(p => p.seed);
      const unseeded = formData.participants.filter(p => !p.seed).sort(() => 0.5 - Math.random());
      const participants = seeded.length >= 2 ? [seeded[0], ...unseeded, seeded[1]] : [...seeded, ...unseeded];
      const totalSlots = Math.pow(2, Math.ceil(Math.log2(participants.length)));
      const byes = totalSlots - participants.length;
      const matches = [];
      for (let i = 0; i < totalSlots / 2; i++) {
        const p1 = i < participants.length ? participants[i] : { player1: null, name: 'BYE' };
        const p2 = i < byes ? { player1: null, name: 'BYE' } : participants[totalSlots - 1 - i] || { player1: null, name: 'BYE' };
        matches.push({ player1: p1, player2: p2, result: { sets: [], winner: p1.player1 && !p2.player1 ? p1.player1 : null }, date: formData.schedule.group || null });
      }
      return [{ round: 1, matches }];
    };

    return (
      <Box sx={{ maxWidth: 600, mx: 'auto' }}>
        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel>Tamaño de Grupos (Round Robin)</InputLabel>
          <Select
            value={formData.groupSize}
            onChange={(e) => setFormData({ ...formData, groupSize: e.target.value })}
            disabled={formData.type === 'Eliminatorio'}
          >
            <MenuItem value={3}>3 Jugadores</MenuItem>
            <MenuItem value={4}>4 Jugadores</MenuItem>
            <MenuItem value={5}>5 Jugadores</MenuItem>
          </Select>
        </FormControl>
        <TextField
          label="Fecha General (Opcional)"
          type="datetime-local"
          value={formData.schedule.group ? formData.schedule.group.slice(0, 16) : ''}
          onChange={(e) => setFormData({ ...formData, schedule: { ...formData.schedule, group: e.target.value || null } })}
          fullWidth
          sx={{ mt: 2 }}
          InputLabelProps={{ shrink: true }}
        />
        <Button
          variant="outlined"
          onClick={() => setFormData({
            ...formData,
            groups: formData.type === 'RoundRobin' ? generateAutoGroups() : [],
            rounds: formData.type === 'Eliminatorio' ? generateAutoRounds() : [],
          })}
          sx={{ mt: 2 }}
        >
          Generar Vista Previa
        </Button>
        {(formData.groups.length > 0 || formData.rounds.length > 0) && (
          <Box sx={{ mt: 2 }}>
            {formData.type === 'RoundRobin' ? formData.groups.map(group => (
              <Box key={group.name} sx={{ mb: 2 }}>
                <Typography variant="subtitle1">{group.name}</Typography>
                <List dense>
                  {group.players.map(p => (
                    <ListItemText key={p.player1} primary={`${players.find(pl => pl._id === p.player1)?.firstName} ${players.find(pl => pl._id === p.player1)?.lastName}`} />
                  ))}
                </List>
              </Box>
            )) : formData.rounds.map(round => (
              <Box key={round.round} sx={{ mb: 2 }}>
                <Typography variant="subtitle1">Ronda {round.round}</Typography>
                <List dense>
                  {round.matches.map((m, idx) => (
                    <ListItemText
                      key={idx}
                      primary={`${players.find(p => p._id === m.player1.player1)?.firstName || 'BYE'} vs ${m.player2.name || players.find(p => p._id === m.player2.player1)?.firstName || 'BYE'}`}
                    />
                  ))}
                </List>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    );
  };

  const steps = ['Datos Básicos', 'Participantes', 'Grupos/Rondas'];

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>Crear Torneo</Typography>
      <Stepper activeStep={step} sx={{ mb: 2 }}>
        {steps.map(label => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
      </Stepper>
      {step === 0 && <Step1 />}
      {step === 1 && <Step2 />}
      {step === 2 && <Step3 />}
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
        {step > 0 && <Button onClick={() => setStep(step - 1)}>Atrás</Button>}
        {step < 2 && <Button variant="contained" onClick={handleNext}>Siguiente</Button>}
        {step === 2 && (
          <>
            <Button variant="contained" onClick={() => handleSubmit(false)}>Iniciar Torneo</Button>
            <Button variant="outlined" onClick={() => handleSubmit(true)}>Guardar Borrador</Button>
          </>
        )}
      </Box>
    </Box>
  );
};

export default TournamentForm;