import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material';
import axios from 'axios';
import { normalizeId } from './tournamentUtils.js';
import MatchCard from './MatchCard.jsx';

const TournamentBracket = ({ tournament, role, getPlayerName, getRoundName, advanceEliminationRound, fetchTournament, addNotification }) => {
  const [confirmAdvanceOpen, setConfirmAdvanceOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [matchResults, setMatchResults] = useState({});
  const [errors, setErrors] = useState({});
  const canEdit = role === 'admin' || role === 'coach';

  const rounds = useMemo(() => {
    if (!tournament?.rounds || !Array.isArray(tournament.rounds)) return [];
    return tournament.rounds;
  }, [tournament]);

  const totalSets = tournament.format?.sets || 2; // Default to 2 sets

  console.log('TournamentBracket rendered:', { totalSets, canEdit, tournamentFormat: tournament.format });

  const initializeMatchResults = useCallback(() => {
    const results = {};
    rounds.forEach((round) => {
      round.matches.forEach((match) => {
        const sets = match.result?.sets?.length > 0
          ? match.result.sets.map(set => ({
              player1: set.player1?.toString() || '',
              player2: set.player2?.toString() || '',
              tiebreak1: set.tiebreak1?.toString() || '',
              tiebreak2: set.tiebreak2?.toString() || '',
            }))
          : Array(totalSets).fill({ player1: '', player2: '', tiebreak1: '', tiebreak2: '' });

        while (sets.length < totalSets) {
          sets.push({ player1: '', player2: '', tiebreak1: '', tiebreak2: '' });
        }
        if (sets.length > totalSets) {
          sets.length = totalSets;
        }

        results[match._id] = {
          sets,
          winner: match.result?.winner ? normalizeId(match.result.winner?.player1?._id || match.result.winner?.player1) : '',
          matchTiebreak: match.result?.matchTiebreak1 ? {
            player1: match.result.matchTiebreak1.toString(),
            player2: match.result.matchTiebreak2.toString(),
          } : null,
          saved: !!match.result?.winner,
        };
      });
    });
    console.log('Initialized matchResults (Bracket):', results);
    setMatchResults(results);
  }, [rounds, tournament, totalSets]);

  useEffect(() => {
    initializeMatchResults();
  }, [initializeMatchResults]);

  const validateSet = (set, index) => {
    const p1Score = parseInt(set.player1, 10);
    const p2Score = parseInt(set.player2, 10);
    const tb1 = parseInt(set.tiebreak1, 10);
    const tb2 = parseInt(set.tiebreak2, 10);

    if ((isNaN(p1Score) || isNaN(p2Score)) && p1Score !== 0 && p2Score !== 0) {
      return `Set ${index + 1}: Ingresa puntajes válidos`;
    }
    if (p1Score === 0 && p2Score === 0) {
      return null;
    }
    if (p1Score === 6 && p2Score <= 4) return null;
    if (p2Score === 6 && p1Score <= 4) return null;
    if (p1Score === 7 && p2Score === 5) return null;
    if (p2Score === 7 && p1Score === 5) return null;
    if (p1Score === 6 && p2Score === 6) {
      if (isNaN(tb1) || isNaN(tb2) || tb1 === tb2) {
        return `Set ${index + 1}: Ingresa tiebreak válido (diferencia de 2)`;
      }
      if (Math.abs(tb1 - tb2) < 2 || (tb1 < 7 && tb2 < 7)) {
        return `Set ${index + 1}: Tiebreak debe ser ≥7 con 2 puntos de diferencia`;
      }
      return null;
    }
    return `Set ${index + 1}: Puntaje inválido (6-4, 7-5, o 6-6 con tiebreak)`;
  };

  const validateMatchTiebreak = (matchTiebreak) => {
    if (!matchTiebreak) return null;
    const tb1 = parseInt(matchTiebreak.player1, 10);
    const tb2 = parseInt(matchTiebreak.player2, 10);
    if (isNaN(tb1) || isNaN(tb2)) {
      return 'Ingresa puntajes de tiebreak válidos';
    }
    if (tb1 === 0 && tb2 === 0) {
      return null;
    }
    if (tb1 === tb2) {
      return 'El tiebreak debe tener un ganador';
    }
    if (tb1 < 10 && tb2 < 10 || Math.abs(tb1 - tb2) < 2) {
      return 'Tiebreak debe ser ≥10 con 2 puntos de diferencia';
    }
    return null;
  };

  const validateResult = (matchId, result) => {
    const errors = {};
    const sets = result.sets || [];

    sets.forEach((set, index) => {
      const error = validateSet(set, index);
      if (error) errors[`set${index}`] = error;
    });

    if (totalSets === 2) {
      let setsWonByPlayer1 = 0;
      let setsWonByPlayer2 = 0;
      sets.forEach((set) => {
        const p1Score = parseInt(set.player1, 10);
        const p2Score = parseInt(set.player2, 10);
        const tb1 = parseInt(set.tiebreak1, 10);
        const tb2 = parseInt(set.tiebreak2, 10);
        if (p1Score > p2Score || (p1Score === p2Score && tb1 > tb2)) setsWonByPlayer1++;
        else if (p2Score > p1Score || (p1Score === p2Score && tb2 > tb1)) setsWonByPlayer2++;
      });
      if (setsWonByPlayer1 === 1 && setsWonByPlayer2 === 1) {
        const tiebreakError = validateMatchTiebreak(result.matchTiebreak);
        if (tiebreakError) errors.matchTiebreak = tiebreakError;
      }
    }

    if (result.winner) {
      const match = rounds.flatMap(r => r.matches).find(m => m._id === matchId);
      const p1Id = normalizeId(match.player1?.player1?._id || match.player1?.player1);
      const p2Id = normalizeId(match.player2?.player1?._id || match.player2?.player1);
      const isPlayer1Winner = result.winner === p1Id;
      let setsWonByPlayer1 = 0;
      let setsWonByPlayer2 = 0;
      sets.forEach((set) => {
        const p1Score = parseInt(set.player1, 10);
        const p2Score = parseInt(set.player2, 10);
        const tb1 = parseInt(set.tiebreak1, 10);
        const tb2 = parseInt(set.tiebreak2, 10);
        if (p1Score > p2Score || (p1Score === p2Score && tb1 > tb2)) setsWonByPlayer1++;
        else if (p2Score > p1Score || (p1Score === p2Score && tb2 > tb1)) setsWonByPlayer2++;
      });
      const expectedWinner = setsWonByPlayer1 > setsWonByPlayer2 || 
        (totalSets === 2 && setsWonByPlayer1 === 1 && setsWonByPlayer2 === 1 && result.matchTiebreak?.player1 > result.matchTiebreak?.player2);
      if ((isPlayer1Winner && !expectedWinner) || (!isPlayer1Winner && expectedWinner)) {
        errors.winner = 'El ganador no coincide con las puntuaciones';
      }
    }

    return Object.keys(errors).length > 0 ? errors : null;
  };

  const saveMatchResult = useCallback(async (matchId, result) => {
    if (!canEdit) return;
    if (!result) return;

    const validationErrors = validateResult(matchId, result);
    if (validationErrors) {
      setErrors(prev => ({ ...prev, [matchId]: validationErrors }));
      addNotification('Corrige los errores antes de guardar', 'error');
      return;
    }

    const validSets = result.sets.filter(set => parseInt(set.player1, 10) > 0 || parseInt(set.player2, 10) > 0);
    if (validSets.length !== totalSets) {
      setErrors(prev => ({ ...prev, [matchId]: { general: `Ingresa exactamente ${totalSets} set${totalSets > 1 ? 's' : ''} válidos` } }));
      addNotification(`Ingresa exactamente ${totalSets} set${totalSets > 1 ? 's' : ''} válidos`, 'error');
      return;
    }

    setIsLoading(true);
    try {
      const match = rounds.flatMap(r => r.matches).find(m => m._id === matchId);
      const player1Pair = {
        player1: normalizeId(match.player1?.player1?._id || match.player1?.player1),
        player2: match.player1?.player2 ? normalizeId(match.player1?.player2?._id || match.player1?.player2) : null,
      };
      const player2Pair = match.player2?.name === 'BYE' ? { name: 'BYE' } : {
        player1: normalizeId(match.player2?.player1?._id || match.player2?.player1),
        player2: match.player2?.player2 ? normalizeId(match.player2?.player2?._id || match.player2?.player2) : null,
      };

      const winnerPair = result.winner ? (result.winner === player1Pair.player1 ? player1Pair : player2Pair) : null;
      let runnerUpPair = null;
      if (winnerPair && winnerPair !== player2Pair && player2Pair.name !== 'BYE') {
        runnerUpPair = player2Pair;
      } else if (winnerPair && winnerPair !== player1Pair) {
        runnerUpPair = player1Pair;
      }

      const payload = {
        sets: result.sets.map(set => ({
          player1: parseInt(set.player1, 10) || 0,
          player2: parseInt(set.player2, 10) || 0,
          tiebreak1: parseInt(set.tiebreak1, 10) || undefined,
          tiebreak2: parseInt(set.tiebreak2, 10) || undefined,
        })),
        winner: winnerPair,
        runnerUp: runnerUpPair,
        isKnockout: true,
        matchTiebreak1: result.matchTiebreak ? parseInt(result.matchTiebreak.player1, 10) : undefined,
        matchTiebreak2: result.matchTiebreak ? parseInt(result.matchTiebreak.player2, 10) : undefined,
      };

      await axios.put(`https://padnis.onrender.com/api/tournaments/${tournament._id}/matches/${matchId}/result`, payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setMatchResults(prev => {
        const updated = {
          ...prev,
          [matchId]: { ...prev[matchId], saved: true },
        };
        console.log('Updated matchResults after save (Bracket):', updated);
        return updated;
      });
      setErrors(prev => ({ ...prev, [matchId]: null }));
      addNotification('Resultado guardado con éxito', 'success');
      await fetchTournament();
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Error al guardar resultado';
      setErrors(prev => ({ ...prev, [matchId]: { general: errorMessage } }));
      addNotification(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [canEdit, tournament, addNotification, fetchTournament]);

  const handleInputChange = (matchId, field, value, setIndex = null) => {
    setMatchResults(prev => {
      const result = { ...prev[matchId] };
      if (field.startsWith('set')) {
        const [type, index] = field.split('-');
        result.sets = [...result.sets];
        result.sets[parseInt(index, 10)] = { ...result.sets[parseInt(index, 10)], [setIndex === 0 ? 'player1' : 'player2']: value };
      } else if (field.startsWith('tiebreak')) {
        const [type, index, player] = field.split('-');
        result.sets = [...result.sets];
        result.sets[parseInt(index, 10)] = { ...result.sets[parseInt(index, 10)], [player === '1' ? 'tiebreak1' : 'tiebreak2']: value };
      } else if (field === 'winner') {
        result.winner = value;
      } else if (field.startsWith('matchTiebreak')) {
        const player = field.split('-')[1];
        result.matchTiebreak = { ...result.matchTiebreak, [player]: value };
      }
      console.log('Updated matchResults after input change (Bracket):', { matchId, field, value, result });
      return { ...prev, [matchId]: result };
    });
  };

  const toggleEditMode = (matchId) => {
    setMatchResults(prev => {
      const updated = {
        ...prev,
        [matchId]: { ...prev[matchId], saved: !prev[matchId].saved },
      };
      console.log('Updated matchResults after toggleEditMode (Bracket):', updated);
      return updated;
    });
  };

  const handleConfirmAdvance = async () => {
    setIsLoading(true);
    try {
      await advanceEliminationRound();
      setConfirmAdvanceOpen(false);
      addNotification('Avanzado a la siguiente ronda con éxito', 'success');
    } catch (error) {
      addNotification('Error al avanzar la ronda', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
        <CircularProgress aria-label="Cargando rondas" />
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
    <Box sx={{ p: { xs: 0.5, sm: 2 }, maxWidth: '100%', overflowX: 'auto' }}>
      {rounds.map((round, roundIndex) => (
        <Box key={round.round || roundIndex} sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' }, mb: 1, color: '#1976d2' }}>
            {getRoundName(round.round, rounds.length)}
          </Typography>
          <Grid container spacing={1} sx={{ overflowX: 'auto', scrollSnapType: 'x mandatory' }}>
            {round.matches && Array.isArray(round.matches) && round.matches.length > 0 ? (
              round.matches.map((match, matchIndex) => {
                const matchResult = useMemo(() => matchResults[match._id] || {}, [matchResults[match._id]]);
                const matchErrors = errors[match._id] || {};
                const isEditable = roundIndex === rounds.length - 1;
                const isTied = matchResult.sets?.length === 2 &&
                  matchResult.sets.reduce((acc, set) => {
                    const p1Score = parseInt(set.player1, 10);
                    const p2Score = parseInt(set.player2, 10);
                    const tb1 = parseInt(set.tiebreak1, 10);
                    const tb2 = parseInt(set.tiebreak2, 10);
                    return acc + (p1Score > p2Score || (p1Score === p2Score && tb1 > tb2) ? 1 : p2Score > p1Score || (p1Score === p2Score && tb2 > tb1) ? -1 : 0);
                  }, 0) === 0;

                return (
                  <Grid item xs={12} key={match._id} sx={{ scrollSnapAlign: 'start' }}>
                    <MatchCard
                      match={match}
                      tournament={tournament}
                      getPlayerName={getPlayerName}
                      canEdit={canEdit}
                      saveMatchResult={saveMatchResult}
                      toggleEditMode={toggleEditMode}
                      matchResult={matchResult}
                      matchErrors={matchErrors}
                      isTied={isTied}
                      handleInputChange={handleInputChange}
                      totalSets={totalSets}
                      isEditable={isEditable}
                    />
                  </Grid>
                );
              })
            ) : (
              <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                No hay partidos disponibles para esta ronda.
              </Typography>
            )}
          </Grid>
          {canEdit && roundIndex === rounds.length - 1 && round.matches.length > 1 && (
            <Button
              variant="contained"
              onClick={() => setConfirmAdvanceOpen(true)}
              sx={{ mt: 1, bgcolor: '#1976d2', fontSize: { xs: '0.75rem', sm: '0.875rem' }, minHeight: 40 }}
              aria-label="Avanzar a la siguiente ronda"
            >
              Avanzar Ronda
            </Button>
          )}
        </Box>
      ))}
      <Dialog open={confirmAdvanceOpen} onClose={() => setConfirmAdvanceOpen(false)} aria-labelledby="confirm-advance-dialog-title">
        <DialogTitle id="confirm-advance-dialog-title">Confirmar Avance de Ronda</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
            ¿Estás seguro de que quieres avanzar a la siguiente ronda? Asegúrate de que todos los partidos estén completos.
          </Typography>
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