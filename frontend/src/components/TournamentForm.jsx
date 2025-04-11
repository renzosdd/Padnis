import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { Box, Stepper, Step, StepLabel, Button, Typography, FormControl, InputLabel, Select, MenuItem, Checkbox, List, ListItem, ListItemText, TextField, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';

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
    autoGenerate: true,
  });
  const [pairDialog, setPairDialog] = useState({ open: false, player1: null, player2: null });
  const { user } = useAuth();
  const { addNotification } = useNotification();

  const updateFormData = (updates) => setFormData(prev => ({ ...prev, ...updates }));

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
      autoGenerate: true,
    });
  };

  const Step1 = () => (
    <Box>
      <FormControl fullWidth sx={{ mt: 2 }}>
        <InputLabel>Tipo de Torneo</InputLabel>
        <Select value={formData.type} onChange={(e) => updateFormData({ type: e.target.value })}>
          <MenuItem value="RoundRobin">Round Robin</MenuItem>
          <MenuItem value="Eliminatorio">Eliminatorio</MenuItem>
        </Select>
      </FormControl>
      <FormControl fullWidth sx={{ mt: 2 }}>
        <InputLabel>Deporte</InputLabel>
        <Select value={formData.sport} onChange={(e) => updateFormData({ sport: e.target.value })}>
          <MenuItem value="Tenis">Tenis</MenuItem>
          <MenuItem value="Pádel">Pádel</MenuItem>
        </Select>
      </FormControl>
      <FormControl fullWidth sx={{ mt: 2 }}>
        <InputLabel>Modalidad</InputLabel>
        <Select value={formData.format.mode} onChange={(e) => updateFormData({ format: { ...formData.format, mode: e.target.value }, participants: [] })}>
          <MenuItem value="Singles">Singles</MenuItem>
          <MenuItem value="Dobles">Dobles</MenuItem>
        </Select>
      </FormControl>
    </Box>
  );

  const Step2 = () => {
    const toggleParticipant = (player) => {
      const exists = formData.participants.some(p => p.player1 === player._id);
      updateFormData({
        participants: exists
          ? formData.participants.filter(p => p.player1 !== player._id)
          : [...formData.participants, { player1: player._id, player2: null }],
      });
    };

    const addPair = () => {
      if (!pairDialog.player1 || !pairDialog.player2 || pairDialog.player1._id === pairDialog.player2._id) {
        addNotification('Selecciona dos jugadores diferentes', 'error');
        return;
      }
      updateFormData({
        participants: [...formData.participants, { player1: pairDialog.player1._id, player2: pairDialog.player2._id }],
      });
      setPairDialog({ open: false, player1: null, player2: null });
    };

    return (
      <Box>
        {formData.format.mode === 'Singles' ? (
          <List sx={{ maxHeight: '50vh', overflowY: 'auto', border: '1px solid #e0e0e0' }}>
            {players.map(player => (
              <ListItem key={player._id} sx={{ borderBottom: '1px solid #e0e0e0' }}>
                <Checkbox
                  checked={formData.participants.some(p => p.player1 === player._id)}
                  onChange={() => toggleParticipant(player)}
                />
                <ListItemText primary={`${player.firstName} ${player.lastName}`} />
              </ListItem>
            ))}
          </List>
        ) : (
          <>
            <Button variant="contained" onClick={() => setPairDialog({ ...pairDialog, open: true })}>Agregar Pareja</Button>
            <List sx={{ maxHeight: '50vh', overflowY: 'auto', border: '1px solid #e0e0e0', mt: 2 }}>
              {formData.participants.map((pair, idx) => (
                <ListItem key={idx} sx={{ borderBottom: '1px solid #e0e0e0' }}>
                  <ListItemText
                    primary={`${players.find(p => p._id === pair.player1)?.firstName} ${players.find(p => p._id === pair.player1)?.lastName} / ${players.find(p => p._id === pair.player2)?.firstName} ${players.find(p => p._id === pair.player2)?.lastName}`}
                  />
                </ListItem>
              ))}
            </List>
            <Dialog open={pairDialog.open} onClose={() => setPairDialog({ ...pairDialog, open: false })}>
              <DialogTitle>Crear Pareja</DialogTitle>
              <DialogContent>
                <FormControl fullWidth sx={{ mt: 2 }}>
                  <InputLabel>Jugador 1</InputLabel>
                  <Select value={pairDialog.player1?._id || ''} onChange={(e) => setPairDialog({ ...pairDialog, player1: players.find(p => p._id === e.target.value) })}>
                    {players.map(p => (
                      <MenuItem key={p._id} value={p._id}>{`${p.firstName} ${p.lastName}`}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth sx={{ mt: 2 }}>
                  <InputLabel>Jugador 2</InputLabel>
                  <Select value={pairDialog.player2?._id || ''} onChange={(e) => setPairDialog({ ...pairDialog, player2: players.find(p => p._id === e.target.value) })}>
                    {players.map(p => (
                      <MenuItem key={p._id} value={p._id}>{`${p.firstName} ${p.lastName}`}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setPairDialog({ ...pairDialog, open: false })}>Cancelar</Button>
                <Button onClick={addPair}>Agregar</Button>
              </DialogActions>
            </Dialog>
          </>
        )}
      </Box>
    );
  };

  const Step3 = () => {
    const generateAutoGroups = () => {
      const shuffled = [...formData.participants].sort(() => 0.5 - Math.random());
      const groups = [];
      for (let i = 0; i < shuffled.length; i += 4) {
        const groupPlayers = shuffled.slice(i, i + 4);
        const matches = groupPlayers.flatMap((p1, idx) =>
          groupPlayers.slice(idx + 1).map(p2 => ({
            player1: p1,
            player2: p2,
            result: { sets: [], winner: null },
            date: null,
          }))
        );
        groups.push({ name: `Grupo ${groups.length + 1}`, players: groupPlayers, matches, standings: [] });
      }
      return groups;
    };

    const generateAutoRounds = () => {
      const shuffled = [...formData.participants].sort(() => 0.5 - Math.random());
      const matches = [];
      for (let i = 0; i < shuffled.length; i += 2) {
        if (i + 1 < shuffled.length) {
          matches.push({ player1: shuffled[i], player2: shuffled[i + 1], result: { sets: [], winner: null }, date: null });
        } else {
          matches.push({ player1: shuffled[i], player2: { player1: null, name: 'BYE' }, result: { sets: [], winner: shuffled[i].player1 }, date: null });
        }
      }
      return [{ round: 1, matches }];
    };

    return (
      <Box>
        <FormControlLabel
          control={<Checkbox checked={formData.autoGenerate} onChange={(e) => updateFormData({ autoGenerate: e.target.checked, groups: [], rounds: [] })} />}
          label="Generar automáticamente"
        />
        {formData.autoGenerate ? (
          <TextField
            label="Fecha General (Opcional)"
            type="datetime-local"
            value={formData.schedule.group ? formData.schedule.group.slice(0, 16) : ''}
            onChange={(e) => updateFormData({ schedule: { ...formData.schedule, group: e.target.value || null } })}
            fullWidth
            sx={{ mt: 2 }}
            InputLabelProps={{ shrink: true }}
          />
        ) : (
          <Typography>Implementar entrada manual (pendiente)</Typography>
        )}
        {step === 2 && formData.autoGenerate && (
          <Button onClick={() => updateFormData({ groups: formData.type === 'RoundRobin' ? generateAutoGroups() : [], rounds: formData.type === 'Eliminatorio' ? generateAutoRounds() : [] })}>
            Generar Vista Previa
          </Button>
        )}
        {(formData.groups.length > 0 || formData.rounds.length > 0) && (
          <Box sx={{ mt: 2 }}>
            {formData.type === 'RoundRobin' ? formData.groups.map(group => (
              <Box key={group.name}>
                <Typography>{group.name}</Typography>
                <List>
                  {group.players.map(p => (
                    <ListItemText key={p.player1} primary={`${players.find(pl => pl._id === p.player1)?.firstName} ${players.find(pl => pl._id === p.player1)?.lastName}`} />
                  ))}
                </List>
              </Box>
            )) : formData.rounds.map(round => (
              <Box key={round.round}>
                <Typography>Ronda {round.round}</Typography>
                <List>
                  {round.matches.map((m, idx) => (
                    <ListItemText key={idx} primary={`${players.find(p => p._id === m.player1.player1)?.firstName} vs ${m.player2.name || players.find(p => p._id === m.player2.player1)?.firstName}`} />
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