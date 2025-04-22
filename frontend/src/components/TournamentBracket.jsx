import React, { useState, useMemo } from 'react';
import { Box, Typography, Grid, Card, CardContent, Avatar, Button, Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress } from '@mui/material';
import { getPlayerName, getRoundName } from './tournamentUtils.js';

const MatchCard = ({ match, matchIndex, roundIndex, tournament, role, openMatchDialog }) => {
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
                  {match.player2?.name ? 'BYE' : (match.player2?.player1 ? getPlayerName(tournament, match.player2.player1).charAt(0) : '?')}
                </Avatar>
                <Typography sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                  {match.player2?.name || (match.player2?.player1 ? getPlayerName(tournament, match.player2.player1, match.player2.player2) : 'Jugador no definido')}
                </Typography>
              </Box>
            </Box>
            <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' }, fontWeight: 'bold', color: '#1976d2' }}>
              {match.result?.winner && match.result?.sets && match.result.sets.length > 0 ? (
                match.result.sets.map((set, i) => (
                  <span key={i}>
                    {set.player1 || 0}-{set.player2 || 0}
                    {set.tiebreak1 ? ` (${set.tiebreak1}-${set.tiebreak2})` : ''}{' '}
                  </span>
                ))
              ) : 'Pendiente'}
            </Typography>
          </Box>
          <Button
            variant="outlined"
            size="small"
            onClick={() => openMatchDialog(match, null, matchIndex, roundIndex)}
            disabled={isDisabled}
            sx={{ mt: 1, fontSize: { xs: '0.75rem', sm: '0.875rem' }, minHeight: { xs: 32, sm: 36 } }}
            aria-label={`Actualizar resultado del partido ${matchIndex + 1} de la ronda ${roundIndex + 1}`}
          >
            Actualizar Resultado
          </Button>
        </CardContent>
      </Card>
    </Grid>
  );
};

const TournamentBracket = ({ tournament, role, openMatchDialog, advanceEliminationRound }) => {
  const [confirmAdvanceOpen, setConfirmAdvanceOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const rounds = useMemo(() => {
    if (!tournament?.rounds || !Array.isArray(tournament.rounds)) return [];
    return tournament.rounds;
  }, [tournament]);

  const handleConfirmAdvance = async () => {
    setIsLoading(true);
    try {
      await advanceEliminationRound();
      setConfirmAdvanceOpen(false);
    } catch (error) {
      // Error handling is managed by useTournament
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
        <CircularProgress aria-label="Avanzando ronda eliminatoria" />
      </Box>
    );
  }

  if (!tournament) {
    return <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>Cargando...</Typography>;
  }

  if (rounds.length === 0) {
    return <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>No hay rondas disponibles para mostrar.</Typography>;
  }

  return (
    <Box sx={{ p: { xs: 1, sm: 2 }, display: 'flex', flexDirection: 'column', gap: 2 }}>
      {rounds.map((round, roundIndex) => {
        const numTeams = round.matches?.length * 2 || 0;
        return (
          <Box key={round.round || roundIndex} sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' }, mb: 2, color: '#1976d2' }}>
              {getRoundName(numTeams, rounds.length)}
            </Typography>
            <Grid container spacing={2}>
              {round.matches && Array.isArray(round.matches) && round.matches.length > 0 ? (
                round.matches.map((match, matchIndex) => (
                  <MatchCard
                    key={matchIndex}
                    match={match}
                    matchIndex={matchIndex}
                    roundIndex={roundIndex}
                    tournament={tournament}
                    role={role}
                    openMatchDialog={openMatchDialog}
                  />
                ))
              ) : (
                <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                  No hay partidos disponibles para esta ronda.
                </Typography>
              )}
            </Grid>
          </Box>
        );
      })}
      {(role === 'admin' || role === 'coach') && rounds.length > 0 && rounds[rounds.length - 1].matches.length > 1 && (
        <Button
          variant="contained"
          onClick={() => setConfirmAdvanceOpen(true)}
          sx={{
            mt: 2,
            bgcolor: '#1976d2',
            ':hover': { bgcolor: '#1565c0' },
            fontSize: { xs: '0.875rem', sm: '1rem' },
            py: { xs: 1, sm: 1.5 },
            minHeight: { xs: 40, sm: 48 },
          }}
          aria-label="Avanzar a la siguiente ronda"
        >
          Avanzar a la Siguiente Ronda
        </Button>
      )}

      <Dialog open={confirmAdvanceOpen} onClose={() => setConfirmAdvanceOpen(false)} aria-labelledby="confirm-advance-dialog-title">
        <DialogTitle id="confirm-advance-dialog-title">Confirmar Avance de Ronda</DialogTitle>
        <DialogContent>
          <Typography>¿Estás seguro de que quieres avanzar a la siguiente ronda? Asegúrate de que todos los partidos estén completos.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmAdvanceOpen(false)} aria-label="Cancelar avance de ronda">Cancelar</Button>
          <Button onClick={handleConfirmAdvance} variant="contained" aria-label="Confirmar avance de ronda">
            Avanzar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TournamentBracket;