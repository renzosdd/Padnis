import React from 'react';
import { Box, Typography, List, ListItem, ListItemText, ListItemAvatar, Avatar } from '@mui/material';
import { EmojiEvents } from '@mui/icons-material';

const TournamentHistory = ({ tournaments }) => {
  const completedTournaments = tournaments.filter(t => t.status === 'Finalizado');

  return (
    <Box sx={{ p: 2, bgcolor: '#f5f5f5', minHeight: '100vh' }}>
      <Typography variant="h5" gutterBottom sx={{ color: '#333', fontWeight: 600, textAlign: 'center' }}>
        Historial de Torneos
      </Typography>
      {completedTournaments.length > 0 ? (
        <List>
          {completedTournaments.map(tournament => (
            <ListItem key={tournament._id} sx={{ bgcolor: '#ffffff', mb: 1, borderRadius: 2, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: '#388e3c' }}>
                  <EmojiEvents />
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={`${tournament.name} - ${tournament.category || 'Sin categoría'}`}
                secondary={`Finalizado el ${new Date(tournament.endDate).toLocaleDateString()}`}
                primaryTypographyProps={{ fontWeight: 500 }}
                secondaryTypographyProps={{ color: '#666' }}
              />
            </ListItem>
          ))}
        </List>
      ) : (
        <Typography sx={{ textAlign: 'center', color: '#666' }}>No hay torneos finalizados.</Typography>
      )}
    </Box>
  );
};

export default TournamentHistory;