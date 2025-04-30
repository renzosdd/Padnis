// src/frontend/src/components/TournamentGroups.jsx
import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Box, Typography, Button } from '@mui/material';
import { setMatchResult, resetMatchResults } from '../store/store';
import MatchCard from './MatchCard';

const TournamentGroups = ({
  groups,
  tournament,
  role,
  fetchTournament,
  addNotification,
  generateKnockoutPhase,
  getPlayerName
}) => {
  const dispatch = useDispatch();
  const matchResults = useSelector((state) => state.matchResults);
  const canEdit = ['admin', 'coach'].includes(role) && tournament.status === 'En curso';
  const totalSets = tournament.format.sets;

  // Reset and initialize local results whenever the groups or tournament change
  useEffect(() => {
    dispatch(resetMatchResults());
    groups.forEach((group) => {
      group.matches.forEach((match) => {
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
  }, [groups, dispatch, totalSets]);

  // Save result to backend
  const handleSave = async (matchId, result) => {
    const errors = await fetchTournament(true, matchId, result);
    if (errors) {
      addNotification(errors.message || 'Error al guardar resultado', 'error');
    } else {
      addNotification('Resultado guardado', 'success');
    }
    return errors;
  };

  // Update local result in Redux
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
          ? { ...s, [sideKey === 'player1' ? 'tiebreak1' : 'tiebreak2']: value }
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
      {groups.map((group) => (
        <Box key={group._id || group.name} sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            {group.name}
          </Typography>

          {group.matches.map((match) => (
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

          {canEdit && (
            <Button
              variant="contained"
              onClick={generateKnockoutPhase}
              sx={{ mt: 2 }}
            >
              Generar Eliminatorias
            </Button>
          )}
        </Box>
      ))}
    </Box>
  );
};

export default TournamentGroups;
