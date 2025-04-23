import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Avatar,
  Button,
  IconButton,
  TextField,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Add, Remove } from '@mui/icons-material';
import HourglassEmpty from '@mui/icons-material/HourglassEmpty';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Edit from '@mui/icons-material/Edit';
import axios from 'axios';
import { getPlayerName, normalizeId, isValidObjectId, determineWinner } from './tournamentUtils.js';

const TournamentGroups = ({ tournament, role, openMatchDialog, generateKnockoutPhase, getPlayerName, fetchTournament, addNotification }) => {
  const [confirmKnockoutOpen, setConfirmKnockoutOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [matchResults, setMatchResults] = useState({});
  const [errors, setErrors] = useState({});
  const [unsavedCount, setUnsavedCount] = useState(0);
  const canEdit = role === 'admin' || role === 'coach';
  const hasKnockout = tournament.rounds && tournament.rounds.length > 0;

  // Initialize local match results
  const initializeMatchResults = useCallback(() => {
    const results = {};
    tournament.groups.forEach((group) => {
      group.matches.forEach((match) => {
        results[match._id] = {
          sets: match.result?.sets || Array(tournament.format.sets || 1).fill({ player1: '', player2: '', tiebreak1: '', tiebreak2: '' }),
          winner: match.result?.winner ? normalizeId(match.result.winner.player1) : '',
          matchTiebreak: match.result?.matchTiebreak1 ? { player1: match.result.matchTiebreak1, player2: match.result.matchTiebreak2 } : null,
          saved: !!match.result?.winner,
        };
      });
    });
    setMatchResults(results);
    setUnsavedCount(Object.values(results).filter(r => !r.saved).length);
  }, [tournament]);

  useEffect(() => {
    initializeMatchResults();
  }, [initializeMatchResults]);

  // Validate set scores
  const validateSet = (set, index) => {
    const p1Score = parseInt(set.player1, 10);
    const p2Score = parseInt(set.player2, 10);
    const tb1 = parseInt(set.tiebreak1, 10);
    const tb2 = parseInt(set.tiebreak2, 10);

    if ((isNaN(p1Score) || isNaN(p2Score)) && p1Score !== 0 && p2Score !== 0) {
      return `Set ${index + 1}: Ingresa puntajes válidos`;
    }
    if (p1Score === 0 && p2Score === 0) {
      return null; // Allow empty sets
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

  // Validate match tiebreak
  const validateMatchTiebreak = (matchTiebreak) => {
    if (!matchTiebreak) return null;
    const tb1 = parseInt(matchTiebreak.player1, 10);
    const tb2 = parseInt(matchTiebreak.player2, 10);
    if (isNaN(tb1) || isNaN(tb2)) {
      return 'Ingresa puntajes de tiebreak válidos';
    }
    if (tb1 === 0 && tb2 === 0) {
      return null; // Allow empty tiebreak
    }
    if (tb1 === tb2) {
      return 'El tiebreak debe tener un ganador';
    }
    if (tb1 < 10 && tb2 < 10 || Math.abs(tb1 - tb2) < 2) {
      return 'Tiebreak debe ser ≥10 con 2 puntos de diferencia';
    }
    return null;
  };

  // Validate match result
  const validateResult = (matchId, result) => {
    const errors = {};
    const totalSets = tournament.format.sets || 1;
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
      const match = tournament.groups.flatMap(g => g.matches).find(m => m._id === matchId);
      const p1Id = normalizeId(match.player1?.player1);
      const p2Id = normalizeId(match.player2?.player1);
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

  // Save single match result
  const saveMatchResult = useCallback(async (matchId) => {
    if (!canEdit) return;
    const result = matchResults[matchId];
    if (!result || result.saved) return;

    const validationErrors = validateResult(matchId, result);
    if (validationErrors) {
      setErrors(prev => ({ ...prev, [matchId]: validationErrors }));
      addNotification('Corrige los errores antes de guardar', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const match = tournament.groups.flatMap(g => g.matches).find(m => m._id === matchId);
      const player1Pair = { player1: normalizeId(match.player1?.player1), player2: match.player1?.player2 ? normalizeId(match.player1.player2) : null };
      const player2Pair = match.player2?.name === 'BYE' ? { name: 'BYE' } : {
        player1: normalizeId(match.player2?.player1),
        player2: match.player2?.player2 ? normalizeId(match.player2.player2) : null,
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
        isKnockout: false,
        matchTiebreak1: result.matchTiebreak ? parseInt(result.matchTiebreak.player1, 10) : undefined,
        matchTiebreak2: result.matchTiebreak ? parseInt(result.matchTiebreak.player2, 10) : undefined,
      };

      await axios.put(`https://padnis.onrender.com/api/tournaments/${tournament._id}/matches/${matchId}/result`, payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setMatchResults(prev => ({
        ...prev,
        [matchId]: { ...prev[matchId], saved: true },
      }));
      setErrors(prev => ({ ...prev, [matchId]: null }));
      setUnsavedCount(prev => prev - 1);
      addNotification('Resultado guardado con éxito', 'success');
      await fetchTournament();
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Error al guardar resultado';
      setErrors(prev => ({ ...prev, [matchId]: { general: errorMessage } }));
      addNotification(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [canEdit, matchResults, tournament, addNotification, fetchTournament]);

  // Save all unsaved match results
  const saveAllResults = useCallback(async () => {
    if (!canEdit || unsavedCount === 0) return;
    setIsLoading(true);
    const unsavedMatchIds = Object.keys(matchResults).filter(id => !matchResults[id].saved);
    for (const matchId of unsavedMatchIds) {
      await saveMatchResult(matchId);
    }
    setIsLoading(false);
  }, [canEdit, matchResults, unsavedCount, saveMatchResult]);

  // Handle input changes
  const handleInputChange = (matchId, field, value, setIndex = null) => {
    setMatchResults(prev => {
      const result = { ...prev[matchId] };
      if (field.startsWith('set')) {
        const [type, index] = field.split('-');
        result.sets = [...result.sets];
        result.sets[parseInt(index, 10)] = { ...result.sets[index], [setIndex === 0 ? 'player1' : 'player2']: value };
      } else if (field.startsWith('tiebreak')) {
        const [type, index, player] = field.split('-');
        result.sets = [...result.sets];
        result.sets[parseInt(index, 10)] = { ...result.sets[index], [player === '1' ? 'tiebreak1' : 'tiebreak2']: value };
      } else if (field === 'winner') {
        result.winner = value;
      } else if (field.startsWith('matchTiebreak')) {
        const player = field.split('-')[1];
        result.matchTiebreak = { ...result.matchTiebreak, [player]: value };
      }
      if (!result.saved) {
        setUnsavedCount(prev => prev + (prev[matchId]?.saved ? 1 : 0));
      }
      return { ...prev, [matchId]: result };
    });
  };

  // Increment/decrement scores
  const incrementScore = (matchId, field, setIndex) => {
    setMatchResults(prev => {
      const result = { ...prev[matchId] };
      if (field.startsWith('set')) {
        const index = parseInt(field.split('-')[1], 10);
        result.sets = [...result.sets];
        result.sets[index] = { ...result.sets[index], [setIndex === 0 ? 'player1' : 'player2']: (parseInt(result.sets[index][setIndex === 0 ? 'player1' : 'player2'], 10) || 0) + 1 };
      } else if (field.startsWith('tiebreak')) {
        const [type, index, player] = field.split('-');
        result.sets = [...result.sets];
        result.sets[parseInt(index, 10)] = { ...result.sets[index], [player === '1' ? 'tiebreak1' : 'tiebreak2']: (parseInt(result.sets[index][player === '1' ? 'tiebreak1' : 'tiebreak2'], 10) || 0) + 1 };
      } else if (field.startsWith('matchTiebreak')) {
        const player = field.split('-')[1];
        result.matchTiebreak = { ...result.matchTiebreak, [player]: (parseInt(result.matchTiebreak?.[player], 10) || 0) + 1 };
      }
      return { ...prev, [matchId]: result };
    });
  };

  const decrementScore = (matchId, field, setIndex) => {
    setMatchResults(prev => {
      const result = { ...prev[matchId] };
      if (field.startsWith('set')) {
        const index = parseInt(field.split('-')[1], 10);
        result.sets = [...result.sets];
        result.sets[index] = { ...result.sets[index], [setIndex === 0 ? 'player1' : 'player2']: Math.max(0, (parseInt(result.sets[index][setIndex === 0 ? 'player1' : 'player2'], 10) || 0) - 1) };
      } else if (field.startsWith('tiebreak')) {
        const [type, index, player] = field.split('-');
        result.sets = [...result.sets];
        result.sets[parseInt(index, 10)] = { ...result.sets[index], [player === '1' ? 'tiebreak1' : 'tiebreak2']: Math.max(0, (parseInt(result.sets[index][player === '1' ? 'tiebreak1' : 'tiebreak2'], 10) || 0) - 1) };
      } else if (field.startsWith('matchTiebreak')) {
        const player = field.split('-')[1];
        result.matchTiebreak = { ...result.matchTiebreak, [player]: Math.max(0, (parseInt(result.matchTiebreak?.[player], 10) || 0) - 1) };
      }
      return { ...prev, [matchId]: result };
    });
  };

  const handleConfirmKnockout = async () => {
    setIsLoading(true);
    try {
      await generateKnockoutPhase();
      setConfirmKnockoutOpen(false);
      addNotification('Fase eliminatoria generada con éxito', 'success');
    } catch (error) {
      addNotification('Error al generar la fase eliminatoria', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
        <CircularProgress aria-label="Cargando grupos" />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 0.5, sm: 2 }, maxWidth: '100%', overflowX: 'auto' }}>
      {tournament.groups && Array.isArray(tournament.groups) && tournament.groups.length > 0 ? (
        tournament.groups.map((group, groupIndex) => (
          <Box key={group.name || groupIndex} sx={{ mb: 2 }}>
            <Typography
              variant="h6"
              sx={{ fontSize: { xs: '1rem', sm: '1.25rem' }, mb: 1, color: '#1976d2' }}
            >
              {group.name || `Grupo ${groupIndex + 1}`}
            </Typography>
            <Grid container spacing={1} sx={{ overflowX: 'auto' }}>
              {group.matches && Array.isArray(group.matches) && group.matches.length > 0 ? (
                group.matches.map((match, matchIndex) => {
                  const matchResult = matchResults[match._id] || {};
                  const matchErrors = errors[match._id] || {};
                  const isTied = matchResult.sets?.length === 2 &&
                    matchResult.sets.reduce((acc, set) => {
                      const p1Score = parseInt(set.player1, 10);
                      const p2Score = parseInt(set.player2, 10);
                      const tb1 = parseInt(set.tiebreak1, 10);
                      const tb2 = parseInt(set.tiebreak2, 10);
                      return acc + (p1Score > p2Score || (p1Score === p2Score && tb1 > tb2) ? 1 : p2Score > p1Score || (p1Score === p2Score && tb2 > tb1) ? -1 : 0);
                    }, 0) === 0;
                  return (
                    <Grid item xs={12} key={match._id}>
                      <Card
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          p: 1,
                          height: { xs: 100, sm: 120 },
                          bgcolor: '#fff',
                          border: '1px solid #e0e0e0',
                          borderRadius: 2,
                          width: '100%',
                        }}
                        aria-label={`Partido ${matchIndex + 1} del ${group.name}`}
                      >
                        <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 0.5 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                              <Avatar sx={{ bgcolor: '#1976d2', width: 24, height: 24, fontSize: '0.75rem' }}>
                                {getPlayerName(tournament, match.player1?.player1)?.[0]}
                              </Avatar>
                              <Typography
                                sx={{
                                  fontSize: { xs: '0.875rem', sm: '1rem' },
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  maxWidth: { xs: '100px', sm: '140px' },
                                }}
                              >
                                {getPlayerName(tournament, match.player1?.player1)}
                                {match.player1?.player2 && ` / ${getPlayerName(tournament, match.player1?.player2)}`}
                              </Typography>
                            </Box>
                            <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>vs</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                              <Avatar sx={{ bgcolor: '#424242', width: 24, height: 24, fontSize: '0.75rem' }}>
                                {match.player2?.name ? 'BYE' : getPlayerName(tournament, match.player2?.player1)?.[0]}
                              </Avatar>
                              <Typography
                                sx={{
                                  fontSize: { xs: '0.875rem', sm: '1rem' },
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  maxWidth: { xs: '100px', sm: '140px' },
                                }}
                              >
                                {match.player2?.name || getPlayerName(tournament, match.player2?.player1)}
                                {match.player2?.player2 && !match.player2.name && ` / ${getPlayerName(tournament, match.player2?.player2)}`}
                              </Typography>
                            </Box>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 'auto', flexWrap: 'wrap', minWidth: 0 }}>
                            {matchResult.saved ? (
                              <CheckCircle sx={{ color: '#388e3c', fontSize: '1rem' }} aria-label="Partido completado" />
                            ) : (
                              <HourglassEmpty sx={{ color: '#757575', fontSize: '1rem' }} aria-label="Partido pendiente" />
                            )}
                            {canEdit && !hasKnockout && (
                              <>
                                {matchResult.sets?.map((set, index) => (
                                  <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
                                      <IconButton
                                        onClick={() => decrementScore(match._id, `set${index}-0`, 0)}
                                        size="small"
                                        sx={{ bgcolor: '#e0e0e0', ':hover': { bgcolor: '#d5d5d5' }, p: 0.75 }}
                                        aria-label={`Decrementar puntaje del equipo 1 en el set ${index + 1}`}
                                      >
                                        <Remove fontSize="small" />
                                      </IconButton>
                                      <TextField
                                        size="small"
                                        type="number"
                                        value={set.player1}
                                        onChange={(e) => handleInputChange(match._id, `set${index}-0`, e.target.value, 0)}
                                        onBlur={() => saveMatchResult(match._id)}
                                        sx={{ width: 36, minWidth: 0, '& input': { fontSize: { xs: '0.75rem', sm: '0.875rem' }, textAlign: 'center' } }}
                                        error={!!matchErrors[`set${index}`]}
                                        aria-label={`Puntuación del equipo 1 para el set ${index + 1}`}
                                      />
                                      <IconButton
                                        onClick={() => incrementScore(match._id, `set${index}-0`, 0)}
                                        size="small"
                                        sx={{ bgcolor: '#e0e0e0', ':hover': { bgcolor: '#d5d5d5' }, p: 0.75 }}
                                        aria-label={`Incrementar puntaje del equipo 1 en el set ${index + 1}`}
                                      >
                                        <Add fontSize="small" />
                                      </IconButton>
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
                                      <IconButton
                                        onClick={() => decrementScore(match._id, `set${index}-1`, 1)}
                                        size="small"
                                        sx={{ bgcolor: '#e0e0e0', ':hover': { bgcolor: '#d5d5d5' }, p: 0.75 }}
                                        aria-label={`Decrementar puntaje del equipo 2 en el set ${index + 1}`}
                                      >
                                        <Remove fontSize="small" />
                                      </IconButton>
                                      <TextField
                                        size="small"
                                        type="number"
                                        value={set.player2}
                                        onChange={(e) => handleInputChange(match._id, `set${index}-1`, e.target.value, 1)}
                                        onBlur={() => saveMatchResult(match._id)}
                                        sx={{ width: 36, minWidth: 0, '& input': { fontSize: { xs: '0.75rem', sm: '0.875rem' }, textAlign: 'center' } }}
                                        error={!!matchErrors[`set${index}`]}
                                        aria-label={`Puntuación del equipo 2 para el set ${index + 1}`}
                                      />
                                      <IconButton
                                        onClick={() => incrementScore(match._id, `set${index}-1`, 1)}
                                        size="small"
                                        sx={{ bgcolor: '#e0e0e0', ':hover': { bgcolor: '#d5d5d5' }, p: 0.75 }}
                                        aria-label={`Incrementar puntaje del equipo 2 en el set ${index + 1}`}
                                      >
                                        <Add fontSize="small" />
                                      </IconButton>
                                    </Box>
                                    {parseInt(set.player1, 10) === 6 && parseInt(set.player2, 10) === 6 && (
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                          <IconButton
                                            onClick={() => decrementScore(match._id, `tiebreak${index}-1`, 1)}
                                            size="small"
                                            sx={{ bgcolor: '#e0e0e0', ':hover': { bgcolor: '#d5d5d5' }, p: 0.75 }}
                                            aria-label={`Decrementar tie historic del equipo 1 en el set ${index + 1}`}
                                          >
                                            <Remove fontSize="small" />
                                          </IconButton>
                                          <TextField
                                            size="small"
                                            type="number"
                                            value={set.tiebreak1}
                                            onChange={(e) => handleInputChange(match._id, `tiebreak${index}-1`, e.target.value, 1)}
                                            onBlur={() => saveMatchResult(match._id)}
                                            sx={{ width: 36, minWidth: 0, '& input': { fontSize: { xs: '0.75rem', sm: '0.875rem' }, textAlign: 'center' } }}
                                            error={!!matchErrors[`set${index}`]}
                                            aria-label={`Tiebreak del equipo 1 para el set ${index + 1}`}
                                          />
                                          <IconButton
                                            onClick={() => incrementScore(match._id, `tiebreak${index}-1`, 1)}
                                            size="small"
                                            sx={{ bgcolor: '#e0e0e0', ':hover': { bgcolor: '#d5d5d5' }, p: 0.75 }}
                                            aria-label={`Incrementar tiebreak del equipo 1 en el set ${index + 1}`}
                                          >
                                            <Add fontSize="small" />
                                          </IconButton>
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                          <IconButton
                                            onClick={() => decrementScore(match._id, `tiebreak${index}-2`, 2)}
                                            size="small"
                                            sx={{ bgcolor: '#e0e0e0', ':hover': { bgcolor: '#d5d5d5' }, p: 0.75 }}
                                            aria-label={`Decrementar tiebreak del equipo 2 en el set ${index + 1}`}
                                          >
                                            <Remove fontSize="small" />
                                          </IconButton>
                                          <TextField
                                            size="small"
                                            type="number"
                                            value={set.tiebreak2}
                                            onChange={(e) => handleInputChange(match._id, `tiebreak${index}-2`, e.target.value, 2)}
                                            onBlur={() => saveMatchResult(match._id)}
                                            sx={{ width: 36, minWidth: 0, '& input': { fontSize: { xs: '0.75rem', sm: '0.875rem' }, textAlign: 'center' } }}
                                            error={!!matchErrors[`set${index}`]}
                                            aria-label={`Tiebreak del equipo 2 para el set ${index + 1}`}
                                          />
                                          <IconButton
                                            onClick={() => incrementScore(match._id, `tiebreak${index}-2`, 2)}
                                            size="small"
                                            sx={{ bgcolor: '#e0e0e0', ':hover': { bgcolor: '#d5d5d5' }, p: 0.75 }}
                                            aria-label={`Incrementar tiebreak del equipo 2 en el set ${index + 1}`}
                                          >
                                            <Add fontSize="small" />
                                          </IconButton>
                                        </Box>
                                      </Box>
                                    )}
                                  </Box>
                                ))}
                                {isTied && (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
                                    <IconButton
                                      onClick={() => decrementScore(match._id, 'matchTiebreak-player1', 0)}
                                      size="small"
                                      sx={{ bgcolor: '#e0e0e0', ':hover': { bgcolor: '#d5d5d5' }, p: 0.75 }}
                                      aria-label="Decrementar tiebreak del partido para el equipo 1"
                                    >
                                      <Remove fontSize="small" />
                                    </IconButton>
                                    <TextField
                                      size="small"
                                      type="number"
                                      value={matchResult.matchTiebreak?.player1 || ''}
                                      onChange={(e) => handleInputChange(match._id, 'matchTiebreak-player1', e.target.value)}
                                      onBlur={() => saveMatchResult(match._id)}
                                      sx={{ width: 36, minWidth: 0, '& input': { fontSize: { xs: '0.75rem', sm: '0.875rem' }, textAlign: 'center' } }}
                                      error={!!matchErrors.matchTiebreak}
                                      aria-label="Puntuación de tiebreak del partido para el equipo 1"
                                    />
                                    <IconButton
                                      onClick={() => incrementScore(match._id, 'matchTiebreak-player1', 0)}
                                      size="small"
                                      sx={{ bgcolor: '#e0e0e0', ':hover': { bgcolor: '#d5d5d5' }, p: 0.75 }}
                                      aria-label="Incrementar tiebreak del partido para el equipo 1"
                                    >
                                      <Add fontSize="small" />
                                    </IconButton>
                                    <IconButton
                                      onClick={() => decrementScore(match._id, 'matchTiebreak-player2', 1)}
                                      size="small"
                                      sx={{ bgcolor: '#e0e0e0', ':hover': { bgcolor: '#d5d5d5' }, p: 0.75 }}
                                      aria-label="Decrementar tiebreak del partido para el equipo 2"
                                    >
                                      <Remove fontSize="small" />
                                    </IconButton>
                                    <TextField
                                      size="small"
                                      type="number"
                                      value={matchResult.matchTiebreak?.player2 || ''}
                                      onChange={(e) => handleInputChange(match._id, 'matchTiebreak-player2', e.target.value)}
                                      onBlur={() => saveMatchResult(match._id)}
                                      sx={{ width: 36, minWidth: 0, '& input': { fontSize: { xs: '0.75rem', sm: '0.875rem' }, textAlign: 'center' } }}
                                      error={!!matchErrors.matchTiebreak}
                                      aria-label="Puntuación de tiebreak del partido para el equipo 2"
                                    />
                                    <IconButton
                                      onClick={() => incrementScore(match._id, 'matchTiebreak-player2', 1)}
                                      size="small"
                                      sx={{ bgcolor: '#e0e0e0', ':hover': { bgcolor: '#d5d5d5' }, p: 0.75 }}
                                      aria-label="Incrementar tiebreak del partido para el equipo 2"
                                    >
                                      <Add fontSize="small" />
                                    </IconButton>
                                  </Box>
                                )}
                                <Select
                                  size="small"
                                  value={matchResult.winner || ''}
                                  onChange={(e) => handleInputChange(match._id, 'winner', e.target.value)}
                                  onBlur={() => saveMatchResult(match._id)}
                                  sx={{ width: { xs: 80, sm: 100 }, minWidth: 0, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                                  error={!!matchErrors.winner}
                                  aria-label="Seleccionar ganador"
                                >
                                  <MenuItem value="">Ninguno</MenuItem>
                                  <MenuItem value={normalizeId(match.player1?.player1)}>{getPlayerName(tournament, match.player1?.player1)}</MenuItem>
                                  <MenuItem value={normalizeId(match.player2?.player1)}>{match.player2?.name || getPlayerName(tournament, match.player2?.player1)}</MenuItem>
                                </Select>
                                <IconButton
                                  onClick={() => openMatchDialog(match, groupIndex, matchIndex)}
                                  sx={{ ml: 0.5, p: 0.75 }}
                                  aria-label="Editar detalles del partido"
                                >
                                  <Edit fontSize="small" />
                                </IconButton>
                              </>
                            )}
                            {matchErrors.general && (
                              <Alert severity="error" sx={{ fontSize: '0.75rem', mt: 1, width: '100%' }}>{matchErrors.general}</Alert>
                            )}
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })
              ) : (
                <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                  No hay partidos disponibles para este grupo.
                </Typography>
              )}
            </Grid>
            {canEdit && tournament.type === 'RoundRobin' && !hasKnockout && (
              <>
                <Button
                  variant="contained"
                  onClick={() => setConfirmKnockoutOpen(true)}
                  sx={{ mt: 1, bgcolor: '#1976d2', fontSize: { xs: '0.75rem', sm: '0.875rem' }, mr: 1, minHeight: 40 }}
                  aria-label="Generar fase eliminatoria"
                >
                  Generar Fase Eliminatoria
                </Button>
                <Button
                  variant="contained"
                  onClick={saveAllResults}
                  disabled={unsavedCount === 0}
                  sx={{ mt: 1, bgcolor: '#388e3c', fontSize: { xs: '0.75rem', sm: '0.875rem' }, minHeight: 40 }}
                  aria-label="Guardar todos los resultados"
                >
                  Guardar Todos ({unsavedCount})
                </Button>
              </>
            )}
          </Box>
        ))
      ) : (
        <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
          No hay grupos disponibles para mostrar.
        </Typography>
      )}
      <Dialog open={confirmKnockoutOpen} onClose={() => setConfirmKnockoutOpen(false)} aria-labelledby="confirm-knockout-dialog-title">
        <DialogTitle id="confirm-knockout-dialog-title">Confirmar Fase Eliminatoria</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
            ¿Estás seguro de que quieres generar la fase eliminatoria? Esto puede modificar la estructura del torneo.
          </Typography>
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