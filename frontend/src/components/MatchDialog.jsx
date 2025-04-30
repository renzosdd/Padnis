import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  Card,
  TextField,
  Avatar,
  IconButton,
  CircularProgress,
  Alert,
  Stack,
} from '@mui/material';
import { Add, Remove } from '@mui/icons-material';
import axios from 'axios';
import { determineWinner, normalizeId, isValidObjectId } from '../hooks/tournamentUtils.js';

const MatchDialog = ({
  open,
  onClose,
  selectedMatch,
  tournament,
  getPlayerName,
  addNotification,
  fetchTournament,
  role,
}) => {
  const [matchScores, setMatchScores] = useState([]);
  const [matchTiebreak, setMatchTiebreak] = useState({ player1: 0, player2: 0 });
  const [errors, setErrors] = useState([]);
  const [tiebreakError, setTiebreakError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (selectedMatch && open) {
      const initialSets =
        selectedMatch.match.result?.sets && selectedMatch.match.result.sets.length > 0
          ? selectedMatch.match.result.sets.map((set) => ({
              player1: set.player1 || 0,
              player2: set.player2 || 0,
              tiebreak1: set.tiebreak1 || 0,
              tiebreak2: set.tiebreak2 || 0,
            }))
          : Array(tournament?.format?.sets || 1).fill({ player1: 0, player2: 0, tiebreak1: 0, tiebreak2: 0 });
      setMatchScores(initialSets);
      setMatchTiebreak({
        player1: selectedMatch.match.result?.matchTiebreak1 || 0,
        player2: selectedMatch.match.result?.matchTiebreak2 || 0,
      });
      setErrors([]);
      setTiebreakError('');
    }
  }, [selectedMatch, open, tournament?.format?.sets]);

  const validateSet = (set, index) => {
    const { player1, player2, tiebreak1, tiebreak2 } = set;
    if (player1 === 0 && player2 === 0) {
      return `Set ${index + 1}: Ingresa puntajes válidos`;
    }
    if (player1 === 6 && player2 <= 4) return null;
    if (player2 === 6 && player1 <= 4) return null;
    if (player1 === 7 && player2 === 5) return null;
    if (player2 === 7 && player1 === 5) return null;
    if (player1 === 6 && player2 === 6) {
      if (!tiebreak1 || !tiebreak2 || tiebreak1 === tiebreak2) {
        return `Set ${index + 1}: Ingresa tiebreak válido (diferencia de 2)`;
      }
      if (Math.abs(tiebreak1 - tiebreak2) < 2 || (tiebreak1 < 7 && tiebreak2 < 7)) {
        return `Set ${index + 1}: Tiebreak debe ser ≥7 con 2 puntos de diferencia`;
      }
      return null;
    }
    return `Set ${index + 1}: Puntaje inválido (6-4, 7-5, o 6-6 con tiebreak)`;
  };

  const validateMatchTiebreak = () => {
    if (matchTiebreak.player1 === 0 && matchTiebreak.player2 === 0) {
      return 'Ingresa puntajes de tiebreak válidos';
    }
    if (matchTiebreak.player1 === matchTiebreak.player2) {
      return 'El tiebreak debe tener un ganador';
    }
    if (Math.abs(matchTiebreak.player1 - matchTiebreak.player2) < 2) {
      return 'El tiebreak debe ganarse por 2 puntos';
    }
    return null;
  };

  const handleScoreChange = useCallback((index, field, value) => {
    const parsedValue = parseInt(value);
    if (isNaN(parsedValue) || parsedValue < 0) return;
    setMatchScores((prev) => {
      const newScores = [...prev];
      newScores[index] = { ...newScores[index], [field]: parsedValue };
      return newScores;
    });
    setErrors((prev) => {
      const newErrors = [...prev];
      newErrors[index] = validateSet({ ...matchScores[index], [field]: parsedValue }, index);
      return newErrors;
    });
  }, [matchScores]);

  const handleTiebreakChange = useCallback((field, value) => {
    const parsedValue = parseInt(value);
    if (isNaN(parsedValue) || parsedValue < 0) return;
    setMatchTiebreak((prev) => ({
      ...prev,
      [field]: parsedValue,
    }));
    setTiebreakError(validateMatchTiebreak());
  }, []);

  const incrementScore = useCallback((index, field) => {
    setMatchScores((prev) => {
      const newScores = [...prev];
      newScores[index] = { ...newScores[index], [field]: newScores[index][field] + 1 };
      return newScores;
    });
    setErrors((prev) => {
      const newErrors = [...prev];
      newErrors[index] = validateSet({ ...matchScores[index], [field]: matchScores[index][field] + 1 }, index);
      return newErrors;
    });
  }, [matchScores]);

  const decrementScore = useCallback((index, field) => {
    setMatchScores((prev) => {
      const newScores = [...prev];
      newScores[index] = { ...newScores[index], [field]: Math.max(0, newScores[index][field] - 1) };
      return newScores;
    });
    setErrors((prev) => {
      const newErrors = [...prev];
      newErrors[index] = validateSet({ ...matchScores[index], [field]: Math.max(0, matchScores[index][field] - 1) }, index);
      return newErrors;
    });
  }, [matchScores]);

  const incrementTiebreak = useCallback((field) => {
    setMatchTiebreak((prev) => ({
      ...prev,
      [field]: prev[field] + 1,
    }));
    setTiebreakError(validateMatchTiebreak());
  }, []);

  const decrementTiebreak = useCallback((field) => {
    setMatchTiebreak((prev) => ({
      ...prev,
      [field]: Math.max(0, prev[field] - 1),
    }));
    setTiebreakError(validateMatchTiebreak());
  }, []);

  const submitMatchResult = async (retries = 3) => {
    if (role !== 'admin' && role !== 'coach') {
      addNotification('Solo admin o coach pueden actualizar partidos', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const validSets = matchScores.filter((set) => set.player1 > 0 || set.player2 > 0);
      if (validSets.length !== tournament?.format?.sets) {
        addNotification(`Ingresa exactamente ${tournament?.format?.sets} set${tournament?.format?.sets > 1 ? 's' : ''} válidos`, 'error');
        return;
      }
      const validationErrors = validSets.map((set, index) => validateSet(set, index)).filter((error) => error);
      if (validationErrors.length > 0) {
        setErrors(validationErrors);
        addNotification('Corrige los errores en los sets antes de guardar', 'error');
        return;
      }

      const { matchId, roundIndex } = selectedMatch;
      if (!matchId || !isValidObjectId(matchId)) {
        addNotification('ID de partido inválido', 'error');
        return;
      }

      const player1Id = normalizeId(selectedMatch.match.player1?.player1);
      const player1Id2 = selectedMatch.match.player1?.player2 ? normalizeId(selectedMatch.match.player1.player2) : null;
      const player2Id = normalizeId(selectedMatch.match.player2?.player1);
      const player2Id2 = selectedMatch.match.player2?.player2 ? normalizeId(selectedMatch.match.player2.player2) : null;

      if (
        !player1Id ||
        !player2Id ||
        !isValidObjectId(player1Id) ||
        !isValidObjectId(player2Id) ||
        (tournament.format.mode === 'Dobles' && player1Id2 && !isValidObjectId(player1Id2)) ||
        (tournament.format.mode === 'Dobles' && player2Id2 && !isValidObjectId(player2Id2))
      ) {
        addNotification('IDs de jugadores inválidos', 'error');
        return;
      }

      const player1Pair = { player1: player1Id, player2: player1Id2 };
      const player2Pair = { player1: player2Id, player2: player2Id2 };

      let matchTiebreak1, matchTiebreak2;
      if (tournament.format.sets === 2) {
        let setsWonByPlayer1 = 0;
        let setsWonByPlayer2 = 0;
        validSets.forEach((set) => {
          if (set.player1 > set.player2 || (set.player1 === set.player2 && set.tiebreak1 > set.tiebreak2)) {
            setsWonByPlayer1 += 1;
          } else if (set.player2 > set.player1 || (set.player1 === set.player2 && set.tiebreak2 > set.tiebreak1)) {
            setsWonByPlayer2 += 1;
          }
        });
        if (setsWonByPlayer1 === 1 && setsWonByPlayer2 === 1) {
          const tiebreakError = validateMatchTiebreak();
          if (tiebreakError) {
            setTiebreakError(tiebreakError);
            addNotification(tiebreakError, 'error');
            return;
          }
          matchTiebreak1 = matchTiebreak.player1;
          matchTiebreak2 = matchTiebreak.player2;
        }
      }

      const winnerPair = determineWinner(matchScores, player1Pair, player2Pair, tournament?.format?.sets, matchTiebreak);
      if (!winnerPair) {
        addNotification('No se pudo determinar un ganador válido', 'error');
        return;
      }

      let runnerUpPair;
      if (roundIndex !== null && tournament?.rounds?.length === roundIndex + 1 && tournament?.rounds[roundIndex]?.matches?.length === 1) {
        runnerUpPair = winnerPair === player1Pair ? player2Pair : player1Pair;
      }

      const payload = {
        sets: matchScores.map((set) => ({
          player1: set.player1,
          player2: set.player2,
          tiebreak1: set.tiebreak1 > 0 ? set.tiebreak1 : undefined,
          tiebreak2: set.tiebreak2 > 0 ? set.tiebreak2 : undefined,
        })),
        winner: winnerPair,
        runnerUp: runnerUpPair || null,
        isKnockout: roundIndex !== null,
        matchTiebreak1: matchTiebreak1 || undefined,
        matchTiebreak2: matchTiebreak2 || undefined,
      };

      await axios.put(
        `https://padnis.onrender.com/api/tournaments/${tournament._id}/matches/${matchId}/result`,
        payload,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          timeout: 60000,
        }
      );
      onClose();
      await fetchTournament();
      addNotification('Resultado de partido actualizado', 'success');
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Error al guardar resultado';
      if (retries > 0 && error.code === 'ERR_NETWORK') {
        setTimeout(() => submitMatchResult(retries - 1), 5000);
        return;
      }
      addNotification(`Error: ${errorMessage}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const isMatchTied = tournament?.format?.sets === 2 &&
    matchScores.length === 2 &&
    matchScores[0].player1 !== 0 &&
    matchScores[0].player2 !== 0 &&
    matchScores[1].player1 !== 0 &&
    matchScores[1].player2 !== 0 &&
    (
      (matchScores[0].player1 > matchScores[0].player2 && matchScores[1].player2 > matchScores[1].player1) ||
      (matchScores[0].player2 > matchScores[0].player1 && matchScores[1].player1 > matchScores[1].player2) ||
      (matchScores[0].player1 === matchScores[0].player2 && matchScores[0].tiebreak1 > matchScores[0].tiebreak2 && matchScores[1].player2 > matchScores[1].player1) ||
      (matchScores[0].player1 === matchScores[0].player2 && matchScores[0].tiebreak2 > matchScores[0].tiebreak1 && matchScores[1].player1 > matchScores[1].player2)
    );

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" aria-labelledby="match-dialog-title">
      <DialogTitle id="match-dialog-title" sx={{ bgcolor: '#1976d2', color: '#fff', fontSize: { xs: '1rem', sm: '1.25rem' }, p: 1.5 }}>
        Actualizar Resultado del Partido
      </DialogTitle>
      <DialogContent sx={{ bgcolor: '#f0f4f8', p: { xs: 1, sm: 2 } }}>
        {selectedMatch && (
          <Stack spacing={2}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                bgcolor: '#fff',
                p: 1,
                borderRadius: 2,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                <Avatar sx={{ bgcolor: '#1976d2', width: 24, height: 24, fontSize: '0.75rem' }}>
                  {selectedMatch.match.player1?.player1 ? getPlayerName(tournament, selectedMatch.match.player1.player1).charAt(0) : '?'}
                </Avatar>
                <Typography sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                  {selectedMatch.match.player1?.player1
                    ? getPlayerName(tournament, selectedMatch.match.player1.player1, selectedMatch.match.player1.player2)
                    : 'Jugador no definido'}
                </Typography>
              </Box>
              <Typography sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>vs</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                  {selectedMatch.match.player2?.name ||
                  (selectedMatch.match.player2?.player1
                    ? getPlayerName(tournament, selectedMatch.match.player2.player1, selectedMatch.match.player2.player2)
                    : 'Jugador no definido')}
                </Typography>
                <Avatar sx={{ bgcolor: '#424242', width: 24, height: 24, fontSize: '0.75rem' }}>
                  {selectedMatch.match.player2?.name
                    ? 'BYE'
                    : selectedMatch.match.player2?.player1
                    ? getPlayerName(tournament, selectedMatch.match.player2.player1).charAt(0)
                    : '?'}
                </Avatar>
              </Box>
            </Box>
            {matchScores.map((set, index) => (
              index < tournament?.format?.sets && (
                <Card key={index} sx={{ bgcolor: '#fff', p: 1, borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                  <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' }, fontWeight: 'medium', mb: 1 }}>
                    Set {index + 1}
                  </Typography>
                  {errors[index] && <Alert severity="error" sx={{ mb: 1, fontSize: '0.75rem' }}>{errors[index]}</Alert>}
                  <Stack spacing={1}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Typography sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, width: { xs: '80px', sm: '100px' } }}>
                        Equipo 1
                      </Typography>
                      <IconButton
                        onClick={() => decrementScore(index, 'player1')}
                        size="small"
                        sx={{ bgcolor: '#e0e0e0', ':hover': { bgcolor: '#d5d5d5' }, p: 0.75 }}
                        aria-label={`Decrementar puntaje del equipo 1 en el set ${index + 1}`}
                      >
                        <Remove fontSize="small" />
                      </IconButton>
                      <TextField
                        type="number"
                        value={set.player1}
                        onChange={(e) => handleScoreChange(index, 'player1', e.target.value)}
                        inputProps={{ min: 0, 'aria-label': `Puntaje del equipo 1 en el set ${index + 1}` }}
                        sx={{ width: 48, minWidth: 0, '& input': { textAlign: 'center', fontSize: { xs: '0.75rem', sm: '0.875rem' } } }}
                      />
                      <IconButton
                        onClick={() => incrementScore(index, 'player1')}
                        size="small"
                        sx={{ bgcolor: '#e0e0e0', ':hover': { bgcolor: '#d5d5d5' }, p: 0.75 }}
                        aria-label={`Incrementar puntaje del equipo 1 en el set ${index + 1}`}
                      >
                        <Add fontSize="small" />
                      </IconButton>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Typography sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, width: { xs: '80px', sm: '100px' } }}>
                        Equipo 2
                      </Typography>
                      <IconButton
                        onClick={() => decrementScore(index, 'player2')}
                        size="small"
                        sx={{ bgcolor: '#e0e0e0', ':hover': { bgcolor: '#d5d5d5' }, p: 0.75 }}
                        aria-label={`Decrementar puntaje del equipo 2 en el set ${index + 1}`}
                      >
                        <Remove fontSize="small" />
                      </IconButton>
                      <TextField
                        type="number"
                        value={set.player2}
                        onChange={(e) => handleScoreChange(index, 'player2', e.target.value)}
                        inputProps={{ min: 0, 'aria-label': `Puntaje del equipo 2 en el set ${index + 1}` }}
                        sx={{ width: 48, minWidth: 0, '& input': { textAlign: 'center', fontSize: { xs: '0.75rem', sm: '0.875rem' } } }}
                      />
                      <IconButton
                        onClick={() => incrementScore(index, 'player2')}
                        size="small"
                        sx={{ bgcolor: '#e0e0e0', ':hover': { bgcolor: '#d5d5d5' }, p: 0.75 }}
                        aria-label={`Incrementar puntaje del equipo 2 en el set ${index + 1}`}
                      >
                        <Add fontSize="small" />
                      </IconButton>
                    </Box>
                    {set.player1 === 6 && set.player2 === 6 && (
                      <>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, width: { xs: '80px', sm: '100px' } }}>
                            Tiebreak Equipo 1
                          </Typography>
                          <IconButton
                            onClick={() => decrementScore(index, 'tiebreak1')}
                            size="small"
                            sx={{ bgcolor: '#e0e0e0', ':hover': { bgcolor: '#d5d5d5' }, p: 0.75 }}
                            aria-label={`Decrementar tiebreak del equipo 1 en el set ${index + 1}`}
                          >
                            <Remove fontSize="small" />
                          </IconButton>
                          <TextField
                            type="number"
                            value={set.tiebreak1}
                            onChange={(e) => handleScoreChange(index, 'tiebreak1', e.target.value)}
                            inputProps={{ min: 0, 'aria-label': `Tiebreak del equipo 1 en el set ${index + 1}` }}
                            sx={{ width: 48, minWidth: 0, '& input': { textAlign: 'center', fontSize: { xs: '0.75rem', sm: '0.875rem' } } }}
                          />
                          <IconButton
                            onClick={() => incrementScore(index, 'tiebreak1')}
                            size="small"
                            sx={{ bgcolor: '#e0e0e0', ':hover': { bgcolor: '#d5d5d5' }, p: 0.75 }}
                            aria-label={`Incrementar tiebreak del equipo 1 en el set ${index + 1}`}
                          >
                            <Add fontSize="small" />
                          </IconButton>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, width: { xs: '80px', sm: '100px' } }}>
                            Tiebreak Equipo 2
                          </Typography>
                          <IconButton
                            onClick={() => decrementScore(index, 'tiebreak2')}
                            size="small"
                            sx={{ bgcolor: '#e0e0e0', ':hover': { bgcolor: '#d5d5d5' }, p: 0.75 }}
                            aria-label={`Decrementar tiebreak del equipo 2 en el set ${index + 1}`}
                          >
                            <Remove fontSize="small" />
                          </IconButton>
                          <TextField
                            type="number"
                            value={set.tiebreak2}
                            onChange={(e) => handleScoreChange(index, 'tiebreak2', e.target.value)}
                            inputProps={{ min: 0, 'aria-label': `Tiebreak del equipo 2 en el set ${index + 1}` }}
                            sx={{ width: 48, minWidth: 0, '& input': { textAlign: 'center', fontSize: { xs: '0.75rem', sm: '0.875rem' } } }}
                          />
                          <IconButton
                            onClick={() => incrementScore(index, 'tiebreak2')}
                            size="small"
                            sx={{ bgcolor: '#e0e0e0', ':hover': { bgcolor: '#d5d5d5' }, p: 0.75 }}
                            aria-label={`Incrementar tiebreak del equipo 2 en el set ${index + 1}`}
                          >
                            <Add fontSize="small" />
                          </IconButton>
                        </Box>
                      </>
                    )}
                  </Stack>
                </Card>
              )
            ))}
            {isMatchTied && (
              <Card sx={{ bgcolor: '#fff', p: 1, borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' }, fontWeight: 'medium', mb: 1 }}>
                  Tiebreak del Partido
                </Typography>
                {tiebreakError && <Alert severity="error" sx={{ mb: 1, fontSize: '0.75rem' }}>{tiebreakError}</Alert>}
                <Stack spacing={1}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Typography sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, width: { xs: '80px', sm: '100px' } }}>
                      Equipo 1
                    </Typography>
                    <IconButton
                      onClick={() => decrementTiebreak('player1')}
                      size="small"
                      sx={{ bgcolor: '#e0e0e0', ':hover': { bgcolor: '#d5d5d5' }, p: 0.75 }}
                      aria-label="Decrementar tiebreak del partido para el equipo 1"
                    >
                      <Remove fontSize="small" />
                    </IconButton>
                    <TextField
                      type="number"
                      value={matchTiebreak.player1}
                      onChange={(e) => handleTiebreakChange('player1', e.target.value)}
                      inputProps={{ min: 0, 'aria-label': 'Tiebreak del partido para el equipo 1' }}
                      sx={{ width: 48, minWidth: 0, '& input': { textAlign: 'center', fontSize: { xs: '0.75rem', sm: '0.875rem' } } }}
                    />
                    <IconButton
                      onClick={() => incrementTiebreak('player1')}
                      size="small"
                      sx={{ bgcolor: '#e0e0e0', ':hover': { bgcolor: '#d5d5d5' }, p: 0.75 }}
                      aria-label="Incrementar tiebreak del partido para el equipo 1"
                    >
                      <Add fontSize="small" />
                    </IconButton>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Typography sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, width: { xs: '80px', sm: '100px' } }}>
                      Equipo 2
                    </Typography>
                    <IconButton
                      onClick={() => decrementTiebreak('player2')}
                      size="small"
                      sx={{ bgcolor: '#e0e0e0', ':hover': { bgcolor: '#d5d5d5' }, p: 0.75 }}
                      aria-label="Decrementar tiebreak del partido para el equipo 2"
                    >
                      <Remove fontSize="small" />
                    </IconButton>
                    <TextField
                      type="number"
                      value={matchTiebreak.player2}
                      onChange={(e) => handleTiebreakChange('player2', e.target.value)}
                      inputProps={{ min: 0, 'aria-label': 'Tiebreak del partido para el equipo 2' }}
                      sx={{ width: 48, minWidth: 0, '& input': { textAlign: 'center', fontSize: { xs: '0.75rem', sm: '0.875rem' } } }}
                    />
                    <IconButton
                      onClick={() => incrementTiebreak('player2')}
                      size="small"
                      sx={{ bgcolor: '#e0e0e0', ':hover': { bgcolor: '#d5d5d5' }, p: 0.75 }}
                      aria-label="Incrementar tiebreak del partido para el equipo 2"
                    >
                      <Add fontSize="small" />
                    </IconButton>
                  </Box>
                </Stack>
              </Card>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ p: { xs: 1, sm: 2 }, bgcolor: '#f0f4f8' }}>
        <Button
          onClick={onClose}
          disabled={isLoading}
          sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, minHeight: { xs: 32, sm: 36 } }}
          aria-label="Cancelar actualización de resultado"
        >
          Cancelar
        </Button>
        <Button
          onClick={submitMatchResult}
          variant="contained"
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null}
          sx={{
            bgcolor: '#1976d2',
            ':hover': { bgcolor: '#1565c0' },
            fontSize: { xs: '0.75rem', sm: '0.875rem' },
            py: { xs: 1, sm: 1.5 },
            minHeight: { xs: 32, sm: 36 },
          }}
          aria-label="Guardar resultado del partido"
        >
          {isLoading ? 'Guardando...' : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MatchDialog;