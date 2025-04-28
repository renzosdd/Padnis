import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
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

const TournamentInProgress = memo(({ tournamentId, role, addNotification, onFinishTournament }) => {
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [isFetching, setIsFetching] = useState(false);
  const [hasFetched, setHasFetched] = useState(false); // Nueva bandera para evitar múltiples solicitudes
  const swiperRef = useRef(null);
  const { standings, fetchTournament, generateKnockoutPhase, advanceEliminationRound } = useTournament(tournamentId);

  console.log('TournamentInProgress rendered:', { tournamentId, isFetching, loading, tabValue });

  const fetchTournamentData = useCallback(async () => {
    if (isFetching || hasFetched) {
      console.log('Fetch already in progress or already fetched, skipping...');
      return;
    }
    setIsFetching(true);
    setLoading(true);
    try {
      const data = await fetchTournament();
      console.log('Fetched tournament data in TournamentInProgress:', data);
      setTournament(data);
      setHasFetched(true); // Marcamos que ya se ha solicitado los datos
      if (data.status !== 'En curso') {
        onFinishTournament(data);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error al cargar el torneo');
      addNotification('Error al cargar el torneo', 'error');
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  }, [fetchTournament, addNotification, onFinishTournament, isFetching, hasFetched]);

  useEffect(() => {
    if (tournamentId) {
      fetchTournamentData();
    } else {
      setError('No se proporcionó un ID de torneo válido');
      setLoading(false);
    }
  }, [tournamentId, fetchTournamentData]);

  const handleTabChange = (event, newValue) => {
    console.log('handleTabChange triggered - New tab value:', newValue, 'Swiper ref:', swiperRef.current);
    setTabValue(newValue);
    if (swiperRef.current && swiperRef.current.swiper) {
      swiperRef.current.swiper.slideTo(newValue);
    } else {
      console.warn('Swiper ref is not initialized properly during tab change');
    }
  };

  const handleSlideChange = (swiper) => {
    console.log('Slide changed to index:', swiper.activeIndex);
    setTabValue(swiper.activeIndex);
  };

  const handleGenerateKnockout = useCallback(async () => {
    if (isFetching) return;
    setHasFetched(false); // Permitir una nueva solicitud después de generar la fase de eliminación
    try {
      await generateKnockoutPhase();
      await fetchTournamentData();
    } catch (err) {
      addNotification('Error al generar la fase de eliminación', 'error');
    }
  }, [generateKnockoutPhase, addNotification, fetchTournamentData, isFetching]);

  const handleAdvanceEliminationRound = useCallback(async () => {
    if (isFetching) return;
    setHasFetched(false); // Permitir una nueva solicitud después de avanzar la ronda
    try {
      await advanceEliminationRound();
      await fetchTournamentData();
    } catch (err) {
      addNotification('Error al avanzar la ronda de eliminación', 'error');
    }
  }, [advanceEliminationRound, addNotification, fetchTournamentData, isFetching]);

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

  const hasGroups = Array.isArray(tournament.groups) && tournament.groups.length > 0;
  const hasRounds = Array.isArray(tournament.rounds) && tournament.rounds.length > 0;

  // Ensure tabs and slides are aligned
  const tabConfig = [
    { label: 'Detalles', component: <TournamentDetails tournament={tournament} /> },
    ...(hasGroups
      ? [
          {
            label: 'Grupos',
            component: (
              <TournamentGroups
                tournament={tournament}
                role={role}
                generateKnockoutPhase={handleGenerateKnockout}
                getPlayerName={getPlayerName}
                fetchTournament={fetchTournamentData}
                addNotification={addNotification}
                groups={tournament.groups || []} // Aseguramos que groups siempre sea un arreglo
              />
            ),
          },
          {
            label: 'Posiciones',
            component: (
              <TournamentStandings
                tournament={tournament}
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
            component: (
              <TournamentBracket
                tournament={tournament}
                role={role}
                getPlayerName={getPlayerName}
                getRoundName={getRoundName}
                advanceEliminationRound={handleAdvanceEliminationRound}
                fetchTournament={fetchTournamentData}
                addNotification={addNotification}
                matches={tournament.rounds || []} // Aseguramos que rounds siempre sea un arreglo
              />
            ),
          },
        ]
      : []),
  ];

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
        {tabConfig.map((tab, index) => (
          <Tab
            key={index}
            label={tab.label}
            sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
          />
        ))}
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
        lazy={true} // Habilita la carga perezosa para mejorar el rendimiento
      >
        {tabConfig.map((tab, index) => (
          <SwiperSlide key={index}>
            <ErrorBoundary>
              {tab.component}
            </ErrorBoundary>
          </SwiperSlide>
        ))}
      </Swiper>
    </Box>
  );
});

export default TournamentInProgress;