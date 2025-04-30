import React from 'react';
import { Box, Typography, Grid, Button, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import MatchCard from './MatchCard';
import { getPlayerName } from '../utils/tournamentUtils';

const TournamentGroups = ({
  tournament,
  onResultChange,
  onSaveResult,
  matchResults,
  matchErrors,
  role,
  generateKnockoutPhase
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const canGenerate = ['admin','coach'].includes(role);

  return (
    <Box sx={{ p: isMobile ? 1 : 2 }}>
      {canGenerate && tournament.groups.length > 0 && (
        <Button fullWidth variant="contained" onClick={generateKnockoutPhase} sx={{ mb:2 }}>
          Generar Eliminatorias
        </Button>
      )}

      {tournament.groups.map(grp => (
        <Box key={grp.name} sx={{ mb:4 }}>
          <Typography variant="h6" sx={{ mb:1, color:'#1976d2' }}>
            {grp.name}
          </Typography>
          <Grid container spacing={2}>
            {grp.matches.map(m => (
              <Grid item xs={12} sm={6} key={m._id}>
                <MatchCard
                  match={m}
                  matchResult={matchResults[m._id] || m.result}
                  totalSets={tournament.format.sets}
                  matchErrors={matchErrors[m._id] || {}}
                  tournament={tournament}
                  onResultChange={onResultChange}
                  getPlayerName={getPlayerName}
                  onSaveResult={onSaveResult}
                  canEdit={tournament.status === 'En curso' && canGenerate}
                />
              </Grid>
            ))}
          </Grid>
        </Box>
      ))}
    </Box>
  );
};

export default TournamentGroups;
