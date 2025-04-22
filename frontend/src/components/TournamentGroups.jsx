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
} from '@mui/material';
import HourglassEmpty from '@mui/icons-material/HourglassEmpty';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Edit from '@mui/icons-material/Edit';
import axios from 'axios';
import { getPlayerName, normalizeId } from './tournamentUtils.js';

const TournamentGroups = ({ tournament, role, openMatchDialog, generateKnockoutPhase, getPlayerName }) => {
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
          sets: match.result?.sets || Array(tournament.format.sets || 1).fill({ player1: '', player2: '' }),
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

  // Validate match result
  const validateResult = (matchId, result) => {
    const errors = {};
    const totalSets = tournament.format.sets || 1;
    const sets = result.sets || [];

    // Validate set scores
    sets.forEach((set, index) => {
      const p1Score = parseInt(set.player1, 10);
      const p2Score = parseInt(set.player2, 10);
      if (isNaN(p1Score) || isNaN(p2Score) || p1Score < 0 || p2Score < 0) {
        errors[`set${index}`] = 'Puntuaciones deben ser números no negativos';
      }
    });

    // Validate winner
    let setsWonByPlayer1 = 0;
    let setsWonByPlayer2 = 0;
    sets.forEach((set) => {
      const p1Score = parseInt(set.player1, 10);
      const p2Score = parseInt(set.player2, 10);
      if (p1Score > p2Score) setsWonByPlayer1++;
      else if (p2Score > p1Score) setsWonByPlayer2++;
    });

    if (totalSets === 2 && setsWonByPlayer1 === 1 && setsWonByPlayer2 === 1) {
      if (!result.matchTiebreak || !result.matchTiebreak.player1 || !result.matchTiebreak.player2) {
        errors.matchTiebreak = 'Se requiere tiebreak para sets empatados';
      } else {
        const tb1 = parseInt(result.matchTiebreak.player1, 10);
        const tb2 = parseInt(result.matchTiebreak.player2, 10);
        if (isNaN(tb1) || isNaN(tb2) || tb1 < 10 || tb2 < 10 || Math.abs(tb1 - tb2) < 2) {
          errors.matchTiebreak = 'Tiebreak debe ser ≥10 con 2 puntos de diferencia';
        }
      }
    }

    if (result.winner && !errors.matchTiebreak) {
      const match = tournament.groups.flatMap(g => g.matches).find(m => m._id === matchId);
      const p1Id = normalizeId(match.player1?.player1);
      const p2Id = normalizeId(match.player2?.player1);
      const isPlayer1Winner = result.winner === p1Id;
      const expectedWinner = setsWonByPlayer1 > setsWonByPlayer2 || (totalSets === 2 && setsWonByPlayer1 === 1 && setsWonByPlayer2 === 1 && result.matchTiebreak?.player1 > result.matchTiebreak?.player2);
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
      return;
    }

    setIsLoading(true);
    try {
      const match = tournament.groups.flatMap(g => g.matches).find(m => m._id === matchId);
      const payload = {
        sets: result.sets.map(set => ({
          player1: parseInt(set.player1, 10) || 0,
          player2: parseInt(set.player2, 10) || 0,
        })),
        winner: result.winner ? (result.winner === normalizeId(match.player1?.player1) ? match.player1 : match.player2) : null,
        matchTiebreak1: result.matchTiebreak ? parseInt(result.matchTiebreak.player1, 10) : null,
        matchTiebreak2: result.matchTiebreak ? parseInt(result.matchTiebreak.player2, 10) : null,
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
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Error al guardar resultado';
      setErrors(prev => ({ ...prev, [matchId]: { general: errorMessage } }));
      addNotification(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [canEdit, matchResults, tournament, addNotification]);

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
        const index = parseInt(field.split('-')[1], 10);
        result.sets = [...result.sets];
        result.sets[index] = { ...result.sets[index], [setIndex === 0 ? 'player1' : 'player2']: value };
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
        <CircularProgress aria-label="Cargando grupos" />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1, sm: 2 } }}>
      {tournament.groups && Array.isArray(tournament.groups) && tournament.groups.length > 0 ? (
        tournament.groups.map((group, groupIndex) => (
          <Box key={group.name || groupIndex} sx={{ mb: 3 }}>
            <Typography
              variant="h6"
              sx={{ fontSize: { xs: '1rem', sm: '1.25rem' }, mb: 2, color: '#1976d2' }}
            >
              {group.name || `Grupo ${groupIndex + 1}`}
            </Typography>
            <Grid container spacing={2}>
              {group.matches && Array.isArray(group.matches) && group.matches.length > 0 ? (
                group.matches.map((match, matchIndex) => {
                  const matchResult = matchResults[match._id] || {};
                  const matchErrors = errors[match._id] || {};
                  const isTied = matchResult.sets?.length === 2 &&
                    matchResult.sets.reduce((acc, set) => acc + (parseInt(set.player1, 10) > parseInt(set.player2, 10) ? 1 : parseInt(set.player2, 10) > parseInt(set.player1, 10) ? -1 : 0), 0) === 0;
                  return (
                    <Grid item xs={12} key={match._id}>
                      <Card
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          p: 1,
                          height: '120px',
                          bgcolor: '#fff',
                          border: '1px solid #e0e0e0',
                          borderRadius: 2,
                        }}
                        aria-label={`Partido ${matchIndex + 1} del ${group.name}`}
                      >
                        <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar sx={{ bgcolor: '#1976d2', width: 24, height: 24, fontSize: '0.75rem' }}>
                                {getPlayerName(match.player1?.player1, tournament)?.[0]}
                              </Avatar>
                              <Typography sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, maxWidth: '150px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                {getPlayerName(match.player1?.player1, tournament)}
                                {match.player1?.player2 && ` / ${getPlayerName(match.player1?.player2, tournament)}`}
                              </Typography>
                            </Box>
                            <Typography sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>vs</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar sx={{ bgcolor: '#424242', width: 24, height: 24, fontSize: '0.75rem' }}>
                                {match.player2?.name ? 'BYE' : getPlayerName(match.player2?.player1, tournament)?.[0]}
                              </Avatar>
                              <Typography sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, maxWidth: '150px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                {match.player2?.name || getPlayerName(match.player2?.player1, tournament)}
                                {match.player2?.player2 && !match.player2.name && ` / ${getPlayerName(match.player2?.player2, tournament)}`}
                              </Typography>
                            </Box>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 'auto' }}>
                            {matchResult.saved ? (
                              <CheckCircle sx={{ color: '#388e3c', fontSize: '1rem' }} aria-label="Partido completado" />
                            ) : (
                              <HourglassEmpty sx={{ color: '#757575', fontSize: '1rem' }} aria-label="Partido pendiente" />
                            )}
                            {canEdit && !hasKnockout && (
                              <>
                                {matchResult.sets?.map((set, index) => (
                                  <Box key={index} sx={{ display: 'flex', gap: 0.5 }}>
                                    <TextField
                                      size="small"
                                      type="number"
                                      value={set.player1}
                                      onChange={(e) => handleInputChange(match._id, `set${index}-0`, e.target.value)}
                                      onBlur={() => saveMatchResult(match._id)}
                                      sx={{ width: 40 }}
                                      error={!!matchErrors[`set${index}`]}
                                      helperText={matchErrors[`set${index}`]}
                                      aria-label={`Puntuación del jugador 1 para el set ${index + 1}`}
                                    />
                                    <TextField
                                      size="small"
                                      type="number"
                                      value={set.player2}
                                      onChange={(e) => handleInputChange(match._id, `set${index}-1`, e.target.value)}
                                      onBlur={() => saveMatchResult(match._id)}
                                      sx={{ width: 40 }}
                                      error={!!matchErrors[`set${index}`]}
                                      helperText={matchErrors[`set${index}`]}
                                      aria-label={`Puntuación del jugador 2 para el set ${index + 1}`}
                                    />
                                  </Box>
                                ))}
                                {isTied && (
                                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                                    <TextField
                                      size="small"
                                      type="number"
                                      value={matchResult.matchTiebreak?.player1 || ''}
                                      onChange={(e) => handleInputChange(match._id, 'matchTiebreak-player1', e.target.value)}
                                      onBlur={() => saveMatchResult(match._id)}
                                      sx={{ width: 40 }}
                                      error={!!matchErrors.matchTiebreak}
                                      helperText={matchErrors.matchTiebreak}
                                      aria-label="Puntuación de tiebreak del jugador 1"
                                    />
                                    <TextField
                                      size="small"
                                      type="number"
                                      value={matchResult.matchTiebreak?.player2 || ''}
                                      onChange={(e) => handleInputChange(match._id, 'matchTiebreak-player2', e.target.value)}
                                      onBlur={() => saveMatchResult(match._id)}
                                      sx={{ width: 40 }}
                                      error={!!matchErrors.matchTiebreak}
                                      helperText={matchErrors.matchTiebreak}
                                      aria-label="Puntuación de tiebreak del jugador 2"
                                    />
                                  </Box>
                                )}
                                <Select
                                  size="small"
                                  value={matchResult.winner || ''}
                                  onChange={(e) => handleInputChange(match._id, 'winner', e.target.value)}
                                  onBlur={() => saveMatchResult(match._id)}
                                  sx={{ width: 100 }}
                                  aria-label="Seleccionar ganador"
                                >
                                  <MenuItem value="">Ninguno</MenuItem>
                                  <MenuItem value={normalizeId(match.player1?.player1)}>Jugador 1</MenuItem>
                                  <MenuItem value={normalizeId(match.player2?.player1)}>Jugador 2</MenuItem>
                                </Select>
                                <IconButton
                                  onClick={() => openMatchDialog(match, groupIndex, matchIndex)}
                                  sx={{ ml: 1 }}
                                  aria-label="Editar detalles del partido"
                                >
                                  <Edit fontSize="small" />
                                </IconButton>
                              </>
                            )}
                            {matchErrors.general && (
                              <Typography color="error" sx={{ fontSize: '0.75rem' }}>{matchErrors.general}</Typography>
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
                  sx={{ mt: 2, bgcolor: '#1976d2', fontSize: { xs: '0.75rem', sm: '0.875rem' }, mr: 1 }}
                  aria-label="Generar fase eliminatoria"
                >
                  Generar Fase Eliminatoria
                </Button>
                <Button
                  variant="contained"
                  onClick={saveAllResults}
                  disabled={unsavedCount === 0}
                  sx={{ mt: 2, bgcolor: '#388e3c', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
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