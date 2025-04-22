import React, { useMemo } from 'react';
import { Box, Typography, Card, CardContent, Avatar, CircularProgress } from '@mui/material';
import { getPlayerName } from './tournamentUtils.js';

const StandingCard = ({ player, participant, tournament, index }) => {
  const player1Name = participant?.player1?.firstName
    ? `${participant.player1.firstName} ${participant.player1.lastName || ''}`
    : 'Jugador no encontrado';
  const player2Name =
    tournament.format?.mode === 'Dobles' && participant?.player2
      ? `${participant.player2.firstName || ''} ${participant.player2.lastName || ''}`
      : '';
  const label = tournament.format?.mode === 'Singles' ? player1Name : `${player1Name} / ${player2Name || 'Jugador no encontrado'}`;

  return (
    <Card
      sx={{
        bgcolor: '#fff',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        width: '100%',
        mb: 1,
        borderRadius: 2,
      }}
      aria-label={`Posición ${index + 1}: ${label}`}
    >
      <CardContent sx={{ p: { xs: 1, sm: 2 }, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar sx={{ bgcolor: '#1976d2', width: { xs: 28, sm: 32 }, height: { xs: 28, sm: 32 } }}>
            {player1Name.charAt(0)}
          </Avatar>
          <Typography sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, fontWeight: 'bold' }}>
            {label}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: { xs: 1, sm: 2 }, flexWrap: 'wrap' }}>
          <Typography sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
            <strong>V:</strong> {player.wins || 0}
          </Typography>
          <Typography sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
            <strong>S:</strong> {player.setsWon || 0}
          </Typography>
          <Typography sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
            <strong>JG:</strong> {player.gamesWon || 0}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

const TournamentStandings = ({ tournament, standings }) => {
  const isLoading = !tournament || !standings;

  const sortedStandings = useMemo(() => {
    if (!standings || !Array.isArray(standings)) return [];
    return standings.map((group) => ({
      ...group,
      standings: [...(group.standings || [])].sort(
        (a, b) => b.wins - a.wins || b.setsWon - a.setsWon || b.gamesWon - a.gamesWon
      ),
    }));
  }, [standings]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
        <CircularProgress aria-label="Cargando posiciones" />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1, sm: 2 }, height: '100%', overflowY: 'auto' }}>
      <Box sx={{ width: '100%' }}>
        <Typography
          variant="h5"
          gutterBottom
          sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' }, color: '#1976d2' }}
        >
          Posiciones
        </Typography>
        {sortedStandings.length > 0 ? (
          sortedStandings.map((group, groupIndex) => (
            <Box key={group.groupName || groupIndex} sx={{ mb: 2 }}>
              <Typography
                variant="h6"
                sx={{ fontSize: { xs: '1rem', sm: '1.25rem' }, mb: 1, color: '#1976d2' }}
              >
                {group.groupName || `Grupo ${groupIndex + 1}`}
              </Typography>
              {group.standings && Array.isArray(group.standings) && group.standings.length > 0 ? (
                group.standings.map((player, idx) => {
                  const participant = tournament.participants.find((p) =>
                    (typeof p.player1 === 'object' ? p.player1?._id?.toString() || p.player1?.$oid : p.player1?.toString()) === player.playerId?.toString()
                  );
                  return (
                    <StandingCard
                      key={idx}
                      player={player}
                      participant={participant}
                      tournament={tournament}
                      index={idx}
                    />
                  );
                })
              ) : (
                <Typography sx={{ textAlign: 'center', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                  No hay posiciones disponibles para este grupo.
                </Typography>
              )}
            </Box>
          ))
        ) : (
          <Typography sx={{ textAlign: 'center', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
            No hay posiciones disponibles para mostrar.
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default TournamentStandings;