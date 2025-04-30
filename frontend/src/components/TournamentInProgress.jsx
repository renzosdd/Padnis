// src/frontend/src/components/TournamentInProgress.jsx
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  memo,
  useContext
} from 'react';
import {
  Box,
  Tabs,
  Tab,
  Typography,
  CircularProgress,
  Alert,
  Snackbar
} from '@mui/material';
import { Navigation, Pagination } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

import TournamentDetails from './TournamentDetails.jsx';
import TournamentGroups from './TournamentGroups.jsx';
import TournamentStandings from './TournamentStandings.jsx';
import TournamentBracket from './TournamentBracket.jsx';
import useTournament from './useTournament.js';
import { getPlayerName, getRoundName } from './tournamentUtils.js';
import AuthContext from '../contexts/AuthContext';
import NotificationContext from '../contexts/NotificationContext';
import { SocketContext } from '../App.jsx';

// Captura errores de renderizado
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 2 }}>
          <Alert severity="error">
            Ocurrió un error: {this.state.error?.message || 'desconocido'}.
          </Alert>
        </Box>
      );
    }
    return this.props.children;
  }
}

const TournamentInProgress = memo(({ tournamentId, onFinishTournament }) => {
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(() => {
    return parseInt(localStorage.getItem(`tab_${tournamentId}`) || '0', 10);
  });
  const [snackbar, setSnackbar] = useState(null);

  const swiperRef = useRef(null);
  const socket = useContext(SocketContext);
  const { user, role } = useContext(AuthContext);
  const { standings, fetchTournament, generateKnockoutPhase, advanceEliminationRound } =
    useTournament(tournamentId);

  const addNotification = useContext(NotificationContext).addNotification;

  // Carga inicial o forzada
  const loadTournament = useCallback(
    async (force = false) => {
      setLoading(true);
      try {
        const data = await fetchTournament();
        setTournament(data);
        if (data.status !== 'En curso') onFinishTournament?.(data);
      } catch (err) {
        const msg = err.response?.data?.message || err.message;
        setError(msg);
        addNotification('Error cargando torneo', 'error');
      } finally {
        setLoading(false);
      }
    },
    [fetchTournament, onFinishTournament, addNotification]
  );

  useEffect(() => {
    if (tournamentId) loadTournament();
    else {
      setError('ID de torneo inválido');
      setLoading(false);
    }
  }, [tournamentId, loadTournament]);

  // Socket.io: recarga dinámica
  useEffect(() => {
    socket.on('match:updated', () => {
      loadTournament(true);
      addNotification('Resultado actualizado', 'success');
    });
    socket.on('tournament:roundChanged', () => {
      loadTournament(true);
      addNotification('Nueva ronda generada', 'info');
    });
    return () => {
      socket.off('match:updated');
      socket.off('tournament:roundChanged');
    };
  }, [socket, loadTournament, addNotification]);

  // Guardar pestaña en localStorage
  useEffect(() => {
    localStorage.setItem(`tab_${tournamentId}`, tabValue.toString());
  }, [tabValue, tournamentId]);

  // Cambiar pestaña
  const handleTabChange = useCallback((_, newVal) => {
    setTabValue(newVal);
    swiperRef.current?.swiper?.slideTo(newVal);
  }, []);

  // Syncronizar Swiper → Tabs
  const handleSlideChange = useCallback((swiper) => {
    setTabValue(swiper.activeIndex);
  }, []);

  // Handlers de fase de eliminación
  const onGenerateKnockout = useCallback(async () => {
    try {
      await generateKnockoutPhase();
      loadTournament(true);
    } catch {
      addNotification('Error al generar eliminatorias', 'error');
    }
  }, [generateKnockoutPhase, loadTournament, addNotification]);

  const onAdvanceRound = useCallback(async () => {
    try {
      await advanceEliminationRound();
      loadTournament(true);
    } catch {
      addNotification('Error al avanzar ronda', 'error');
    }
  }, [advanceEliminationRound, loadTournament, addNotification]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress aria-label="Cargando torneo" />
      </Box>
    );
  }
  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }
  if (!tournament) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography>No se encontró el torneo.</Typography>
      </Box>
    );
  }

  const hasGroups = Array.isArray(tournament.groups) && tournament.groups.length > 0;
  const hasRounds = Array.isArray(tournament.rounds) && tournament.rounds.length > 0;

  // Configuración de pestañas
  const tabs = [
    { label: 'Detalles', content: <TournamentDetails tournament={tournament} /> },
    ...(hasGroups
      ? [
          {
            label: 'Grupos',
            content: (
              <TournamentGroups
                tournament={tournament}
                role={role}
                getPlayerName={getPlayerName}
                fetchTournament={() => loadTournament(true)}
                addNotification={addNotification}
                generateKnockoutPhase={onGenerateKnockout}
                groups={tournament.groups}
              />
            ),
          },
          {
            label: 'Posiciones',
            content: (
              <TournamentStandings
                standings={standings}
                getPlayerName={getPlayerName}
              />
            ),
          },
        ]
      : []),
    ...(hasRounds
      ? [
          {
            label: 'Llave',
            content: (
              <TournamentBracket
                tournament={tournament}
                role={role}
                getPlayerName={getPlayerName}
                getRoundName={getRoundName}
                fetchTournament={() => loadTournament(true)}
                addNotification={addNotification}
                advanceEliminationRound={onAdvanceRound}
                matches={tournament.rounds}
              />
            ),
          },
        ]
      : []),
  ];

  return (
    <Box sx={{ p: { xs: 1, sm: 2 } }}>
      <Typography
        variant="h5"
        sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' }, mb: 2 }}
      >
        {tournament.name}
      </Typography>

      <Tabs
        value={tabValue}
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 2 }}
      >
        {tabs.map((t, i) => (
          <Tab key={i} label={t.label} />
        ))}
      </Tabs>

      <Swiper
        ref={swiperRef}
        modules={[Navigation, Pagination]}
        spaceBetween={10}
        slidesPerView={1}
        onSlideChange={handleSlideChange}
        pagination={{ clickable: true }}
      >
        {tabs.map((t, i) => (
          <SwiperSlide key={i}>
            <ErrorBoundary>{t.content}</ErrorBoundary>
          </SwiperSlide>
        ))}
      </Swiper>

      <Snackbar
        open={!!snackbar}
        autoHideDuration={3000}
        onClose={() => setSnackbar(null)}
        message={snackbar}
      />
    </Box>
  );
});

export default TournamentInProgress;
