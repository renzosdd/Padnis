import React, { useState } from 'react';
import { Box, Typography, TextField } from '@mui/material';

const MatchCard = ({ matchResult, totalSets, handleLocalInputChange, matchErrors }) => {
  const [localResult, setLocalResult] = useState(() => {
    const initialResult = { ...matchResult };
    if (!initialResult.sets || initialResult.sets.length < totalSets) {
      initialResult.sets = Array(totalSets).fill({ player1: '', player2: '', tiebreak1: '', tiebreak2: '' });
    }
    return initialResult;
  });

  return (
    <Box>
      {Array.from({ length: totalSets }, (_, idx) => (
        <Box
          key={idx}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            flexWrap: 'wrap',
          }}
        >
          <Typography sx={{ fontSize: '0.75rem', minWidth: 50 }}>
            Set {idx + 1}:
          </Typography>
          <TextField
            size="small"
            type="number"
            value={localResult.sets?.[idx]?.player1 || ''}
            onChange={(e) => handleLocalInputChange(`set${idx}-0`, e.target.value, 0)}
            sx={{
              width: 40,
              '& input': { fontSize: '0.75rem', textAlign: 'center', padding: '4px' },
            }}
            error={!!matchErrors[`set${idx}`]}
            aria-label={`Puntuación del equipo 1 para el set ${idx + 1}`}
          />
          <Typography sx={{ fontSize: '0.75rem' }}>-</Typography>
          <TextField
            size="small"
            type="number"
            value={localResult.sets?.[idx]?.player2 || ''}
            onChange={(e) => handleLocalInputChange(`set${idx}-1`, e.target.value, 1)}
            sx={{
              width: 40,
              '& input': { fontSize: '0.75rem', textAlign: 'center', padding: '4px' },
            }}
            error={!!matchErrors[`set${idx}`]}
            aria-label={`Puntuación del equipo 2 para el set ${idx + 1}`}
          />
        </Box>
      ))}
    </Box>
  );
};

export default MatchCard;