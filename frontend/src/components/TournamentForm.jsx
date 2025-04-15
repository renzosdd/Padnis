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

const TournamentForm = React.memo(({ players, onCreateTournament }) => {
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
    playersPerGroupToAdvance: 2,
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
          participants: selectedPlayers.map(id => ({ player1: id, player2: null, seed: false })),
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
        playersPerGroupToAdvance: formData.playersPerGroupToAdvance,
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
      playersPerGroupToAdvance: 2,
    });
    setSelectedPlayers([]);
    setPairPlayers([]);
    setSearch('');
  };

  const steps = ['Datos Básicos', 'Participantes', 'Grupos/Rondas'];

  return (
    <Box
      sx={{
        p: { xs: 3, sm: 4 },
        maxWidth: '100%',
        mx: 'auto',
        bgcolor: '#f5f5f5',
        minHeight: '100vh',
      }}
    >
      <Typography
        variant="h5"
        gutterBottom
        sx={{
          fontSize: { xs: '1.8rem', sm: '2rem' },
          color: '#333',
          fontWeight: 600,
          textAlign: 'center',
        }}
      >
        Crear Torneo
      </Typography>
      <Stepper
        activeStep={step}
        orientation={isMobile ? 'vertical' : 'horizontal'}
        sx={{
          mb: 3,
          bgcolor: '#ffffff',
          p: 2,
          borderRadius: 2,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          width: { xs: '100%', sm: 'auto' },
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        {steps.map(label => (
          <Step key={label}>
            <StepLabel sx={{ fontSize: { xs: '0.9rem', sm: '1rem' }, color: '#333' }}>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      {step === 0 && <Step1 />}
      {step === 1 && <Step2 />}
      {step === 2 && <Step3 />}
      <Stack
        direction="row"
        spacing={2}
        justifyContent="space-between"
        sx={{ mt: 3, px: 2 }}
      >
        {step > 0 && (
          <Button
            variant="outlined"
            onClick={() => setStep(step - 1)}
            sx={{
              borderColor: '#d32f2f',
              color: '#d32f2f',
              fontSize: { xs: '0.9rem', sm: '1rem' },
              py: 1,
              px: 3,
              transition: 'all 0.2s',
              '&:hover': { borderColor: '#b71c1c', bgcolor: '#ffebee' },
            }}
          >
            Atrás
          </Button>
        )}
        {step < 2 && (
          <Button
            variant="contained"
            onClick={handleNext}
            sx={{
              bgcolor: '#1976d2',
              color: '#fff',
              fontSize: { xs: '0.9rem', sm: '1rem' },
              py: 1,
              px: 3,
              transition: 'all 0.2s',
              '&:hover': { bgcolor: '#1565c0' },
            }}
          >
            Siguiente
          </Button>
        )}
        {step === 2 && (
          <>
            <Button
              variant="contained"
              onClick={() => handleSubmit(false)}
              sx={{
                bgcolor: '#388e3c',
                color: '#fff',
                fontSize: { xs: '0.9rem', sm: '1rem' },
                py: 1,
                px: 3,
                transition: 'all 0.2s',
                '&:hover': { bgcolor: '#2e7d32' },
              }}
            >
              Iniciar Torneo
            </Button>
            <Button
              variant="outlined"
              onClick={() => handleSubmit(true)}
              sx={{
                borderColor: '#1976d2',
                color: '#1976d2',
                fontSize: { xs: '0.9rem', sm: '1rem' },
                py: 1,
                px: 3,
                transition: 'all 0.2s',
                '&:hover': { borderColor: '#1565c0', bgcolor: '#e3f2fd' },
              }}
            >
              Guardar Borrador
            </Button>
          </>
        )}
      </Stack>
    </Box>
  );
});

export default TournamentForm;