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
  Tooltip,
  IconButton,
} from '@mui/material';
import { Navigation, Pagination } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import GetAppIcon from '@mui/icons-material/GetApp';
import CheckIcon from '@mui/icons-material/Check';
import FinishIcon from '@mui/icons-material/Flag';

import TournamentDetails from './TournamentDetails.jsx';
import TournamentGroups from './TournamentGroups.jsx';
import TournamentStandings from './TournamentStandings.jsx';
import TournamentBracket from './TournamentBracket.jsx';

import useTournament from '../hooks/useTournament.js';
import {
  getPlayerName,
  getRoundName,
  exportStandingsToCSV,
  exportBracketToCSV,
} from '../utils/tournamentUtils.js';

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

  // Hook personalizado que expone toda la lógica necesaria
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
    finishTournament,       // Función para finalizar el torneo
    isFinishingTournament,  // Estado booleano mientras se finaliza
    lastUpdated,            // Timestamp de última recarga exitosa
  } = useTournament(tournamentId);

  // Persistir pestaña activa en sessionStorage
  const STORAGE_KEY = `tournament-${tournamentId}-activeTab`;
  const initialTab = parseInt(sessionStorage.getItem(STORAGE_KEY) || '0', 10);
  const [activeTab, setActiveTab] = useState(initialTab);

  // Estado para Snackbar de mensajes
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info',
  });

  // Conexión a Socket.IO para actualizar en tiempo real
  useEffect(() => {
    if (!socket) return;
    const onMatchUpdated = () => {
      fetchTournament();
      setSnackbar({ open: true, message: 'Resultado actualizado', severity: 'success' });
    };
    const onRoundChanged = () => {
      fetchTournament();
      setSnackbar({ open: true, message: 'Nueva ronda generada', severity: 'info' });
    };
    const onTournamentFinished = () => {
      fetchTournament();
      setSnackbar({ open: true, message: 'Torneo finalizado', severity: 'info' });
    };

    socket.on('match:updated', onMatchUpdated);
    socket.on('tournament:roundChanged', onRoundChanged);
    socket.on('tournament:finished', onTournamentFinished);

    return () => {
      socket.off('match:updated', onMatchUpdated);
      socket.off('tournament:roundChanged', onRoundChanged);
      socket.off('tournament:finished', onTournamentFinished);
    };
  }, [socket, fetchTournament]);

  // Si el torneo cambia de “En curso” a otro estado, avisar al padre
  useEffect(() => {
    if (tournament?.status && tournament.status !== 'En curso') {
      onFinishTournament?.(tournament);
    }
  }, [tournament, onFinishTournament]);

  // Mostrar spinner o error inicial
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

  // Existen grupos/rondas en este torneo?
  const hasGroups = Array.isArray(tournament.groups) && tournament.groups.length > 0;
  const hasRounds = Array.isArray(tournament.rounds) && tournament.rounds.length > 0;
  const canManage = role === 'admin' || role === 'coach';

  // Calcular resumen de progreso
  const totalGroupMatches = hasGroups
    ? tournament.groups.reduce((acc, g) => acc + (g.matches?.length || 0), 0)
    : 0;
  const playedGroupMatches = hasGroups
    ? Object.values(matchResults).filter((mr) => mr.saved).length
    : 0;
  const totalElimMatches = hasRounds
    ? tournament.rounds.reduce((acc, r) => acc + (r.matches?.length || 0), 0)
    : 0;
  const playedElimMatches = hasRounds
    ? tournament.rounds
        .flatMap((r) => r.matches)
        .filter((m) => m.result?.winner?.player1 || m.result?.winner?.player2).length
    : 0;

  // Generar fase eliminatoria
  const handleGenerateKnockout = useCallback(async () => {
    try {
      await generateKnockoutPhase();
      setSnackbar({
        open: true,
        message: 'Fase eliminatoria generada',
        severity: 'success',
      });
      // Cambiar automáticamente a la pestaña “Llave”
      const idxLlave = tabs.findIndex((t) => t.label === 'Llave');
      if (idxLlave >= 0) {
        setActiveTab(idxLlave);
        sessionStorage.setItem(STORAGE_KEY, idxLlave.toString());
      }
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.response?.data?.message || err.message || 'Error generando llave',
        severity: 'error',
      });
    }
  }, [generateKnockoutPhase]);

  // Avanzar ronda eliminatoria
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

  // Finalizar torneo
  const handleFinishTournament = useCallback(async () => {
    try {
      await finishTournament();
      setSnackbar({
        open: true,
        message: 'Torneo finalizado correctamente',
        severity: 'success',
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.response?.data?.message || err.message || 'Error al finalizar torneo',
        severity: 'error',
      });
    }
  }, [finishTournament]);

  // Construcción dinámica de pestañas
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
              <Box>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    mb: 1,
                  }}
                >
                  <Typography variant="subtitle1">
                    Partidos grupos: {playedGroupMatches}/{totalGroupMatches}
                  </Typography>
                  {canManage && tournament.status === 'Pendiente' && (
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleGenerateKnockout}
                      disabled={isGeneratingKnockout}
                      startIcon={<CheckIcon />}
                      aria-label="Generar fase eliminatoria"
                    >
                      {isGeneratingKnockout ? 'Generando...' : 'Generar Eliminatorias'}
                    </Button>
                  )}
                </Box>
                <TournamentGroups
                  tournament={tournament}
                  role={role}
                  matchResults={matchResults}
                  matchErrors={matchErrors}
                  onResultChange={onResultChange}
                  onSaveResult={onSaveResult}
                  isGeneratingKnockout={isGeneratingKnockout}
                  standings={standings}
                />
              </Box>
            ),
          },
          {
            label: 'Posiciones',
            content: (
              <Box>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    mb: 1,
                  }}
                >
                  <Typography variant="subtitle1">
                    Última actualización: {new Date(lastUpdated).toLocaleString()}
                  </Typography>
                  <Tooltip title="Exportar posiciones a CSV">
                    <IconButton
                      color="primary"
                      onClick={() => exportStandingsToCSV(standings)}
                      aria-label="Exportar posiciones"
                    >
                      <GetAppIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
                <TournamentStandings
                  standings={standings}
                  getPlayerName={getPlayerName}
                />
              </Box>
            ),
          },
        ]
      : []),
    ...(hasRounds
      ? [
          {
            label: 'Llave',
            content: (
              <Box>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    mb: 1,
                  }}
                >
                  <Typography variant="subtitle1">
                    Partidos eliminatoria: {playedElimMatches}/{totalElimMatches}
                  </Typography>
                  <Box>
                    <Tooltip title="Exportar llave a CSV">
                      <IconButton
                        color="primary"
                        onClick={() => exportBracketToCSV(tournament.rounds)}
                        aria-label="Exportar llave"
                      >
                        <GetAppIcon />
                      </IconButton>
                    </Tooltip>
                    {canManage && tournament.status === 'En curso' && (
                      <Button
                        variant="contained"
                        color="secondary"
                        onClick={handleAdvanceRound}
                        disabled={isAdvancingRound}
                        startIcon={<CheckIcon />}
                        sx={{ ml: 1 }}
                        aria-label="Avanzar ronda"
                      >
                        {isAdvancingRound ? 'Avanzando...' : 'Avanzar Ronda'}
                      </Button>
                    )}
                  </Box>
                </Box>
                <TournamentBracket
                  tournament={tournament}
                  role={role}
                  getPlayerName={getPlayerName}
                  getRoundName={getRoundName}
                  onResultChange={onResultChange}
                  onSaveResult={onSaveResult}
                  isAdvancingRound={isAdvancingRound}
                  standings={standings}
                />
              </Box>
            ),
          },
        ]
      : []),
  ];

  // Guardar pestaña activa en sessionStorage
  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, activeTab.toString());
  }, [activeTab]);

  return (
    <Box sx={{ p: { xs: 1, sm: 2 } }}>
      {/* Encabezado con título, estado y botón “Finalizar Torneo” */}
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
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="body2" sx={{ mr: 2 }}>
            Estado: {tournament.status}
          </Typography>
          {canManage && tournament.status === 'En curso' && (
            <Button
              variant="outlined"
              color="error"
              onClick={handleFinishTournament}
              disabled={isFinishingTournament}
              startIcon={<FinishIcon />}
              aria-label="Finalizar torneo"
            >
              {isFinishingTournament ? 'Finalizando...' : 'Finalizar Torneo'}
            </Button>
          )}
        </Box>
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Pestañas de navegación */}
      <Tabs
        value={activeTab}
        onChange={(_, newIndex) => {
          setActiveTab(newIndex);
        }}
        variant="scrollable"
        scrollButtons="auto"
        aria-label="Navegación de pestañas del torneo"
        sx={{ mb: 2 }}
      >
        {tabs.map((t, i) => (
          <Tab key={i} label={t.label} aria-controls={`tabpanel-${i}`} />
        ))}
      </Tabs>

      {/* Contenido de cada pestaña con Swiper */}
      <Swiper
        modules={[Navigation, Pagination]}
        spaceBetween={10}
        slidesPerView={1}
        pagination={{ clickable: true }}
        onSlideChange={(swiper) => {
          setActiveTab(swiper.activeIndex);
        }}
        initialSlide={activeTab}
      >
        {tabs.map((t, i) => (
          <SwiperSlide key={i} aria-labelledby={`tabpanel-${i}`}>
            <ErrorBoundary>{t.content}</ErrorBoundary>
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Snackbar para notificaciones */}
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
