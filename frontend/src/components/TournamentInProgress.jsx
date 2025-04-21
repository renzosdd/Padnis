import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import {
  Box,
  Typography,
  Button,
  Tabs,
  Tab,
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
  CircularProgress,
} from '@mui/material';
import { Add, Remove } from '@mui/icons-material';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import { ErrorBoundary } from 'react-error-boundary';

const TournamentInProgress = ({ tournamentId, onFinishTournament }) => {
  const [tournament, setTournament] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [matchDialogOpen, setMatchDialogOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [matchScores, setMatchScores] = useState([]);
  const [standings, setStandings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user, role } = useAuth();
  const { addNotification } = useNotification();
  const swiperRef = useRef(null);

  useEffect(() => {
    fetchTournament();
  }, [tournamentId]);

  const fetchTournament = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.get(`https://padnis.onrender.com/api/tournaments/${tournamentId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (process.env.NODE_ENV === 'development') {
        console.log('Tournament data:', JSON.stringify(response.data, null, 2));
      }
      setTournament(response.data);
      if (response.data.type === 'RoundRobin') {
        updateStandings(response.data);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Error desconocido';
      setError(errorMessage);
      addNotification(`Error al cargar el torneo: ${errorMessage}`, 'error');
      console.error('Error al cargar torneo:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateStandings = (tournamentData) => {
    if (!tournamentData.groups || !Array.isArray(tournamentData.groups)) {
      console.warn('No groups found in tournament data');
      setStandings([]);
      return;
    }

    const newStandings = tournamentData.groups.map((group, groupIndex) => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`Processing group ${group.name || groupIndex}:`, JSON.stringify(group, null, 2));
      }
      const standings = group.players && Array.isArray(group.players)
        ? group.players.map(p => {
            const player1Id = typeof p.player1 === 'object' ? p.player1?._id?.toString() || p.player1?.$oid : p.player1?.toString();
            if (!player1Id || !isValidObjectId(player1Id)) {
              console.warn(`Invalid player1 ID in group ${group.name || groupIndex}:`, p.player1);
              return null;
            }
            return {
              playerId: player1Id,
              player2Id: p.player2
                ? (typeof p.player2 === 'object' ? p.player2?._id?.toString() || p.player2?.$oid : p.player2.toString())
                : null,
              wins: 0,
              setsWon: 0,
              gamesWon: 0,
            };
          }).filter(p => p !== null)
        : [];

      if (standings.length === 0) {
        console.warn(`No valid players found for group ${group.name || groupIndex}`);
      }

      if (group.matches && Array.isArray(group.matches)) {
        group.matches.forEach(match => {
          if (match.result?.winner) {
            const winnerId = typeof match.result.winner === 'object' && match.result.winner.player1 
              ? match.result.winner.player1.toString() 
              : (typeof match.result.winner === 'object' ? match.result.winner?._id?.toString() || match.result.winner?.$oid : match.result.winner.toString());
            if (!winnerId || !isValidObjectId(winnerId)) {
              console.warn(`Invalid winner ID in match for group ${group.name || groupIndex}:`, match.result.winner);
              return;
            }
            const winner = standings.find(s => s.playerId === winnerId);
            if (winner) {
              winner.wins += 1;
            } else {
              console.warn(`Winner ID ${winnerId} not found in standings for group ${group.name || groupIndex}`);
            }
            if (match.result.sets && Array.isArray(match.result.sets)) {
              match.result.sets.forEach(set => {
                const p1Id = typeof match.player1?.player1 === 'object' ? match.player1.player1?._id?.toString() || match.player1.player1?.$oid : match.player1?.player1?.toString();
                const p2Id = typeof match.player2?.player1 === 'object' ? match.player2.player1?._id?.toString() || match.player2.player1?.$oid : match.player2?.player1?.toString();
                if (!p1Id || !p2Id || !isValidObjectId(p1Id) || !isValidObjectId(p2Id)) {
                  console.warn(`Invalid player IDs in match for group ${group.name || groupIndex}:`, { p1Id, p2Id });
                  return;
                }
                const p1 = standings.find(s => s.playerId === p1Id);
                const p2 = standings.find(s => s.playerId === p2Id);
                if (p1 && p2) {
                  p1.gamesWon += set.player1 || 0;
                  p2.gamesWon += set.player2 || 0;
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
                  console.warn(`Player IDs ${p1Id} or ${p2Id} not found in standings for group ${group.name || groupIndex}`);
                }
              });
            }
          }
        });
      } else {
        console.warn(`No matches found for group ${group.name || groupIndex}`);
      }

      return {
        groupName: group.name || `Grupo ${groupIndex + 1}`,
        standings: standings.sort((a, b) => b.wins - a.wins || b.setsWon - a.setsWon || b.gamesWon - a.gamesWon),
      };
    });
    if (process.env.NODE_ENV === 'development') {
      console.log('Updated standings:', JSON.stringify(newStandings, null, 2));
    }
    setStandings(newStandings);
  };

  const handleTabChange = useCallback((event, newValue) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Tab changed to:', newValue);
    }
    setTabValue(newValue);
    if (swiperRef.current && swiperRef.current.swiper) {
      swiperRef.current.swiper.slideTo(newValue);
    }
  }, []);

  const handleSlideChange = useCallback((swiper) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Slide changed to:', swiper.activeIndex);
    }
    setTabValue(swiper.activeIndex);
  }, []);

  const openMatchDialog = useCallback((match, groupIndex, matchIndex, roundIndex = null) => {
    if (role !== 'admin' && role !== 'coach') {
      addNotification('Solo admin o coach pueden actualizar partidos', 'error');
      return;
    }
    setSelectedMatch({ match, groupIndex, matchIndex, roundIndex, matchId: match._id });
    const initialSets = match.result.sets && match.result.sets.length > 0 
      ? match.result.sets.map(set => ({
          player1: set.player1 || 0,
          player2: set.player2 || 0,
          tiebreak1: set.tiebreak1 || 0,
          tiebreak2: set.tiebreak2 || 0,
        }))
      : Array(tournament?.format?.sets || 1).fill({ player1: 0, player2: 0, tiebreak1: 0, tiebreak2: 0 });
    setMatchScores(initialSets);
    setMatchDialogOpen(true);
  }, [role, tournament?.format?.sets, addNotification]);

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

  const determineWinner = useCallback((sets, player1Pair, player2Pair) => {
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
  }, [tournament?.format?.sets]);

  const isValidObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(id);

  const submitMatchResult = async (retries = 2) => {
    const validSets = matchScores.filter(set => set.player1 > 0 || set.player2 > 0);
    if (validSets.length !== tournament?.format.sets) {
      addNotification(`Ingresa exactamente ${tournament?.format.sets} set${tournament?.format.sets > 1 ? 's' : ''} válidos`, 'error');
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
      const player1Id = typeof selectedMatch.match.player1?.player1 === 'object' ? selectedMatch.match.player1.player1?._id?.toString() || selectedMatch.match.player1.player1?.$oid : selectedMatch.match.player1?.player1?.toString();
      const player1Id2 = selectedMatch.match.player1?.player2 ? (typeof selectedMatch.match.player1.player2 === 'object' ? selectedMatch.match.player1.player2?._id?.toString() || selectedMatch.match.player1.player2?.$oid : selectedMatch.match.player1?.player2?.toString()) : null;
      const player2Id = typeof selectedMatch.match.player2?.player1 === 'object' ? selectedMatch.match.player2.player1?._id?.toString() || selectedMatch.match.player2.player1?.$oid : selectedMatch.match.player2?.player1?.toString();
      const player2Id2 = selectedMatch.match.player2?.player2 ? (typeof selectedMatch.match.player2.player2 === 'object' ? selectedMatch.match.player2.player2?._id?.toString() || selectedMatch.match.player2.player2?.$oid : selectedMatch.match.player2?.player2?.toString()) : null;
      
      if (!player1Id || !player2Id || !isValidObjectId(player1Id) || !isValidObjectId(player2Id) || 
          (tournament.format.mode === 'Dobles' && (!player1Id2 || !player2Id2 || !isValidObjectId(player1Id2) || !isValidObjectId(player2Id2)))) {
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
      if (roundIndex !== null && tournament?.rounds.length === roundIndex + 1 && tournament?.rounds[roundIndex].matches.length === 1) {
        runnerUpPair = winnerPair === player1Pair ? player2Pair : player1Pair;
      }

      const payload = {
        sets,
        winner: winnerPair,
        runnerUp: runnerUpPair,
        isKnockout: roundIndex !== null,
      };
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Submitting match result payload:', JSON.stringify(payload, null, 2));
      }
      
      await axios.put(`https://padnis.onrender.com/api/tournaments/${tournamentId}/matches/${matchId}/result`, payload, {
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
    if (tournament?.type !== 'RoundRobin') return;
    try {
      const allMatchesCompleted = tournament.groups.every(group =>
        group.matches.every(match => match.result.winner !== null)
      );
      if (!allMatchesCompleted) {
        addNotification('Faltan completar algunos partidos en los grupos', 'error');
        return;
      }

      const validParticipantIds = tournament.participants.map(p => {
        const id = typeof p.player1 === 'object' ? p.player1?._id?.toString() || p.player1?.$oid : p.player1?.toString();
        return id;
      });
      const topPlayers = standings.flatMap(group => {
        if (!group.standings || !Array.isArray(group.standings)) {
          console.warn(`El grupo ${group.groupName} no tiene standings. Se omitirá.`);
          return [];
        }
        return group.standings.slice(0, tournament.playersPerGroupToAdvance || 2).map(s => {
          const participant = tournament.participants.find(p => {
            const pId = typeof p.player1 === 'object' ? p.player1?._id?.toString() || p.player1?.$oid : p.player1?.toString();
            return pId === s.playerId?.toString();
          });
          if (!participant) {
            console.warn(`No se encontró participante para playerId: ${s.playerId} en grupo ${group.groupName}`);
            return null;
          }
          const player1Id = typeof participant.player1 === 'object' ? participant.player1?._id?.toString() || participant.player1?.$oid : participant.player1?.toString();
          if (!player1Id || !isValidObjectId(player1Id)) {
            console.warn(`Invalid player1Id: ${player1Id} en grupo ${group.groupName}`);
            return null;
          }
          const player2Id = tournament.format.mode === 'Dobles' && participant.player2
            ? (typeof participant.player2 === 'object' ? participant.player2?._id?.toString() || participant.player2?.$oid : participant.player2.toString())
            : null;
          if (tournament.format.mode === 'Dobles' && player2Id && !isValidObjectId(player2Id)) {
            console.warn(`Invalid player2Id: ${player2Id} en grupo ${group.groupName}`);
            return null;
          }
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

      if (process.env.NODE_ENV === 'development') {
        console.log('Top players for knockout phase:', JSON.stringify(topPlayers, null, 2));
      }

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

      if (process.env.NODE_ENV === 'development') {
        console.log('Generated matches:', JSON.stringify(matches, null, 2));
      }

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
    if (!tournament?.rounds?.length) {
      addNotification('No hay rondas para avanzar', 'error');
      return;
    }
    try {
      const currentRound = tournament.rounds[tournament.rounds.length - 1];
      console.log('Current round:', JSON.stringify(currentRound, null, 2));
      if (!currentRound.matches.every(m => m.result.winner || m.player2?.name === 'BYE')) {
        addNotification('Faltan completar partidos de la ronda actual', 'error');
        return;
      }

      const winners = currentRound.matches
        .filter(m => m.result.winner || m.player2?.name === 'BYE')
        .map(m => {
          const winnerPair = m.result.winner;
          if (!winnerPair || !winnerPair.player1 || !isValidObjectId(winnerPair.player1) ||
              (tournament.format.mode === 'Dobles' && (!winnerPair.player2 || !isValidObjectId(winnerPair.player2)))) {
            addNotification(`Pareja ganadora inválida en el partido`, 'error');
            return null;
          }
          return winnerPair;
        })
        .filter(w => w !== null);

      if (winners.length < 2) {
        addNotification('No hay suficientes ganadores para crear la siguiente ronda', 'error');
        return;
      }

      const matches = [];
      const nextRoundNumber = tournament.rounds.length + 1;

      if (winners.length === 2) {
        matches.push({
          player1: { player1: winners[0].player1, player2: winners[0].player2 || null },
          player2: { player1: winners[1].player1, player2: winners[1].player2 || null },
          result: { sets: [], winner: null },
          date: null
        });
      }

      const existingRounds = tournament.rounds.map(round => ({
        round: round.round,
        matches: round.matches.map(match => ({
          player1: {
            player1: typeof match.player1.player1 === 'object' ? match.player1.player1._id : match.player1.player1,
            player2: match.player1.player2 ? (typeof match.player1.player2 === 'object' ? match.player1.player2._id : match.player1.player2) : null
          },
          player2: match.player2.name === 'BYE' ? { name: 'BYE' } : {
            player1: typeof match.player2.player1 === 'object' ? match.player2.player1._id : match.player2.player1,
            player2: match.player2.player2 ? (typeof match.player2.player2 === 'object' ? match.player2.player2._id : match.player2.player2) : null
          },
          result: { winner: match.result.winner },
          date: match.date
        }))
      }));

      const newRound = {
        round: nextRoundNumber,
        matches: matches
      };

      const updatePayload = {
        rounds: [...existingRounds, newRound]
      };
      console.log('Advancing to round payload:', JSON.stringify(updatePayload, null, 2));

      await axios.put(`https://padnis.onrender.com/api/tournaments/${tournamentId}`, updatePayload, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
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

      let winnerPair, runnerUpPair;
      if (tournament.rounds.length > 0) {
        const finalRound = tournament.rounds[tournament.rounds.length - 1];
        if (finalRound.matches.length !== 1) {
          addNotification('La ronda final debe tener exactamente un partido', 'error');
          return;
        }
        const finalMatch = finalRound.matches[0];
        if (!finalMatch.result.winner) {
          addNotification('La ronda final no tiene un ganador definido', 'error');
          return;
        }
        winnerPair = finalMatch.result.winner;
        runnerUpPair = finalMatch.result.runnerUp;

        if (!winnerPair || !winnerPair.player1 || !isValidObjectId(winnerPair.player1) || 
            (tournament.format.mode === 'Dobles' && (!winnerPair.player2 || !isValidObjectId(winnerPair.player2))) ||
            (runnerUpPair && (!runnerUpPair.player1 || !isValidObjectId(runnerUpPair.player1) || 
            (tournament.format.mode === 'Dobles' && (!runnerUpPair.player2 || !isValidObjectId(runnerUpPair.player2)))))) {
          addNotification('IDs inválidos para ganador o subcampeón', 'error');
          return;
        }
      } else if (tournament.type === 'RoundRobin') {
        const allStandings = standings.flatMap(group => group.standings);
        const sortedStandings = allStandings.sort((a, b) => b.wins - a.wins || b.setsWon - a.setsWon || b.gamesWon - a.gamesWon);
        const winnerParticipant = tournament.participants.find(p =>
          (typeof p.player1 === 'object' ? p.player1?._id?.toString() || p.player1?.$oid : p.player1?.toString()) === sortedStandings[0].playerId?.toString()
        );
        const runnerUpParticipant = sortedStandings[1] ? tournament.participants.find(p =>
          (typeof p.player1 === 'object' ? p.player1?._id?.toString() || p.player1?.$oid : p.player1?.toString()) === sortedStandings[1].playerId?.toString()
        ) : null;
        winnerPair = {
          player1: winnerParticipant.player1._id.toString(),
          player2: winnerParticipant.player2 ? winnerParticipant.player2._id.toString() : null
        };
        runnerUpPair = runnerUpParticipant ? {
          player1: runnerUpParticipant.player1._id.toString(),
          player2: runnerUpParticipant.player2 ? runnerUpParticipant.player2._id.toString() : null
        } : null;
      }

      if (!winnerPair || !winnerPair.player1 || !isValidObjectId(winnerPair.player1) || 
          (tournament.format.mode === 'Dobles' && (!winnerPair.player2 || !isValidObjectId(winnerPair.player2)))) {
        addNotification('No se pudo determinar una pareja ganadora válida', 'error');
        return;
      }

      const updatePayload = { 
        status: 'Finalizado', 
        draft: false, 
        winner: winnerPair,
        runnerUp: runnerUpPair || null,
      };
      if (process.env.NODE_ENV === 'development') {
        console.log('Finalizing tournament payload:', JSON.stringify(updatePayload, null, 2));
      }

      await axios.put(`https://padnis.onrender.com/api/tournaments/${tournamentId}`, updatePayload, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      await fetchTournament();
      const winnerPlayer1 = tournament.participants.find(p => 
        (typeof p.player1 === 'object' ? p.player1?._id?.toString() || p.player1?.$oid : p.player1.toString()) === winnerPair.player1
      );
      const runnerUpPlayer1 = runnerUpPair ? tournament.participants.find(p => 
        (typeof p.player1 === 'object' ? p.player1?._id?.toString() || p.player1?.$oid : p.player1.toString()) === runnerUpPair.player1
      ) : null;
      addNotification(
        `Torneo finalizado con éxito. Ganadores: ${winnerPlayer1?.player1.firstName} ${winnerPlayer1?.player1.lastName}${winnerPlayer1?.player2 ? ` / ${winnerPlayer1.player2.firstName} ${winnerPlayer1.player2.lastName}` : ''}` +
        (runnerUpPlayer1 ? `, Segundo puesto: ${runnerUpPlayer1.player1.firstName} ${runnerUpPlayer1.player1.lastName}${runnerUpPlayer1.player2 ? ` / ${runnerUpPlayer1.player2.firstName} ${runnerUpPlayer1.player2.lastName}` : ''}` : ''),
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

  const getPlayerName = useCallback((playerId, player2Id = null) => {
    if (!tournament || !tournament.participants) {
      return 'Cargando...';
    }
    const normalizeId = (id) => {
      if (typeof id === 'object' && id?.$oid) return id.$oid;
      if (typeof id === 'object' && id?._id) return id._id.toString();
      return id?.toString() || '';
    };
    const participant = tournament.participants.find(p => {
      const pId = typeof p.player1 === 'object' ? p.player1?._id?.toString() || p.player1?.$oid : p.player1?.toString();
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
  }, [tournament]);

  const getRoundName = useCallback((numTeams) => {
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
        return `Ronda ${tournament?.rounds?.length + 1 || 1}`;
    }
  }, [tournament?.rounds]);

  const renderBracket = useMemo(() => {
    if (!tournament) {
      return <Typography>Cargando...</Typography>;
    }
    if (process.env.NODE_ENV === 'development') {
      console.log('Rendering bracket with rounds:', JSON.stringify(tournament.rounds, null, 2));
    }
    if (!tournament.rounds || !Array.isArray(tournament.rounds) || tournament.rounds.length === 0) {
      return <Typography>No hay rondas disponibles para mostrar.</Typography>;
    }
    return (
      <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {tournament.rounds.map((round, roundIndex) => {
          const numTeams = round.matches?.length * 2 || 0;
          return (
            <Box key={round.round || roundIndex} sx={{ mb: 2 }}>
              <Typography variant="h6" sx={{ fontSize: 'clamp(1rem, 5vw, 1.25rem)', mb: 2 }}>
                {getRoundName(numTeams)}
              </Typography>
              <Grid container spacing={2}>
                {round.matches && Array.isArray(round.matches) && round.matches.length > 0 ? (
                  round.matches.map((match, matchIndex) => (
                    <Grid item xs={12} key={matchIndex}>
                      <Card sx={{ bgcolor: '#ffffff', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)', width: '100%' }}>
                        <CardContent sx={{ p: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Avatar sx={{ bgcolor: '#01579b', width: 24, height: 24 }}>
                                  {match.player1?.player1 ? getPlayerName(match.player1.player1).charAt(0) : '?'}
                                </Avatar>
                                <Typography sx={{ fontSize: 'clamp(0.75rem, 3vw, 0.875rem)' }}>
                                  {match.player1?.player1 ? getPlayerName(match.player1.player1, match.player1.player2) : 'Jugador no definido'}
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Avatar sx={{ bgcolor: '#0288d1', width: 24, height: 24 }}>
                                  {match.player2?.name ? 'BYE' : (match.player2?.player1 ? getPlayerName(match.player2.player1).charAt(0) : '?')}
                                </Avatar>
                                <Typography sx={{ fontSize: 'clamp(0.75rem, 3vw, 0.875rem)' }}>
                                  {match.player2?.name || (match.player2?.player1 ? getPlayerName(match.player2.player1, match.player2.player2) : 'Jugador no definido')}
                                </Typography>
                              </Box>
                            </Box>
                            <Typography sx={{ fontSize: 'clamp(0.875rem, 3.5vw, 1rem)', fontWeight: 'bold', color: '#01579b' }}>
                              {match.result?.winner ? (
                                match.result.sets && match.result.sets.length > 0 ? (
                                  match.result.sets.map((set, i) => (
                                    <span key={i}>
                                      {set.player1 || 0}-{set.player2 || 0}
                                      {set.tiebreak1 ? ` (${set.tiebreak1}-${set.tiebreak2})` : ''}{' '}
                                    </span>
                                  ))
                                ) : 'Ganador definido sin sets'
                              ) : 'Pendiente'}
                            </Typography>
                          </Box>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => openMatchDialog(match, null, matchIndex, roundIndex)}
                            disabled={match.result?.winner !== null}
                            sx={{ mt: 1, fontSize: 'clamp(0.75rem, 3.5vw, 0.875rem)' }}
                          >
                            Actualizar Resultado
                          </Button>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))
                ) : (
                  <Typography>No hay partidos disponibles para esta ronda.</Typography>
                )}
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
  }, [tournament, role, getPlayerName, getRoundName, openMatchDialog, advanceEliminationRound]);

  const ErrorFallback = ({ error, resetErrorBoundary }) => (
    <Box sx={{ p: 2, bgcolor: '#ffebee', borderRadius: 2, textAlign: 'center' }}>
      <Typography color="error" variant="h6">Error al cargar el torneo</Typography>
      <Typography color="error">{error.message}</Typography>
      <Button onClick={resetErrorBoundary} variant="contained" sx={{ mt: 2, bgcolor: '#0288d1' }}>
        Reintentar
      </Button>
    </Box>
  );

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !tournament) {
    return (
      <Box sx={{ p: 2, bgcolor: '#ffebee', borderRadius: 2, textAlign: 'center' }}>
        <Typography color="error" variant="h6">Error al cargar el torneo</Typography>
        <Typography color="error">{error || 'No se pudo cargar el torneo'}</Typography>
        <Button onClick={fetchTournament} variant="contained" sx={{ mt: 2, bgcolor: '#0288d1' }}>
          Reintentar
        </Button>
      </Box>
    );
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} onReset={fetchTournament}>
      <Box
        sx={{
          p: { xs: 2, sm: 3 },
          bgcolor: '#f0f4f8',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          height: 'auto',
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
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
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
            {tournament.name} - {tournament.sport} ({tournament.format?.mode || 'No definido'}) en {tournament.club?.name || 'No definido'}
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

          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Swiper
              spaceBetween={10}
              slidesPerView={1}
              onSlideChange={handleSlideChange}
              initialSlide={tabValue}
              style={{ width: '100%', height: 'auto' }}
              ref={swiperRef}
            >
              <SwiperSlide>
                <Box sx={{ p: 2, height: 'auto' }}>
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
                      <strong>Tipo:</strong> {tournament.type || 'No definido'}
                    </Typography>
                    <Typography sx={{ fontSize: 'clamp(0.875rem, 4vw, 1rem)', mb: 1 }}>
                      <strong>Deporte:</strong> {tournament.sport || 'No definido'}
                    </Typography>
                    <Typography sx={{ fontSize: 'clamp(0.875rem, 4vw, 1rem)', mb: 1 }}>
                      <strong>Modalidad:</strong> {tournament.format?.mode || 'No definido'}
                    </Typography>
                    <Typography sx={{ fontSize: 'clamp(0.875rem, 4vw, 1rem)', mb: 1 }}>
                      <strong>Sets por partido:</strong> {tournament.format?.sets || 'No definido'}
                    </Typography>
                    <Typography sx={{ fontSize: 'clamp(0.875rem, 4vw, 1rem)', mb: 1 }}>
                      <strong>Juegos por set:</strong> {tournament.format?.gamesPerSet || 'No definido'}
                    </Typography>
                    <Typography sx={{ fontSize: 'clamp(0.875rem, 4vw, 1rem)', mb: 1 }}>
                      <strong>Participantes:</strong>
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', mt: 1, gap: 1 }}>
                      {tournament.participants && tournament.participants.length > 0 ? (
                        tournament.participants.map(part => {
                          const player1Name = part.player1?.firstName
                            ? `${part.player1.firstName} ${part.player1.lastName || ''}`
                            : 'Jugador no encontrado';
                          const player2Name =
                            tournament.format?.mode === 'Dobles' && part.player2
                              ? `${part.player2.firstName || ''} ${part.player2.lastName || ''}`
                              : '';
                          const label =
                            tournament.format?.mode === 'Singles'
                              ? player1Name
                              : `${player1Name} / ${player2Name || 'Jugador no encontrado'}`;
                          return (
                            <Chip
                              key={part.player1?._id || part.player1?.$oid || part.player1}
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
                </Box>
              </SwiperSlide>
              <SwiperSlide>
                <Box sx={{ p: 2, height: 'auto' }}>
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
                                  <Card sx={{ bgcolor: '#ffffff', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)', width: '100%' }}>
                                    <CardContent sx={{ p: 1 }}>
                                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Avatar sx={{ bgcolor: '#01579b', width: 24, height: 24 }}>
                                              {match.player1?.player1 ? getPlayerName(match.player1.player1).charAt(0) : '?'}
                                            </Avatar>
                                            <Typography sx={{ fontSize: 'clamp(0.75rem, 3vw, 0.875rem)' }}>
                                              {match.player1?.player1 ? getPlayerName(match.player1.player1, match.player1.player2) : 'Jugador no definido'}
                                            </Typography>
                                          </Box>
                                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Avatar sx={{ bgcolor: '#0288d1', width: 24, height: 24 }}>
                                              {match.player2?.player1 ? getPlayerName(match.player2.player1).charAt(0) : '?'}
                                            </Avatar>
                                            <Typography sx={{ fontSize: 'clamp(0.75rem, 3vw, 0.875rem)' }}>
                                              {match.player2?.player1 ? getPlayerName(match.player2.player1, match.player2.player2) : 'Jugador no definido'}
                                            </Typography>
                                          </Box>
                                        </Box>
                                        <Typography sx={{ fontSize: 'clamp(0.875rem, 3.5vw, 1rem)', fontWeight: 'bold', color: '#01579b' }}>
                                          {match.result?.sets && match.result.sets.length > 0
                                            ? match.result.sets.map((set, idx) => (
                                                <span key={idx}>
                                                  {set.player1 || 0} - {set.player2 || 0}{' '}
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
                                        disabled={match.result?.winner !== null}
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
                </Box>
              </SwiperSlide>
              <SwiperSlide>
                <Box sx={{ p: 2, height: 'auto' }}>
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
                        <Box key={group.groupName || groupIndex} sx={{ mb: 0.5 }}>
                          <Typography
                            variant="h6"
                            sx={{ fontSize: 'clamp(1rem, 5vw, 1.25rem)', mb: 0.5 }}
                          >
                            {group.groupName || `Grupo ${groupIndex + 1}`}
                          </Typography>
                          {group.standings && Array.isArray(group.standings) && group.standings.length > 0 ? (
                            group.standings.map((player, idx) => {
                              const participant = tournament.participants.find(p =>
                                (typeof p.player1 === 'object' ? p.player1?._id?.toString() || p.player1?.$oid : p.player1?.toString()) === player.playerId?.toString()
                              );
                              const player1Name = participant?.player1?.firstName
                                ? `${participant.player1.firstName} ${participant.player1.lastName || ''}`
                                : 'Jugador no encontrado';
                              const player2Name =
                                tournament.format?.mode === 'Dobles' && participant?.player2
                                  ? `${participant.player2.firstName || ''} ${participant.player2.lastName || ''}`
                                  : '';
                              const label =
                                tournament.format?.mode === 'Singles'
                                  ? player1Name
                                  : `${player1Name} / ${player2Name || 'Jugador no encontrado'}`;
                              return (
                                <Card
                                  key={idx}
                                  sx={{
                                    bgcolor: '#ffffff',
                                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                                    width: '100%',
                                    maxWidth: '100%',
                                    mb: 0.5,
                                    borderRadius: 1,
                                  }}
                                >
                                  <CardContent sx={{ p: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <Avatar
                                        sx={{ bgcolor: '#01579b', width: 24, height: 24 }}
                                      >
                                        {player1Name.charAt(0)}
                                      </Avatar>
                                      <Typography sx={{ fontSize: 'clamp(0.75rem, 3vw, 0.875rem)', fontWeight: 'bold' }}>
                                        {label}
                                      </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                      <Typography sx={{ fontSize: 'clamp(0.75rem, 3vw, 0.875rem)' }}>
                                        <strong>V:</strong> {player.wins || 0}
                                      </Typography>
                                      <Typography sx={{ fontSize: 'clamp(0.75rem, 3vw, 0.875rem)' }}>
                                        <strong>S:</strong> {player.setsWon || 0}
                                      </Typography>
                                      <Typography sx={{ fontSize: 'clamp(0.75rem, 3vw, 0.875rem)' }}>
                                        <strong>JG:</strong> {player.gamesWon || 0}
                                      </Typography>
                                    </Box>
                                  </CardContent>
                                </Card>
                              );
                            })
                          ) : (
                            <Typography sx={{ textAlign: 'center', fontSize: 'clamp(0.75rem, 3vw, 0.875rem)' }}>
                              No hay posiciones disponibles para este grupo.
                            </Typography>
                          )}
                        </Box>
                      ))
                    ) : (
                      <Typography sx={{ textAlign: 'center', fontSize: 'clamp(0.75rem, 3vw, 0.875rem)' }}>
                        No hay posiciones disponibles para mostrar.
                      </Typography>
                    )}
                  </Box>
                </Box>
              </SwiperSlide>
              {tournament.rounds && tournament.rounds.length > 0 && (
                <SwiperSlide>
                  <Box sx={{ p: 2, height: 'auto' }}>
                    {renderBracket}
                  </Box>
                </SwiperSlide>
              )}
            </Swiper>
          </Box>

          {(role === 'admin' || role === 'coach') && (
            <Box sx={{ mt: 1, textAlign: 'center' }}>
              <Button
                variant="contained"
                color="success"
                onClick={handleFinishTournament}
                sx={{
                  bgcolor: '#388e3c',
                  '&:hover': { bgcolor: '#2e7d32' },
                  fontSize: 'clamp(0.875rem, 4vw, 1rem)',
                }}
              >
                Finalizar Torneo
              </Button>
            </Box>
          )}
        </Box>

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
                      {selectedMatch.match.player1?.player1 ? getPlayerName(selectedMatch.match.player1.player1).charAt(0) : '?'}
                    </Avatar>
                    <Typography sx={{ fontSize: 'clamp(0.875rem, 4vw, 1rem)', fontWeight: 'bold' }}>
                      {selectedMatch.match.player1?.player1 ? getPlayerName(selectedMatch.match.player1.player1, selectedMatch.match.player1.player2) : 'Jugador no definido'}
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: 'clamp(0.875rem, 4vw, 1rem)' }}>vs</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ fontSize: 'clamp(0.875rem, 4vw, 1rem)', fontWeight: 'bold' }}>
                      {selectedMatch.match.player2?.name || (selectedMatch.match.player2?.player1 ? getPlayerName(selectedMatch.match.player2.player1, selectedMatch.match.player2.player2) : 'Jugador no definido')}
                    </Typography>
                    <Avatar sx={{ bgcolor: '#0288d1', width: 40, height: 40 }}>
                      {selectedMatch.match.player2?.name ? 'BYE' : (selectedMatch.match.player2?.player1 ? getPlayerName(selectedMatch.match.player2.player1).charAt(0) : '?')}
                    </Avatar>
                  </Box>
                </Box>
                {matchScores.map((set, index) =>
                  index < tournament?.format?.sets ? (
                    <Card key={index} sx={{ bgcolor: '#ffffff', p: 2, borderRadius: 1, boxShadow: '0 1px 4px rgba(0, 0, 0, 0.1)' }}>
                      <Typography sx={{ fontSize: 'clamp(0.875rem, 4vw, 1rem)', fontWeight: 'medium', mb: 2 }}>
                        Set {index + 1}
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography sx={{ fontSize: 'clamp(0.75rem, 3.5vw, 0.875rem)', width: '150px' }}>
                            {selectedMatch.match.player1?.player1 ? getPlayerName(selectedMatch.match.player1.player1, selectedMatch.match.player1.player2) : 'Jugador no definido'}
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
                            {selectedMatch.match.player2?.name || (selectedMatch.match.player2?.player1 ? getPlayerName(selectedMatch.match.player2.player1, selectedMatch.match.player2.player2) : 'Jugador no definido')}
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
    </ErrorBoundary>
  );
};

export default TournamentInProgress;