import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Tabs,
  Tab,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import TournamentDetails from './TournamentDetails.jsx';
import TournamentGroups from './TournamentGroups.jsx';
import TournamentStandings from './TournamentStandings.jsx';
import TournamentBracket from './TournamentBracket.jsx';
import useTournament from './useTournament.js';
import { getPlayerName, getRoundName } from './tournamentUtils.js';

// Error Boundary Component
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
            Ocurrió un error al renderizar este componente: {this.state.error?.message || 'Error desconocido'}.
            Por favor, intenta recargar la página o contacta al soporte.
          </Alert>
        </Box>
      );
    }
    return this.props.children;
  }
}

const TournamentInProgress = ({ role, addNotification }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const swiperRef = useRef(null);
  const { standings, fetchTournament, generateKnockoutPhase, advanceEliminationRound } = useTournament(id);

  const fetchTournamentData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchTournament();
      setTournament(data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error al cargar el torneo');
      addNotification('Error al cargar el torneo', 'error');
    } finally {
      setLoading(false);
    }
  }, [fetchTournament, addNotification]);

  useEffect(() => {
    fetchTournamentData();
  }, [fetchTournamentData]);

  const handleTabChange = (event, newValue) => {
    console.log('handleTabChange triggered - New tab value:', newValue, 'Swiper ref:', swiperRef.current);
    if (swiperRef.current && swiperRef.current.swiper) {
      swiperRef.current.swiper.slideTo(newValue);
      setTabValue(newValue);
    } else {
      console.warn('Swiper ref is not initialized properly during tab change');
      setTabValue(newValue); // Fallback to update tabValue
    }
  };

  const handleSlideChange = (swiper) => {
    console.log('Slide changed to index:', swiper.activeIndex);
    setTabValue(swiper.activeIndex);
  };

  const handleGenerateKnockout = async () => {
    try {
      await generateKnockoutPhase();
      await fetchTournamentData();
    } catch (err) {
      addNotification('Error al generar la fase de eliminación', 'error');
    }
  };

  const handleAdvanceEliminationRound = async () => {
    try {
      await advanceEliminationRound();
      await fetchTournamentData();
    } catch (err) {
      addNotification('Error al avanzar la ronda de eliminación', 'error');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
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
        <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
          No se encontró el torneo.
        </Typography>
      </Box>
    );
  }

  const hasGroups = tournament.groups && tournament.groups.length > 0;
  const hasRounds = tournament.rounds && tournament.rounds.length > 0;

  return (
    <Box sx={{ p: { xs: 1, sm: 2 } }}>
      <Typography variant="h5" sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' }, mb: 1 }}>
        {tournament.name || 'Torneo sin nombre'}
      </Typography>
      <Tabs
        value={tabValue}
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons="auto"
        aria-label="Pestañas de navegación del torneo"
        sx={{ mb: 2 }}
      >
        <Tab label="Detalles" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }} />
        {hasGroups && <Tab label="Grupos" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }} />}
        {hasGroups && <Tab label="Posiciones" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }} />}
        {hasRounds && <Tab label="Llave" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }} />}
      </Tabs>
      <Swiper
        ref={swiperRef}
        spaceBetween={10}
        slidesPerView={1}
        onSlideChange={handleSlideChange}
        onSwiper={(swiper) => {
          console.log('Swiper initialized:', swiper);
          swiperRef.current = { swiper };
        }}
        modules={[Navigation, Pagination]}
        pagination={{ clickable: true }}
        style={{ width: '100%' }}
      >
        <SwiperSlide>
          <ErrorBoundary>
            <TournamentDetails tournament={tournament} />
          </ErrorBoundary>
        </SwiperSlide>
        {hasGroups && (
          <SwiperSlide>
            <ErrorBoundary>
              <TournamentGroups
                tournament={tournament}
                role={role}
                generateKnockoutPhase={handleGenerateKnockout}
                getPlayerName={getPlayerName}
                fetchTournament={fetchTournamentData}
                addNotification={addNotification}
              />
            </ErrorBoundary>
          </SwiperSlide>
        )}
        {hasGroups && (
          <SwiperSlide>
            <ErrorBoundary>
              <TournamentStandings
                tournament={tournament}
                standings={standings}
                getPlayerName={getPlayerName}
              />
            </ErrorBoundary>
          </SwiperSlide>
        )}
        {hasRounds && (
          <SwiperSlide>
            <ErrorBoundary>
              <TournamentBracket
                tournament={tournament}
                role={role}
                getPlayerName={getPlayerName}
                getRoundName={getRoundName}
                advanceEliminationRound={handleAdvanceEliminationRound}
                fetchTournament={fetchTournamentData}
                addNotification={addNotification}
              />
            </ErrorBoundary>
          </SwiperSlide>
        )}
      </Swiper>
    </Box>
  );
};

export default TournamentInProgress;