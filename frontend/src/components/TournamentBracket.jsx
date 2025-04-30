import React, { useEffect } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import MatchCard from './MatchCard';
import { setMatchResult, resetMatchResults } from '../store/store';

const TournamentBracket = ({
  tournament,
  role,
  getPlayerName,
  fetchTournament,
  addNotification,
  advanceEliminationRound,
  onSaveResult // Added prop
}) => {
  const dispatch = useDispatch();
  const matchResults = useSelector(state => state.matchResults);
  const canEdit = ['admin', 'coach'].includes(role) && tournament.status === 'En curso';
  const totalSets = tournament.format.sets;

  // Inicializar resultados locales
  useEffect(() => {
    dispatch(resetMatchResults());
    tournament.rounds.forEach(round => {
      round.matches.forEach(match => {
        const saved = !!match.result?.winner;
        const initialSets = Array.from({ length: totalSets }, () => ({
          player1: '',
          player2: '',
          tiebreak1: '',
          tiebreak2: ''
        }));
        dispatch(setMatchResult({
          matchId: match._id,
          result: {
            sets: match.result?.sets || initialSets,
            matchTiebreak: match.result?.matchTiebreak || { player1: '', player2: '' },
            saved
          }
        }));
      });
    });
  }, [tournament.rounds, dispatch, totalSets]);

  const handleSave = async (matchId, result) => {
    const errors = await onSaveResult(matchId, result); // Use onSaveResult instead of fetchTournament
    if (errors) {
      addNotification(errors.general || 'Error al guardar resultado', 'error');
    } else {
      addNotification('Resultado guardado', 'success');
    }
    return errors;
  };

  const handleLocalInputChange = (matchId, field, value) => {
    const current = matchResults[matchId];
    if (!current) return;
    let updated = { ...current };

    const [base, side] = field.split('-');
    const sideKey = side === '0' ? 'player1' : 'player2';

    if (base.startsWith('set')) {
      const setIdx = parseInt(base.replace('set',''), 10);
      updated.sets = current.sets.map((s, i) =>
        i === setIdx ? { ...s, [sideKey]: value } : s
      );
    } else if (base.startsWith('tiebreak')) {
      const tbIdx = parseInt(base.replace('tiebreak',''), 10);
      updated.sets = current.sets.map((s, i) =>
        i === tbIdx
          ? {
              ...s,
              ...(sideKey === 'player1' ? { tiebreak1: value } : { tiebreak2: value })
            }
          : s
      );
    } else if (base === 'matchTiebreak') {
      updated.matchTiebreak = {
        ...current.matchTiebreak,
        [sideKey]: value
      };
    } else {
      return;
    }

    dispatch(setMatchResult({ matchId, result: updated }));
  };

  return (
    <Box>
      {tournament.rounds.map((round, ri) => (
        <Box key={round.round || ri} sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Ronda {round.round}
          </Typography>
          {round.matches.map(match => (
            <MatchCard
              key={match._id}
              match={match}
              matchResult={matchResults[match._id] || {}}
              totalSets={totalSets}
              handleLocalInputChange={handleLocalInputChange}
              matchErrors={{}}
              getPlayerName={getPlayerName}
              tournament={tournament}
              onSave={handleSave}
              onToggleEdit={() => {}}
              canEdit={canEdit}
            />
          ))}
        </Box>
      ))}
      {canEdit && (
        <Button
          variant="contained"
          onClick={advanceEliminationRound}
          sx={{ mt: 2 }}
        >
          Avanzar Ronda
        </Button>
      )}
    </Box>
  );
};

export default TournamentBracket;