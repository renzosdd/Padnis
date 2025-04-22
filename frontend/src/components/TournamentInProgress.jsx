import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Box, Typography, Button, useMediaQuery, useTheme } from '@mui/material';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import TournamentDetails from './TournamentDetails';
import TournamentGroups from './TournamentGroups';
import TournamentStandings from './TournamentStandings';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

const TournamentInProgress = ({ tournamentId, onFinishTournament }) => {
  const { user, role } = useAuth();
  const { addNotification } = useNotification();
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    const fetchTournament = async () => {
      try {
        const response = await axios.get(`https://padnis.onrender.com/api/tournaments/${tournamentId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        setTournament(response.data);
      } catch (error) {
        addNotification(`Error al cargar el torneo: ${error.response?.data?.message || error.message}`, 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchTournament();
  }, [tournamentId, addNotification]);

  const handleGenerateKnockout = async () => {
    try {
      const response = await axios.put(
        `https://padnis.onrender.com/api/tournaments/${tournamentId}`,
        { status: 'En curso', draft: false, rounds: generateKnockoutRounds(tournament) },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setTournament(response.data);
      addNotification('Fase eliminatoria generada', 'success');
    } catch (error) {
      addNotification(`Error al generar fase eliminatoria: ${error.response?.data?.message || error.message}`, 'error');
    }
  };

  const handleFinishTournament = async () => {
    try {
      const response = await axios.put(
        `https://padnis.onrender.com/api/tournaments/${tournamentId}`,
        { status: 'Finalizado', winner: null, runnerUp: null }, // Update with actual winner/runner-up logic
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      onFinishTournament(response.data);
      addNotification('Torneo finalizado', 'success');
    } catch (error) {
      addNotification(`Error al finalizar torneo: ${error.response?.data?.message || error.message}`, 'error');
    }
  };

  const generateKnockoutRounds = (tournament) => {
    // Placeholder logic for knockout rounds
    return [];
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress aria-label="Cargando torneo" />
      </Box>
    );
  }

  if (!tournament) {
    return (
      <Box sx={{ p: isMobile ? 2 : 3, textAlign: 'center' }}>
        <Typography variant={isMobile ? 'h6' : 'h5'} color="error">
          No se pudo cargar el torneo
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: isMobile ? 2 : 3, bgcolor: '#f0f4f8', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant={isMobile ? 'h5' : 'h4'} sx={{ color: '#1976d2', textAlign: 'center' }}>
        {tournament.name}
      </Typography>
      <Box sx={{ flex: 0, minHeight: 0 }}>
        <Swiper
          modules={[Navigation, Pagination]}
          navigation
          pagination={{ clickable: true }}
          spaceBetween={10}
          slidesPerView={1}
          style={{ width: '100%' }}
        >
          <SwiperSlide style={{ height: 'auto' }}>
            <TournamentDetails tournament={tournament} />
          </SwiperSlide>
          <SwiperSlide style={{ height: 'auto' }}>
            <TournamentGroups tournament={tournament} onUpdate={() => fetchTournaments()} />
          </SwiperSlide>
          <SwiperSlide style={{ height: 'auto' }}>
            <TournamentStandings tournament={tournament} />
          </SwiperSlide>
        </Swiper>
      </Box>
      {(role === 'admin' || role === 'coach') && (
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 2 }}>
          {tournament.type === 'RoundRobin' && (
            <Button
              variant="contained"
              onClick={handleGenerateKnockout}
              sx={{ bgcolor: '#1976d2', fontSize: isMobile ? '0.75rem' : '0.875rem' }}
              aria-label="Generar fase eliminatoria"
            >
              Generar Fase Eliminatoria
            </Button>
          )}
          <Button
            variant="contained"
            color="secondary"
            onClick={handleFinishTournament}
            sx={{ bgcolor: '#d32f2f', fontSize: isMobile ? '0.75rem' : '0.875rem' }}
            aria-label="Finalizar torneo"
          >
            Finalizar Torneo
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default TournamentInProgress;