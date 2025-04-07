import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { Stepper, Step, StepLabel, Button, Typography, Box, Checkbox, FormControlLabel, Select, MenuItem, InputLabel, FormControl, Dialog, DialogTitle, DialogContent, DialogActions, Card, CardContent, TextField, Autocomplete } from '@mui/material';

const TournamentForm = ({ players, onCreateTournament }) => {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    type: 'RoundRobin',
    sport: 'Tenis',
    mode: 'Singles',
    sets: 1,
    gamesPerSet: 6,
    tiebreakSet: 7,
    tiebreakMatch: 10,
    participants: [],
    groupSize: 3,
    schedule: { group: null, matches: [] },
  });
  const [pairModalOpen, setPairModalOpen] = useState(false);
  const [pairPlayer1, setPairPlayer1] = useState(null);
  const [pairPlayer2, setPairPlayer2] = useState(null);
  const { user } = useAuth();
  const { addNotification } = useNotification();

  const updateFormData = (updates) => setFormData(prev => ({ ...prev, ...updates }));

  const generateParticipants = () => {
    return formData.mode === 'Singles'
      ? formData.participants.map(p => ({
          player1: p.playerId,
          player2: null,
          seed: p.isSeed || false,
        }))
      : formData.participants.map(p => ({
          player1: p.player1Id,
          player2: p.player2Id,
          seed: false,
        }));
  };

  const generateGroups = (participants) => {
    const groupCount = Math.ceil(participants.length / formData.groupSize);
    const groups = Array.from({ length: groupCount }, (_, i) => ({
      name: `Grupo ${i + 1}`,
      players: participants.slice(i * formData.groupSize, (i + 1) * formData.groupSize),
      matches: [],
      standings: [],
    }));
    if (groups.some(g => g.players.length === 1)) {
      const loneGroup = groups.find(g => g.players.length === 1);
      const targetGroup = groups.find(g => g.players.length < formData.groupSize && g.players.length > 1);
      if (targetGroup) {
        targetGroup.players.push(loneGroup.players[0]);
        groups.splice(groups.indexOf(loneGroup), 1);
      }
    }
    groups.forEach(group => {
      group.matches = group.players.flatMap((p1, i) =>
        group.players.slice(i + 1).map(p2 => ({
          player1: p1,
          player2: p2,
          result: { sets: [], winner: null },
        }))
      );
    });
    return groups;
  };

  const generateRounds = (participants) => {
    const seeded = participants.filter(p => p.seed);
    const unseeded = participants.filter(p => !p.seed);
    const shuffledUnseeded = unseeded.sort(() => 0.5 - Math.random());
    const ordered = [...seeded.slice(0, 2), ...shuffledUnseeded, ...seeded.slice(2)].reverse();
    const roundCount = Math.ceil(Math.log2(ordered.length));
    const firstRoundSize = Math.pow(2, roundCount);
    const byes = firstRoundSize - ordered.length;
    const matches = [];
    for (let i = 0; i < firstRoundSize / 2; i++) {
      const p1 = i < byes ? ordered[i] : ordered[i];
      const p2 = i < byes ? { player1: null, name: 'BYE' } : ordered[firstRoundSize - 1 - i];
      matches.push({ player1: p1, player2: p2, result: { sets: [], winner: null } });
    } // Cierre correcto del bucle for
    return [{ round: 1, matches }];
  };

  const handleSubmit = async (isDraft = false) => {
    try {
      if (!user || !user._id) throw new Error('Usuario no autenticado');
      const participants = generateParticipants();
      if (participants.length === 0 || participants.some(p => !p.player1)) {
        throw new Error('Faltan participantes válidos');
      }
      const tournament = {
        type: formData.type,
        sport: formData.sport,
        format: {
          mode: formData.mode,
          sets: formData.sets,
          gamesPerSet: formData.gamesPerSet,
          tiebreakSet: formData.tiebreakSet,
          tiebreakMatch: formData.tiebreakMatch,
        },
        participants,
        groups: formData.type === 'RoundRobin' ? generateGroups(participants) : [],
        rounds: formData.type === 'Eliminatorio' ? generateRounds(participants) : [],
        schedule: formData.schedule,
        creator: user._id,
        draft: isDraft,
      };
      const response = await axios.post('http://localhost:5001/api/tournaments', tournament, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!isDraft) onCreateTournament(response.data);
      addNotification(isDraft ? 'Borrador guardado' : 'Torneo creado con éxito', 'success');
      resetForm();
    } catch (error) {
      console.error('Error submitting tournament:', error);
      addNotification(error.response?.data?.message || 'Error al guardar torneo', 'error');
    }
  };

  const resetForm = () => {
    setStep(0);
    setPairModalOpen(false);
    setPairPlayer1(null);
    setPairPlayer2(null);
    setFormData({
      type: 'RoundRobin',
      sport: 'Tenis',
      mode: 'Singles',
      sets: 1,
      gamesPerSet: 6,
      tiebreakSet: 7,
      tiebreakMatch: 10,
      participants: [],
      groupSize: 3,
      schedule: { group: null, matches: [] },
    });
  };

  const Step1 = () => (
    <Box>
      <FormControl fullWidth margin="normal">
        <InputLabel>Tipo de Torneo</InputLabel>
        <Select value={formData.type} onChange={(e) => updateFormData({ type: e.target.value })}>
          <MenuItem value="RoundRobin">Round Robin</MenuItem>
          <MenuItem value="Eliminatorio">Eliminatorio</MenuItem>
        </Select>
      </FormControl>
      <FormControl fullWidth margin="normal">
        <InputLabel>Deporte</InputLabel>
        <Select value={formData.sport} onChange={(e) => updateFormData({ sport: e.target.value })}>
          <MenuItem value="Tenis">Tenis</MenuItem>
          <MenuItem value="Pádel">Pádel</MenuItem>
        </Select>
      </FormControl>
    </Box>
  );

  const Step2 = () => {
    const togglePlayer = (playerId, isSeed = false) => {
      setFormData(prev => {
        const participants = [...prev.participants];
        const index = participants.findIndex(p => p.playerId === playerId);
        if (index >= 0) {
          if (isSeed) participants[index].isSeed = !participants[index].isSeed;
          else participants.splice(index, 1);
        } else if (!isSeed) {
          participants.push({ playerId, isSeed: false });
        }
        return { ...prev, participants };
      });
    };

    const addPair = () => {
      if (!pairPlayer1 || !pairPlayer2 || pairPlayer1._id === pairPlayer2._id) {
        addNotification('Selecciona dos jugadores diferentes', 'error');
        return;
      }
      const existing = formData.participants.some(p => p.player1Id === pairPlayer1._id || p.player2Id === pairPlayer1._id || p.player1Id === pairPlayer2._id || p.player2Id === pairPlayer2._id);
      if (existing) {
        addNotification('Jugador ya asignado a una pareja', 'error');
        return;
      }
      setFormData(prev => ({
        ...prev,
        participants: [...prev.participants, { player1Id: pairPlayer1._id, player2Id: pairPlayer2._id }],
      }));
      setPairPlayer1(null);
      setPairPlayer2(null);
      setPairModalOpen(false);
    };

    const availablePlayers = players.filter(p => !formData.participants.some(part => part.player1Id === p._id || part.player2Id === p._id));

    return (
      <Box>
        <FormControl fullWidth margin="normal">
          <InputLabel>Modalidad</InputLabel>
          <Select value={formData.mode} onChange={(e) => updateFormData({ mode: e.target.value, participants: [] })}>
            <MenuItem value="Singles">Singles</MenuItem>
            <MenuItem value="Dobles">Dobles</MenuItem>
          </Select>
        </FormControl>
        {formData.mode === 'Singles' ? (
          <Box>
            <Typography variant="h6" gutterBottom>Seleccionar Jugadores</Typography>
            <Box sx={{ maxHeight: '50vh', overflowY: 'auto', border: '1px solid #e0e0e0' }}>
              {players.map(player => (
                <Box key={player._id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderBottom: '1px solid #e0e0e0' }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.participants.some(p => p.playerId === player._id)}
                        onChange={() => togglePlayer(player._id)}
                      />
                    }
                    label={`${player.firstName} ${player.lastName}`}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.participants.some(p => p.playerId === player._id && p.isSeed)}
                        onChange={() => togglePlayer(player._id, true)}
                        disabled={!formData.participants.some(p => p.playerId === player._id)}
                      />
                    }
                    label="Cabeza de Serie"
                  />
                </Box>
              ))}
            </Box>
          </Box>
        ) : (
          <Box>
            <Typography variant="h6" gutterBottom>Crear Parejas</Typography>
            <Button variant="contained" color="primary" onClick={() => setPairModalOpen(true)} sx={{ mb: 2 }}>Agregar Pareja</Button>
            <Box sx={{ maxHeight: '50vh', overflowY: 'auto', border: '1px solid #e0e0e0' }}>
              {formData.participants.map((pair, idx) => (
                <Box key={`${pair.player1Id}-${pair.player2Id}`} sx={{ padding: '10px', borderBottom: '1px solid #e0e0e0' }}>
                  {players.find(p => p._id === pair.player1Id)?.firstName} {players.find(p => p._id === pair.player1Id)?.lastName} / 
                  {players.find(p => p._id === pair.player2Id)?.firstName} {players.find(p => p._id === pair.player2Id)?.lastName}
                </Box>
              ))}
            </Box>
            <Dialog open={pairModalOpen} onClose={() => setPairModalOpen(false)}>
              <DialogTitle>Agregar Pareja</DialogTitle>
              <DialogContent>
                <Autocomplete
                  options={availablePlayers}
                  getOptionLabel={(option) => `${option.firstName} ${option.lastName}`}
                  value={pairPlayer1}
                  onChange={(e, newValue) => setPairPlayer1(newValue)}
                  renderInput={(params) => <TextField {...params} label="Jugador 1" margin="normal" />}
                  fullWidth
                />
                <Autocomplete
                  options={availablePlayers}
                  getOptionLabel={(option) => `${option.firstName} ${option.lastName}`}
                  value={pairPlayer2}
                  onChange={(e, newValue) => setPairPlayer2(newValue)}
                  renderInput={(params) => <TextField {...params} label="Jugador 2" margin="normal" />}
                  fullWidth
                />
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setPairModalOpen(false)} color="secondary">Cancelar</Button>
                <Button onClick={addPair} color="primary">Agregar</Button>
              </DialogActions>
            </Dialog>
          </Box>
        )}
      </Box>
    );
  };

  const Step3 = () => (
    <Box>
      <FormControl fullWidth margin="normal">
        <InputLabel>Cantidad de Sets</InputLabel>
        <Select value={formData.sets} onChange={(e) => updateFormData({ sets: parseInt(e.target.value) })}>
          <MenuItem value={1}>1 Set</MenuItem>
          <MenuItem value={2}>2 Sets</MenuItem>
        </Select>
      </FormControl>
      <FormControlLabel
        control={
          <Checkbox
            checked={formData.gamesPerSet === 4}
            onChange={() => updateFormData({ gamesPerSet: formData.gamesPerSet === 6 ? 4 : 6 })}
          />
        }
        label="Sets a 4 Juegos"
      />
      <TextField
        label="Tiebreak por Set (7-25)"
        type="number"
        value={formData.tiebreakSet}
        onChange={(e) => updateFormData({ tiebreakSet: Math.min(Math.max(parseInt(e.target.value) || 7, 7), 25) })}
        fullWidth
        margin="normal"
        inputProps={{ min: 7, max: 25 }}
      />
      {formData.sets === 2 && (
        <TextField
          label="Tiebreak por Partido (7-25)"
          type="number"
          value={formData.tiebreakMatch}
          onChange={(e) => updateFormData({ tiebreakMatch: Math.min(Math.max(parseInt(e.target.value) || 7, 7), 25) })}
          fullWidth
          margin="normal"
          inputProps={{ min: 7, max: 25 }}
        />
      )}
      {formData.type === 'RoundRobin' && (
        <TextField
          label="Tamaño de Grupos (2-5)"
          type="number"
          value={formData.groupSize}
          onChange={(e) => updateFormData({ groupSize: Math.min(Math.max(parseInt(e.target.value) || 2, 2), 5) })}
          fullWidth
          margin="normal"
          inputProps={{ min: 2, max: 5 }}
        />
      )}
    </Box>
  );

  const Step4 = () => {
    const participants = generateParticipants();
    const previewData = formData.type === 'RoundRobin' ? generateGroups(participants) : generateRounds(participants);

    return (
      <Box>
        <TextField
          label="Horario General (Opcional)"
          type="datetime-local"
          value={formData.schedule.group ? formData.schedule.group.toISOString().slice(0, 16) : ''}
          onChange={(e) => updateFormData({ schedule: { ...formData.schedule, group: e.target.value ? new Date(e.target.value) : null } })}
          fullWidth
          margin="normal"
          InputLabelProps={{ shrink: true }}
        />
        <Typography variant="h6" gutterBottom>Vista Previa</Typography>
        {formData.type === 'RoundRobin' ? (
          previewData.map((group) => (
            <Card key={group.name} sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6">{group.name}</Typography>
                <ul style={{ padding: 0, listStyleType: 'none' }}>
                  {group.players.map((p) => (
                    <li key={p.player1}>
                      {players.find(pl => pl._id === p.player1)?.firstName} {players.find(pl => pl._id === p.player1)?.lastName}
                      {p.player2 && ` / ${players.find(pl => pl._id === p.player2)?.firstName} ${players.find(pl => pl._id === p.player2)?.lastName}`}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))
        ) : (
          previewData.map((round) => (
            <Card key={round.round} sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6">Ronda {round.round}</Typography>
                <ul style={{ padding: 0, listStyleType: 'none' }}>
                  {round.matches.map((match, idx) => (
                    <li key={`${round.round}-${idx}`}>
                      {players.find(p => p._id === match.player1.player1)?.firstName} 
                      {match.player1.player2 && ` / ${players.find(p => p._id === match.player1.player2)?.firstName}`} 
                      {' vs. '} 
                      {match.player2.name || players.find(p => p._id === match.player2.player1)?.firstName}
                      {match.player2.player2 && ` / ${players.find(p => p._id === match.player2.player2)?.firstName}`}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))
        )}
      </Box>
    );
  };

  const steps = ['Tipo y Deporte', 'Participantes', 'Formato', 'Revisión'];

  return (
    <Box sx={{ padding: 2 }}>
      <Stepper activeStep={step} alternativeLabel>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      <Box sx={{ mt: 2 }}>
        {step === 0 && <Step1 />}
        {step === 1 && <Step2 />}
        {step === 2 && <Step3 />}
        {step === 3 && <Step4 />}
      </Box>
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
        {step > 0 && (
          <Button variant="contained" color="secondary" onClick={() => setStep(step - 1)}>Atrás</Button>
        )}
        {step < 3 && (
          <Button variant="contained" color="primary" onClick={() => setStep(step + 1)}>Siguiente</Button>
        )}
        {step === 3 && (
          <>
            <Button variant="contained" color="primary" onClick={() => handleSubmit(false)}>Finalizar</Button>
            <Button variant="outlined" color="primary" onClick={() => handleSubmit(true)}>Guardar Borrador</Button>
          </>
        )}
      </Box>
    </Box>
  );
};

export default TournamentForm;