import React from 'react';
import { Box, Typography, Chip, Avatar } from '@mui/material';

const TournamentDetails = ({ tournament }) => {
  return (
    <Box sx={{ p: 2, height: 'auto' }}>
      <Box>
        <Typography sx={{ fontSize: 'clamp(0.875rem, 4vw, 1rem)', mb: 1 }}>
          <strong>Nombre:</strong> {tournament.name}
        </Typography>
        <Typography sx={{ fontSize: 'clamp(0.875rem, 4vw, 1rem)', mb: 1 }}>
          <strong>Club:</strong> {tournament.club?.name || 'No definido'}
        </Typography>
        <Typography sx={{ fontSize: 'clamp(0.875rem, 4vw, 1rem)', mb: 1 }}>
          <strong>Categoría:</strong> {tournament.category || 'No definida'}
        </Typography>
        <Typography sx={{ fontSize: 'clamp(0.875rem, 4vw, 1rem)', mb: 1 }}>
          <strong>Tipo:</strong> {tournament.type || 'No definido'}
        </Typography>
        <Typography sx={{ fontSize: 'clamp(0.875rem, 4vw, 1rem)', mb: 1 }}>
          <strong>Deporte:</strong> {tournament.sport || 'No definido'}
        </Typography>
        <Typography sx={{ fontSize: 'clamp(0.875rem, 4vw, 1rem)', mb: 1 }}>
          <strong>Modalidad:</strong> {tournament.format?.mode || 'No definido'}
        </Typography>
        <Typography sx={{ fontSize: 'clamp(0.875rem, 4vw, 1rem)', mb: 1 }}>
          <strong>Sets por partido:</strong> {tournament.format?.sets || 'No definido'}
        </Typography>
        <Typography sx={{ fontSize: 'clamp(0.875rem, 4vw, 1rem)', mb: 1 }}>
          <strong>Juegos por set:</strong> {tournament.format?.gamesPerSet || 'No definido'}
        </Typography>
        <Typography sx={{ fontSize: 'clamp(0.875rem, 4vw, 1rem)', mb: 1 }}>
          <strong>Participantes:</strong>
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', mt: 1, gap: 1 }}>
          {tournament.participants && tournament.participants.length > 0 ? (
            tournament.participants.map(part => {
              const player1Name = part.player1?.firstName
                ? `${part.player1.firstName} ${part.player1.lastName || ''}`
                : 'Jugador no encontrado';
              const player2Name =
                tournament.format?.mode === 'Dobles' && part.player2
                  ? `${part.player2.firstName || ''} ${part.player2.lastName || ''}`
                  : '';
              const label =
                tournament.format?.mode === 'Singles'
                  ? player1Name
                  : `${player1Name} / ${player2Name || 'Jugador no encontrado'}`;
              return (
                <Chip
                  key={part.player1?._id || part.player1?.$oid || part.player1}
                  avatar={<Avatar>{player1Name.charAt(0)}</Avatar>}
                  label={label}
                  sx={{ m: 0.5, fontSize: 'clamp(0.75rem, 3.5vw, 0.875rem)' }}
                />
              );
            })
          ) : (
            <Typography>No hay participantes disponibles.</Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default TournamentDetails;