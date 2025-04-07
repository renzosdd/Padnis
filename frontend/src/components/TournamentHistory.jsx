import React from 'react';
import { Box, Typography, List, ListItem, ListItemText } from '@mui/material';

const TournamentHistory = ({ tournaments }) => {
  const completedTournaments = tournaments.filter(t => t.completed);

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Historial de Torneos</Typography>
      {completedTournaments.length > 0 ? (
        <List>
          {completedTournaments.map(tournament => (
            <ListItem key={tournament._id}>
              <ListItemText primary={`${tournament.name} - ${tournament.category}`} secondary={`Finalizado el ${tournament.startDate}`} />
            </ListItem>
          ))}
        </List>
      ) : (
        <Typography>No hay torneos finalizados.</Typography>
      )}
    </Box>
  );
};

export default TournamentHistory;