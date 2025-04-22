import React, { useState, useCallback, useRef } from 'react';
import { Box, Typography, Button, Tabs, Tab, CircularProgress } from '@mui/material';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import { ErrorBoundary } from 'react-error-boundary';
import useTournament from './useTournament.js';
import TournamentDetails from './TournamentDetails';
import TournamentGroups from './TournamentGroups';
import TournamentStandings from './TournamentStandings';
import TournamentBracket from './TournamentBracket';
import MatchDialog from './MatchDialog';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

const TournamentInProgress = ({ tournamentId, onFinishTournament }) => {
  const [tabValue, setTabValue] = useState(0);
  const [matchDialogOpen, setMatchDialogOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const swiperRef = useRef(null);
  const { user, role } = useAuth();
  const { addNotification } = useNotification();

  // Validate tournamentId early
  if (!tournamentId || typeof tournamentId !== 'string' || !/^[0-9a-fA-F]{24}$/.test(tournamentId)) {
    return (
      <Box sx={{ p: 2, bgcolor: '#ffebee', borderRadius: 2, textAlign: 'center' }}>
        <Typography color="error" variant="h6">
          Error: ID de torneo inválido
        </Typography>
        <Typography color="error">
          El ID del torneo proporcionado no es válido. Por favor, selecciona otro torneo.
        </Typography>
        <Button onClick={() => window.location.reload()} variant="outlined" sx={{ mt: 2 }}>
          Recargar Página
        </Button>
      </Box>
    );
  }

  const {
    tournament,
    standings,
    isLoading,
    error,
    fetchTournament,
    generateKnockoutPhase,
    advanceEliminationRound,
    handleFinishTournament,
    getPlayerName,
    getRoundName,
  } = useTournament(tournamentId, addNotification, onFinishTournament);

  const handleTabChange = useCallback((event, newValue) => {
    setTabValue(newValue);
    if (swiperRef.current && swiperRef.current.swiper) {
      swiperRef.current.swiper.slideTo(newValue);
    }
  }, []);

  const handleSlideChange = useCallback(swiper => {
    setTabValue(swiper.activeIndex);
  }, []);

  const openMatchDialog = useCallback(
    (match, groupIndex, matchIndex, roundIndex = null) => {
      if (role !== 'admin' && role !== 'coach') {
        addNotification('Solo admin o coach pueden actualizar partidos', 'error');
        return;
      }
      setSelectedMatch({ match, groupIndex, matchIndex, roundIndex, matchId: match._id });
      setMatchDialogOpen(true);
    },
    [role, addNotification]
  );

  const ErrorFallback = ({ error, resetErrorBoundary }) => (
    <Box sx={{ p: 2, bgcolor: '#ffebee', borderRadius: 2, textAlign: 'center' }}>
      <Typography color="error" variant="h6">
        Error al cargar el torneo
      </Typography>
      <Typography color="error">{error.message}</Typography>
      <Button onClick={resetErrorBoundary} variant="contained" sx={{ mt: 2, bgcolor: '#0288d1' }}>
        Reintentar
      </Button>
    </Box>
  );

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !tournament) {
    return (
      <Box sx={{ p: 2, bgcolor: '#ffebee', borderRadius: '0 2px 8px rgba(0, 0, 0, 0.1)', textAlign: 'center' }}>
        <Typography color="error" variant="h6">
          Error al cargar el torneo
        </Typography>
        <Typography color="error">{error || 'No se pudo cargar el torneo. El servidor podría estar inactivo.'}</Typography>
        <Button onClick={() => fetchTournament()} variant="contained" sx={{ mt: 2, bgcolor: '#0288d1', mr: 1 }}>
          Reintentar
        </Button>
        <Button onClick={() => window.location.reload()} variant="outlined" sx={{ mt: 2 }}>
          Recargar Página
        </Button>
      </Box>
    );
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => fetchTournament()}>
      <Box
        sx={{
          p: { xs: 2, sm: 3 },
          bgcolor: '#f0f4f8',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          height: 'auto',
        }}
      >
        <Box
          sx={{
            bgcolor: '#ffffff',
            p: { xs: 2, sm: 3 },
            borderRadius: 2,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            maxWidth: '100%',
            mx: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Typography
            variant="h5"
            gutterBottom
            sx={{
              fontSize: 'clamp(1.5rem, 6vw, 2rem)',
              color: '#01579b',
              fontWeight: 700,
              textAlign: 'center',
            }}
          >
            {tournament.name} - {tournament.sport} ({tournament.format?.mode || 'No definido'}) en{' '}
            {tournament.club?.name || 'No definido'}
          </Typography>
          <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 2 }} variant="scrollable" scrollButtons="auto">
            <Tab label="Detalles" />
            <Tab label="Grupos" />
            <Tab label="Posiciones" />
            {tournament.rounds && tournament.rounds.length > 0 && <Tab label="Llave" />}
          </Tabs>

          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Swiper
              spaceBetween={10}
              slidesPerView={1}
              onSlideChange={handleSlideChange}
              initialSlide={tabValue}
              style={{ width: '100%', height: 'auto' }}
              ref={swiperRef}
            >
              <SwiperSlide>
                <Box sx={{ p: 2, height: 'auto' }}>
                  <TournamentDetails tournament={tournament} />
                </Box>
              </SwiperSlide>
              <SwiperSlide>
                <Box sx={{ p: 2, height: 'auto' }}>
                  <TournamentGroups
                    tournament={tournament}
                    role={role}
                    openMatchDialog={openMatchDialog}
                    generateKnockoutPhase={generateKnockoutPhase}
                    getPlayerName={getPlayerName}
                  />
                </Box>
              </SwiperSlide>
              <SwiperSlide>
                <Box sx={{ p: 2, height: 'auto' }}>
                  <TournamentStandings tournament={tournament} standings={standings} getPlayerName={getPlayerName} />
                </Box>
              </SwiperSlide>
              {tournament.rounds && tournament.rounds.length > 0 && (
                <SwiperSlide>
                  <Box sx={{ p: 2, height: 'auto' }}>
                    <TournamentBracket
                      tournament={tournament}
                      role={role}
                      getPlayerName={getPlayerName}
                      getRoundName={getRoundName}
                      openMatchDialog={openMatchDialog}
                      advanceEliminationRound={advanceEliminationRound}
                    />
                  </Box>
                </SwiperSlide>
              )}
            </Swiper>
          </Box>

          {(role === 'admin' || role === 'coach') && (
            <Box sx={{ mt: 1, textAlign: 'center' }}>
              <Button
                variant="contained"
                color="success"
                onClick={handleFinishTournament}
                sx={{
                  bgcolor: '#388e3c',
                  '&:hover': { bgcolor: '#2e7d32' },
                  fontSize: 'clamp(0.875rem, 4vw, 1rem)',
                }}
              >
                Finalizar Torneo
              </Button>
            </Box>
          )}
        </Box>

        <MatchDialog
          open={matchDialogOpen}
          onClose={() => setMatchDialogOpen(false)}
          selectedMatch={selectedMatch}
          tournament={tournament}
          getPlayerName={getPlayerName}
          addNotification={addNotification}
          fetchTournament={fetchTournament}
          role={role}
        />
      </Box>
    </ErrorBoundary>
  );
};

export default TournamentInProgress;