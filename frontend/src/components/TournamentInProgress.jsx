import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import {
  Box,
  Typography,
  Button,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  IconButton,
  TextField,
  Avatar,
} from '@mui/material';
import { Add, Remove } from '@mui/icons-material';

const TournamentInProgress = ({ tournamentId, onFinishTournament }) => {
  const [tournament, setTournament] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [matchDialogOpen, setMatchDialogOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [matchScores, setMatchScores] = useState([]);
  const [standings, setStandings] = useState([]);
  const { user, role } = useAuth();
  const { addNotification } = useNotification();

  useEffect(() => {
    fetchTournament();
  }, [tournamentId]);

  const fetchTournament = async () => {
    try {
      const response = await axios.get(`https://padnis.onrender.com/api/tournaments/${tournamentId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setTournament(response.data);
      if (response.data.type === 'RoundRobin') {
        updateStandings(response.data);
      }
    } catch (error) {
      addNotification(`Error al cargar el torneo: ${error.response?.data?.message || error.message}`, 'error');
    }
  };

  const updateStandings = (tournamentData) => {
    const newStandings = tournamentData.groups.map(group => {
      const standings = group.players.map(p => ({
        playerId: p.player1._id ? p.player1._id : p.player1,
        player2Id: p.player2 ? (p.player2._id ? p.player2._id : p.player2) : null,
        wins: 0,
        setsWon: 0,
        gamesWon: 0,
      }));
      group.matches.forEach(match => {
        if (match.result.winner) {
          const winner = standings.find(s => s.playerId.toString() === match.result.winner.toString());
          if (winner) {
            winner.wins += 1;
          }
          match.result.sets.forEach(set => {
            const p1 = standings.find(s => s.playerId.toString() === (match.player1?.player1?._id || match.player1?.player1).toString());
            const p2 = standings.find(s => s.playerId.toString() === (match.player2?.player1?._id || match.player2?.player1).toString());
            if (p1 && p2) {
              p1.gamesWon += set.player1;
              p2.gamesWon += set.player2;
              if (set.player1 > set.player2) {
                p1.setsWon += 1;
              } else if (set.player2 > set.player1) {
                p2.setsWon += 1;
              } else if (set.player1 === set.player2 && set.tiebreak1 !== undefined && set.tiebreak2 !== undefined) {
                if (set.tiebreak1 > set.tiebreak2) {
                  p1.setsWon += 1;
                } else if (set.tiebreak2 > set.tiebreak1) {
                  p2.setsWon += 1;
                }
              }
            }
          });
        }
      });
      return {
        groupName: group.name,
        standings: standings.sort((a, b) => b.wins - a.wins || b.setsWon - a.setsWon || b.gamesWon - a.gamesWon),
      };
    });
    setStandings(newStandings);
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const openMatchDialog = (match, groupIndex, matchIndex) => {
    if (role !== 'admin' && role !== 'coach') {
      addNotification('Solo admin o coach pueden actualizar partidos', 'error');
      return;
    }
    setSelectedMatch({ match, groupIndex, matchIndex, matchId: match._id });
    const initialSets = match.result.sets.length > 0 
      ? match.result.sets.map(set => ({
          player1: set.player1,
          player2: set.player2,
          tiebreak1: set.tiebreak1 || 0,
          tiebreak2: set.tiebreak2 || 0,
        }))
      : Array(tournament?.format.sets || 1).fill({ player1: 0, player2: 0, tiebreak1: 0, tiebreak2: 0 });
    setMatchScores(initialSets);
    setMatchDialogOpen(true);
  };

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

  const determineWinner = (sets, player1Id, player2Id) => {
    let setsWonByPlayer1 = 0;
    let setsWonByPlayer2 = 0;
    sets.forEach(set => {
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
    if (setsWonByPlayer1 > setsWonByPlayer2) {
      return player1Id;
    } else if (setsWonByPlayer2 > setsWonByPlayer1) {
      return player2Id;
    }
    return null;
  };

  const submitMatchResult = async (retries = 2) => {
    const validSets = matchScores.filter(set => set.player1 > 0 || set.player2 > 0);
    if (validSets.length !== tournament.format.sets) {
      addNotification(`Ingresa exactamente ${tournament.format.sets} set${tournament.format.sets > 1 ? 's' : ''} válidos`, 'error');
      return;
    }
    for (const set of validSets) {
      const { player1, player2, tiebreak1, tiebreak2 } = set;
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
      const { matchId } = selectedMatch;
      if (!matchId) {
        addNotification('No se pudo identificar el partido', 'error');
        return;
      }
      const sets = validSets.map(set => ({
        player1: set.player1,
        player2: set.player2,
        tiebreak1: set.tiebreak1 > 0 ? set.tiebreak1 : undefined,
        tiebreak2: set.tiebreak2 > 0 ? set.tiebreak2 : undefined,
      }));
      const player1Id = selectedMatch.match.player1.player1._id.toString();
      const player2Id = selectedMatch.match.player2.player1._id.toString();
      const winnerId = determineWinner(sets, player1Id, player2Id);
      await axios.put(`https://padnis.onrender.com/api/tournaments/${tournamentId}/matches/${matchId}/result`, {
        sets,
        winner: winnerId,
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setMatchDialogOpen(false);
      await fetchTournament();
      addNotification('Resultado de partido actualizado', 'success');
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Error desconocido';
      const statusCode = error.response?.status || 'desconocido';
      addNotification(`Error al actualizar el resultado (código ${statusCode}): ${errorMessage}`, 'error');
      console.error('Error updating match result:', error);
      if (retries > 0 && error.code === 'ERR_NETWORK') {
        setTimeout(() => submitMatchResult(retries - 1), 2000);
      }
    }
  };

  const generateKnockoutPhase = async () => {
    if (tournament.type !== 'RoundRobin') return;
    try {
      const topPlayers = standings.flatMap(group => {
        if (!group.standings || !Array.isArray(group.standings)) {
          console.warn(`El grupo ${group.groupName} no tiene standings. Se omitirá.`);
          return [];
        }
        return group.standings.slice(0, tournament.playersPerGroupToAdvance || 2).map(s => {
          const participant = tournament.participants.find(p => 
            (p.player1._id ? p.player1._id.toString() : p.player1.toString()) === s.playerId.toString()
          );
          if (!participant) {
            console.warn(`No se encontró participante para playerId: ${s.playerId}`);
            return null;
          }
          return {
            player1: participant.player1._id ? participant.player1._id.toString() : participant.player1.toString(),
            player2: tournament.format.mode === 'Dobles' && participant.player2 
              ? (participant.player2._id ? participant.player2._id.toString() : participant.player2.toString()) 
              : null,
          };
        }).filter(p => p !== null);
      });

      if (topPlayers.length < 2) {
        addNotification('No hay suficientes clasificados para generar la fase eliminatoria', 'error');
        return;
      }
      const shuffled = topPlayers.sort(() => 0.5 - Math.random());
      const matches = [];
      for (let i = 0; i < shuffled.length; i += 2) {
        if (i + 1 < shuffled.length) {
          matches.push({
            player1: { player1: shuffled[i].player1, player2: shuffled[i].player2 },
            player2: { player1: shuffled[i + 1].player1, player2: shuffled[i + 1].player2 },
            result: { sets: [], winner: null },
            date: null,
          });
        }
      }
      if (matches.length === 0) {
        addNotification('No se pudieron generar partidos para la fase eliminatoria', 'error');
        return;
      }
      const updatedTournament = {
        ...tournament,
        rounds: [...tournament.rounds, { round: tournament.rounds.length + 1, matches }],
      };
      await axios.put(`https://padnis.onrender.com/api/tournaments/${tournamentId}`, updatedTournament, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      await fetchTournament();
      addNotification('Fase eliminatoria generada', 'success');
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Error desconocido';
      const statusCode = error.response?.status || 'desconocido';
      addNotification(`Error al generar la fase eliminatoria (código ${statusCode}): ${errorMessage}`, 'error');
      console.error('Error generating knockout phase:', error);
    }
  };

  const advanceEliminationRound = async () => {
    if (tournament.type !== 'Eliminatorio') return;
    try {
      const currentRound = tournament.rounds[tournament.rounds.length - 1];
      if (!currentRound.matches.every(m => m.result.winner || m.player2?.name === 'BYE')) {
        addNotification('Faltan completar partidos de la ronda actual', 'error');
        return;
      }
      const winners = currentRound.matches
        .filter(m => m.result.winner || m.player2?.name === 'BYE')
        .map(m => {
          const winnerId = m.result.winner || m.player1.player1._id || m.player1.player1;
          const participant = tournament.participants.find(p => 
            (p.player1._id ? p.player1._id.toString() : p.player1.toString()) === winnerId.toString()
          );
          if (!participant) {
            console.warn(`Participant not found for winnerId: ${winnerId}`);
            return null;
          }
          return {
            player1: participant.player1._id ? participant.player1._id.toString() : participant.player1.toString(),
            player2: tournament.format.mode === 'Dobles' && participant.player2 
              ? (participant.player2._id ? participant.player2._id.toString() : participant.player2.toString()) 
              : null,
          };
        })
        .filter(w => w !== null);
      if (winners.length < 1) {
        addNotification('No hay suficientes ganadores para avanzar', 'error');
        return;
      }
      const matches = [];
      for (let i = 0; i < winners.length; i += 2) {
        if (i + 1 < winners.length) {
          matches.push({
            player1: { player1: winners[i].player1, player2: winners[i].player2 },
            player2: { player1: winners[i + 1].player1, player2: winners[i + 1].player2 },
            result: { sets: [], winner: null },
            date: null,
          });
        } else {
          matches.push({
            player1: { player1: winners[i].player1, player2: winners[i].player2 },
            player2: { player1: null, name: 'BYE' },
            result: { sets: [], winner: winners[i].player1 },
            date: null,
          });
        }
      }
      const updatedTournament = {
        ...tournament,
        rounds: [...tournament.rounds, { round: tournament.rounds.length + 1, matches }],
      };
      await axios.put(`https://padnis.onrender.com/api/tournaments/${tournamentId}`, updatedTournament, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      await fetchTournament();
      addNotification('Ronda avanzada con éxito', 'success');
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Error desconocido';
      const statusCode = error.response?.status || 'desconocido';
      addNotification(`Error al avanzar la ronda (código ${statusCode}): ${errorMessage}`, 'error');
      console.error('Error advancing round:', error);
    }
  };

  const handleFinishTournament = async () => {
    try {
      const allMatchesCompleted = tournament.type === 'RoundRobin'
        ? tournament.groups.every(group => group.matches.every(match => match.result.winner !== null))
        : tournament.rounds.every(round => round.matches.every(match => match.result.winner !== null || match.player2?.name === 'BYE'));
      if (!allMatchesCompleted) {
        addNotification('Faltan completar algunos partidos', 'error');
        return;
      }
      let winner;
      if (tournament.type === 'Eliminatorio') {
        const finalRound = tournament.rounds[tournament.rounds.length - 1];
        const finalMatch = finalRound.matches[0];
        winner = finalMatch.result.winner;
      } else if (tournament.type === 'RoundRobin') {
        const allStandings = standings.flatMap(group => group.standings);
        winner = allStandings.sort((a, b) => b.wins - a.wins || b.setsWon - a.setsWon || b.gamesWon - a.gamesWon)[0].playerId;
      }
      if (!winner) {
        addNotification('No se pudo determinar un ganador', 'error');
        return;
      }
      const updatedTournament = { 
        ...tournament, 
        status: 'Finalizado', 
        draft: false, 
        winner 
      };
      await axios.put(`https://padnis.onrender.com/api/tournaments/${tournamentId}`, updatedTournament, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      onFinishTournament(updatedTournament);
      const winnerPlayer = tournament.participants.find(p => p.player1._id.toString() === winner.toString());
      addNotification(`Torneo finalizado con éxito. Ganador: ${winnerPlayer.player1.firstName} ${winnerPlayer.player1.lastName}`, 'success');
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Error desconocido';
      const statusCode = error.response?.status || 'desconocido';
      addNotification(`Error al finalizar el torneo (código ${statusCode}): ${errorMessage}`, 'error');
      console.error('Error finishing tournament:', error);
    }
  };

  const renderBracket = () => {
    if (tournament.type !== 'Eliminatorio') return null;
    const rounds = tournament.rounds || [];
    if (rounds.length === 0) {
      return <Typography>No hay rondas disponibles para mostrar.</Typography>;
    }
    return (
      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between', overflowX: 'auto' }}>
        {rounds.map((round, index) => (
          <Box key={round.round} sx={{ mx: 2, minWidth: 200 }}>
            <Typography variant="h6">Ronda {round.round}</Typography>
            {round.matches && round.matches.length > 0 ? (
              round.matches.map((match, idx) => (
                <Box key={idx} sx={{ my: 2, p: 1, border: '1px solid #e0e0e0', borderRadius: 2 }}>
                  <Typography sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar sx={{ mr: 1, bgcolor: '#01579b' }}>
                      {match.player1?.player1?.firstName?.charAt(0) || '?'}
                    </Avatar>
                    {match.player1?.name || `${match.player1?.player1?.firstName || 'Jugador no encontrado'} ${match.player1?.player1?.lastName || ''}`}
                    {tournament.format.mode === 'Dobles' && match.player1?.player2 && (
                      <> / {match.player1?.player2?.firstName || 'Jugador no encontrado'} {match.player1?.player2?.lastName || ''}</>
                    )}
                  </Typography>
                  <Typography sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar sx={{ mr: 1, bgcolor: '#0288d1' }}>
                      {match.player2?.player1?.firstName?.charAt(0) || '?'}
                    </Avatar>
                    {match.player2?.name || `${match.player2?.player1?.firstName || 'Jugador no encontrado'} ${match.player2?.player1?.lastName || ''}`}
                    {tournament.format.mode === 'Dobles' && match.player2?.player2 && (
                      <> / {match.player2?.player2?.firstName || 'Jugador no encontrado'} {match.player2?.player2?.lastName || ''}</>
                    )}
                  </Typography>
                  <Typography>
                    {match.result.sets.length > 0 ? match.result.sets.map((set, i) => (
                      <span key={i}>{set.player1}-{set.player2}{set.tiebreak1 ? ` (${set.tiebreak1}-${set.tiebreak2})` : ''} </span>
                    )) : 'Pendiente'}
                  </Typography>
                </Box>
              ))
            ) : (
              <Typography>No hay partidos en esta ronda.</Typography>
            )}
          </Box>
        ))}
      </Box>
    );
  };

  if (!tournament) return <Typography>Cargando torneo...</Typography>;

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 4 },
        bgcolor: '#f0f4f8',
        minHeight: '100vh',
      }}
    >
      <Box
        sx={{
          bgcolor: '#ffffff',
          p: 3,
          borderRadius: 2,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        }}
      >
        <Typography
          variant="h5"
          gutterBottom
          sx={{
            fontSize: { xs: '1.5rem', sm: '2rem' },
            color: '#01579b',
            fontWeight: 700,
            textAlign: 'center',
          }}
        >
          {tournament.name} - {tournament.sport} ({tournament.format.mode}) en {tournament.club?.name || 'No definido'}
        </Typography>
        <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 2 }}>
          <Tab label="Detalles" />
          <Tab label={tournament.type === 'RoundRobin' ? 'Grupos' : 'Rondas'} />
          {tournament.type === 'RoundRobin' && <Tab label="Posiciones" />}
          {tournament.type === 'Eliminatorio' && <Tab label="Llave" />}
        </Tabs>

        {tabValue === 0 && (
          <Box>
            <Typography><strong>Nombre:</strong> {tournament.name}</Typography>
            <Typography><strong>Club:</strong> {tournament.club?.name || 'No definido'}</Typography>
            <Typography><strong>Categoría:</strong> {tournament.category || 'No definida'}</Typography>
            <Typography><strong>Tipo:</strong> {tournament.type}</Typography>
            <Typography><strong>Deporte:</strong> {tournament.sport}</Typography>
            <Typography><strong>Modalidad:</strong> {tournament.format.mode}</Typography>
            <Typography><strong>Sets por partido:</strong> {tournament.format.sets}</Typography>
            <Typography><strong>Juegos por set:</strong> {tournament.format.gamesPerSet}</Typography>
            <Typography><strong>Participantes:</strong></Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', mt: 1 }}>
              {tournament.participants.map(part => {
                const player1Name = part.player1?.firstName ? `${part.player1.firstName} ${part.player1.lastName}` : 'Jugador no encontrado';
                const player2Name = tournament.format.mode === 'Dobles' && part.player2 ? `${part.player2.firstName} ${part.player2.lastName}` : '';
                const label = tournament.format.mode === 'Singles' ? player1Name : `${player1Name} / ${player2Name || 'Jugador no encontrado'}`;
                return (
                  <Chip
                    key={part.player1?._id || part.player1}
                    avatar={<Avatar>{player1Name.charAt(0)}</Avatar>}
                    label={label}
                    sx={{ m: 0.5 }}
                  />
                );
              })}
            </Box>
          </Box>
        )}

        {tabValue === 1 && (
          <Box sx={{ overflowX: 'auto' }}>
            {tournament.type === 'RoundRobin' ? (
              tournament.groups.map((group, groupIndex) => (
                <Box key={group.name} sx={{ mb: 3 }}>
                  <Typography variant="h6">{group.name}</Typography>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>{tournament.format.mode === 'Singles' ? 'Jugador 1' : 'Equipo 1'}</TableCell>
                        <TableCell>{tournament.format.mode === 'Singles' ? 'Jugador 2' : 'Equipo 2'}</TableCell>
                        <TableCell>Resultado</TableCell>
                        <TableCell>Fecha</TableCell>
                        <TableCell>Acción</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {group.matches.map((match, matchIndex) => (
                        <TableRow key={matchIndex}>
                          <TableCell sx={{ display: 'flex', alignItems: 'center' }}>
                            <Avatar sx={{ mr: 1, bgcolor: '#01579b' }}>
                              {match.player1?.player1?.firstName?.charAt(0) || '?'}
                            </Avatar>
                            {match.player1?.player1?.firstName || 'Jugador no encontrado'} {match.player1?.player1?.lastName || ''}
                            {tournament.format.mode === 'Dobles' && match.player1?.player2 && (
                              <> / {match.player1?.player2?.firstName || 'Jugador no encontrado'} {match.player1?.player2?.lastName || ''}</>
                            )}
                          </TableCell>
                          <TableCell sx={{ display: 'flex', alignItems: 'center' }}>
                            <Avatar sx={{ mr: 1, bgcolor: '#0288d1' }}>
                              {match.player2?.player1?.firstName?.charAt(0) || '?'}
                            </Avatar>
                            {match.player2?.player1?.firstName || 'Jugador no encontrado'} {match.player2?.player1?.lastName || ''}
                            {tournament.format.mode === 'Dobles' && match.player2?.player2 && (
                              <> / {match.player2?.player2?.firstName || 'Jugador no encontrado'} {match.player2?.player2?.lastName || ''}</>
                            )}
                          </TableCell>
                          <TableCell>
                            {match.result.sets.length > 0 ? match.result.sets.map((set, idx) => (
                              <Typography key={idx}>
                                {set.player1} - {set.player2} {set.tiebreak1 && set.tiebreak2 ? `(${set.tiebreak1}-${set.tiebreak2})` : ''}
                              </Typography>
                            )) : 'Pendiente'}
                          </TableCell>
                          <TableCell>{match.date || 'No definida'}</TableCell>
                          <TableCell>
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => openMatchDialog(match, groupIndex, matchIndex)}
                              disabled={match.result.winner !== null}
                            >
                              Actualizar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              ))
            ) : (
              tournament.rounds.map((round, roundIndex) => (
                <Box key={round.round} sx={{ mb: 3 }}>
                  <Typography variant="h6">Ronda {round.round}</Typography>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>{tournament.format.mode === 'Singles' ? 'Jugador 1' : 'Equipo 1'}</TableCell>
                        <TableCell>{tournament.format.mode === 'Singles' ? 'Jugador 2' : 'Equipo 2'}</TableCell>
                        <TableCell>Resultado</TableCell>
                        <TableCell>Fecha</TableCell>
                        <TableCell>Acción</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {round.matches.map((match, matchIndex) => (
                        <TableRow key={matchIndex}>
                          <TableCell sx={{ display: 'flex', alignItems: 'center' }}>
                            <Avatar sx={{ mr: 1, bgcolor: '#01579b' }}>
                              {match.player1?.player1?.firstName?.charAt(0) || '?'}
                            </Avatar>
                            {match.player1?.name || `${match.player1?.player1?.firstName || 'Jugador no encontrado'} ${match.player1?.player1?.lastName || ''}`}
                            {tournament.format.mode === 'Dobles' && match.player1?.player2 && (
                              <> / {match.player1?.player2?.firstName || 'Jugador no encontrado'} {match.player1?.player2?.lastName || ''}</>
                            )}
                          </TableCell>
                          <TableCell sx={{ display: 'flex', alignItems: 'center' }}>
                            <Avatar sx={{ mr: 1, bgcolor: '#0288d1' }}>
                              {match.player2?.player1?.firstName?.charAt(0) || '?'}
                            </Avatar>
                            {match.player2?.name || `${match.player2?.player1?.firstName || 'Jugador no encontrado'} ${match.player2?.player1?.lastName || ''}`}
                            {tournament.format.mode === 'Dobles' && match.player2?.player2 && (
                              <> / {match.player2?.player2?.firstName || 'Jugador no encontrado'} {match.player2?.player2?.lastName || ''}</>
                            )}
                          </TableCell>
                          <TableCell>
                            {match.result.sets.length > 0 ? match.result.sets.map((set, idx) => (
                              <Typography key={idx}>
                                {set.player1} - {set.player2} {set.tiebreak1 && set.tiebreak2 ? `(${set.tiebreak1}-${set.tiebreak2})` : ''}
                              </Typography>
                            )) : 'Pendiente'}
                          </TableCell>
                          <TableCell>{match.date || 'No definida'}</TableCell>
                          <TableCell>
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => openMatchDialog(match, roundIndex, matchIndex)}
                              disabled={match.result.winner !== null}
                            >
                              Actualizar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              ))
            )}
            {tournament.type === 'Eliminatorio' && (role === 'admin' || role === 'coach') && (
              <Button
                variant="contained"
                onClick={advanceEliminationRound}
                sx={{ mt: 2, bgcolor: '#0288d1', '&:hover': { bgcolor: '#0277bd' } }}
              >
                Avanzar a la Siguiente Ronda
              </Button>
            )}
            {tournament.type === 'RoundRobin' && (role === 'admin' || role === 'coach') && (
              <Button
                variant="contained"
                onClick={generateKnockoutPhase}
                sx={{ mt: 2, ml: 2, bgcolor: '#0288d1', '&:hover': { bgcolor: '#0277bd' } }}
              >
                Generar Fase Eliminatoria
              </Button>
            )}
          </Box>
        )}

        {tabValue === 2 && tournament.type === 'RoundRobin' && (
          <Box sx={{ overflowX: 'auto' }}>
            <Typography variant="h5" gutterBottom>Posiciones</Typography>
            {standings && Array.isArray(standings) ? (
              standings.map(group => (
                <Box key={group.groupName} sx={{ mb: 3 }}>
                  <Typography variant="h6">{group.groupName}</Typography>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>{tournament.format.mode === 'Singles' ? 'Jugador' : 'Equipo'}</TableCell>
                        <TableCell>Victorias</TableCell>
                        <TableCell>Sets Ganados</TableCell>
                        <TableCell>Juegos Ganados</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {group.standings.map((player, idx) => {
                        const participant = tournament.participants.find(p => 
                          (p.player1._id ? p.player1._id.toString() : p.player1.toString()) === player.playerId.toString()
                        );
                        const player1Name = participant?.player1?.firstName 
                          ? `${participant.player1.firstName} ${participant.player1.lastName || ''}` 
                          : 'Jugador no encontrado';
                        const player2Name = tournament.format.mode === 'Dobles' && participant?.player2 
                          ? `${participant.player2.firstName} ${participant.player2.lastName || ''}` 
                          : '';
                        const label = tournament.format.mode === 'Singles' 
                          ? player1Name 
                          : `${player1Name} / ${player2Name || 'Jugador no encontrado'}`;
                        return (
                          <TableRow key={idx}>
                            <TableCell sx={{ display: 'flex', alignItems: 'center' }}>
                              <Avatar sx={{ mr: 1, bgcolor: '#01579b' }}>
                                {player1Name.charAt(0)}
                              </Avatar>
                              {label}
                            </TableCell>
                            <TableCell>{player.wins}</TableCell>
                            <TableCell>{player.setsWon}</TableCell>
                            <TableCell>{player.gamesWon}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Box>
              ))
            ) : (
              <Typography>No hay posiciones disponibles para mostrar.</Typography>
            )}
          </Box>
        )}

        {tabValue === 3 && tournament.type === 'Eliminatorio' && renderBracket()}

        {(role === 'admin' || role === 'coach') && (
          <Button
            variant="contained"
            color="success"
            onClick={handleFinishTournament}
            sx={{ mt: 2, bgcolor: '#388e3c', '&:hover': { bgcolor: '#2e7d32' } }}
          >
            Finalizar Torneo
          </Button>
        )}

        <Dialog open={matchDialogOpen} onClose={() => setMatchDialogOpen(false)}>
          <DialogTitle>Actualizar Resultado del Partido</DialogTitle>
          <DialogContent>
            {selectedMatch && (
              <>
                <Typography>
                  {selectedMatch.match.player1?.player1?.firstName || 'Jugador no encontrado'} {selectedMatch.match.player1?.player1?.lastName || ''}
                  {tournament.format.mode === 'Dobles' && selectedMatch.match.player1?.player2 && (
                    <> / {selectedMatch.match.player1?.player2?.firstName || 'Jugador no encontrado'} {selectedMatch.match.player1?.player2?.lastName || ''}</>
                  )}
                  {' vs '}
                  {selectedMatch.match.player2?.player1?.firstName || 'Jugador no encontrado'} {selectedMatch.match.player2?.player1?.lastName || ''}
                  {tournament.format.mode === 'Dobles' && selectedMatch.match.player2?.player2 && (
                    <> / {selectedMatch.match.player2?.player2?.firstName || 'Jugador no encontrado'} {selectedMatch.match.player2?.player2?.lastName || ''}</>
                  )}
                </Typography>
                {matchScores.map((set, index) => (
                  index < tournament.format.sets && (
                    <Box key={index} sx={{ mt: 2 }}>
                      <Typography>Set {index + 1}</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                        <IconButton onClick={() => decrementScore(index, 'player1')} size="small">
                          <Remove />
                        </IconButton>
                        <TextField
                          label="Puntaje Jugador 1"
                          type="number"
                          value={set.player1}
                          onChange={(e) => handleScoreChange(index, 'player1', e.target.value)}
                          inputProps={{ min: 0 }}
                          sx={{ width: 100, mx: 1 }}
                        />
                        <IconButton onClick={() => incrementScore(index, 'player1')} size="small">
                          <Add />
                        </IconButton>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                        <IconButton onClick={() => decrementScore(index, 'player2')} size="small">
                          <Remove />
                        </IconButton>
                        <TextField
                          label="Puntaje Jugador 2"
                          type="number"
                          value={set.player2}
                          onChange={(e) => handleScoreChange(index, 'player2', e.target.value)}
                          inputProps={{ min: 0 }}
                          sx={{ width: 100, mx: 1 }}
                        />
                        <IconButton onClick={() => incrementScore(index, 'player2')} size="small">
                          <Add />
                        </IconButton>
                      </Box>
                      {set.player1 >= tournament.format.tiebreakSet && set.player2 >= tournament.format.tiebreakSet && (
                        <>
                          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                            <IconButton onClick={() => decrementScore(index, 'tiebreak1')} size="small">
                              <Remove />
                            </IconButton>
                            <TextField
                              label="Tiebreak Jugador 1"
                              type="number"
                              value={set.tiebreak1}
                              onChange={(e) => handleScoreChange(index, 'tiebreak1', e.target.value)}
                              inputProps={{ min: 0 }}
                              sx={{ width: 100, mx: 1 }}
                            />
                            <IconButton onClick={() => incrementScore(index, 'tiebreak1')} size="small">
                              <Add />
                            </IconButton>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                            <IconButton onClick={() => decrementScore(index, 'tiebreak2')} size="small">
                              <Remove />
                            </IconButton>
                            <TextField
                              label="Tiebreak Jugador 2"
                              type="number"
                              value={set.tiebreak2}
                              onChange={(e) => handleScoreChange(index, 'tiebreak2', e.target.value)}
                              inputProps={{ min: 0 }}
                              sx={{ width: 100, mx: 1 }}
                            />
                            <IconButton onClick={() => incrementScore(index, 'tiebreak2')} size="small">
                              <Add />
                            </IconButton>
                          </Box>
                        </>
                      )}
                    </Box>
                  )
                ))}
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setMatchDialogOpen(false)}>Cancelar</Button>
            <Button onClick={submitMatchResult} color="primary">Guardar</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

export default TournamentInProgress;