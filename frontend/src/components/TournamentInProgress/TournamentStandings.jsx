import React from 'react';
import { Box, Typography, Card, CardContent, Avatar } from '@mui/material';

const TournamentStandings = ({ tournament, standings }) => {
  return (
    <Box sx={{ p: 2, height: 'auto' }}>
      <Box sx={{ width: '100%' }}>
        <Typography
          variant="h5"
          gutterBottom
          sx={{ fontSize: 'clamp(1.25rem, 6vw, 1.5rem)' }}
        >
          Posiciones
        </Typography>
        {standings && Array.isArray(standings) && standings.length > 0 ? (
          standings.map((group, groupIndex) => (
            <Box key={group.groupName || groupIndex} sx={{ mb: 0.5 }}>
              <Typography
                variant="h6"
                sx={{ fontSize: 'clamp(1rem, 5vw, 1.25rem)', mb: 0.5 }}
              >
                {group.groupName || `Grupo ${groupIndex + 1}`}
              </Typography>
              {group.standings && Array.isArray(group.standings) && group.standings.length > 0 ? (
                group.standings.map((player, idx) => {
                  const participant = tournament.participants.find(p =>
                    (typeof p.player1 === 'object' ? p.player1?._id?.toString() || p.player1?.$oid : p.player1?.toString()) === player.playerId?.toString()
                  );
                  const player1Name = participant?.player1?.firstName
                    ? `${participant.player1.firstName} ${participant.player1.lastName || ''}`
                    : 'Jugador no encontrado';
                  const player2Name =
                    tournament.format?.mode === 'Dobles' && participant?.player2
                      ? `${participant.player2.firstName || ''} ${participant.player2.lastName || ''}`
                      : '';
                  const label =
                    tournament.format?.mode === 'Singles'
                      ? player1Name
                      : `${player1Name} / ${player2Name || 'Jugador no encontrado'}`;
                  return (
                    <Card
                      key={idx}
                      sx={{
                        bgcolor: '#ffffff',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                        width: '100%',
                        maxWidth: '100%',
                        mb: 0.5,
                        borderRadius: 1,
                      }}
                    >
                      <CardContent sx={{ p: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar
                            sx={{ bgcolor: '#01579b', width: 24, height: 24 }}
                          >
                            {player1Name.charAt(0)}
                          </Avatar>
                          <Typography sx={{ fontSize: 'clamp(0.75rem, 3vw, 0.875rem)', fontWeight: 'bold' }}>
                            {label}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                          <Typography sx={{ fontSize: 'clamp(0.75rem, 3vw, 0.875rem)' }}>
                            <strong>V:</strong> {player.wins || 0}
                          </Typography>
                          <Typography sx={{ fontSize: 'clamp(0.75rem, 3vw, 0.875rem)' }}>
                            <strong>S:</strong> {player.setsWon || 0}
                          </Typography>
                          <Typography sx={{ fontSize: 'clamp(0.75rem, 3vw, 0.875rem)' }}>
                            <strong>JG:</strong> {player.gamesWon || 0}
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                <Typography sx={{ textAlign: 'center', fontSize: 'clamp(0.75rem, 3vw, 0.875rem)' }}>
                  No hay posiciones disponibles para este grupo.
                </Typography>
              )}
            </Box>
          ))
        ) : (
          <Typography sx={{ textAlign: 'center', fontSize: 'clamp(0.75rem, 3vw, 0.875rem)' }}>
            No hay posiciones disponibles para mostrar.
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default TournamentStandings;