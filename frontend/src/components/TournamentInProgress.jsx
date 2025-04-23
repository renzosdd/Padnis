import React, { useState, useCallback, useRef } from 'react';
import { Box, Typography, Button, Tabs, Tab, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import { ErrorBoundary } from 'react-error-boundary';
import useTournament from './useTournament.js';
import TournamentDetails from './TournamentDetails';
import TournamentGroups from './TournamentGroups';
import TournamentStandings from './TournamentStandings';
import TournamentBracket from './TournamentBracket';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { getRoundName } from './tournamentUtils.js';

const swiperStyles = `
  .swiper {
    width: 100%;
  }
  .swiper-slide {
    height: auto !important;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
  }
`;

const TournamentInProgress = ({ tournamentId, onFinishTournament }) => {
  const [tabValue, setTabValue] = useState(0);
  const [confirmFinishOpen, setConfirmFinishOpen] = useState(false);
  const swiperRef = useRef(null);
  const { user, role } = useAuth();
  const { addNotification } = useNotification();

  if (!tournamentId || typeof tournamentId !== 'string' || !/^[0-9a-fA-F]{24}$/.test(tournamentId)) {
    return (
      <Box sx={{ p: 2, bgcolor: '#ffebee', borderRadius: 2, textAlign: 'center', maxWidth: '100%', overflowX: 'auto' }}>
        <Typography color="error" variant="h6" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
          Error: ID de torneo inválido
        </Typography>
        <Typography color="error" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
          El ID del torneo proporcionado no es válido. Por favor, selecciona otro torneo.
        </Typography>
        <Button onClick={() => window.location.reload()} variant="outlined" sx={{ mt: 2, minHeight: 40 }} aria-label="Recargar página">
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
  } = useTournament(tournamentId, addNotification, onFinishTournament);

  const handleTabChange = useCallback((event, newValue) => {
    setTabValue(newValue);
    if (swiperRef.current && swiperRef.current.swiper) {
      swiperRef.current.swiper.slideTo(newValue);
    } else {
      console.warn('Swiper instance not available, directly updating tab value:', newValue);
      setTabValue(newValue); // Fallback to ensure tab updates
    }
  }, []);

  const handleSlideChange = useCallback((swiper) => {
    setTabValue(swiper.activeIndex);
  }, []);

  const handleConfirmFinish = () => {
    setConfirmFinishOpen(true);
  };

  const handleFinishConfirmed = async () => {
    await handleFinishTournament();
    setConfirmFinishOpen(false);
  };

  const ErrorFallback = ({ error, resetErrorBoundary }) => (
    <Box sx={{ p: 2, bgcolor: '#ffebee', borderRadius: 2, textAlign: 'center', maxWidth: '100%', overflowX: 'auto' }}>
      <Typography color="error" variant="h6" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
        Error al cargar el torneo
      </Typography>
      <Typography color="error" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
        {error.message}
      </Typography>
      <Button onClick={resetErrorBoundary} variant="contained" sx={{ mt: 2, bgcolor: '#1976d2', minHeight: 40 }} aria-label="Reintentar carga">
        Reintentar
      </Button>
    </Box>
  );

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress aria-label="Cargando torneo" />
      </Box>
    );
  }

  if (error || !tournament) {
    return (
      <Box sx={{ p: 2, bgcolor: '#ffebee', borderRadius: 2, textAlign: 'center', maxWidth: '100%', overflowX: 'auto' }}>
        <Typography color="error" variant="h6" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
          Error al cargar el torneo
        </Typography>
        <Typography color="error" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
          {error || 'No se pudo cargar el torneo. El servidor podría estar inactivo.'}
        </Typography>
        <Button onClick={() => fetchTournament()} variant="contained" sx={{ mt: 2, bgcolor: '#1976d2', mr: 1, minHeight: 40 }} aria-label="Reintentar carga">
          Reintentar
        </Button>
        <Button onClick={() => window.location.reload()} variant="outlined" sx={{ mt: 2, minHeight: 40 }} aria-label="Recargar página">
          Recargar Página
        </Button>
      </Box>
    );
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => fetchTournament()}>
      <style>{swiperStyles}</style>
      <Box
        sx={{
          p: { xs: 0.5, sm: 2 },
          bgcolor: '#f0f4f8',
          width: '100%',
          maxWidth: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflowX: 'auto',
        }}
      >
        <Box
          sx={{
            bgcolor: '#fff',
            p: { xs: 0.5, sm: 2 },
            borderRadius: 2,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            maxWidth: '100%',
            mx: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Typography
            variant="h5"
            gutterBottom
            sx={{
              fontSize: { xs: '1.125rem', sm: '1.5rem' },
              color: '#1976d2',
              fontWeight: 700,
              textAlign: 'center',
            }}
          >
            {tournament.name} - {tournament.sport} ({tournament.format?.mode || 'No definido'})
          </Typography>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            sx={{ mb: 1 }}
            variant="scrollable"
            scrollButtons="auto"
            aria-label="Pestañas de navegación del torneo"
          >
            <Tab label="Detalles" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, minWidth: 80 }} aria-label="Detalles del torneo" />
            <Tab label="Grupos" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, minWidth: 80 }} aria-label="Grupos del torneo" />
            <Tab label="Posiciones" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, minWidth: 80 }} aria-label="Posiciones del torneo" />
            {tournament.rounds && tournament.rounds.length > 0 && (
              <Tab label="Llave" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, minWidth: 80 }} aria-label="Llave del torneo" />
            )}
          </Tabs>

          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <Swiper
              modules={[Navigation, Pagination]}
              navigation
              pagination={{ clickable: true }}
              spaceBetween={{ xs: 5, sm: 10 }}
              slidesPerView={1}
              autoHeight={true}
              touchRatio={1}
              onSlideChange={handleSlideChange}
              initialSlide={tabValue}
              style={{ width: '100%' }}
              ref={swiperRef}
              aria-label="Carrusel de vistas del torneo"
            >
              <SwiperSlide>
                <Box sx={{ p: { xs: 0.5, sm: 2 }, overflowY: 'auto', maxWidth: '100%' }}>
                  <TournamentDetails tournament={tournament} />
                </Box>
              </SwiperSlide>
              <SwiperSlide>
                <Box sx={{ p: { xs: 0.5, sm: 2 }, overflowY: 'auto', maxWidth: '100%' }}>
                  <TournamentGroups
                    tournament={tournament}
                    role={role}
                    generateKnockoutPhase={generateKnockoutPhase}
                    getPlayerName={getPlayerName}
                    fetchTournament={fetchTournament}
                    addNotification={addNotification}
                  />
                </Box>
              </SwiperSlide>
              <SwiperSlide>
                <Box sx={{ p: { xs: 0.5, sm: 2 }, overflowY: 'auto', maxWidth: '100%' }}>
                  <TournamentStandings tournament={tournament} standings={standings} getPlayerName={getPlayerName} />
                </Box>
              </SwiperSlide>
              {tournament.rounds && tournament.rounds.length > 0 && (
                <SwiperSlide>
                  <Box sx={{ p: { xs: 0.5, sm: 2 }, overflowY: 'auto', maxWidth: '100%' }}>
                    <TournamentBracket
                      tournament={tournament}
                      role={role}
                      getPlayerName={getPlayerName}
                      getRoundName={getRoundName}
                      advanceEliminationRound={advanceEliminationRound}
                      fetchTournament={fetchTournament}
                      addNotification={addNotification}
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
                onClick={handleConfirmFinish}
                sx={{
                  bgcolor: '#388e3c',
                  ':hover': { bgcolor: '#2e7d32' },
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  py: { xs: 1, sm: 1.5 },
                  minHeight: { xs: 40, sm: 48 },
                  minWidth: { xs: 120, sm: 160 },
                }}
                aria-label="Finalizar torneo"
              >
                Finalizar Torneo
              </Button>
            </Box>
          )}
        </Box>

        <Dialog open={confirmFinishOpen} onClose={() => setConfirmFinishOpen(false)} aria-labelledby="confirm-finish-dialog-title">
          <DialogTitle id="confirm-finish-dialog-title">Confirmar Finalización</DialogTitle>
          <DialogContent>
            <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
              ¿Estás seguro de que quieres finalizar el torneo? Esta acción no se puede deshacer.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmFinishOpen(false)} aria-label="Cancelar finalización">
              Cancelar
            </Button>
            <Button onClick={handleFinishConfirmed} variant="contained" color="error" aria-label="Confirmar finalización">
              Finalizar
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ErrorBoundary>
  );
};

export default TournamentInProgress;