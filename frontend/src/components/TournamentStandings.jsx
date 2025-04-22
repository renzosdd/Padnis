import React from 'react';
import { Box, Typography, Card, CardContent, Avatar } from '@mui/material';

const TournamentStandings = ({ tournament, standings, getPlayerName }) => {
  return (
    <Box sx={{ p: { xs: 1, sm: 2 } }}>
      <Typography variant="h5" gutterBottom sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' }, color: '#1976d2' }}>
        Posiciones
      </Typography>
      {standings.map((group, groupIndex) => (
        <Box key={groupIndex} sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' }, color: '#1976d2', mb: 1 }}>
            {tournament.groups[groupIndex]?.name || `Grupo ${groupIndex + 1}`}
          </Typography>
          {group.map((player, index) => (
            <Card
              key={player.id}
              sx={{
                mb: 1,
                p: 1,
                bgcolor: '#fff',
                border: '1px solid #e0e0e0',
                borderRadius: 2,
              }}
              aria-label={`Posición ${index + 1}: ${player.name}`}
            >
              <CardContent sx={{ display: 'flex', alignItems: 'center', p: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                  <Avatar sx={{ bgcolor: '#1976d2', width: 24, height: 24, fontSize: '0.75rem' }}>
                    {player.name[0]}
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
                    {player.name}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, minWidth: '120px', justifyContent: 'flex-end' }}>
                  <Typography sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, fontWeight: 'bold' }}>
                    V: {player.victories}
                  </Typography>
                  <Typography sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, fontWeight: 'bold' }}>
                    S: {player.sets}
                  </Typography>
                  <Typography sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, fontWeight: 'bold' }}>
                    JG: {player.games}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      ))}
    </Box>
  );
};

export default TournamentStandings;