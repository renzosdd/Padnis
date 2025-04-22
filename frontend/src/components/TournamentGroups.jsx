import React, { useState, useMemo } from 'react';
import { Box, Typography, Grid, Card, CardContent, Avatar, Button, Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress } from '@mui/material';
import { getPlayerName } from './tournamentUtils.js';

const MatchCard = ({ match, matchIndex, groupIndex, tournament, role, openMatchDialog }) => {
  const isDisabled = match.result?.winner !== null;

  return (
    <Grid item xs={12}>
      <Card sx={{ bgcolor: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', width: '100%', borderRadius: 2 }}>
        <CardContent sx={{ p: { xs: 1, sm: 2 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar sx={{ bgcolor: '#1976d2', width: { xs: 28, sm: 32 }, height: { xs: 28, sm: 32 } }}>
                  {match.player1?.player1 ? getPlayerName(tournament, match.player1.player1).charAt(0) : '?'}
                </Avatar>
                <Typography sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                  {match.player1?.player1 ? getPlayerName(tournament, match.player1.player1, match.player1.player2) : 'Jugador no definido'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar sx={{ bgcolor: '#42a5f5', width: { xs: 28, sm: 32 }, height: { xs: 28, sm: 32 } }}>
                  {match.player2?.player1 ? getPlayerName(tournament, match.player2.player1).charAt(0) : '?'}
                </Avatar>
                <Typography sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                  {match.player2?.player1 ? getPlayerName(tournament, match.player2.player1, match.player2.player2) : 'Jugador no definido'}
                </Typography>
              </Box>
            </Box>
            <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' }, fontWeight: 'bold', color: '#1976d2' }}>
              {match.result?.winner && match.result?.sets && match.result.sets.length > 0 ? (
                match.result.sets.map((set, idx) => (
                  <span key={idx}>
                    {set.player1 || 0} - {set.player2 || 0}{' '}
                    {set.tiebreak1 && set.tiebreak2 ? `(${set.tiebreak1}-${set.tiebreak2})` : ''}
                  </span>
                ))
              ) : 'Pendiente'}
            </Typography>
          </Box>
          <Typography sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, color: 'text.secondary', mt: 1 }}>
            Fecha: {match.date || 'No definida'}
          </Typography>
          <Button
            variant="outlined"
            size="small"
            onClick={() => openMatchDialog(match, groupIndex, matchIndex)}
            disabled={isDisabled}
            sx={{ mt: 1, fontSize: { xs: '0.75rem', sm: '0.875rem' }, minHeight: { xs: 32, sm: 36 } }}
            aria-label={`Actualizar resultado del partido ${matchIndex + 1} del grupo ${groupIndex + 1}`}
          >
            Actualizar Resultado
          </Button>
        </CardContent>
      </Card>
    </Grid>
  );
};

const TournamentGroups = ({ tournament, role, openMatchDialog, generateKnockoutPhase }) => {
  const [confirmKnockoutOpen, setConfirmKnockoutOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const groups = useMemo(() => {
    if (!tournament?.groups || !Array.isArray(tournament.groups)) return [];
    return tournament.groups;
  }, [tournament]);

  const handleConfirmKnockout = async () => {
    setIsLoading(true);
    try {
      await generateKnockoutPhase();
      setConfirmKnockoutOpen(false);
    } catch (error) {
      // Error handling is managed by useTournament
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
        <CircularProgress aria-label="Generando fase eliminatoria" />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1, sm: 2 }, height: '100%' }}>
      <Box sx={{ width: '100%', overflowX: 'auto' }}>
        {groups.length > 0 ? (
          groups.map((group, groupIndex) => (
            <Box key={group.name || groupIndex} sx={{ mb: 3 }}>
              <Typography
                variant="h6"
                sx={{ fontSize: { xs: '1rem', sm: '1.25rem' }, mb: 2, color: '#1976d2' }}
              >
                {group.name || `Grupo ${groupIndex + 1}`}
              </Typography>
              <Grid container spacing={2}>
                {group.matches && Array.isArray(group.matches) && group.matches.length > 0 ? (
                  group.matches.map((match, matchIndex) => (
                    <MatchCard
                      key={matchIndex}
                      match={match}
                      matchIndex={matchIndex}
                      groupIndex={groupIndex}
                      tournament={tournament}
                      role={role}
                      openMatchDialog={openMatchDialog}
                    />
                  ))
                ) : (
                  <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                    No hay partidos disponibles para este grupo.
                  </Typography>
                )}
              </Grid>
            </Box>
          ))
        ) : (
          <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
            No hay grupos disponibles para mostrar.
          </Typography>
        )}
        {(role === 'admin' || role === 'coach') && (!tournament.rounds || tournament.rounds.length === 0) && (
          <Button
            variant="contained"
            onClick={() => setConfirmKnockoutOpen(true)}
            sx={{
              mt: 2,
              bgcolor: '#1976d2',
              ':hover': { bgcolor: '#1565c0' },
              fontSize: { xs: '0.875rem', sm: '1rem' },
              py: { xs: 1, sm: 1.5 },
              minHeight: { xs: 40, sm: 48 },
            }}
            aria-label="Generar fase eliminatoria"
          >
            Generar Fase Eliminatoria
          </Button>
        )}
      </Box>

      <Dialog open={confirmKnockoutOpen} onClose={() => setConfirmKnockoutOpen(false)} aria-labelledby="confirm-knockout-dialog-title">
        <DialogTitle id="confirm-knockout-dialog-title">Confirmar Fase Eliminatoria</DialogTitle>
        <DialogContent>
          <Typography>¿Estás seguro de que quieres generar la fase eliminatoria? Esto puede modificar la estructura del torneo.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmKnockoutOpen(false)} aria-label="Cancelar generación de fase eliminatoria">Cancelar</Button>
          <Button onClick={handleConfirmKnockout} variant="contained" aria-label="Confirmar generación de fase eliminatoria">
            Generar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TournamentGroups;