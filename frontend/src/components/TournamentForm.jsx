import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  Checkbox,
  ListItemText,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useMediaQuery } from '@mui/material';

const NewPlayerDialog = ({ open, onClose, onAddPlayer }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const { addNotification } = useNotification();

  const handleAddPlayer = async () => {
    if (!firstName || !lastName) {
      addNotification('Nombre y apellido son obligatorios', 'error');
      return;
    }
    try {
      const response = await axios.post(
        'https://padnis.onrender.com/api/players',
        {
          firstName,
          lastName,
          phone: phone || undefined,
          email: email || undefined,
          dominantHand: 'right',
          racketBrand: '',
          matches: [],
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      onAddPlayer(response.data);
      setFirstName('');
      setLastName('');
      setPhone('');
      setEmail('');
      addNotification('Jugador creado y agregado', 'success');
    } catch (error) {
      addNotification(error.response?.data?.message || 'Error al crear jugador', 'error');
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Crear Nuevo Jugador</DialogTitle>
      <DialogContent>
        <TextField
          id="new-player-firstName"
          label="Nombre *"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          fullWidth
          sx={{ mt: 2 }}
        />
        <TextField
          id="new-player-lastName"
          label="Apellido *"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          fullWidth
          sx={{ mt: 2 }}
        />
        <TextField
          id="new-player-phone"
          label="Teléfono"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          fullWidth
          sx={{ mt: 2 }}
        />
        <TextField
          id="new-player-email"
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          fullWidth
          sx={{ mt: 2 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleAddPlayer}>Crear</Button>
      </DialogActions>
    </Dialog>
  );
};

const TournamentForm = ({ players, onCreateTournament }) => {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [formData, setFormData] = useState({
    clubId: '',
    type: 'RoundRobin',
    sport: 'Tenis',
    category: '',
    format: { mode: 'Singles', sets: 1, gamesPerSet: 6, tiebreakSet: 6, tiebreakMatch: 10 },
    participants: [],
    groups: [],
    rounds: [],
    schedule: { group: null, matches: [] },
    groupSize: 4,
    autoGenerate: true,
    seededPlayers: [],
  });
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [pairPlayers, setPairPlayers] = useState([]);
  const [search, setSearch] = useState('');
  const [newPlayerDialogOpen, setNewPlayerDialogOpen] = useState(false);
  const [localPlayers, setLocalPlayers] = useState([]);
  const [clubs, setClubs] = useState([]);
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const isMobile = useMediaQuery('(max-width:600px)');

  useEffect(() => {
    const normalizedPlayers = players.map(p => ({ ...p, _id: String(p._id) }));
    setLocalPlayers(normalizedPlayers);
    fetchClubs();
  }, [players]);

  const fetchClubs = async () => {
    try {
      const response = await axios.get('https://padnis.onrender.com/api/clubs', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setClubs(response.data);
    } catch (error) {
      addNotification('Error al cargar clubes', 'error');
    }
  };

  const handleNameChange = useCallback((event) => {
    setName(event.target.value);
  }, []);

  const handleNext = () => {
    if (step === 0) {
      if (!name) {
        addNotification('El nombre del torneo es obligatorio', 'error');
        return;
      }
      if (!formData.type || !formData.sport || !formData.format.mode || !formData.category) {
        addNotification('Completa todos los campos básicos', 'error');
        return;
      }
    }
    if (step === 1) {
      const participantCount = formData.format.mode === 'Singles' ? selectedPlayers.length : formData.participants.length;
      if (participantCount < (formData.format.mode === 'Singles' ? 2 : 1)) {
        addNotification(`Selecciona al menos ${formData.format.mode === 'Singles' ? 2 : 1} participantes`, 'error');
        return;
      }
      if (formData.format.mode === 'Singles') {
        setFormData(prev => ({
          ...prev,
          participants: selectedPlayers.map(id => ({ player1: id, player2: null, seed: formData.seededPlayers.includes(id) })),
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          participants: prev.participants.map(pair => ({ ...pair, seed: formData.seededPlayers.includes(pair.player1) || formData.seededPlayers.includes(pair.player2) })),
        }));
      }
    }
    setStep(step + 1);
  };

  const handleSubmit = async (draft = true) => {
    try {
      const tournament = {
        name,
        clubId: formData.clubId || null,
        type: formData.type,
        sport: formData.sport,
        category: formData.category,
        format: formData.format,
        participants: formData.participants,
        groups: formData.groups,
        rounds: formData.rounds,
        schedule: formData.schedule,
        seededPlayers: formData.seededPlayers,
        draft,
      };
      const response = await axios.post('https://padnis.onrender.com/api/tournaments', tournament, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!draft) onCreateTournament(response.data);
      addNotification(draft ? 'Borrador guardado' : 'Torneo creado', 'success');
      resetForm();
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Error al crear el torneo';
      addNotification(errorMessage, 'error');
      console.error('Error al crear el torneo:', error);
    }
  };

  const resetForm = () => {
    setStep(0);
    setName('');
    setFormData({
      clubId: '',
      type: 'RoundRobin',
      sport: 'Tenis',
      category: '',
      format: { mode: 'Singles', sets: 1, gamesPerSet: 6, tiebreakSet: 6, tiebreakMatch: 10 },
      participants: [],
      groups: [],
      rounds: [],
      schedule: { group: null, matches: [] },
      groupSize: 4,
      autoGenerate: true,
      seededPlayers: [],
    });
    setSelectedPlayers([]);
    setPairPlayers([]);
    setSearch('');
  };

  const Step1 = () => {
    const categories = formData.sport === 'Tenis'
      ? ['A', 'B', 'C', 'D', 'E']
      : ['Séptima', 'Sexta', 'Quinta', 'Cuarta', 'Tercera', 'Segunda', 'Primera'];

    return (
      <Stack
        spacing={3}
        sx={{
          maxWidth: '90%',
          width: { xs: '100%', sm: 400 },
          mx: 'auto',
          bgcolor: '#ffffff',
          p: 3,
          borderRadius: 2,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        }}
      >
        <TextField
          label="Nombre del Torneo *"
          value={name}
          onChange={handleNameChange}
          fullWidth
          variant="outlined"
        />
        <FormControl fullWidth variant="outlined">
          <InputLabel id="club-label">Club</InputLabel>
          <Select
            labelId="club-label"
            id="club"
            value={formData.clubId}
            label="Club"
            onChange={(e) => setFormData({ ...formData, clubId: e.target.value })}
          >
            <MenuItem value="">Ninguno</MenuItem>
            {clubs.map(club => (
              <MenuItem key={club._id} value={club._id}>{club.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl fullWidth variant="outlined">
          <InputLabel id="tournament-type-label">Tipo de Torneo</InputLabel>
          <Select
            labelId="tournament-type-label"
            id="tournament-type"
            value={formData.type}
            label="Tipo de Torneo"
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
          >
            <MenuItem value="RoundRobin">Round Robin</MenuItem>
            <MenuItem value="Eliminatorio">Eliminatorio</MenuItem>
          </Select>
        </FormControl>
        <FormControl fullWidth variant="outlined">
          <InputLabel id="sport-label">Deporte</InputLabel>
          <Select
            labelId="sport-label"
            id="sport"
            value={formData.sport}
            label="Deporte"
            onChange={(e) => setFormData({ ...formData, sport: e.target.value, category: '' })}
          >
            <MenuItem value="Tenis">Tenis</MenuItem>
            <MenuItem value="Pádel">Pádel</MenuItem>
          </Select>
        </FormControl>
        <FormControl fullWidth variant="outlined">
          <InputLabel id="category-label">Categoría *</InputLabel>
          <Select
            labelId="category-label"
            id="category"
            value={formData.category}
            label="Categoría"
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          >
            {categories.map(cat => (
              <MenuItem key={cat} value={cat}>{cat}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl fullWidth variant="outlined">
          <InputLabel id="format-mode-label">Modalidad</InputLabel>
          <Select
            labelId="format-mode-label"
            id="format-mode"
            value={formData.format.mode}
            label="Modalidad"
            onChange={(e) => setFormData({ ...formData, format: { ...formData.format, mode: e.target.value }, participants: [] })}
          >
            <MenuItem value="Singles">Singles</MenuItem>
            <MenuItem value="Dobles">Dobles</MenuItem>
          </Select>
        </FormControl>
        <FormControl fullWidth variant="outlined">
          <InputLabel id="sets-label">Sets por Partido</InputLabel>
          <Select
            labelId="sets-label"
            id="sets"
            value={formData.format.sets}
            label="Sets por Partido"
            onChange={(e) => setFormData({ ...formData, format: { ...formData.format, sets: e.target.value } })}
          >
            <MenuItem value={1}>1 Set</MenuItem>
            <MenuItem value={2}>2 Sets</MenuItem>
          </Select>
        </FormControl>
      </Stack>
    );
  };

  const Step2 = () => {
    const handleAddPlayer = (playerId) => {
      const idAsString = String(playerId);
      if (formData.format.mode === 'Singles') {
        if (selectedPlayers.includes(idAsString)) {
          addNotification('Jugador ya seleccionado', 'error');
          return;
        }
        setSelectedPlayers(prev => [...prev, idAsString]);
      } else {
        if (pairPlayers.length >= 2) {
          addNotification('Solo puedes seleccionar 2 jugadores para formar una pareja', 'error');
          return;
        }
        if (pairPlayers.includes(idAsString) || formData.participants.some(p => p.player1 === idAsString || p.player2 === idAsString)) {
          addNotification('Jugador ya seleccionado o en una pareja', 'error');
          return;
        }
        setPairPlayers(prev => [...prev, idAsString]);
      }
    };

    const addPair = () => {
      if (pairPlayers.length !== 2) {
        addNotification('Selecciona exactamente 2 jugadores para formar una pareja', 'error');
        return;
      }
      if (pairPlayers[0] === pairPlayers[1]) {
        addNotification('No puedes seleccionar al mismo jugador dos veces', 'error');
        return;
      }
      if (formData.participants.some(p => p.player1 === pairPlayers[0] || p.player2 === pairPlayers[0] || p.player1 === pairPlayers[1] || p.player2 === pairPlayers[1])) {
        addNotification('Uno o ambos jugadores ya están en una pareja', 'error');
        return;
      }
      setFormData(prev => ({
        ...prev,
        participants: [...prev.participants, { player1: pairPlayers[0], player2: pairPlayers[1], seed: false }],
      }));
      setPairPlayers([]);
    };

    const removeParticipant = (playerId) => {
      setSelectedPlayers(prev => prev.filter(id => id !== playerId));
    };

    const removePair = (pair) => {
      setFormData(prev => ({
        ...prev,
        participants: prev.participants.filter(p => !(p.player1 === pair.player1 && p.player2 === pair.player2)),
      }));
    };

    const handleAddNewPlayer = (newPlayer) => {
      const normalizedPlayer = { ...newPlayer, _id: String(newPlayer._id) };
      setLocalPlayers(prev => [...prev, normalizedPlayer]);
      if (formData.format.mode === 'Singles') {
        setSelectedPlayers(prev => [...prev, normalizedPlayer._id]);
      }
      setNewPlayerDialogOpen(false);
    };

    const filteredPlayers = localPlayers.filter(player => {
      const fullName = `${player.firstName} ${player.lastName}`.toLowerCase();
      return fullName.includes(search.toLowerCase());
    });

    const handleSeededPlayersChange = (event) => {
      const selected = event.target.value;
      if (selected.length > 6) {
        addNotification('Solo puedes seleccionar hasta 6 cabezas de serie', 'error');
        return;
      }
      setFormData({ ...formData, seededPlayers: selected });
    };

    return (
      <Stack
        spacing={3}
        sx={{
          maxWidth: '90%',
          width: { xs: '100%', sm: 600 },
          mx: 'auto',
          bgcolor: '#ffffff',
          p: 3,
          borderRadius: 2,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        }}
      >
        <TextField
          id="search-players"
          label="Buscar Jugadores"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          fullWidth
          variant="outlined"
        />
        <Typography variant="subtitle1">Jugadores Disponibles</Typography>
        <Box sx={{ maxHeight: '30vh', overflowY: 'auto', border: '1px solid #e0e0e0', borderRadius: 2 }}>
          {filteredPlayers.map(player => (
            <Box key={player._id} sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
              <Typography>{`${player.firstName} ${player.lastName}`}</Typography>
              <Button
                variant="contained"
                onClick={() => handleAddPlayer(player._id)}
                disabled={
                  (formData.format.mode === 'Singles' && selectedPlayers.includes(String(player._id))) ||
                  (formData.format.mode === 'Dobles' &&
                    (pairPlayers.includes(String(player._id)) ||
                      formData.participants.some(p => p.player1 === String(player._id) || p.player2 === String(player._id))))
                }
              >
                Agregar
              </Button>
            </Box>
          ))}
        </Box>
        <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setNewPlayerDialogOpen(true)}>
          Agregar Jugador
        </Button>
        {formData.format.mode === 'Dobles' && (
          <>
            <Button variant="contained" onClick={addPair} disabled={pairPlayers.length !== 2}>
              Formar Pareja
            </Button>
            <Typography variant="subtitle1">Parejas Seleccionadas</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {formData.participants.map((pair, idx) => (
                <Chip
                  key={idx}
                  label={`${localPlayers.find(p => p._id === pair.player1)?.firstName} / ${localPlayers.find(p => p._id === pair.player2)?.firstName}`}
                  onDelete={() => removePair(pair)}
                />
              ))}
            </Box>
          </>
        )}
        {formData.format.mode === 'Singles' && (
          <>
            <Typography variant="subtitle1">Jugadores Seleccionados</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {selectedPlayers.map(playerId => (
                <Chip
                  key={playerId}
                  label={`${localPlayers.find(p => p._id === playerId)?.firstName} ${localPlayers.find(p => p._id === playerId)?.lastName}`}
                  onDelete={() => removeParticipant(playerId)}
                />
              ))}
            </Box>
          </>
        )}
        <FormControl fullWidth variant="outlined">
          <InputLabel id="seeded-players-label">Cabezas de Serie (hasta 6)</InputLabel>
          <Select
            labelId="seeded-players-label"
            id="seeded-players"
            multiple
            value={formData.seededPlayers}
            onChange={handleSeededPlayersChange}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((value) => (
                  <Chip key={value} label={localPlayers.find(p => p._id === value)?.firstName} />
                ))}
              </Box>
            )}
          >
            {localPlayers.map((player) => (
              <MenuItem key={player._id} value={player._id}>
                <Checkbox checked={formData.seededPlayers.indexOf(player._id) > -1} />
                <ListItemText primary={`${player.firstName} ${player.lastName}`} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <NewPlayerDialog open={newPlayerDialogOpen} onClose={() => setNewPlayerDialogOpen(false)} onAddPlayer={handleAddNewPlayer} />
      </Stack>
    );
  };

  const Step3 = () => {
    const generateAutoGroups = () => {
      const seeded = formData.seededPlayers.map(id => ({ player1: id, seed: true }));
      const unseeded = formData.participants.filter(p => !formData.seededPlayers.includes(p.player1)).sort(() => 0.5 - Math.random());
      const participants = [...seeded, ...unseeded];
      const groups = [];
      for (let i = 0; i < participants.length; i += formData.groupSize) {
        const groupPlayers = participants.slice(i, i + formData.groupSize);
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
      const seeded = formData.seededPlayers.map(id => ({ player1: id, seed: true }));
      const unseeded = formData.participants.filter(p => !formData.seededPlayers.includes(p.player1)).sort(() => 0.5 - Math.random());
      const participants = [...seeded, ...unseeded];
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
      <Stack
        spacing={3}
        sx={{
          maxWidth: '90%',
          width: { xs: '100%', sm: 600 },
          mx: 'auto',
          bgcolor: '#ffffff',
          p: 3,
          borderRadius: 2,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        }}
      >
        <FormControl fullWidth variant="outlined">
          <InputLabel id="group-size-label">Tamaño de Grupos (Round Robin)</InputLabel>
          <Select
            labelId="group-size-label"
            id="group-size"
            value={formData.groupSize}
            label="Tamaño de Grupos (Round Robin)"
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
          variant="outlined"
          InputLabelProps={{ shrink: true }}
        />
        <Button
          variant="contained"
          onClick={() =>
            setFormData({
              ...formData,
              groups: formData.type === 'RoundRobin' ? generateAutoGroups() : [],
              rounds: formData.type === 'Eliminatorio' ? generateAutoRounds() : [],
            })
          }
        >
          Generar Vista Previa
        </Button>
        {(formData.groups.length > 0 || formData.rounds.length > 0) && (
          <Box>
            {formData.type === 'RoundRobin'
              ? formData.groups.map(group => (
                  <Box key={group.name} sx={{ mb: 2 }}>
                    <Typography variant="subtitle1">{group.name}</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {group.players.map(p => (
                        <Chip
                          key={p.player1}
                          label={
                            formData.format.mode === 'Singles'
                              ? `${localPlayers.find(pl => pl._id === p.player1)?.firstName} ${localPlayers.find(pl => pl._id === p.player1)?.lastName}`
                              : `${localPlayers.find(pl => pl._id === p.player1)?.firstName} / ${localPlayers.find(pl => pl._id === p.player2)?.firstName}`
                          }
                        />
                      ))}
                    </Box>
                  </Box>
                ))
              : formData.rounds.map(round => (
                  <Box key={round.round} sx={{ mb: 2 }}>
                    <Typography variant="subtitle1">Ronda {round.round}</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {round.matches.map((m, idx) => (
                        <Chip
                          key={idx}
                          label={
                            formData.format.mode === 'Singles'
                              ? `${localPlayers.find(p => p._id === m.player1.player1)?.firstName || 'BYE'} vs ${m.player2.name || localPlayers.find(p => p._id === m.player2.player1)?.firstName || 'BYE'}`
                              : `${localPlayers.find(p => p._id === m.player1.player1)?.firstName} / ${localPlayers.find(p => p._id === m.player1.player2)?.firstName || 'BYE'} vs ${m.player2.name || localPlayers.find(p => p._id === m.player2.player1)?.firstName} / ${localPlayers.find(p => p._id === m.player2.player2)?.firstName || 'BYE'}`
                          }
                        />
                      ))}
                    </Box>
                  </Box>
                ))}
          </Box>
        )}
      </Stack>
    );
  };

  const steps = ['Datos Básicos', 'Participantes', 'Grupos/Rondas'];

  return (
    <Box sx={{ p: { xs: 3, sm: 4 }, maxWidth: '100%', mx: 'auto', bgcolor: '#f5f5f5', minHeight: '100vh' }}>
      <Typography variant="h5" gutterBottom sx={{ fontSize: { xs: '1.8rem', sm: '2rem' }, color: '#333', fontWeight: 600, textAlign: 'center' }}>
        Crear Torneo
      </Typography>
      <Stepper activeStep={step} orientation={isMobile ? 'vertical' : 'horizontal'} sx={{ mb: 3, bgcolor: '#ffffff', p: 2, borderRadius: 2, boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' }}>
        {steps.map(label => (
          <Step key={label}>
            <StepLabel sx={{ fontSize: { xs: '0.9rem', sm: '1rem' }, color: '#333' }}>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      {step === 0 && <Step1 />}
      {step === 1 && <Step2 />}
      {step === 2 && <Step3 />}
      <Stack direction="row" spacing={2} justifyContent="space-between" sx={{ mt: 3, px: 2 }}>
        {step > 0 && (
          <Button variant="outlined" onClick={() => setStep(step - 1)} sx={{ borderColor: '#d32f2f', color: '#d32f2f', fontSize: { xs: '0.9rem', sm: '1rem' }, py: 1, px: 3, '&:hover': { borderColor: '#b71c1c', bgcolor: '#ffebee' } }}>
            Atrás
          </Button>
        )}
        {step < 2 && (
          <Button variant="contained" onClick={handleNext} sx={{ bgcolor: '#1976d2', color: '#fff', fontSize: { xs: '0.9rem', sm: '1rem' }, py: 1, px: 3, '&:hover': { bgcolor: '#1565c0' } }}>
            Siguiente
          </Button>
        )}
        {step === 2 && (
          <>
            <Button variant="contained" onClick={() => handleSubmit(false)} sx={{ bgcolor: '#388e3c', color: '#fff', fontSize: { xs: '0.9rem', sm: '1rem' }, py: 1, px: 3, '&:hover': { bgcolor: '#2e7d32' } }}>
              Iniciar Torneo
            </Button>
            <Button variant="outlined" onClick={() => handleSubmit(true)} sx={{ borderColor: '#1976d2', color: '#1976d2', fontSize: { xs: '0.9rem', sm: '1rem' }, py: 1, px: 3, '&:hover': { borderColor: '#1565c0', bgcolor: '#e3f2fd' } }}>
              Guardar Borrador
            </Button>
          </>
        )}
      </Stack>
    </Box>
  );
};

export default TournamentForm;