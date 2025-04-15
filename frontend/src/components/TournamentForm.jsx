import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { Box, Stepper, Step, StepLabel, Button, Typography, FormControl, InputLabel, Select, MenuItem, Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

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
      const response = await axios.post('https://padnis.onrender.com/api/players', {
        firstName,
        lastName,
        phone: phone || undefined,
        email: email || undefined,
        dominantHand: 'right',
        racketBrand: '',
        matches: [],
      }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
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
  const [formData, setFormData] = useState({
    name: '',
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
  });
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [pairPlayers, setPairPlayers] = useState([]);
  const [search, setSearch] = useState('');
  const [newPlayerDialogOpen, setNewPlayerDialogOpen] = useState(false);
  const [localPlayers, setLocalPlayers] = useState([]);
  const [clubs, setClubs] = useState([]);
  const { user } = useAuth();
  const { addNotification } = useNotification();

  useEffect(() => {
    const normalizedPlayers = players.map(p => ({ ...p, _id: String(p._id) }));
    setLocalPlayers(normalizedPlayers);
    console.log('Local Players:', normalizedPlayers);
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
      console.error('Error fetching clubs:', error);
    }
  };

  const handleNext = () => {
    if (step === 0) {
      if (!formData.name) {
        addNotification('El nombre del torneo es obligatorio', 'error');
        return;
      }
      if (!formData.clubId) {
        addNotification('Selecciona un club', 'error');
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
          participants: selectedPlayers.map(id => ({ player1: id, player2: null, seed: false })),
        }));
      }
    }
    setStep(step + 1);
  };

  const handleSubmit = async (draft = true) => {
    try {
      const tournament = {
        name: formData.name,
        clubId: formData.clubId,
        type: formData.type,
        sport: formData.sport,
        category: formData.category,
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
      name: '',
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
      <Box sx={{ maxWidth: 400, mx: 'auto' }}>
        <TextField
          label="Nombre del Torneo *"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          fullWidth
          sx={{ mt: 2 }}
        />
        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel id="club-label">Club *</InputLabel>
          <Select
            labelId="club-label"
            id="club"
            value={formData.clubId}
            label="Club"
            onChange={(e) => setFormData({ ...formData, clubId: e.target.value })}
          >
            {clubs.map(club => (
              <MenuItem key={club._id} value={club._id}>{club.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl fullWidth sx={{ mt: 2 }}>
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
        <FormControl fullWidth sx={{ mt: 2 }}>
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
        <FormControl fullWidth sx={{ mt: 2 }}>
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
        <FormControl fullWidth sx={{ mt: 2 }}>
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
        <FormControl fullWidth sx={{ mt: 2 }}>
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
      </Box>
    );
  };

  const Step2 = () => {
    const handleAddPlayer = (playerId) => {
      const idAsString = String(playerId);
      console.log('Adding player with ID:', idAsString);
      if (formData.format.mode === 'Singles') {
        if (selectedPlayers.includes(idAsString)) {
          addNotification('Jugador ya seleccionado', 'error');
          return;
        }
        setSelectedPlayers(prev => {
          const newSelected = [...prev, idAsString];
          console.log('Updated selectedPlayers:', newSelected);
          return newSelected;
        });
      } else {
        if (pairPlayers.length >= 2) {
          addNotification('Solo puedes seleccionar 2 jugadores para formar una pareja', 'error');
          return;
        }
        if (pairPlayers.includes(idAsString) || formData.participants.some(p => p.player1 === idAsString || p.player2 === idAsString)) {
          addNotification('Jugador ya seleccionado o en una pareja', 'error');
          return;
        }
        setPairPlayers(prev => {
          const newPair = [...prev, idAsString];
          console.log('Updated pairPlayers:', newPair);
          return newPair;
        });
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
      const idAsString = String(playerId);
      setSelectedPlayers(prev => prev.filter(id => id !== idAsString));
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

    return (
      <Box sx={{ maxWidth: 600, mx: 'auto' }}>
        <TextField
          id="search-players"
          label="Buscar Jugadores"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          fullWidth
          sx={{ mt: 2 }}
        />
        <Typography variant="subtitle1" sx={{ mt: 2 }}>Jugadores Disponibles</Typography>
        <Box sx={{ maxHeight: '30vh', overflowY: 'auto', border: '1px solid #e0e0e0' }}>
          {filteredPlayers.map(player => (
            <Box
              key={player._id}
              sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, borderBottom: '1px solid #e0e0e0' }}
            >
              <Typography>{`${player.firstName} ${player.lastName}`}</Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => handleAddPlayer(player._id)}
                disabled={
                  (formData.format.mode === 'Singles' && selectedPlayers.includes(String(player._id))) ||
                  (formData.format.mode === 'Dobles' && (pairPlayers.includes(String(player._id)) || formData.participants.some(p => p.player1 === String(player._id) || p.player2 === String(player._id))))
                }
              >
                Agregar
              </Button>
            </Box>
          ))}
        </Box>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => setNewPlayerDialogOpen(true)}
          sx={{ mt: 2 }}
        >
          Agregar Jugador
        </Button>
        {formData.format.mode === 'Dobles' && (
          <>
            <Button
              variant="contained"
              onClick={addPair}
              disabled={pairPlayers.length !== 2}
              sx={{ mt: 2, ml: 2 }}
            >
              Formar Pareja
            </Button>
            <Typography variant="subtitle1" sx={{ mt: 2 }}>Parejas Seleccionadas</Typography>
            <Box sx={{ mt: 1 }}>
              {formData.participants.map((pair, idx) => (
                <Chip
                  key={idx}
                  label={`${localPlayers.find(p => p._id === pair.player1)?.firstName} ${localPlayers.find(p => p._id === pair.player1)?.lastName} / ${localPlayers.find(p => p._id === pair.player2)?.firstName} ${localPlayers.find(p => p._id === pair.player2)?.lastName}`}
                  onDelete={() => removePair(pair)}
                  sx={{ m: 0.5 }}
                />
              ))}
              {pairPlayers.map(playerId => (
                <Chip
                  key={playerId}
                  label={`${localPlayers.find(p => p._id === playerId)?.firstName} ${localPlayers.find(p => p._id === playerId)?.lastName} (en espera)`}
                  sx={{ m: 0.5, bgcolor: 'grey.300' }}
                />
              ))}
            </Box>
          </>
        )}
        {formData.format.mode === 'Singles' && (
          <>
            <Typography variant="subtitle1" sx={{ mt: 2 }}>Jugadores Seleccionados</Typography>
            <Box sx={{ mt: 1 }}>
              {selectedPlayers.map(playerId => (
                <Chip
                  key={playerId}
                  label={`${localPlayers.find(p => p._id === playerId)?.firstName} ${localPlayers.find(p => p._id === playerId)?.lastName}`}
                  onDelete={() => removeParticipant(playerId)}
                  sx={{ m: 0.5 }}
                />
              ))}
            </Box>
          </>
        )}
        <NewPlayerDialog
          open={newPlayerDialogOpen}
          onClose={() => setNewPlayerDialogOpen(false)}
          onAddPlayer={handleAddNewPlayer}
        />
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
          id="schedule-group"
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
                <Box sx={{ display: 'flex', flexWrap: 'wrap' }}>
                  {group.players.map(p => (
                    <Chip
                      key={p.player1}
                      label={
                        formData.format.mode === 'Singles'
                          ? `${localPlayers.find(pl => pl._id === p.player1)?.firstName} ${localPlayers.find(pl => pl._id === p.player1)?.lastName}`
                          : `${localPlayers.find(pl => pl._id === p.player1)?.firstName} ${localPlayers.find(pl => pl._id === p.player1)?.lastName} / ${localPlayers.find(pl => pl._id === p.player2)?.firstName} ${localPlayers.find(pl => pl._id === p.player2)?.lastName}`
                      }
                      sx={{ m: 0.5 }}
                    />
                  ))}
                </Box>
              </Box>
            )) : formData.rounds.map(round => (
              <Box key={round.round} sx={{ mb: 2 }}>
                <Typography variant="subtitle1">Ronda {round.round}</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap' }}>
                  {round.matches.map((m, idx) => (
                    <Chip
                      key={idx}
                      label={
                        formData.format.mode === 'Singles'
                          ? `${localPlayers.find(p => p._id === m.player1.player1)?.firstName || 'BYE'} vs ${m.player2.name || localPlayers.find(p => p._id === m.player2.player1)?.firstName || 'BYE'}`
                          : `${localPlayers.find(p => p._id === m.player1.player1)?.firstName} / ${localPlayers.find(p => p._id === m.player1.player2)?.firstName || 'BYE'} vs ${m.player2.name || localPlayers.find(p => p._id === m.player2.player1)?.firstName} / ${localPlayers.find(p => p._id === m.player2.player2)?.firstName || 'BYE'}`
                      }
                      sx={{ m: 0.5 }}
                    />
                  ))}
                </Box>
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