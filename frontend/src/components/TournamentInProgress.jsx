// src/components/TournamentInProgress.jsx
import React, {
  useEffect,
  useState,
  useCallback,
  memo,
  useContext,
} from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Tabs,
  Tab,
  Typography,
  CircularProgress,
  Alert,
  Snackbar,
  Button,
  Divider,
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

import useTournament from '../hooks/useTournament.js';
import { getPlayerName, getRoundName } from '../utils/tournamentUtils.js';

import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import SocketContext from '../contexts/SocketContext';

/**
 * ErrorBoundary para capturar errores en la UI de cada pestaña.
 */
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

const TournamentInProgress = memo(({ onFinishTournament }) => {
  const { id: tournamentId } = useParams();
  const { role } = useAuth();
  const { addNotification } = useNotification();
  const socket = useContext(SocketContext);

  // Hook personalizado que maneja la lógica de fetching y mutaciones
  const {
    tournament,
    matchResults,
    matchErrors,
    loading,
    error,
    fetchTournament,
    onResultChange,
    onSaveResult,
    generateKnockoutPhase,
    advanceEliminationRound,
    standings,
    isGeneratingKnockout,
    isAdvancingRound,
  } = useTournament(tournamentId);

  // Estado para el índice de la pestaña activa
  const [activeTab, setActiveTab] = useState(0);

  // Estado para Snackbar de errores o mensajes
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info',
  });

  // Conexión a Socket.IO para refrescar datos en tiempo real
  useEffect(() => {
    if (!socket) return;
    socket.on('match:updated', () => {
      fetchTournament();
      setSnackbar({
        open: true,
        message: 'Resultado actualizado',
        severity: 'success',
      });
    });
    socket.on('tournament:roundChanged', () => {
      fetchTournament();
      setSnackbar({
        open: true,
        message: 'Nueva ronda generada',
        severity: 'info',
      });
    });
    return () => {
      socket.off('match:updated');
      socket.off('tournament:roundChanged');
    };
  }, [socket, fetchTournament]);

  // Si el torneo cambia de estado “En curso” a otro, llamamos al callback externo
  useEffect(() => {
    if (tournament?.status && tournament.status !== 'En curso') {
      onFinishTournament?.(tournament);
    }
  }, [tournament, onFinishTournament]);

  // Mostrar loading o errores iniciales
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
        <Alert severity="error">
          {error.response?.data?.message || error.message}
        </Alert>
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

  // ¿Existen grupos y/o rondas en este torneo?
  const hasGroups = Array.isArray(tournament.groups) && tournament.groups.length > 0;
  const hasRounds = Array.isArray(tournament.rounds) && tournament.rounds.length > 0;
  const canManage = role === 'admin' || role === 'coach';

  // Maneja cambio de pestaña
  const handleTabChange = useCallback((_, newIndex) => {
    setActiveTab(newIndex);
  }, []);

  // Acción de generar fase eliminatoria
  const handleGenerateKnockout = useCallback(async () => {
    try {
      await generateKnockoutPhase();
      setSnackbar({
        open: true,
        message: 'Fase eliminatoria generada',
        severity: 'success',
      });
      // Después de generar, cambiar automáticamente a la pestaña de “Llave”
      setActiveTab(tabs.findIndex((t) => t.label === 'Llave'));
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.response?.data?.message || err.message || 'Error generando llave',
        severity: 'error',
      });
    }
  }, [generateKnockoutPhase]);

  // Acción de avanzar ronda en eliminatoria (se llama desde TournamentBracket)
  const handleAdvanceRound = useCallback(async () => {
    try {
      await advanceEliminationRound();
      setSnackbar({
        open: true,
        message: 'Siguiente ronda generada',
        severity: 'success',
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.response?.data?.message || err.message || 'Error avanzando ronda',
        severity: 'error',
      });
    }
  }, [advanceEliminationRound]);

  // Construcción dinámica de pestañas según el tipo de torneo
  const tabs = [
    {
      label: 'Detalles',
      content: (
        <TournamentDetails
          tournament={tournament}
          canManage={canManage}
          fetchTournament={fetchTournament}
        />
      ),
    },
    ...(hasGroups
      ? [
          {
            label: 'Grupos',
            content: (
              <TournamentGroups
                tournament={tournament}
                role={role}
                matchResults={matchResults}
                matchErrors={matchErrors}
                onResultChange={onResultChange}
                onSaveResult={onSaveResult}
                generateKnockoutPhase={handleGenerateKnockout}
                isGeneratingKnockout={isGeneratingKnockout}
                standings={standings}
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
                onResultChange={onResultChange}
                onSaveResult={onSaveResult}
                advanceEliminationRound={handleAdvanceRound}
                isAdvancingRound={isAdvancingRound}
                standings={standings}
              />
            ),
          },
        ]
      : []),
  ];

  return (
    <Box sx={{ p: { xs: 1, sm: 2 } }}>
      {/* Título del torneo */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 2,
        }}
      >
        <Typography
          variant="h5"
          sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}
        >
          {tournament.name}
        </Typography>
        {canManage && tournament.status === 'Pendiente' && (
          <Button
            variant="contained"
            color="primary"
            onClick={handleGenerateKnockout}
            disabled={isGeneratingKnockout}
          >
            {isGeneratingKnockout ? 'Generando...' : 'Generar Eliminatorias'}
          </Button>
        )}
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Pestañas de navegación */}
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 2 }}
      >
        {tabs.map((t, i) => (
          <Tab key={i} label={t.label} />
        ))}
      </Tabs>

      {/* Contenido de cada pestaña, con Swiper para swipe horizontal */}
      <Swiper
        modules={[Navigation, Pagination]}
        spaceBetween={10}
        slidesPerView={1}
        pagination={{ clickable: true }}
        onSlideChange={(swiper) => setActiveTab(swiper.activeIndex)}
        initialSlide={activeTab}
      >
        {tabs.map((t, i) => (
          <SwiperSlide key={i}>
            <ErrorBoundary>{t.content}</ErrorBoundary>
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Snackbar para notificaciones de éxito/fracaso */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
});

export default TournamentInProgress;
