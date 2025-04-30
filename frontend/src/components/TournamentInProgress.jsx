import React, { useEffect, useCallback, memo, useContext } from 'react';
import { useParams } from 'react-router-dom';
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

import TournamentDetails   from './TournamentDetails.jsx';
import TournamentGroups    from './TournamentGroups.jsx';
import TournamentStandings from './TournamentStandings.jsx';
import TournamentBracket   from './TournamentBracket.jsx';

import useTournament from '../hooks/useTournament.js';
import { getPlayerName, getRoundName } from '../utils/tournamentUtils.js';

import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import SocketContext from '../contexts/SocketContext';

class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p:2 }}>
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
    standings
  } = useTournament(tournamentId);

  // actualizar al recibir socket
  useEffect(() => {
    if (!socket) return;
    socket.on('match:updated', () => {
      fetchTournament();
      addNotification('Resultado actualizado', 'success');
    });
    socket.on('tournament:roundChanged', () => {
      fetchTournament();
      addNotification('Nueva ronda generada', 'info');
    });
    return () => {
      socket.off('match:updated');
      socket.off('tournament:roundChanged');
    };
  }, [socket, fetchTournament, addNotification]);

  // finalizar si sale de curso
  useEffect(() => {
    if (tournament?.status !== 'En curso') {
      onFinishTournament?.(tournament);
    }
  }, [tournament, onFinishTournament]);

  if (loading) {
    return (
      <Box sx={{ display:'flex', justifyContent:'center', p:3 }}>
        <CircularProgress aria-label="Cargando torneo" />
      </Box>
    );
  }
  if (error) {
    return (
      <Box sx={{ p:2 }}>
        <Alert severity="error">{error.response?.data?.message || error.message}</Alert>
      </Box>
    );
  }
  if (!tournament) {
    return (
      <Box sx={{ p:2 }}>
        <Typography>No se encontró el torneo.</Typography>
      </Box>
    );
  }

  const hasGroups = tournament.groups.length > 0;
  const hasRounds = tournament.rounds.length > 0;
  const canManage = role==='admin' || role==='coach';

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
                matchResults={matchResults}
                matchErrors={matchErrors}
                onResultChange={onResultChange}
                onSaveResult={onSaveResult}
                generateKnockoutPhase={generateKnockoutPhase}
                standings={standings}
              />
            ),
          },
          {
            label: 'Posiciones',
            content: (
              <TournamentStandings standings={standings} getPlayerName={getPlayerName} />
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
                advanceEliminationRound={advanceEliminationRound}
                standings={standings}
              />
            ),
          },
        ]
      : []),
  ];

  return (
    <Box sx={{ p:{ xs:1, sm:2 } }}>
      <Typography
        variant="h5"
        sx={{ fontSize:{ xs:'1.25rem', sm:'1.5rem' }, mb:2 }}
      >
        {tournament.name}
      </Typography>

      <Tabs
        value={0} // controla vía swiper
        // onChange...
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb:2 }}
      >
        {tabs.map((t,i)=><Tab key={i} label={t.label} />)}
      </Tabs>

      <Swiper
        modules={[Navigation, Pagination]}
        spaceBetween={10}
        slidesPerView={1}
        pagination={{ clickable: true }}
      >
        {tabs.map((t,i)=>(
          <SwiperSlide key={i}>
            <ErrorBoundary>{t.content}</ErrorBoundary>
          </SwiperSlide>
        ))}
      </Swiper>

      <Snackbar
        open={false}
        autoHideDuration={3000}
        // onClose...
      />
    </Box>
  );
});

export default TournamentInProgress;
