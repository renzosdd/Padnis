import React, { useMemo } from 'react';
import { Box, Typography, Card, CardContent, Avatar, CircularProgress } from '@mui/material';

const TournamentStandings = ({ tournament, standings, getPlayerName }) => {
  if (!standings || !Array.isArray(standings)) {
    console.warn('Invalid standings data:', standings);
    return (
      <Box sx={{ p: { xs: 0.5, sm: 2 }, maxWidth: '100%', overflowX: 'auto' }}>
        <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
          No hay posiciones disponibles para mostrar.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 0.5, sm: 2 }, maxWidth: '100%', overflowX: 'auto' }}>
      <Typography variant="h6" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' }, mb: 1, color: '#1976d2' }}>
        Posiciones
      </Typography>
      {standings.map((group, index) => (
        <Box key={group.groupName || index} sx={{ mb: 2 }}>
          <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' }, fontWeight: 'bold', mb: 1 }}>
            {group.groupName}
          </Typography>
          {group.standings && Array.isArray(group.standings) && group.standings.length > 0 ? (
            group.standings.map((player, idx) => (
              <Card
                key={player.playerId}
                sx={{
                  mb: 1,
                  bgcolor: '#fff',
                  border: '1px solid #e0e0e0',
                  borderRadius: 2,
                  height: { xs: 80, sm: 100 },
                }}
                aria-label={`Posición ${idx + 1} en ${group.groupName}`}
              >
                <CardContent sx={{ p: 1, display: 'flex', alignItems: 'center' }}>
                  <Avatar sx={{ bgcolor: '#1976d2', width: 24, height: 24, fontSize: '0.75rem', mr: 1 }}>
                    {getPlayerName(tournament, player.playerId)?.[0]}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      sx={{
                        fontSize: { xs: '0.75rem', sm: '0.875rem' },
                        fontWeight: 'bold',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: { xs: '120px', sm: '200px' },
                      }}
                    >
                      {getPlayerName(tournament, player.playerId)}
                      {player.player2Id && ` / ${getPlayerName(tournament, player.player2Id)}`}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                      <Typography sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, width: 40 }}>
                        V: {player.wins || 0}
                      </Typography>
                      <Typography sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, width: 40 }}>
                        S: {player.setsWon || 0}
                      </Typography>
                      <Typography sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, width: 40 }}>
                        JG: {player.gamesWon || 0}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))
          ) : (
            <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
              No hay posiciones disponibles para este grupo.
            </Typography>
          )}
        </Box>
      ))}
    </Box>
  );
};

export default TournamentStandings;