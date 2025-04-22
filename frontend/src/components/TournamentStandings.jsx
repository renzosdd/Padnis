import React from 'react';
import { Box, Typography, Card, CardContent, Avatar } from '@mui/material';

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
        mb: 1,
        p: 1,
        bgcolor: '#fff',
        border: '1px solid #e0e0e0',
        borderRadius: 2,
      }}
      aria-label={`Posición ${index + 1}: ${label}`}
    >
      <CardContent sx={{ display: 'flex', alignItems: 'center', p: 1, justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
          <Avatar sx={{ bgcolor: '#1976d2', width: 24, height: 24, fontSize: '0.75rem' }}>
            {player1Name[0]}
          </Avatar>
          <Typography
            sx={{
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              maxWidth: { xs: '150px', sm: '200px' },
              textOverflow: 'ellipsis',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, minWidth: '120px', justifyContent: 'flex-end' }}>
          <Typography sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, fontWeight: 'bold' }}>
            V: {player.wins || 0}
          </Typography>
          <Typography sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, fontWeight: 'bold' }}>
            S: {player.setsWon || 0}
          </Typography>
          <Typography sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, fontWeight: 'bold' }}>
            JG: {player.gamesWon || 0}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

const TournamentStandings = ({ tournament, standings, getPlayerName }) => {
  const isLoading = !tournament || !standings;

  // Validate and sort standings
  const sortedStandings = useMemo(() => {
    if (!standings || !Array.isArray(standings)) {
      console.warn('Invalid standings data:', standings);
      return [];
    }
    return standings.map((group) => ({
      ...group,
      standings: Array.isArray(group.standings)
        ? [...group.standings].sort(
            (a, b) => (b.wins || 0) - (a.wins || 0) || (b.setsWon || 0) - (a.setsWon || 0) || (b.gamesWon || 0) - (a.gamesWon || 0)
          )
        : [],
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
    <Box sx={{ p: { xs: 1, sm: 2 } }}>
      <Typography variant="h5" gutterBottom sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' }, color: '#1976d2' }}>
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
            {group.standings.length > 0 ? (
              group.standings.map((player, idx) => {
                const participant = tournament.participants.find((p) =>
                  (typeof p.player1 === 'object' ? p.player1?._id?.toString() || p.player1?.$oid : p.player1?.toString()) === player.playerId?.toString()
                );
                return (
                  <StandingCard
                    key={player.playerId || idx}
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
  );
};

export default TournamentStandings;