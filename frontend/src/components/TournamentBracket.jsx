import React, { useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Button, Grid, Typography } from '@mui/material';
import MatchCard from './MatchCard';
import { resetMatchResults, setMatchResult } from '../store/store';
import useTournament from '../hooks/useTournament';

const TournamentBracket = ({ tournamentId, canEdit }) => {
  const dispatch = useDispatch();
  const { tournament, matchResults, matchErrors, onResultChange, onSaveResult, refetch } = useTournament(tournamentId);

  // Inicializar Redux state de matchResults a partir de la data de tournament.rounds
  useEffect(() => {
    dispatch(resetMatchResults());
    if (!tournament?.rounds) return;

    const totalSets = tournament.format.sets || 3;
    tournament.rounds.forEach((round) => {
      round.matches.forEach((match) => {
        const saved = !!match.result?.winner?.player1 || !!match.result?.winner?.player2;
        const initialSets = Array.from({ length: totalSets }, () => ({
          player1: '',
          player2: '',
          tiebreak1: '',
          tiebreak2: '',
        }));
        dispatch(
          setMatchResult({
            matchId: match._id,
            result: {
              sets: match.result?.sets || initialSets,
              matchTiebreak: match.result?.matchTiebreak || { player1: '', player2: '' },
              winner: match.result?.winner || { player1: null, player2: null },
              runnerUp: match.result?.runnerUp || { player1: null, player2: null },
              saved,
            },
          })
        );
      });
    });
  }, [tournament?.rounds, dispatch]);

  const handleLocalInputChange = useCallback(
    (matchId, field, value) => {
      onResultChange(matchId, field, value);
    },
    [onResultChange]
  );

  const handleSave = useCallback(
    async (matchId) => {
      const result = matchResults[matchId];
      const errors = await onSaveResult(matchId, result);
      if (errors) {
        // Mostrar notificación de error (opcional)
      } else {
        // Mostrar notificación de éxito (opcional)
      }
    },
    [matchResults, onSaveResult]
  );

  if (!tournament) {
    return <Typography>Cargando torneo...</Typography>;
  }

  return (
    <Grid container spacing={2}>
      {tournament.rounds.map((round) => (
        <Grid item xs={12} key={`round-${round.round}`}>
          <Typography variant="h6">Ronda {round.round}</Typography>
          <Grid container spacing={2}>
            {round.matches.map((match) => (
              <Grid item key={match._id}>
                <MatchCard
                  match={match}
                  matchResult={matchResults[match._id] || {}}
                  totalSets={tournament.format.sets}
                  onResultChange={handleLocalInputChange}
                  onSaveResult={() => handleSave(match._id)}
                  matchErrors={matchErrors[match._id] || {}}
                  getPlayerName={(p) => (p?.player1 ? `${p.player1.name}` : 'BYE')}
                  canEdit={canEdit}
                />
              </Grid>
            ))}
          </Grid>
        </Grid>
      ))}
    </Grid>
  );
};

export default TournamentBracket;
