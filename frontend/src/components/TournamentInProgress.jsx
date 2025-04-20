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
  Card,
  CardContent,
  Grid,
} from '@mui/material';
import { Add, Remove } from '@mui/icons-material';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css'; // Estilos básicos de Swiper

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
      console.log('Tournament data:', response.data); // Depuración
      setTournament(response.data);
      if (response.data.type === 'RoundRobin') {
        updateStandings(response.data);
      }
    } catch (error) {
      addNotification(`Error al cargar el torneo: ${error.response?.data?.message || error.message}`, 'error');
      console.error('Error al cargar torneo:', error);
    }
  };

  const updateStandings = (tournamentData) => {
    if (!tournamentData.groups || !Array.isArray(tournamentData.groups)) {
      console.warn('No groups found in tournament data');
      setStandings([]);
      return;
    }

    const newStandings = tournamentData.groups.map(group => {
      const standings = group.players && Array.isArray(group.players)
        ? group.players.map(p => ({
            playerId: typeof p.player1 === 'object' && p.player1._id
              ? p.player1._id.toString()
              : (typeof p.player1 === 'object' && p.player1.$oid ? p.player1.$oid : p.player1.toString()),
            player2Id: p.player2
              ? (typeof p.player2 === 'object' && p.player2._id
                  ? p.player2._id.toString()
                  : (typeof p.player2 === 'object' && p.player2.$oid ? p.player2.$oid : p.player2.toString()))
              : null,
            wins: 0,
            setsWon: 0,
            gamesWon: 0,
          }))
        : [];

      if (group.matches && Array.isArray(group.matches)) {
        group.matches.forEach(match => {
          if (match.result.winner) {
            const winnerId = match.result.winner.toString();
            const winner = standings.find(s => s.playerId === winnerId);
            if (winner) {
              winner.wins += 1;
            } else {
              console.warn(`Winner ID ${winnerId} not found in standings for group ${group.name}`);
            }
            match.result.sets.forEach(set => {
              const p1Id = typeof match.player1.player1 === 'object' && match.player1.player1._id
                ? match.player1.player1._id.toString()
                : (typeof match.player1.player1 === 'object' && match.player1.player1.$oid ? match.player1.player1.$oid : match.player1.player1.toString());
              const p2Id = typeof match.player2.player1 === 'object' && match.player2.player1._id
                ? match.player2.player1._id.toString()
                : (typeof match.player2.player1 === 'object' && match.player2.player1.$oid ? match.player2.player1.$oid : match.player2.player1.toString());
              const p1 = standings.find(s => s.playerId === p1Id);
              const p2 = standings.find(s => s.playerId === p2Id);
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
              } else {
                console.warn(`Player IDs ${p1Id} or ${p2Id} not found in standings for group ${group.name}`);
              }
            });
          }
        });
      }

      return {
        groupName: group.name || `Grupo ${groupIndex + 1}`,
        standings: standings.sort((a, b) => b.wins - a.wins || b.setsWon - a.setsWon || b.gamesWon - a.gamesWon),
      };
    });
    console.log('Updated standings:', newStandings);
    setStandings(newStandings);
  };

  const handleTabChange = (event, newValue) => {
    console.log('Tab changed to:', newValue); // Depuración
    setTabValue(newValue);
  };

  const openMatchDialog = (match, groupIndex, matchIndex, roundIndex = null) => {
    if (role !== 'admin' && role !== 'coach') {
      addNotification('Solo admin o coach pueden actualizar partidos', 'error');
      return;
    }
    setSelectedMatch({ match, groupIndex, matchIndex, roundIndex, matchId: match._id });
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
      const { matchId, roundIndex } = selectedMatch;
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
      const player1Id = typeof selectedMatch.match.player1.player1 === 'object' && selectedMatch.match.player1.player1._id
        ? selectedMatch.match.player1.player1._id.toString()
        : (typeof selectedMatch.match.player1.player1 === 'object' && selectedMatch.match.player1.player1.$oid
            ? selectedMatch.match.player1.player1.$oid
            : selectedMatch.match.player1.player1.toString());
      const player2Id = typeof selectedMatch.match.player2.player1 === 'object' && selectedMatch.match.player2.player1._id
        ? selectedMatch.match.player2.player1._id.toString()
        : (typeof selectedMatch.match.player2.player1 === 'object' && selectedMatch.match.player2.player1.$oid
            ? selectedMatch.match.player2.player1.$oid
            : selectedMatch.match.player2.player1.toString());
      const winnerId = determineWinner(sets, player1Id, player2Id);
      let runnerUpId = null;
      if (roundIndex !== null && tournament.rounds.length === roundIndex + 1 && tournament.rounds[roundIndex].matches.length === 1) {
        runnerUpId = winnerId === player1Id ? player2Id : player1Id;
      }
      await axios.put(`https://padnis.onrender.com/api/tournaments/${tournamentId}/matches/${matchId}/result`, {
        sets,
        winner: winnerId,
        runnerUp: runnerUpId,
        isKnockout: roundIndex !== null,
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
      const allMatchesCompleted = tournament.groups.every(group =>
        group.matches.every(match => match.result.winner !== null)
      );
      if (!allMatchesCompleted) {
        addNotification('Faltan completar algunos partidos en los grupos', 'error');
        return;
      }

      const validParticipantIds = tournament.participants.map(p => {
        const id = typeof p.player1 === 'object' && p.player1._id ? p.player1._id.toString() : (typeof p.player1 === 'object' && p.player1.$oid ? p.player1.$oid : p.player1.toString());
        return id;
      });
      const topPlayers = standings.flatMap(group => {
        if (!group.standings || !Array.isArray(group.standings)) {
          console.warn(`El grupo ${group.groupName} no tiene standings. Se omitirá.`);
          return [];
        }
        return group.standings.slice(0, tournament.playersPerGroupToAdvance || 2).map(s => {
          const participant = tournament.participants.find(p => {
            const pId = typeof p.player1 === 'object' && p.player1._id ? p.player1._id.toString() : (typeof p.player1 === 'object' && p.player1.$oid ? p.player1.$oid : p.player1.toString());
            return pId === s.playerId.toString();
          });
          if (!participant) {
            console.warn(`No se encontró participante para playerId: ${s.playerId} en grupo ${group.groupName}`);
            return null;
          }
          if (!validParticipantIds.includes(participant.player1._id ? participant.player1._id.toString() : (participant.player1.$oid ? participant.player1.$oid : participant.player1.toString()))) {
            console.warn(`ID de jugador inválido en standings: ${participant.player1._id || participant.player1.$oid || participant.player1} en grupo ${group.groupName}`);
            return null;
          }
          const player1Id = typeof participant.player1 === 'object' && participant.player1._id
            ? participant.player1._id.toString()
            : (typeof participant.player1 === 'object' && participant.player1.$oid ? participant.player1.$oid : participant.player1.toString());
          const player2Id = tournament.format.mode === 'Dobles' && participant.player2
            ? (typeof participant.player2 === 'object' && participant.player2._id
                ? participant.player2._id.toString()
                : (typeof participant.player2 === 'object' && participant.player2.$oid ? participant.player2.$oid : participant.player2.toString()))
            : null;
          return {
            player1: player1Id,
            player2: player2Id,
            seed: false,
          };
        }).filter(p => p !== null);
      });

      if (topPlayers.length < 2) {
        addNotification('No hay suficientes clasificados para generar la fase eliminatoria', 'error');
        return;
      }

      console.log('Top players for knockout phase:', topPlayers);

      const shuffled = topPlayers.sort(() => 0.5 - Math.random());
      const matches = [];
      for (let i = 0; i < shuffled.length; i += 2) {
        if (i + 1 < shuffled.length) {
          matches.push({
            player1: { player1: shuffled[i].player1, player2: shuffled[i].player2 || null },
            player2: { player1: shuffled[i + 1].player1, player2: shuffled[i + 1].player2 || null },
            result: { sets: [], winner: null },
            date: null,
          });
        }
      }
      if (matches.length === 0) {
        addNotification('No se pudieron generar partidos para la fase eliminatoria', 'error');
        return;
      }

      console.log('Generated matches:', matches);

      const updatePayload = {
        rounds: [...tournament.rounds, { round: tournament.rounds.length + 1, matches }],
      };
      await axios.put(`https://padnis.onrender.com/api/tournaments/${tournamentId}`, updatePayload, {
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
    if (!tournament.rounds.length) return;
    try {
      const currentRound = tournament.rounds[tournament.rounds.length - 1];
      if (!currentRound.matches.every(m => m.result.winner || m.player2?.name === 'BYE')) {
        addNotification('Faltan completar partidos de la ronda actual', 'error');
        return;
      }
      const winners = currentRound.matches
        .filter(m => m.result.winner || m.player2?.name === 'BYE')
        .map(m => {
          const winnerId = m.result.winner || (typeof m.player1.player1 === 'object' && m.player1.player1._id
            ? m.player1.player1._id.toString()
            : (typeof m.player1.player1 === 'object' && m.player1.player1.$oid ? m.player1.player1.$oid : m.player1.player1.toString()));
          const participant = tournament.participants.find(p => {
            const pId = typeof p.player1 === 'object' && p.player1._id
              ? p.player1._id.toString()
              : (typeof p.player1 === 'object' && p.player1.$oid ? p.player1.$oid : p.player1.toString());
            return pId === winnerId.toString();
          });
          if (!participant) {
            console.warn(`Participant not found for winnerId: ${winnerId}`);
            return null;
          }
          const player1Id = typeof participant.player1 === 'object' && participant.player1._id
            ? participant.player1._id.toString()
            : (typeof participant.player1 === 'object' && participant.player1.$oid ? participant.player1.$oid : participant.player1.toString());
          const player2Id = tournament.format.mode === 'Dobles' && participant.player2
            ? (typeof participant.player2 === 'object' && participant.player2._id
                ? participant.player2._id.toString()
                : (typeof participant.player2 === 'object' && participant.player2.$oid ? participant.player2.$oid : participant.player2.toString()))
            : null;
          if (!player1Id || (tournament.format.mode === 'Dobles' && !player2Id)) {
            console.warn(`Invalid player IDs for participant:`, { player1Id, player2Id, winnerId });
            return null;
          }
          return {
            player1: player1Id,
            player2: player2Id || null,
          };
        })
        .filter(w => w !== null);
      console.log('Winners for new round (detailed):', JSON.stringify(winners, null, 2));
      if (winners.length < 1) {
        addNotification('No hay suficientes ganadores para avanzar', 'error');
        return;
      }
      const matches = [];
      for (let i = 0; i < winners.length; i += 2) {
        if (i + 1 < winners.length) {
          matches.push({
            player1: { player1: winners[i].player1, player2: winners[i].player2 || null },
            player2: { player1: winners[i + 1].player1, player2: winners[i + 1].player2 || null },
            result: { sets: [], winner: null },
            date: null,
          });
        } else {
          matches.push({
            player1: { player1: winners[i].player1, player2: winners[i].player2 || null },
            player2: { player1: null, name: 'BYE' },
            result: { sets: [], winner: winners[i].player1 },
            date: null,
          });
        }
      }
      const updatePayload = {
        rounds: [...tournament.rounds, { round: tournament.rounds.length + 1, matches }],
      };
      console.log('Advancing round payload:', JSON.stringify(updatePayload, null, 2));
      await axios.put(`https://padnis.onrender.com/api/tournaments/${tournamentId}`, updatePayload, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      await fetchTournament();
      addNotification(`Avanzado a ${getRoundName(matches.length * 2)}`, 'success');
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Error desconocido';
      const statusCode = error.response?.status || 'desconocido';
      addNotification(`Error al avanzar la ronda (código ${statusCode}): ${errorMessage}`, 'error');
      console.error('Error advancing round:', error);
    }
  };

  const handleFinishTournament = async () => {
    try {
      const allMatchesCompleted = tournament.type === 'RoundRobin' && !tournament.rounds.length
        ? tournament.groups.every(group => group.matches.every(match => match.result.winner !== null))
        : tournament.rounds.every(round => round.matches.every(match => match.result.winner !== null || match.player2?.name === 'BYE'));
      if (!allMatchesCompleted) {
        addNotification('Faltan completar algunos partidos', 'error');
        return;
      }
      let winner, runnerUp;
      if (tournament.rounds.length > 0) {
        const finalRound = tournament.rounds[tournament.rounds.length - 1];
        if (finalRound.matches.length !== 1 || !finalRound.matches[0].result.winner) {
          addNotification('La ronda final no está completa o no tiene un ganador', 'error');
          return;
        }
        winner = finalRound.matches[0].result.winner;
        const finalMatch = finalRound.matches[0];
        const player1Id = typeof finalMatch.player1.player1 === 'object' && finalMatch.player1.player1._id
          ? finalMatch.player1.player1._id.toString()
          : (typeof finalMatch.player1.player1 === 'object' && finalMatch.player1.player1.$oid ? finalMatch.player1.player1.$oid : finalMatch.player1.player1.toString());
        const player2Id = typeof finalMatch.player2.player1 === 'object' && finalMatch.player2.player1._id
          ? finalMatch.player2.player1._id.toString()
          : (typeof finalMatch.player2.player1 === 'object' && finalMatch.player2.player1.$oid ? finalMatch.player2.player1.$oid : finalMatch.player2.player1.toString());
        runnerUp = winner === player1Id ? player2Id : player1Id;
      } else if (tournament.type === 'RoundRobin') {
        const allStandings = standings.flatMap(group => group.standings);
        const sortedStandings = allStandings.sort((a, b) => b.wins - a.wins || b.setsWon - a.setsWon || b.gamesWon - a.gamesWon);
        winner = sortedStandings[0].playerId;
        runnerUp = sortedStandings[1]?.playerId || null;
      }
      if (!winner) {
        addNotification('No se pudo determinar un ganador', 'error');
        return;
      }
      const updatePayload = { 
        status: 'Finalizado', 
        draft: false, 
        winner,
        runnerUp
      };
      await axios.put(`https://padnis.onrender.com/api/tournaments/${tournamentId}`, updatePayload, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      await fetchTournament();
      const winnerPlayer = tournament.participants.find(p => 
        (typeof p.player1 === 'object' && p.player1._id ? p.player1._id.toString() : (typeof p.player1 === 'object' && p.player1.$oid ? p.player1.$oid : p.player1.toString())) === winner.toString()
      );
      const runnerUpPlayer = runnerUp ? tournament.participants.find(p => 
        (typeof p.player1 === 'object' && p.player1._id ? p.player1._id.toString() : (typeof p.player1 === 'object' && p.player1.$oid ? p.player1.$oid : p.player1.toString())) === runnerUp.toString()
      ) : null;
      addNotification(
        `Torneo finalizado con éxito. Ganador: ${winnerPlayer.player1.firstName} ${winnerPlayer.player1.lastName}` +
        (runnerUpPlayer ? `, Segundo puesto: ${runnerUpPlayer.player1.firstName} ${runnerUpPlayer.player1.lastName}` : ''),
        'success'
      );
      onFinishTournament(tournament);
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Error desconocido';
      const statusCode = error.response?.status || 'desconocido';
      addNotification(`Error al finalizar el torneo (código ${statusCode}): ${errorMessage}`, 'error');
      console.error('Error finishing tournament:', error);
    }
  };

  const getPlayerName = (playerId, player2Id = null) => {
    const normalizeId = (id) => {
      if (typeof id === 'object' && id.$oid) return id.$oid;
      if (typeof id === 'object' && id._id) return id._id.toString();
      return id.toString();
    };
    const participant = tournament.participants.find(p => {
      const pId = typeof p.player1 === 'object' && p.player1._id
        ? p.player1._id.toString()
        : (typeof p.player1 === 'object' && p.player1.$oid ? p.player1.$oid : p.player1.toString());
      return pId === normalizeId(playerId);
    });
    if (!participant) {
      console.warn(`Participant not found for playerId: ${playerId}`);
      return 'Jugador no encontrado';
    }
    const player1Name = participant.player1?.firstName
      ? `${participant.player1.firstName} ${participant.player1.lastName || ''}`
      : 'Jugador no encontrado';
    if (tournament.format.mode === 'Singles' || !player2Id) {
      return player1Name;
    }
    const player2Name = participant.player2?.firstName
      ? `${participant.player2.firstName} ${participant.player2.lastName || ''}`
      : 'Jugador no encontrado';
    return `${player1Name} / ${player2Name}`;
  };

  const getRoundName = (numTeams) => {
    switch (numTeams) {
      case 16:
        return 'Octavos de Final';
      case 8:
        return 'Cuartos de Final';
      case 4:
        return 'Semifinal';
      case 2:
        return 'Final';
      default:
        return `Ronda ${tournament.rounds.length + 1}`;
    }
  };

  const renderBracket = () => {
    if (!tournament.rounds || !Array.isArray(tournament.rounds) || tournament.rounds.length === 0) {
      return <Typography>No hay rondas disponibles para mostrar.</Typography>;
    }
    return (
      <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {tournament.rounds.map((round, roundIndex) => {
          const numTeams = round.matches.length * 2;
          return (
            <Box key={round.round} sx={{ mb: 2 }}>
              <Typography variant="h6" sx={{ fontSize: 'clamp(1rem, 5vw, 1.25rem)', mb: 2 }}>
                {getRoundName(numTeams)}
              </Typography>
              <Grid container spacing={2}>
                {round.matches.map((match, matchIndex) => (
                  <Grid item xs={12} key={matchIndex}>
                    <Card sx={{ bgcolor: '#ffffff', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar sx={{ bgcolor: '#01579b', width: 32, height: 32 }}>
                                {getPlayerName(match.player1.player1).charAt(0)}
                              </Avatar>
                              <Typography sx={{ fontSize: 'clamp(0.875rem, 4vw, 1rem)' }}>
                                {getPlayerName(match.player1.player1, match.player1.player2)}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar sx={{ bgcolor: '#0288d1', width: 32, height: 32 }}>
                                {match.player2.name ? 'BYE' : getPlayerName(match.player2.player1).charAt(0)}
                              </Avatar>
                              <Typography sx={{ fontSize: 'clamp(0.875rem, 4vw, 1rem)' }}>
                                {match.player2.name || getPlayerName(match.player2.player1, match.player2.player2)}
                              </Typography>
                            </Box>
                          </Box>
                          <Typography sx={{ fontSize: 'clamp(1rem, 5vw, 1.25rem)', fontWeight: 'bold', color: '#01579b' }}>
                            {match.result.sets.length > 0
                              ? match.result.sets.map((set, i) => (
                                  <span key={i}>
                                    {set.player1}-{set.player2}
                                    {set.tiebreak1 ? ` (${set.tiebreak1}-${set.tiebreak2})` : ''}{' '}
                                  </span>
                                ))
                              : 'Pendiente'}
                          </Typography>
                        </Box>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => openMatchDialog(match, null, matchIndex, roundIndex)}
                          disabled={match.result.winner !== null}
                          sx={{ mt: 1, fontSize: 'clamp(0.75rem, 3.5vw, 0.875rem)' }}
                        >
                          Actualizar Resultado
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          );
        })}
        {(role === 'admin' || role === 'coach') && tournament.rounds.length > 0 && tournament.rounds[tournament.rounds.length - 1].matches.length > 1 && (
          <Button
            variant="contained"
            onClick={advanceEliminationRound}
            sx={{
              mt: 2,
              bgcolor: '#0288d1',
              '&:hover': { bgcolor: '#0277bd' },
              fontSize: 'clamp(0.875rem, 4vw, 1rem)',
            }}
          >
            Avanzar a la Siguiente Ronda
          </Button>
        )}
      </Box>
    );
  };

  if (!tournament) return <Typography>Cargando torneo...</Typography>;

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 3 },
        bgcolor: '#f0f4f8',
        minHeight: '100vh',
        width: '100%',
        overflowX: 'hidden',
      }}
    >
      <Box
        sx={{
          bgcolor: '#ffffff',
          p: { xs: 2, sm: 3 },
          borderRadius: 2,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          maxWidth: '100%',
          mx: 'auto',
        }}
      >
        <Typography
          variant="h5"
          gutterBottom
          sx={{
            fontSize: 'clamp(1.5rem, 6vw, 2rem)',
            color: '#01579b',
            fontWeight: 700,
            textAlign: 'center',
          }}
        >
          {tournament.name} - {tournament.sport} ({tournament.format.mode}) en {tournament.club?.name || 'No definido'}
        </Typography>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          sx={{ mb: 2 }}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Detalles" />
          <Tab label="Grupos" />
          <Tab label="Posiciones" />
          {tournament.rounds && tournament.rounds.length > 0 && <Tab label="Llave" />}
        </Tabs>

        <Swiper
          spaceBetween={10}
          slidesPerView={1}
          onSlideChange={(swiper) => setTabValue(swiper.activeIndex)}
          initialSlide={tabValue}
          style={{ width: '100%' }}
        >
          <SwiperSlide>
            <Box sx={{ p: 2 }}>
              {tabValue === 0 && (
                <Box>
                  <Typography sx={{ fontSize: 'clamp(0.875rem, 4vw, 1rem)', mb: 1 }}>
                    <strong>Nombre:</strong> {tournament.name}
                  </Typography>
                  <Typography sx={{ fontSize: 'clamp(0.875rem, 4vw, 1rem)', mb: 1 }}>
                    <strong>Club:</strong> {tournament.club?.name || 'No definido'}
                  </Typography>
                  <Typography sx={{ fontSize: 'clamp(0.875rem, 4vw, 1rem)', mb: 1 }}>
                    <strong>Categoría:</strong> {tournament.category || 'No definida'}
                  </Typography>
                  <Typography sx={{ fontSize: 'clamp(0.875rem, 4vw, 1rem)', mb: 1 }}>
                    <strong>Tipo:</strong> {tournament.type}
                  </Typography>
                  <Typography sx={{ fontSize: 'clamp(0.875rem, 4vw, 1rem)', mb: 1 }}>
                    <strong>Deporte:</strong> {tournament.sport}
                  </Typography>
                  <Typography sx={{ fontSize: 'clamp(0.875rem, 4vw, 1rem)', mb: 1 }}>
                    <strong>Modalidad:</strong> {tournament.format.mode}
                  </Typography>
                  <Typography sx={{ fontSize: 'clamp(0.875rem, 4vw, 1rem)', mb: 1 }}>
                    <strong>Sets por partido:</strong> {tournament.format.sets}
                  </Typography>
                  <Typography sx={{ fontSize: 'clamp(0.875rem, 4vw, 1rem)', mb: 1 }}>
                    <strong>Juegos por set:</strong> {tournament.format.gamesPerSet}
                  </Typography>
                  <Typography sx={{ fontSize: 'clamp(0.875rem, 4vw, 1rem)', mb: 1 }}>
                    <strong>Participantes:</strong>
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', mt: 1, gap: 1 }}>
                    {tournament.participants && tournament.participants.length > 0 ? (
                      tournament.participants.map(part => {
                        const player1Name = part.player1?.firstName
                          ? `${part.player1.firstName} ${part.player1.lastName}`
                          : 'Jugador no encontrado';
                        const player2Name =
                          tournament.format.mode === 'Dobles' && part.player2
                            ? `${part.player2.firstName} ${part.player2.lastName || ''}`
                            : '';
                        const label =
                          tournament.format.mode === 'Singles'
                            ? player1Name
                            : `${player1Name} / ${player2Name || 'Jugador no encontrado'}`;
                        return (
                          <Chip
                            key={part.player1?._id || part.player1.$oid || part.player1}
                            avatar={<Avatar>{player1Name.charAt(0)}</Avatar>}
                            label={label}
                            sx={{ m: 0.5, fontSize: 'clamp(0.75rem, 3.5vw, 0.875rem)' }}
                          />
                        );
                      })
                    ) : (
                      <Typography>No hay participantes disponibles.</Typography>
                    )}
                  </Box>
                </Box>
              )}
            </Box>
          </SwiperSlide>
          <SwiperSlide>
            <Box sx={{ p: 2 }}>
              {tabValue === 1 && (
                <Box sx={{ width: '100%', overflowX: 'hidden' }}>
                  {tournament.groups && Array.isArray(tournament.groups) && tournament.groups.length > 0 ? (
                    tournament.groups.map((group, groupIndex) => (
                      <Box key={group.name || groupIndex} sx={{ mb: 3 }}>
                        <Typography
                          variant="h6"
                          sx={{ fontSize: 'clamp(1rem, 5vw, 1.25rem)', mb: 2 }}
                        >
                          {group.name || `Grupo ${groupIndex + 1}`}
                        </Typography>
                        <Grid container spacing={2}>
                          {group.matches && Array.isArray(group.matches) && group.matches.length > 0 ? (
                            group.matches.map((match, matchIndex) => (
                              <Grid item xs={12} key={matchIndex}>
                                <Card sx={{ bgcolor: '#ffffff', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' }}>
                                  <CardContent>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                          <Avatar sx={{ bgcolor: '#01579b', width: 32, height: 32 }}>
                                            {getPlayerName(match.player1.player1).charAt(0)}
                                          </Avatar>
                                          <Typography sx={{ fontSize: 'clamp(0.875rem, 4vw, 1rem)' }}>
                                            {getPlayerName(match.player1.player1, match.player1.player2)}
                                          </Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                          <Avatar sx={{ bgcolor: '#0288d1', width: 32, height: 32 }}>
                                            {getPlayerName(match.player2.player1).charAt(0)}
                                          </Avatar>
                                          <Typography sx={{ fontSize: 'clamp(0.875rem, 4vw, 1rem)' }}>
                                            {getPlayerName(match.player2.player1, match.player2.player2)}
                                          </Typography>
                                        </Box>
                                      </Box>
                                      <Typography sx={{ fontSize: 'clamp(1rem, 5vw, 1.25rem)', fontWeight: 'bold', color: '#01579b' }}>
                                        {match.result.sets.length > 0
                                          ? match.result.sets.map((set, idx) => (
                                              <span key={idx}>
                                                {set.player1} - {set.player2}{' '}
                                                {set.tiebreak1 && set.tiebreak2
                                                  ? `(${set.tiebreak1}-${set.tiebreak2})`
                                                  : ''}
                                              </span>
                                            ))
                                          : 'Pendiente'}
                                      </Typography>
                                    </Box>
                                    <Typography sx={{ fontSize: 'clamp(0.75rem, 3.5vw, 0.875rem)', color: 'text.secondary', mt: 1 }}>
                                      Fecha: {match.date || 'No definida'}
                                    </Typography>
                                    <Button
                                      variant="outlined"
                                      size="small"
                                      onClick={() => openMatchDialog(match, groupIndex, matchIndex)}
                                      disabled={match.result.winner !== null}
                                      sx={{ mt: 1, fontSize: 'clamp(0.75rem, 3.5vw, 0.875rem)' }}
                                    >
                                      Actualizar Resultado
                                    </Button>
                                  </CardContent>
                                </Card>
                              </Grid>
                            ))
                          ) : (
                            <Typography>No hay partidos disponibles para este grupo.</Typography>
                          )}
                        </Grid>
                      </Box>
                    ))
                  ) : (
                    <Typography>No hay grupos disponibles para mostrar.</Typography>
                  )}
                  {(role === 'admin' || role === 'coach') && (!tournament.rounds || tournament.rounds.length === 0) && (
                    <Button
                      variant="contained"
                      onClick={generateKnockoutPhase}
                      sx={{
                        mt: 2,
                        bgcolor: '#0288d1',
                        '&:hover': { bgcolor: '#0277bd' },
                        fontSize: 'clamp(0.875rem, 4vw, 1rem)',
                      }}
                    >
                      Generar Fase Eliminatoria
                    </Button>
                  )}
                </Box>
              )}
            </Box>
          </SwiperSlide>
          <SwiperSlide>
            <Box sx={{ p: 2 }}>
              {tabValue === 2 && (
                <Box sx={{ width: '100%' }}>
                  <Typography
                    variant="h5"
                    gutterBottom
                    sx={{ fontSize: 'clamp(1.25rem, 6vw, 1.5rem)' }}
                  >
                    Posiciones
                  </Typography>
                  {standings && Array.isArray(standings) && standings.length > 0 ? (
                    standings.map((group, groupIndex) => (
                      <Box key={group.groupName || groupIndex} sx={{ mb: 3 }}>
                        <Typography
                          variant="h6"
                          sx={{ fontSize: 'clamp(1rem, 5vw, 1.25rem)', mb: 2 }}
                        >
                          {group.groupName || `Grupo ${groupIndex + 1}`}
                        </Typography>
                        <Box sx={{ overflowX: 'auto' }}>
                          <Table sx={{ minWidth: '600px' }}>
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ padding: '8px', fontSize: '0.875rem' }}>
                                  {tournament.format.mode === 'Singles' ? 'Jugador' : 'Equipo'}
                                </TableCell>
                                <TableCell sx={{ padding: '8px', fontSize: '0.875rem' }}>V</TableCell>
                                <TableCell sx={{ padding: '8px', fontSize: '0.875rem' }}>Sets</TableCell>
                                <TableCell sx={{ padding: '8px', fontSize: '0.875rem' }}>JG</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {group.standings && Array.isArray(group.standings) && group.standings.length > 0 ? (
                                group.standings.map((player, idx) => {
                                  const participant = tournament.participants.find(p =>
                                    (typeof p.player1 === 'object' && p.player1._id
                                      ? p.player1._id.toString()
                                      : (typeof p.player1 === 'object' && p.player1.$oid ? p.player1.$oid : p.player1.toString())) === player.playerId.toString()
                                  );
                                  const player1Name = participant?.player1?.firstName
                                    ? `${participant.player1.firstName} ${participant.player1.lastName || ''}`
                                    : 'Jugador no encontrado';
                                  const player2Name =
                                    tournament.format.mode === 'Dobles' && participant?.player2
                                      ? `${participant.player2.firstName} ${participant.player2.lastName || ''}`
                                      : '';
                                  const label =
                                    tournament.format.mode === 'Singles'
                                      ? player1Name
                                      : `${player1Name} / ${player2Name || 'Jugador no encontrado'}`;
                                  return (
                                    <TableRow key={idx}>
                                      <TableCell sx={{ padding: '8px', fontSize: '0.875rem' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                          <Avatar
                                            sx={{ mr: 1, bgcolor: '#01579b', width: 32, height: 32 }}
                                          >
                                            {player1Name.charAt(0)}
                                          </Avatar>
                                          {label}
                                        </Box>
                                      </TableCell>
                                      <TableCell sx={{ padding: '8px', fontSize: '0.875rem' }}>{player.wins}</TableCell>
                                      <TableCell sx={{ padding: '8px', fontSize: '0.875rem' }}>{player.setsWon}</TableCell>
                                      <TableCell sx={{ padding: '8px', fontSize: '0.875rem' }}>{player.gamesWon}</TableCell>
                                    </TableRow>
                                  );
                                })
                              ) : (
                                <TableRow>
                                  <TableCell colSpan={4} sx={{ textAlign: 'center' }}>
                                    No hay posiciones disponibles para este grupo.
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </Box>
                      </Box>
                    ))
                  ) : (
                    <Typography sx={{ textAlign: 'center' }}>
                      No hay posiciones disponibles para mostrar.
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
          </SwiperSlide>
          {(tournament.rounds && tournament.rounds.length > 0) && (
            <SwiperSlide>
              <Box sx={{ p: 2 }}>
                {tabValue === 3 && renderBracket()}
              </Box>
            </SwiperSlide>
          )}
        </Swiper>

        {(role === 'admin' || role === 'coach') && (
          <Button
            variant="contained"
            color="success"
            onClick={handleFinishTournament}
            sx={{
              mt: 2,
              bgcolor: '#388e3c',
              '&:hover': { bgcolor: '#2e7d32' },
              fontSize: 'clamp(0.875rem, 4vw, 1rem)',
            }}
          >
            Finalizar Torneo
          </Button>
        )}

        <Dialog open={matchDialogOpen} onClose={() => setMatchDialogOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle sx={{ fontSize: 'clamp(1rem, 5vw, 1.25rem)', bgcolor: '#01579b', color: '#ffffff', p: 2 }}>
            Actualizar Resultado del Partido
          </DialogTitle>
          <DialogContent sx={{ bgcolor: '#f5f5f5', p: 3 }}>
            {selectedMatch && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#ffffff', p: 2, borderRadius: 1, boxShadow: '0 1px 4px rgba(0, 0, 0, 0.1)' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ bgcolor: '#01579b', width: 40, height: 40 }}>
                      {getPlayerName(selectedMatch.match.player1.player1).charAt(0)}
                    </Avatar>
                    <Typography sx={{ fontSize: 'clamp(0.875rem, 4vw, 1rem)', fontWeight: 'bold' }}>
                      {getPlayerName(selectedMatch.match.player1.player1, selectedMatch.match.player1.player2)}
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: 'clamp(0.875rem, 4vw, 1rem)' }}>vs</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ fontSize: 'clamp(0.875rem, 4vw, 1rem)', fontWeight: 'bold' }}>
                      {selectedMatch.match.player2.name || getPlayerName(selectedMatch.match.player2.player1, selectedMatch.match.player2.player2)}
                    </Typography>
                    <Avatar sx={{ bgcolor: '#0288d1', width: 40, height: 40 }}>
                      {selectedMatch.match.player2.name ? 'BYE' : getPlayerName(selectedMatch.match.player2.player1).charAt(0)}
                    </Avatar>
                  </Box>
                </Box>
                {matchScores.map((set, index) =>
                  index < tournament.format.sets ? (
                    <Card key={index} sx={{ bgcolor: '#ffffff', p: 2, borderRadius: 1, boxShadow: '0 1px 4px rgba(0, 0, 0, 0.1)' }}>
                      <Typography sx={{ fontSize: 'clamp(0.875rem, 4vw, 1rem)', fontWeight: 'medium', mb: 2 }}>
                        Set {index + 1}
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography sx={{ fontSize: 'clamp(0.75rem, 3.5vw, 0.875rem)', width: '150px' }}>
                            {getPlayerName(selectedMatch.match.player1.player1, selectedMatch.match.player1.player2)}
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
                            {selectedMatch.match.player2.name || getPlayerName(selectedMatch.match.player2.player1, selectedMatch.match.player2.player2)}
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
                        {set.player1 >= tournament.format.tiebreakSet &&
                          set.player2 >= tournament.format.tiebreakSet && (
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
                  ) : null
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2, bgcolor: '#f5f5f5' }}>
            <Button
              onClick={() => setMatchDialogOpen(false)}
              sx={{ fontSize: 'clamp(0.75rem, 3.5vw, 0.875rem)' }}
            >
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
      </Box>
    </Box>
  );
};

export default TournamentInProgress;