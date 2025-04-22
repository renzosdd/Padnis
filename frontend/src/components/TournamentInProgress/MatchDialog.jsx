import React, { useState, useCallback } from 'react';
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
} from '@mui/material';
import { Add, Remove } from '@mui/icons-material';
import axios from 'axios';

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

  // Initialize match scores when dialog opens
  React.useEffect(() => {
    if (selectedMatch && open) {
      const initialSets =
        selectedMatch.match.result.sets && selectedMatch.match.result.sets.length > 0
          ? selectedMatch.match.result.sets.map(set => ({
              player1: set.player1 || 0,
              player2: set.player2 || 0,
              tiebreak1: set.tiebreak1 || 0,
              tiebreak2: set.tiebreak2 || 0,
            }))
          : Array(tournament?.format?.sets || 1).fill({ player1: 0, player2: 0, tiebreak1: 0, tiebreak2: 0 });
      setMatchScores(initialSets);
    }
  }, [selectedMatch, open, tournament?.format?.sets]);

  const handleScoreChange = useCallback((index, field, value) => {
    const parsedValue = parseInt(value);
    if (isNaN(parsedValue) || parsedValue < 0) return;
    setMatchScores(prev => {
      const newScores = [...prev];
      newScores[index] = { ...newScores[index], [field]: parsedValue };
      return newScores;
    });
  }, []);

  const incrementScore = useCallback((index, field) => {
    setMatchScores(prev => {
      const newScores = [...prev];
      newScores[index] = { ...newScores[index], [field]: newScores[index][field] + 1 };
      return newScores;
    });
  }, []);

  const decrementScore = useCallback((index, field) => {
    setMatchScores(prev => {
      const newScores = [...prev];
      newScores[index] = { ...newScores[index], [field]: Math.max(0, newScores[index][field] - 1) };
      return newScores;
    });
  }, []);

  const determineWinner = useCallback(
    (sets, player1Pair, player2Pair) => {
      let setsWonByPlayer1 = 0;
      let setsWonByPlayer2 = 0;
      sets.forEach((set, index) => {
        if (set.player1 > set.player2) {
          setsWonByPlayer1 += 1;
        } else if (set.player2 > set.player1) {
          setsWonByPlayer2 += 1;
        } else if (set.player1 === set.player2 && set.tiebreak1 !== undefined && set.tiebreak2 !== undefined) {
          if (set.tiebreak1 > set.tiebreak2) {
            setsWonByPlayer1 += 1;
          } else if (set.tiebreak2 > set.tiebreak1) {
            setsWonByPlayer2 += 1;
          }
        }
      });
      if (tournament?.format?.sets === 2 && sets.length === 2) {
        const finalSet = sets[1];
        if (finalSet.player1 === 6 && finalSet.player2 === 6 && finalSet.tiebreak1 !== undefined && finalSet.tiebreak2 !== undefined) {
          if (finalSet.tiebreak1 > finalSet.tiebreak2) {
            return player1Pair;
          } else if (finalSet.tiebreak2 > finalSet.tiebreak1) {
            return player2Pair;
          }
        }
        if (setsWonByPlayer1 === setsWonByPlayer2) {
          return null;
        }
      }
      if (setsWonByPlayer1 > setsWonByPlayer2) {
        return player1Pair;
      } else if (setsWonByPlayer2 > setsWonByPlayer1) {
        return player2Pair;
      }
      return null;
    },
    [tournament?.format?.sets]
  );

  const isValidObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(id);

  const submitMatchResult = async (retries = 3) => {
    const validSets = matchScores.filter(set => set.player1 > 0 || set.player2 > 0);
    if (validSets.length !== tournament?.format?.sets) {
      addNotification(`Ingresa exactamente ${tournament?.format?.sets} set${tournament?.format?.sets > 1 ? 's' : ''} válidos`, 'error');
      return;
    }
    for (const set of validSets) {
      const { player1, player2, tiebreak1, tiebreak2 } = set;
      if (player1 === 0 && player2 === 0) {
        addNotification('Los puntajes de los sets no pueden ser ambos 0', 'error');
        return;
      }
      if (player1 === 6 && player2 <= 4) continue;
      if (player2 === 6 && player1 <= 4) continue;
      if (player1 === 7 && player2 === 5) continue;
      if (player2 === 7 && player1 === 5) continue;
      if (player1 === 6 && player2 === 6) {
        if (!tiebreak1 || !tiebreak2 || tiebreak1 === tiebreak2) {
          addNotification('Ingresa puntajes de tiebreak válidos (diferencia mínima de 2)', 'error');
          return;
        }
        if (Math.abs(tiebreak1 - tiebreak2) < 2 || (tiebreak1 < 7 && tiebreak2 < 7)) {
          addNotification('El tiebreak debe ganarse por 2 puntos de diferencia, mínimo 7', 'error');
          return;
        }
      } else {
        addNotification('Puntaje de set inválido (debe ser 6-4, 7-5 o 6-6 con tiebreak)', 'error');
        return;
      }
    }
    try {
      const { matchId, roundIndex } = selectedMatch;
      if (!matchId || !isValidObjectId(matchId)) {
        addNotification('ID de partido inválido', 'error');
        console.error('Invalid matchId:', matchId);
        return;
      }
      const sets = validSets.map(set => ({
        player1: set.player1,
        player2: set.player2,
        tiebreak1: set.tiebreak1 > 0 ? set.tiebreak1 : undefined,
        tiebreak2: set.tiebreak2 > 0 ? set.tiebreak2 : undefined,
      }));
      const player1Id =
        typeof selectedMatch.match.player1?.player1 === 'object'
          ? selectedMatch.match.player1.player1?._id?.toString() || selectedMatch.match.player1.player1?.$oid
          : selectedMatch.match.player1?.player1?.toString();
      const player1Id2 = selectedMatch.match.player1?.player2
        ? typeof selectedMatch.match.player1.player2 === 'object'
          ? selectedMatch.match.player1.player2?._id?.toString() || selectedMatch.match.player1.player2?.$oid
          : selectedMatch.match.player1?.player2?.toString()
        : null;
      const player2Id =
        typeof selectedMatch.match.player2?.player1 === 'object'
          ? selectedMatch.match.player2.player1?._id?.toString() || selectedMatch.match.player2.player1?.$oid
          : selectedMatch.match.player2?.player1?.toString();
      const player2Id2 = selectedMatch.match.player2?.player2
        ? typeof selectedMatch.match.player2.player2 === 'object'
          ? selectedMatch.match.player2.player2?._id?.toString() || selectedMatch.match.player2.player2?.$oid
          : selectedMatch.match.player2?.player2?.toString()
        : null;

      if (
        !player1Id ||
        !player2Id ||
        !isValidObjectId(player1Id) ||
        !isValidObjectId(player2Id) ||
        (tournament.format.mode === 'Dobles' && player1Id2 && !isValidObjectId(player1Id2)) ||
        (tournament.format.mode === 'Dobles' && player2Id2 && !isValidObjectId(player2Id2))
      ) {
        addNotification('IDs de jugadores inválidos', 'error');
        console.error('Invalid player IDs:', { player1Id, player1Id2, player2Id, player2Id2 });
        return;
      }

      const player1Pair = { player1: player1Id, player2: player1Id2 };
      const player2Pair = { player1: player2Id, player2: player2Id2 };

      const winnerPair = determineWinner(sets, player1Pair, player2Pair);
      if (!winnerPair) {
        addNotification('No se pudo determinar un ganador', 'error');
        return;
      }

      let runnerUpPair;
      if (roundIndex !== null && tournament?.rounds?.length === roundIndex + 1 && tournament?.rounds[roundIndex]?.matches?.length === 1) {
        runnerUpPair = winnerPair === player1Pair ? player2Pair : player1Pair;
      }

      const payload = {
        sets,
        winner: winnerPair,
        runnerUp: runnerUpPair,
        isKnockout: roundIndex !== null,
      };

      console.log('Submitting match result payload:');
      const response = await axios.put(
        `https://padnis.onrender.com/api/tournaments/${tournament._id}/matches/${matchId}/result`,
        payload,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          timeout: 60000,
        }
      );
      console.log('Match update response:', response.data);
      onClose();
      await fetchTournament();
      addNotification('Resultado de partido actualizado', 'success');
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Error desconocido';
      const statusCode = error.response?.status || 'desconocido';
      const errorDetails = {
        message: errorMessage,
        status: statusCode,
        responseData: error.response?.data,
        request: error.config,
      };
      addNotification(`Error al actualizar el resultado (código ${statusCode}): ${errorMessage}.`, 'error');
      console.error('Error updating match result:', errorDetails);
      if (retries > 0 && error.code === 'ERR_NETWORK') {
        console.log(`Retrying match update (${retries} retries left)...`);
        setTimeout(() => submitMatchResult(retries - 1), 5000);
      }
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontSize: 'clamp(1rem, 5vw, 1.25rem)', bgcolor: '#01579b', color: '#ffffff', p: 2 }}>
        Actualizar Resultado del Partido
      </DialogTitle>
      <DialogContent sx={{ bgcolor: '#f5f5f5', p: 3 }}>
        {selectedMatch && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                bgcolor: '#ffffff',
                p: 2,
                borderRadius: 1,
                boxShadow: '0 1px 4px rgba(0, 0, 0, 0.1)',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar sx={{ bgcolor: '#01579b', width: 40, height: 40 }}>
                  {selectedMatch.match.player1?.player1 ? getPlayerName(selectedMatch.match.player1.player1).charAt(0) : '?'}
                </Avatar>
                <Typography sx={{ fontSize: 'clamp(0.875rem, 4vw, 1rem)', fontWeight: 'bold' }}>
                  {selectedMatch.match.player1?.player1
                    ? getPlayerName(selectedMatch.match.player1.player1, selectedMatch.match.player1.player2)
                    : 'Jugador no definido'}
                </Typography>
              </Box>
              <Typography sx={{ fontSize: 'clamp(0.875rem, 4vw, 1rem)' }}>vs</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography sx={{ fontSize: 'clamp(0.875rem, 4vw, 1rem)', fontWeight: 'bold' }}>
                  {selectedMatch.match.player2?.name ||
                  (selectedMatch.match.player2?.player1
                    ? getPlayerName(selectedMatch.match.player2.player1, selectedMatch.match.player2.player2)
                    : 'Jugador no definido')}
                </Typography>
                <Avatar sx={{ bgcolor: '#0288d1', width: 40, height: 40 }}>
                  {selectedMatch.match.player2?.name
                    ? 'BYE'
                    : selectedMatch.match.player2?.player1
                    ? getPlayerName(selectedMatch.match.player2.player1).charAt(0)
                    : '?'}
                </Avatar>
              </Box>
            </Box>
            {matchScores.map(
              (set, index) =>
                index < tournament?.format?.sets && (
                  <Card key={index} sx={{ bgcolor: '#ffffff', p: 2, borderRadius: 1, boxShadow: '0 1px 4px rgba(0, 0, 0, 0.1)' }}>
                    <Typography sx={{ fontSize: 'clamp(0.875rem, 4vw, 1rem)', fontWeight: 'medium', mb: 2 }}>
                      Set {index + 1}
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ fontSize: 'clamp(0.75rem, 3.5vw, 0.875rem)', width: '150px' }}>
                          {selectedMatch.match.player1?.player1
                            ? getPlayerName(selectedMatch.match.player1.player1, selectedMatch.match.player1.player2)
                            : 'Jugador no definido'}
                        </Typography>
                        <IconButton
                          onClick={() => decrementScore(index, 'player1')}
                          size="small"
                          sx={{ bgcolor: '#e0e0e0', '&:hover': { bgcolor: '#d5d5d5' }, borderRadius: '50%' }}
                        >
                          <Remove />
                        </IconButton>
                        <TextField
                          type="number"
                          value={set.player1}
                          onChange={e => handleScoreChange(index, 'player1', e.target.value)}
                          inputProps={{ min: 0 }}
                          sx={{ width: '80px', '& input': { textAlign: 'center', fontSize: 'clamp(0.875rem, 4vw, 1rem)' } }}
                        />
                        <IconButton
                          onClick={() => incrementScore(index, 'player1')}
                          size="small"
                          sx={{ bgcolor: '#e0e0e0', '&:hover': { bgcolor: '#d5d5d5' }, borderRadius: '50%' }}
                        >
                          <Add />
                        </IconButton>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ fontSize: 'clamp(0.75rem, 3.5vw, 0.875rem)', width: '150px' }}>
                          {selectedMatch.match.player2?.name ||
                          (selectedMatch.match.player2?.player1
                            ? getPlayerName(selectedMatch.match.player2.player1, selectedMatch.match.player2.player2)
                            : 'Jugador no definido')}
                        </Typography>
                        <IconButton
                          onClick={() => decrementScore(index, 'player2')}
                          size="small"
                          sx={{ bgcolor: '#e0e0e0', '&:hover': { bgcolor: '#d5d5d5' }, borderRadius: '50%' }}
                        >
                          <Remove />
                        </IconButton>
                        <TextField
                          type="number"
                          value={set.player2}
                          onChange={e => handleScoreChange(index, 'player2', e.target.value)}
                          inputProps={{ min: 0 }}
                          sx={{ width: '80px', '& input': { textAlign: 'center', fontSize: 'clamp(0.875rem, 4vw, 1rem)' } }}
                        />
                        <IconButton
                          onClick={() => incrementScore(index, 'player2')}
                          size="small"
                          sx={{ bgcolor: '#e0e0e0', '&:hover': { bgcolor: '#d5d5d5' }, borderRadius: '50%' }}
                        >
                          <Add />
                        </IconButton>
                      </Box>
                      {set.player1 === 6 && set.player2 === 6 && (
                        <>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                            <Typography sx={{ fontSize: 'clamp(0.75rem, 3.5vw, 0.875rem)', width: '150px' }}>
                              Tiebreak Equipo 1
                            </Typography>
                            <IconButton
                              onClick={() => decrementScore(index, 'tiebreak1')}
                              size="small"
                              sx={{ bgcolor: '#e0e0e0', '&:hover': { bgcolor: '#d5d5d5' }, borderRadius: '50%' }}
                            >
                              <Remove />
                            </IconButton>
                            <TextField
                              type="number"
                              value={set.tiebreak1}
                              onChange={e => handleScoreChange(index, 'tiebreak1', e.target.value)}
                              inputProps={{ min: 0 }}
                              sx={{ width: '80px', '& input': { textAlign: 'center', fontSize: 'clamp(0.875rem, 4vw, 1rem)' } }}
                            />
                            <IconButton
                              onClick={() => incrementScore(index, 'tiebreak1')}
                              size="small"
                              sx={{ bgcolor: '#e0e0e0', '&:hover': { bgcolor: '#d5d5d5' }, borderRadius: '50%' }}
                            >
                              <Add />
                            </IconButton>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                            <Typography sx={{ fontSize: 'clamp(0.75rem, 3.5vw, 0.875rem)', width: '150px' }}>
                              Tiebreak Equipo 2
                            </Typography>
                            <IconButton
                              onClick={() => decrementScore(index, 'tiebreak2')}
                              size="small"
                              sx={{ bgcolor: '#e0e0e0', '&:hover': { bgcolor: '#d5d5d5' }, borderRadius: '50%' }}
                            >
                              <Remove />
                            </IconButton>
                            <TextField
                              type="number"
                              value={set.tiebreak2}
                              onChange={e => handleScoreChange(index, 'tiebreak2', e.target.value)}
                              inputProps={{ min: 0 }}
                              sx={{ width: '80px', '& input': { textAlign: 'center', fontSize: 'clamp(0.875rem, 4vw, 1rem)' } }}
                            />
                            <IconButton
                              onClick={() => incrementScore(index, 'tiebreak2')}
                              size="small"
                              sx={{ bgcolor: '#e0e0e0', '&:hover': { bgcolor: '#d5d5d5' }, borderRadius: '50%' }}
                            >
                              <Add />
                            </IconButton>
                          </Box>
                        </>
                      )}
                    </Box>
                  </Card>
                )
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2, bgcolor: '#f5f5f5' }}>
        <Button onClick={onClose} sx={{ fontSize: 'clamp(0.75rem, 3.5vw, 0.875rem)' }}>
          Cancelar
        </Button>
        <Button
          onClick={submitMatchResult}
          color="primary"
          variant="contained"
          sx={{ fontSize: 'clamp(0.75rem, 3.5vw, 0.875rem)', bgcolor: '#0288d1', '&:hover': { bgcolor: '#0277bd' } }}
        >
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MatchDialog;