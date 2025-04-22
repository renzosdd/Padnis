import React, { useMemo } from 'react';
import { Box, Typography, Chip, Avatar, Card, CardContent, CircularProgress } from '@mui/material';
import { getPlayerName } from './tournamentUtils.js';

const TournamentDetails = ({ tournament }) => {
  const isLoading = !tournament;

  const participantChips = useMemo(() => {
    if (!tournament?.participants || !Array.isArray(tournament.participants)) return [];
    return tournament.participants.map((part) => {
      const player1Name = part.player1?.firstName
        ? `${part.player1.firstName} ${part.player1.lastName || ''}`
        : 'Jugador no encontrado';
      const player2Name =
        tournament.format?.mode === 'Dobles' && part.player2
          ? `${part.player2.firstName || ''} ${part.player2.lastName || ''}`
          : '';
      const label = tournament.format?.mode === 'Singles' ? player1Name : `${player1Name} / ${player2Name || 'Jugador no encontrado'}`;
      return (
        <Chip
          key={part.player1?._id || part.player1?.$oid || part.player1}
          avatar={<Avatar>{player1Name.charAt(0)}</Avatar>}
          label={label}
          sx={{ m: 0.5, fontSize: { xs: '0.75rem', sm: '0.875rem' }, height: { xs: 28, sm: 32 } }}
          aria-label={`Participante ${label}`}
        />
      );
    });
  }, [tournament]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
        <CircularProgress aria-label="Cargando detalles del torneo" />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1, sm: 2 }, height: '100%' }}>
      <Card sx={{ bgcolor: '#fff', borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography variant="h6" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' }, mb: 2, color: '#1976d2' }}>
            Detalles del Torneo
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
              <strong>Nombre:</strong> {tournament.name || 'No definido'}
            </Typography>
            <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
              <strong>Club:</strong> {tournament.club?.name || 'No definido'}
            </Typography>
            <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
              <strong>Categoría:</strong> {tournament.category || 'No definida'}
            </Typography>
            <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
              <strong>Tipo:</strong> {tournament.type || 'No definido'}
            </Typography>
            <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
              <strong>Deporte:</strong> {tournament.sport || 'No definido'}
            </Typography>
            <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
              <strong>Modalidad:</strong> {tournament.format?.mode || 'No definido'}
            </Typography>
            <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
              <strong>Sets por partido:</strong> {tournament.format?.sets || 'No definido'}
            </Typography>
            <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
              <strong>Juegos por set:</strong> {tournament.format?.gamesPerSet || 'No definido'}
            </Typography>
            <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' }, mt: 1 }}>
              <strong>Participantes:</strong>
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {participantChips.length > 0 ? (
                participantChips
              ) : (
                <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                  No hay participantes disponibles.
                </Typography>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default TournamentDetails;