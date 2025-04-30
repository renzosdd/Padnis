// src/frontend/src/components/TournamentGroups.jsx

import React from 'react';
import { Box, Typography, Grid, Button, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import MatchCard from './MatchCard.jsx';
import { getPlayerName } from '../utils/tournamentUtils.js';

const TournamentGroups = ({
  tournament,
  onResultChange,
  onSaveResult,
  matchErrors,
  role,
  generateKnockoutPhase
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const groups = Array.isArray(tournament?.groups) ? tournament.groups : [];
  const canGenerate = role === 'admin' || role === 'coach';

  return (
    <Box sx={{ px: isMobile ? 1 : 2, py: 1 }}>
      {canGenerate && groups.length > 0 && (
        <Button
          variant="contained"
          onClick={generateKnockoutPhase}
          sx={{ mb: 2, width: '100%' }}
        >
          Generar Eliminatorias
        </Button>
      )}

      {groups.length === 0 && (
        <Typography color="text.secondary">
          No hay grupos generados.
        </Typography>
      )}

      {groups.map((grp) => (
        <Box key={grp.name} sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 1, color: '#1976d2' }}>
            {grp.name}
          </Typography>
          <Grid container spacing={2}>
            {grp.matches?.length ? (
              grp.matches.map((m) => (
                <Grid item xs={12} sm={6} key={m._id}>
                  <MatchCard
                    match={m}
                    matchResult={m.result}
                    totalSets={tournament.format?.sets ?? 2}
                    handleLocalInputChange={onResultChange}
                    matchErrors={matchErrors[m._id] ?? {}}
                    tournament={tournament}
                    getPlayerName={getPlayerName}
                    onSave={onSaveResult}
                    canEdit={tournament.status === 'En curso' && canGenerate}
                  />
                </Grid>
              ))
            ) : (
              <Grid item xs={12}>
                <Typography color="text.secondary">
                  Este grupo no contiene partidos.
                </Typography>
              </Grid>
            )}
          </Grid>
        </Box>
      ))}
    </Box>
  );
};

export default TournamentGroups;
