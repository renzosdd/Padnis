import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
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
  CircularProgress,
  Alert,
  useMediaQuery,
  useTheme,
  FormHelperText,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

// New Player Dialog Component
const NewPlayerDialog = ({ open, onClose, onAddPlayer }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const { addNotification } = useNotification();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const validate = () => {
    const newErrors = {};
    if (!firstName.trim()) newErrors.firstName = 'Nombre es obligatorio';
    if (!lastName.trim()) newErrors.lastName = 'Apellido es obligatorio';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddPlayer = async () => {
    if (!validate()) return;
    setIsLoading(true);
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
      onClose();
    } catch (error) {
      addNotification(error.response?.data?.message || 'Error al crear jugador', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="new-player-dialog-title">
      <DialogTitle id="new-player-dialog-title" sx={{ bgcolor: '#1976d2', color: '#fff', fontSize: isMobile ? '1rem' : '1.25rem' }}>
        Crear Nuevo Jugador
      </DialogTitle>
      <DialogContent sx={{ p: isMobile ? 2 : 3, bgcolor: '#f5f5f5' }}>
        <TextField
          label="Nombre *"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          fullWidth
          error={!!errors.firstName}
          helperText={errors.firstName}
          sx={{ mt: 2 }}
          size={isMobile ? 'small' : 'medium'}
          inputProps={{ 'aria-required': true }}
        />
        <TextField
          label="Apellido *"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          fullWidth
          error={!!errors.lastName}
          helperText={errors.lastName}
          sx={{ mt: 2 }}
          size={isMobile ? 'small' : 'medium'}
          inputProps={{ 'aria-required': true }}
        />
        <TextField
          label="Teléfono"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          fullWidth
          sx={{ mt: 2 }}
          size={isMobile ? 'small' : 'medium'}
        />
        <TextField
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          fullWidth
          sx={{ mt: 2 }}
          size={isMobile ? 'small' : 'medium'}
        />
      </DialogContent>
      <DialogActions sx={{ p: isMobile ? 2 : 3, bgcolor: '#f5f5f5' }}>
        <Button
          onClick={onClose}
          disabled={isLoading}
          sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}
          aria-label="Cancelar creación de jugador"
        >
          Cancelar
        </Button>
        <Button
          onClick={handleAddPlayer}
          variant="contained"
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null}
          sx={{
            bgcolor: '#1976d2',
            ':hover': { bgcolor: '#1565c0' },
            fontSize: isMobile ? '0.75rem' : '0.875rem',
            py: isMobile ? 1 : 1.5,
            minWidth: isMobile ? 80 : 100,
          }}
          aria-label="Crear nuevo jugador"
        >
          {isLoading ? 'Creando...' : 'Crear'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Step 1: Basic Data
const Step1 = ({ name, formData, clubs, errors, onNameChange, onFormDataChange, isMobile }) => {
  const categories = formData.sport === 'Tenis' ? ['A', 'B', 'C', 'D', 'E'] : ['Séptima', 'Sexta', 'Quinta', 'Cuarta', 'Tercera', 'Segunda', 'Primera'];

  return (
    <Stack
      spacing={2}
      sx={{
        maxWidth: isMobile ? '100%' : 600,
        width: '100%',
        mx: 'auto',
        bgcolor: '#fff',
        p: isMobile ? 2 : 3,
        borderRadius: 2,
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      }}
    >
      <TextField
        label="Nombre del Torneo *"
        value={name}
        onChange={onNameChange}
        fullWidth
        error={!!errors.name}
        helperText={errors.name}
        size={isMobile ? 'small' : 'medium'}
        inputProps={{ 'aria-required': true }}
      />
      <FormControl fullWidth error={!!errors.clubId}>
        <InputLabel id="club-label">Club</InputLabel>
        <Select
          labelId="club-label"
          value={formData.clubId}
          label="Club"
          onChange={(e) => onFormDataChange({ clubId: e.target.value })}
          size={isMobile ? 'small' : 'medium'}
        >
          <MenuItem value="">Ninguno</MenuItem>
          {clubs.map((club) => (
            <MenuItem key={club._id} value={club._id}>
              {club.name}
            </MenuItem>
          ))}
        </Select>
        {errors.clubId && <FormHelperText>{errors.clubId}</FormHelperText>}
      </FormControl>
      <FormControl fullWidth error={!!errors.type}>
        <InputLabel id="tournament-type-label">Tipo de Torneo *</InputLabel>
        <Select
          labelId="tournament-type-label"
          value={formData.type}
          label="Tipo de Torneo"
          onChange={(e) => onFormDataChange({ type: e.target.value })}
          size={isMobile ? 'small' : 'medium'}
          inputProps={{ 'aria-required': true }}
        >
          <MenuItem value="RoundRobin">Round Robin</MenuItem>
          <MenuItem value="Eliminatorio">Eliminatorio</MenuItem>
        </Select>
        {errors.type && <FormHelperText>{errors.type}</FormHelperText>}
      </FormControl>
      <FormControl fullWidth error={!!errors.sport}>
        <InputLabel id="sport-label">Deporte *</InputLabel>
        <Select
          labelId="sport-label"
          value={formData.sport}
          label="Deporte"
          onChange={(e) => onFormDataChange({ sport: e.target.value, category: '' })}
          size={isMobile ? 'small' : 'medium'}
          inputProps={{ 'aria-required': true }}
        >
          <MenuItem value="Tenis">Tenis</MenuItem>
          <MenuItem value="Pádel">Pádel</MenuItem>
        </Select>
        {errors.sport && <FormHelperText>{errors.sport}</FormHelperText>}
      </FormControl>
      <FormControl fullWidth error={!!errors.category}>
        <InputLabel id="category-label">Categoría *</InputLabel>
        <Select
          labelId="category-label"
          value={formData.category}
          label="Categoría"
          onChange={(e) => onFormDataChange({ category: e.target.value })}
          size={isMobile ? 'small' : 'medium'}
          inputProps={{ 'aria-required': true }}
        >
          {categories.map((cat) => (
            <MenuItem key={cat} value={cat}>
              {cat}
            </MenuItem>
          ))}
        </Select>
        {errors.category && <FormHelperText>{errors.category}</FormHelperText>}
      </FormControl>
      <FormControl fullWidth error={!!errors.format}>
        <InputLabel id="format-mode-label">Modalidad *</InputLabel>
        <Select
          labelId="format-mode-label"
          value={formData.format.mode}
          label="Modalidad"
          onChange={(e) => onFormDataChange({ format: { ...formData.format, mode: e.target.value }, participants: [] })}
          size={isMobile ? 'small' : 'medium'}
          inputProps={{ 'aria-required': true }}
        >
          <MenuItem value="Singles">Singles</MenuItem>
          <MenuItem value="Dobles">Dobles</MenuItem>
        </Select>
        {errors.format && <FormHelperText>{errors.format}</FormHelperText>}
      </FormControl>
      <FormControl fullWidth>
        <InputLabel id="sets-label">Sets por Partido *</InputLabel>
        <Select
          labelId="sets-label"
          value={formData.format.sets}
          label="Sets por Partido"
          onChange={(e) => onFormDataChange({ format: { ...formData.format, sets: Number(e.target.value) } })}
          size={isMobile ? 'small' : 'medium'}
          inputProps={{ 'aria-required': true }}
        >
          <MenuItem value={1}>1 Set</MenuItem>
          <MenuItem value={2}>2 Sets</MenuItem>
        </Select>
      </FormControl>
      <FormControl fullWidth>
        <InputLabel id="players-per-group-label">Jugadores que pasan por grupo *</InputLabel>
        <Select
          labelId="players-per-group-label"
          value={formData.playersPerGroupToAdvance}
          label="Jugadores que pasan por grupo"
          onChange={(e) => onFormDataChange({ playersPerGroupToAdvance: Number(e.target.value) })}
          disabled={formData.type !== 'RoundRobin'}
          size={isMobile ? 'small' : 'medium'}
          inputProps={{ 'aria-required': true }}
        >
          <MenuItem value={1}>1</MenuItem>
          <MenuItem value={2}>2</MenuItem>
          <MenuItem value={3}>3</MenuItem>
        </Select>
      </FormControl>
    </Stack>
  );
};

// Step 2: Participants
const Step2 = ({
  formData,
  localPlayers,
  selectedPlayers,
  pairPlayers,
  search,
  errors,
  onFormDataChange,
  onSelectedPlayersChange,
  onPairPlayersChange,
  onSearchChange,
  onNewPlayerDialogOpen,
  isMobile,
}) => {
  const { addNotification } = useNotification();

  const filteredPlayers = useMemo(
    () => localPlayers.filter((player) => `${player.firstName} ${player.lastName}`.toLowerCase().includes(search.toLowerCase())),
    [localPlayers, search]
  );

  const playerMap = useMemo(
    () => new Map(localPlayers.map((player) => [player._id, player])),
    [localPlayers]
  );

  const handleAddPlayer = (playerId) => {
    if (formData.format.mode === 'Singles') {
      if (selectedPlayers.includes(playerId)) {
        addNotification('Jugador ya seleccionado', 'error');
        return;
      }
      onSelectedPlayersChange([...selectedPlayers, playerId]);
    } else {
      if (pairPlayers.length >= 2) {
        addNotification('Solo puedes seleccionar 2 jugadores para formar una pareja', 'error');
        return;
      }
      if (pairPlayers.includes(playerId) || formData.participants.some((p) => p.player1 === playerId || p.player2 === playerId)) {
        addNotification('Jugador ya seleccionado o en una pareja', 'error');
        return;
      }
      onPairPlayersChange([...pairPlayers, playerId]);
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
    if (formData.participants.some((p) => p.player1 === pairPlayers[0] || p.player2 === pairPlayers[0] || p.player1 === pairPlayers[1] || p.player2 === pairPlayers[1])) {
      addNotification('Uno o ambos jugadores ya están en una pareja', 'error');
      return;
    }
    onFormDataChange({
      participants: [...formData.participants, { player1: pairPlayers[0], player2: pairPlayers[1], seed: false }],
    });
    onPairPlayersChange([]);
  };

  const removeParticipant = (playerId) => {
    onSelectedPlayersChange(selectedPlayers.filter((id) => id !== playerId));
  };

  const removePair = (pair) => {
    onFormDataChange({
      participants: formData.participants.filter((p) => !(p.player1 === pair.player1 && p.player2 === pair.player2)),
    });
  };

  const handleSeededPlayersChange = (event) => {
    const selected = event.target.value;
    if (selected.length > 6) {
      addNotification('Solo puedes seleccionar hasta 6 cabezas de serie', 'error');
      return;
    }
    onFormDataChange({ seededPlayers: selected });
  };

  return (
    <Stack
      spacing={2}
      sx={{
        maxWidth: isMobile ? '100%' : 600,
        width: '100%',
        mx: 'auto',
        bgcolor: '#fff',
        p: isMobile ? 2 : 3,
        borderRadius: 2,
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      }}
    >
      {errors.participants && <Alert severity="error">{errors.participants}</Alert>}
      <TextField
        label="Buscar Jugadores"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        fullWidth
        size={isMobile ? 'small' : 'medium'}
        inputProps={{ 'aria-label': 'Buscar jugadores disponibles' }}
      />
      <Typography variant="subtitle1" color="#1976d2" fontWeight="bold">
        Jugadores Disponibles
      </Typography>
      <Box sx={{ maxHeight: isMobile ? '40vh' : '50vh', overflowY: 'auto', border: '1px solid #e0e0e0', borderRadius: 2, p: 1 }}>
        {filteredPlayers.map((player) => (
          <Box key={player._id} sx={{ display: 'flex', justifyContent: 'space-between', py: 1, alignItems: 'center' }}>
            <Typography sx={{ fontSize: isMobile ? '0.875rem' : '1rem' }}>{`${player.firstName} ${player.lastName}`}</Typography>
            <Button
              variant="contained"
              onClick={() => handleAddPlayer(player._id)}
              disabled={
                (formData.format.mode === 'Singles' && selectedPlayers.includes(player._id)) ||
                (formData.format.mode === 'Dobles' &&
                  (pairPlayers.includes(player._id) || formData.participants.some((p) => p.player1 === player._id || p.player2 === player._id)))
              }
              sx={{
                bgcolor: '#1976d2',
                ':hover': { bgcolor: '#1565c0' },
                fontSize: isMobile ? '0.75rem' : '0.875rem',
                py: isMobile ? 0.5 : 1,
                px: isMobile ? 1 : 2,
                minWidth: isMobile ? 80 : 100,
              }}
              aria-label={`Agregar ${player.firstName} ${player.lastName}`}
            >
              Agregar
            </Button>
          </Box>
        ))}
      </Box>
      <Button
        variant="outlined"
        startIcon={<AddIcon />}
        onClick={onNewPlayerDialogOpen}
        fullWidth
        sx={{
          borderColor: '#1976d2',
          color: '#1976d2',
          fontSize: isMobile ? '0.875rem' : '1rem',
          py: isMobile ? 1 : 1.5,
          minHeight: isMobile ? 40 : 48,
          ':hover': { borderColor: '#1565c0', bgcolor: '#e3f2fd' },
        }}
        aria-label="Agregar nuevo jugador"
      >
        Agregar Jugador
      </Button>
      {formData.format.mode === 'Dobles' && (
        <>
          <Button
            variant="contained"
            onClick={addPair}
            disabled={pairPlayers.length !== 2}
            fullWidth
            sx={{
              bgcolor: '#1976d2',
              ':hover': { bgcolor: '#1565c0' },
              fontSize: isMobile ? '0.875rem' : '1rem',
              py: isMobile ? 1 : 1.5,
              minHeight: isMobile ? 40 : 48,
            }}
            aria-label="Formar pareja"
          >
            Formar Pareja
          </Button>
          <Typography variant="subtitle1" color="#1976d2" fontWeight="bold">
            Parejas Seleccionadas
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {formData.participants.map((pair, idx) => (
              <Chip
                key={idx}
                label={`${playerMap.get(pair.player1)?.firstName} / ${playerMap.get(pair.player2)?.firstName || 'N/A'}`}
                onDelete={() => removePair(pair)}
                sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem', height: isMobile ? 28 : 32 }}
                aria-label={`Eliminar pareja ${playerMap.get(pair.player1)?.firstName}`}
              />
            ))}
          </Box>
        </>
      )}
      {formData.format.mode === 'Singles' && (
        <>
          <Typography variant="subtitle1" color="#1976d2" fontWeight="bold">
            Jugadores Seleccionados
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {selectedPlayers.map((playerId) => (
              <Chip
                key={playerId}
                label={`${playerMap.get(playerId)?.firstName} ${playerMap.get(playerId)?.lastName}`}
                onDelete={() => removeParticipant(playerId)}
                sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem', height: isMobile ? 28 : 32 }}
                aria-label={`Eliminar ${playerMap.get(playerId)?.firstName}`}
              />
            ))}
          </Box>
        </>
      )}
      <FormControl fullWidth>
        <InputLabel id="seeded-players-label">Cabezas de Serie (hasta 6)</InputLabel>
        <Select
          labelId="seeded-players-label"
          multiple
          value={formData.seededPlayers}
          onChange={handleSeededPlayersChange}
          renderValue={(selected) => (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {selected.map((value) => (
                <Chip
                  key={value}
                  label={playerMap.get(value)?.firstName}
                  sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem', height: isMobile ? 28 : 32 }}
                />
              ))}
            </Box>
          )}
          size={isMobile ? 'small' : 'medium'}
        >
          {localPlayers.map((player) => (
            <MenuItem key={player._id} value={player._id}>
              <Checkbox checked={formData.seededPlayers.indexOf(player._id) > -1} />
              <ListItemText primary={`${player.firstName} ${player.lastName}`} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Stack>
  );
};

// Step 3: Groups/Rounds
const Step3 = ({ formData, localPlayers, onFormDataChange, isMobile }) => {
  const playerMap = useMemo(
    () => new Map(localPlayers.map((player) => [player._id, player])),
    [localPlayers]
  );

  const generateAutoGroups = useCallback(() => {
    const seeded = formData.seededPlayers.map((id) => ({
      player1: id,
      player2: formData.participants.find((p) => p.player1 === id)?.player2 || null,
      seed: true,
    }));
    const unseeded = formData.participants.filter((p) => !formData.seededPlayers.includes(p.player1)).sort(() => 0.5 - Math.random());
    const participants = [...seeded, ...unseeded];
    const groups = [];
    for (let i = 0; i < participants.length; i += formData.groupSize) {
      const groupPlayers = participants.slice(i, i + formData.groupSize);
      const matches = groupPlayers.flatMap((p1, idx) =>
        groupPlayers.slice(idx + 1).map((p2) => ({
          player1: p1,
          player2: p2,
          result: { sets: [], winner: null },
          date: formData.schedule.group || null,
        }))
      );
      groups.push({ name: `Grupo ${groups.length + 1}`, players: groupPlayers, matches });
    }
    return groups;
  }, [formData.seededPlayers, formData.participants, formData.groupSize, formData.schedule.group]);

  const generateAutoRounds = useCallback(() => {
    const seeded = formData.seededPlayers.map((id) => ({
      player1: id,
      player2: formData.participants.find((p) => p.player1 === id)?.player2 || null,
      seed: true,
    }));
    const unseeded = formData.participants.filter((p) => !formData.seededPlayers.includes(p.player1)).sort(() => 0.5 - Math.random());
    const participants = [...seeded, ...unseeded];
    const totalSlots = Math.pow(2, Math.ceil(Math.log2(participants.length)));
    const byes = totalSlots - participants.length;
    const matches = [];
    for (let i = 0; i < totalSlots / 2; i++) {
      const p1 = i < participants.length ? participants[i] : { player1: null, player2: null, name: 'BYE' };
      const p2 = i < byes ? { player1: null, player2: null, name: 'BYE' } : participants[totalSlots - 1 - i] || { player1: null, player2: null, name: 'BYE' };
      matches.push({
        player1: p1,
        player2: p2,
        result: { sets: [], winner: p1.player1 && !p2.player1 ? { player1: p1.player1, player2: p1.player2 } : null },
        date: formData.schedule.group || null,
      });
    }
    return [{ round: 1, matches }];
  }, [formData.seededPlayers, formData.participants, formData.schedule.group]);

  return (
    <Stack
      spacing={2}
      sx={{
        maxWidth: isMobile ? '100%' : 600,
        width: '100%',
        mx: 'auto',
        bgcolor: '#fff',
        p: isMobile ? 2 : 3,
        borderRadius: 2,
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      }}
    >
      <FormControl fullWidth>
        <InputLabel id="group-size-label">Tamaño de Grupos (Round Robin) *</InputLabel>
        <Select
          labelId="group-size-label"
          value={formData.groupSize}
          label="Tamaño de Grupos (Round Robin)"
          onChange={(e) => onFormDataChange({ groupSize: Number(e.target.value) })}
          disabled={formData.type === 'Eliminatorio'}
          size={isMobile ? 'small' : 'medium'}
          inputProps={{ 'aria-required': true }}
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
        onChange={(e) => onFormDataChange({ schedule: { ...formData.schedule, group: e.target.value || null } })}
        fullWidth
        InputLabelProps={{ shrink: true }}
        size={isMobile ? 'small' : 'medium'}
      />
      <Button
        variant="contained"
        onClick={() =>
          onFormDataChange({
            groups: formData.type === 'RoundRobin' ? generateAutoGroups() : [],
            rounds: formData.type === 'Eliminatorio' ? generateAutoRounds() : [],
          })
        }
        fullWidth
        sx={{
          bgcolor: '#1976d2',
          ':hover': { bgcolor: '#1565c0' },
          fontSize: isMobile ? '0.875rem' : '1rem',
          py: isMobile ? 1 : 1.5,
          minHeight: isMobile ? 40 : 48,
        }}
        aria-label="Generar vista previa"
      >
        Generar Vista Previa
      </Button>
      {(formData.groups.length > 0 || formData.rounds.length > 0) && (
        <Box>
          {formData.type === 'RoundRobin'
            ? formData.groups.map((group) => (
                <Box key={group.name} sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" color="#1976d2" fontWeight="bold">
                    {group.name}
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {group.players.map((p) => (
                      <Chip
                        key={p.player1}
                        label={
                          formData.format.mode === 'Singles'
                            ? `${playerMap.get(p.player1)?.firstName} ${playerMap.get(p.player1)?.lastName}`
                            : `${playerMap.get(p.player1)?.firstName} / ${playerMap.get(p.player2)?.firstName || 'N/A'}`
                        }
                        sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem', height: isMobile ? 28 : 32 }}
                      />
                    ))}
                  </Box>
                </Box>
              ))
            : formData.rounds.map((round) => (
                <Box key={round.round} sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" color="#1976d2" fontWeight="bold">
                    Ronda {round.round}
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {round.matches.map((m, idx) => (
                      <Chip
                        key={idx}
                        label={
                          formData.format.mode === 'Singles'
                            ? `${playerMap.get(m.player1.player1)?.firstName || 'BYE'} vs ${m.player2.name || playerMap.get(m.player2.player1)?.firstName || 'BYE'}`
                            : `${playerMap.get(m.player1.player1)?.firstName || 'BYE'} / ${playerMap.get(m.player1.player2)?.firstName || 'N/A'} vs ${m.player2.name || playerMap.get(m.player2.player1)?.firstName || 'BYE'} / ${playerMap.get(m.player2.player2)?.firstName || 'N/A'}`
                        }
                        sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem', height: isMobile ? 28 : 32 }}
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

// Main Tournament Form Component
const TournamentForm = ({ players, onCreateTournament }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [formData, setFormData] = useState({
    clubId: '',
    type: 'RoundRobin',
    sport: 'Tenis',
    category: '',
    format: { mode: 'Singles', sets: 2, gamesPerSet: 6, tiebreakSet: 6, tiebreakMatch: 10 },
    participants: [],
    groups: [],
    rounds: [],
    schedule: { group: null, matches: [] },
    groupSize: 4,
    autoGenerate: true,
    seededPlayers: [],
    playersPerGroupToAdvance: 2,
  });
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [pairPlayers, setPairPlayers] = useState([]);
  const [search, setSearch] = useState('');
  const [newPlayerDialogOpen, setNewPlayerDialogOpen] = useState(false);
  const [localPlayers, setLocalPlayers] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const { user } = useAuth();
  const { addNotification } = useNotification();

  useEffect(() => {
    const normalizedPlayers = players.map((p) => ({ ...p, _id: String(p._id) }));
    setLocalPlayers(normalizedPlayers);
    fetchClubs();
  }, [players]);

  const fetchClubs = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get('https://padnis.onrender.com/api/clubs', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setClubs(response.data);
    } catch (error) {
      addNotification('Error al cargar clubes: ' + (error.response?.data?.message || error.message), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const validateStep = (currentStep) => {
    const newErrors = {};
    if (currentStep === 0) {
      if (!name.trim()) newErrors.name = 'El nombre del torneo es obligatorio';
      if (!formData.type) newErrors.type = 'Selecciona un tipo de torneo';
      if (!formData.sport) newErrors.sport = 'Selecciona un deporte';
      if (!formData.category) newErrors.category = 'Selecciona una categoría';
      if (!formData.format.mode) newErrors.format = 'Selecciona una modalidad';
    } else if (currentStep === 1) {
      const participantCount = formData.format.mode === 'Singles' ? selectedPlayers.length : formData.participants.length;
      if (participantCount < (formData.format.mode === 'Singles' ? 2 : 1)) {
        newErrors.participants = `Selecciona al menos ${formData.format.mode === 'Singles' ? 2 : 1} participantes`;
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep(step)) return;
    if (step === 1) {
      if (formData.format.mode === 'Singles') {
        setFormData((prev) => ({
          ...prev,
          participants: selectedPlayers.map((id) => ({ player1: id, player2: null, seed: formData.seededPlayers.includes(id) })),
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          participants: prev.participants.map((pair) => ({
            ...pair,
            seed: formData.seededPlayers.includes(pair.player1) || (pair.player2 && formData.seededPlayers.includes(pair.player2)),
          })),
        }));
      }
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
    setErrors({});
  };

  const handleSubmit = async (draft = true) => {
    setIsLoading(true);
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
        playersPerGroupToAdvance: formData.playersPerGroupToAdvance,
        draft,
        status: draft ? 'Pendiente' : 'En curso',
      };
      const response = await axios.post('https://padnis.onrender.com/api/tournaments', tournament, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!draft) onCreateTournament(response.data);
      addNotification(draft ? 'Borrador guardado' : 'Torneo creado y activado', 'success');
      setSubmitSuccess(true);
      setTimeout(() => {
        resetForm();
        setSubmitSuccess(false);
      }, 2000);
    } catch (error) {
      addNotification(error.response?.data?.message || 'Error al crear el torneo', 'error');
    } finally {
      setIsLoading(false);
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
      format: { mode: 'Singles', sets: 2, gamesPerSet: 6, tiebreakSet: 6, tiebreakMatch: 10 },
      participants: [],
      groups: [],
      rounds: [],
      schedule: { group: null, matches: [] },
      groupSize: 4,
      autoGenerate: true,
      seededPlayers: [],
      playersPerGroupToAdvance: 2,
    });
    setSelectedPlayers([]);
    setPairPlayers([]);
    setSearch('');
    setErrors({});
  };

  const handleNameChange = useCallback((event) => {
    setName(event.target.value);
    setErrors((prev) => ({ ...prev, name: undefined }));
  }, []);

  const handleFormDataChange = useCallback((updates) => {
    setFormData((prev) => ({ ...prev, ...updates }));
    setErrors((prev) => ({
      ...prev,
      clubId: updates.clubId !== undefined ? undefined : prev.clubId,
      type: updates.type !== undefined ? undefined : prev.type,
      sport: updates.sport !== undefined ? undefined : prev.sport,
      category: updates.category !== undefined ? undefined : prev.category,
      format: updates.format !== undefined ? undefined : prev.format,
      participants: updates.participants !== undefined ? undefined : prev.participants,
    }));
  }, []);

  const handleNewPlayer = (newPlayer) => {
    const normalizedPlayer = { ...newPlayer, _id: String(newPlayer._id) };
    setLocalPlayers((prev) => [...prev, normalizedPlayer]);
    if (formData.format.mode === 'Singles') {
      setSelectedPlayers((prev) => [...prev, normalizedPlayer._id]);
    }
    setNewPlayerDialogOpen(false);
  };

  const steps = ['Datos Básicos', 'Participantes', 'Grupos/Rondas'];

  return (
    <Box
      sx={{
        p: isMobile ? 2 : 3,
        bgcolor: '#f0f4f8',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
      component="form"
      onSubmit={(e) => e.preventDefault()}
      aria-label="Crear Torneo"
    >
      <Typography
        variant={isMobile ? 'h5' : 'h4'}
        gutterBottom
        sx={{ color: '#1976d2', fontWeight: 700, textAlign: 'center' }}
      >
        Crear Torneo
      </Typography>
      {submitSuccess && (
        <Alert severity="success" sx={{ mb: 2, width: '100%', maxWidth: 600 }}>
          {formData.draft ? 'Borrador guardado' : 'Torneo creado y activado'}
        </Alert>
      )}
      <Stepper
        activeStep={step}
        orientation={isMobile ? 'vertical' : 'horizontal'}
        sx={{
          mb: 3,
          bgcolor: '#fff',
          p: isMobile ? 1 : 2,
          borderRadius: 2,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          width: '100%',
          maxWidth: 600,
        }}
      >
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel sx={{ '& .MuiStepLabel-label': { fontSize: isMobile ? '0.875rem' : '1rem', color: '#1976d2' } }}>
              {label}
            </StepLabel>
          </Step>
        ))}
      </Stepper>
      {isLoading && <CircularProgress sx={{ mb: 2 }} aria-label="Cargando datos" />}
      {step === 0 && (
        <Step1
          name={name}
          formData={formData}
          clubs={clubs}
          errors={errors}
          onNameChange={handleNameChange}
          onFormDataChange={handleFormDataChange}
          isMobile={isMobile}
        />
      )}
      {step === 1 && (
        <Step2
          formData={formData}
          localPlayers={localPlayers}
          selectedPlayers={selectedPlayers}
          pairPlayers={pairPlayers}
          search={search}
          errors={errors}
          onFormDataChange={handleFormDataChange}
          onSelectedPlayersChange={setSelectedPlayers}
          onPairPlayersChange={setPairPlayers}
          onSearchChange={setSearch}
          onNewPlayerDialogOpen={() => setNewPlayerDialogOpen(true)}
          isMobile={isMobile}
        />
      )}
      {step === 2 && (
        <Step3
          formData={formData}
          localPlayers={localPlayers}
          onFormDataChange={handleFormDataChange}
          isMobile={isMobile}
        />
      )}
      <Stack
        direction={isMobile ? 'column' : 'row'}
        spacing={2}
        sx={{ mt: 3, width: '100%', maxWidth: 600 }}
        justifyContent="space-between"
      >
        {step > 0 && (
          <Button
            variant="outlined"
            onClick={handleBack}
            disabled={isLoading}
            sx={{
              borderColor: '#d32f2f',
              color: '#d32f2f',
              fontSize: isMobile ? '0.875rem' : '1rem',
              py: isMobile ? 1 : 1.5,
              minHeight: isMobile ? 40 : 48,
              flex: isMobile ? 1 : 'unset',
              ':hover': { borderColor: '#b71c1c', bgcolor: '#ffebee' },
            }}
            aria-label="Volver al paso anterior"
          >
            Atrás
          </Button>
        )}
        {step < 2 && (
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={isLoading}
            sx={{
              bgcolor: '#1976d2',
              ':hover': { bgcolor: '#1565c0' },
              fontSize: isMobile ? '0.875rem' : '1rem',
              py: isMobile ? 1 : 1.5,
              minHeight: isMobile ? 40 : 48,
              flex: isMobile ? 1 : 'unset',
            }}
            aria-label="Siguiente paso"
          >
            Siguiente
          </Button>
        )}
        {step === 2 && (
          <>
            <Button
              variant="contained"
              onClick={() => handleSubmit(false)}
              disabled={isLoading}
              sx={{
                bgcolor: '#388e3c',
                ':hover': { bgcolor: '#2e7d32' },
                fontSize: isMobile ? '0.875rem' : '1rem',
                py: isMobile ? 1 : 1.5,
                minHeight: isMobile ? 40 : 48,
                flex: isMobile ? 1 : 'unset',
              }}
              startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null}
              aria-label="Iniciar torneo"
            >
              {isLoading ? 'Iniciando...' : 'Iniciar Torneo'}
            </Button>
            <Button
              variant="outlined"
              onClick={() => handleSubmit(true)}
              disabled={isLoading}
              sx={{
                borderColor: '#1976d2',
                color: '#1976d2',
                fontSize: isMobile ? '0.875rem' : '1rem',
                py: isMobile ? 1 : 1.5,
                minHeight: isMobile ? 40 : 48,
                flex: isMobile ? 1 : 'unset',
                ':hover': { borderColor: '#1565c0', bgcolor: '#e3f2fd' },
              }}
              aria-label="Guardar borrador"
            >
              Guardar Borrador
            </Button>
          </>
        )}
      </Stack>
      <NewPlayerDialog open={newPlayerDialogOpen} onClose={() => setNewPlayerDialogOpen(false)} onAddPlayer={handleNewPlayer} />
    </Box>
  );
};

export default TournamentForm;