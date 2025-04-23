import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { getPlayerName, normalizeId, isValidObjectId } from './tournamentUtils.js';

const useTournament = (tournamentId, addNotification, onFinishTournament) => {
  const [tournament, setTournament] = useState(null);
  const [standings, setStandings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTournament = useCallback(async (retries = 3, backoff = 5000) => {
    setIsLoading(true);
    setError(null);

    if (!tournamentId || !isValidObjectId(tournamentId)) {
      setError('El ID del torneo no es válido');
      setIsLoading(false);
      addNotification('El ID del torneo no es válido. Por favor, selecciona otro torneo.', 'error');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setError('No se encontró el token de autenticación');
      setIsLoading(false);
      addNotification('Por favor, inicia sesión nuevamente para continuar.', 'error');
      return;
    }

    try {
      const response = await axios.get(`https://padnis.onrender.com/api/tournaments/${tournamentId}`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 60000,
      });
      setTournament(response.data);
      if (response.data.type === 'RoundRobin') {
        updateStandings(response.data);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'No se pudo conectar con el servidor';
      if (retries > 0 && error.code === 'ERR_NETWORK') {
        setTimeout(() => fetchTournament(retries - 1, backoff * 2), backoff);
        return;
      }
      setError(errorMessage);
      addNotification(`No se pudo cargar el torneo: ${errorMessage}. Intenta de nuevo más tarde.`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [tournamentId, addNotification]);

  const updateStandings = (tournamentData) => {
    if (!tournamentData?.groups || !Array.isArray(tournamentData.groups)) {
      console.warn('Invalid or missing groups data:', tournamentData?.groups);
      setStandings([]);
      return;
    }

    const newStandings = tournamentData.groups.map((group, groupIndex) => {
      const standings = (group.players && Array.isArray(group.players) ? group.players : []).map((p) => {
        const player1Id = normalizeId(p.player1?._id || p.player1?.player1?._id || p.player1);
        if (!player1Id || !isValidObjectId(player1Id)) {
          console.warn('Invalid player1 ID:', p.player1);
          return null;
        }
        return {
          playerId: player1Id,
          player2Id: p.player2 ? normalizeId(p.player2?._id || p.player2?.player1?._id || p.player2) : null,
          wins: 0,
          setsWon: 0,
          gamesWon: 0,
        };
      }).filter(p => p !== null);

      if (group.matches && Array.isArray(group.matches)) {
        group.matches.forEach((match) => {
          if (match.result?.winner) {
            const winnerId = normalizeId(match.result.winner?.player1?._id || match.result.winner?.player1);
            if (!winnerId || !isValidObjectId(winnerId)) {
              console.warn('Invalid winner ID:', match.result.winner);
              return;
            }
            const winner = standings.find(s => s.playerId === winnerId);
            if (winner) {
              winner.wins += 1;
            }
            if (match.result.sets && Array.isArray(match.result.sets)) {
              match.result.sets.forEach((set) => {
                const p1Id = normalizeId(
                  match.player1?.player1?._id ||
                  match.player1?._id ||
                  match.player1?.player1 ||
                  (typeof match.player1 === 'object' && match.player1?.player1?._id)
                );
                const p2Id = normalizeId(
                  match.player2?.player1?._id ||
                  match.player2?._id ||
                  match.player2?.player1 ||
                  (typeof match.player2 === 'object' && match.player2?.player1?._id)
                );
                if (!p1Id || !p2Id || !isValidObjectId(p1Id) || !isValidObjectId(p2Id)) {
                  console.warn('Invalid player IDs in match:', { p1Id, p2Id, match });
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
                }
              });
            }
          }
        });
      }

      const groupStandings = {
        groupName: group.name || `Grupo ${groupIndex + 1}`,
        standings: standings.sort((a, b) => (b.wins || 0) - (a.wins || 0) || (b.setsWon || 0) - (a.setsWon || 0) || (b.gamesWon || 0) - (a.gamesWon || 0)),
      };
      console.log('Group standings:', groupStandings);
      return groupStandings;
    });

    console.log('Updated standings:', newStandings);
    setStandings(newStandings);
  };

  const generateKnockoutPhase = useCallback(async (retries = 3, backoff = 5000) => {
    if (tournament?.type !== 'RoundRobin') return;

    try {
      const allMatchesCompleted = tournament.groups.every((group) =>
        group.matches.every((match) => match.result?.winner !== null)
      );
      if (!allMatchesCompleted) {
        addNotification('Completa todos los partidos de los grupos antes de generar la fase eliminatoria.', 'error');
        return;
      }

      const topPlayers = standings.flatMap((group) => {
        if (!group.standings || !Array.isArray(group.standings)) return [];
        return group.standings.slice(0, tournament.playersPerGroupToAdvance || 2).map((s) => {
          const participant = tournament.participants.find((p) => normalizeId(p.player1?._id || p.player1) === s.playerId);
          if (!participant) return null;
          const player1Id = normalizeId(participant.player1?._id || participant.player1);
          const player2Id = tournament.format.mode === 'Dobles' && participant.player2 ? normalizeId(participant.player2?._id || participant.player2) : null;
          if (!player1Id || !isValidObjectId(player1Id) || (player2Id && !isValidObjectId(player2Id))) return null;
          return { player1: player1Id, player2: player2Id, seed: false };
        }).filter((p) => p !== null);
      });

      if (topPlayers.length < 2) {
        addNotification('No hay suficientes jugadores clasificados para la fase eliminatoria.', 'error');
        return;
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
        addNotification('No se pudieron generar partidos para la fase eliminatoria.', 'error');
        return;
      }

      const updatePayload = {
        rounds: [...(tournament.rounds || []), { round: (tournament.rounds?.length || 0) + 1, matches }],
      };
      await axios.put(`https://padnis.onrender.com/api/tournaments/${tournamentId}`, updatePayload, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        timeout: 60000,
      });
      await fetchTournament();
      addNotification('Fase eliminatoria generada con éxito.', 'success');
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'No se pudo conectar con el servidor';
      if (retries > 0 && error.code === 'ERR_NETWORK') {
        setTimeout(() => generateKnockoutPhase(retries - 1, backoff * 2), backoff);
        return;
      }
      addNotification(`No se pudo generar la fase eliminatoria: ${errorMessage}.`, 'error');
    }
  }, [tournament, standings, tournamentId, addNotification, fetchTournament]);

  const advanceEliminationRound = useCallback(async (retries = 3, backoff = 5000) => {
    if (!tournament?.rounds?.length) {
      addNotification('No hay rondas para avanzar.', 'error');
      return;
    }

    try {
      const currentRound = tournament.rounds[tournament.rounds.length - 1];
      if (!currentRound.matches.every((m) => m.result?.winner || m.player2?.name === 'BYE')) {
        addNotification('Completa todos los partidos de la ronda actual antes de avanzar.', 'error');
        return;
      }

      const winners = currentRound.matches
        .filter((m) => m.result?.winner || m.player2?.name === 'BYE')
        .map((m) => {
          const winnerPair = m.result?.winner || (m.player2?.name === 'BYE' ? m.player1 : null);
          if (
            !winnerPair ||
            !winnerPair.player1 ||
            !isValidObjectId(winnerPair.player1) ||
            (tournament.format.mode === 'Dobles' && winnerPair.player2 && !isValidObjectId(winnerPair.player2))
          ) {
            console.warn('Invalid winner pair:', winnerPair);
            addNotification('Pareja ganadora inválida en un partido.', 'error');
            return null;
          }
          return winnerPair;
        })
        .filter((w) => w !== null);

      if (winners.length < 2) {
        addNotification('No hay suficientes ganadores para crear la siguiente ronda.', 'error');
        return;
      }

      const matches = [];
      const nextRoundNumber = tournament.rounds.length + 1;

      if (winners.length === 2) {
        matches.push({
          player1: { player1: winners[0].player1, player2: winners[0].player2 || null },
          player2: { player1: winners[1].player1, player2: winners[1].player2 || null },
          result: { sets: [], winner: null },
          date: null,
        });
      }

      const existingRounds = tournament.rounds.map((round) => ({
        round: round.round,
        matches: round.matches.map((match) => ({
          player1: {
            player1: normalizeId(match.player1?.player1?._id || match.player1?.player1 || match.player1?._id),
            player2: match.player1?.player2 ? normalizeId(match.player1?.player2?._id || match.player1?.player2) : null,
          },
          player2: match.player2?.name === 'BYE' ? { name: 'BYE' } : {
            player1: normalizeId(match.player2?.player1?._id || match.player2?.player1 || match.player2?._id),
            player2: match.player2?.player2 ? normalizeId(match.player2?.player2?._id || match.player2?.player2) : null,
          },
          result: {
            sets: match.result.sets,
            winner: match.result.winner ? {
              player1: normalizeId(match.result.winner?.player1?._id || match.result.winner?.player1),
              player2: match.result.winner?.player2 ? normalizeId(match.result.winner?.player2?._id || match.result.winner?.player2) : null,
            } : null,
            runnerUp: match.result.runnerUp ? {
              player1: normalizeId(match.result.runnerUp?.player1?._id || match.result.runnerUp?.player1),
              player2: match.result.runnerUp?.player2 ? normalizeId(match.result.runnerUp?.player2?._id || match.result.runnerUp?.player2) : null,
            } : null,
            matchTiebreak1: match.result.matchTiebreak1,
            matchTiebreak2: match.result.matchTiebreak2,
          },
          date: match.date,
        })),
      }));

      const newRound = { round: nextRoundNumber, matches };
      const updatePayload = { rounds: [...existingRounds, newRound] };

      await axios.put(`https://padnis.onrender.com/api/tournaments/${tournamentId}`, updatePayload, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        timeout: 60000,
      });
      await fetchTournament();
      addNotification(`Avanzado a la siguiente ronda con éxito.`, 'success');
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'No se pudo conectar con el servidor';
      if (retries > 0 && error.code === 'ERR_NETWORK') {
        setTimeout(() => advanceEliminationRound(retries - 1, backoff * 2), backoff);
        return;
      }
      addNotification(`No se pudo avanzar la ronda: ${errorMessage}.`, 'error');
    }
  }, [tournament, tournamentId, addNotification, fetchTournament]);

  const handleFinishTournament = useCallback(async (retries = 3, backoff = 5000) => {
    try {
      const allMatchesCompleted =
        tournament.type === 'RoundRobin' && !tournament.rounds.length
          ? tournament.groups.every((group) => group.matches.every((match) => match.result?.winner !== null))
          : tournament.rounds.every((round) =>
              round.matches.every((match) => match.result?.winner !== null || match.player2?.name === 'BYE')
            );
      if (!allMatchesCompleted) {
        addNotification('Completa todos los partidos antes de finalizar el torneo.', 'error');
        return;
      }

      let winnerPair, runnerUpPair;
      if (tournament.rounds.length > 0) {
        const finalRound = tournament.rounds[tournament.rounds.length - 1];
        if (finalRound.matches.length !== 1) {
          addNotification('La ronda final debe tener exactamente un partido.', 'error');
          return;
        }
        const finalMatch = finalRound.matches[0];
        if (!finalMatch.result?.winner) {
          addNotification('La ronda final no tiene un ganador definido.', 'error');
          return;
        }
        if (!finalMatch.result.sets || finalMatch.result.sets.length === 0) {
          addNotification('No se pueden finalizar partidos sin sets registrados.', 'error');
          return;
        }
        if (tournament.format.sets === 2) {
          let setsWonByPlayer1 = 0;
          let setsWonByPlayer2 = 0;
          finalMatch.result.sets.forEach((set) => {
            if (set.player1 > set.player2 || (set.player1 === set.player2 && set.tiebreak1 > set.tiebreak2)) {
              setsWonByPlayer1 += 1;
            } else if (set.player2 > set.player1 || (set.player1 === set.player2 && set.tiebreak2 > set.tiebreak1)) {
              setsWonByPlayer2 += 1;
            }
          });
          if (setsWonByPlayer1 === 1 && setsWonByPlayer2 === 1) {
            if (!finalMatch.result.matchTiebreak1 || !finalMatch.result.matchTiebreak2) {
              addNotification('Se requiere un tiebreak de partido para determinar el ganador.', 'error');
              return;
            }
            if (Math.abs(finalMatch.result.matchTiebreak1 - finalMatch.result.matchTiebreak2) < 2) {
              addNotification('El tiebreak del partido debe tener al menos 2 puntos de diferencia.', 'error');
              return;
            }
            if (finalMatch.result.matchTiebreak1 === finalMatch.result.matchTiebreak2) {
              addNotification('El tiebreak del partido no puede resultar en empate.', 'error');
              return;
            }
          }
        }
        winnerPair = {
          player1: normalizeId(finalMatch.result.winner?.player1?._id || finalMatch.result.winner?.player1),
          player2: finalMatch.result.winner?.player2 ? normalizeId(finalMatch.result.winner?.player2?._id || finalMatch.result.winner?.player2) : null,
        };
        runnerUpPair = finalMatch.result.runnerUp ? {
          player1: normalizeId(finalMatch.result.runnerUp?.player1?._id || finalMatch.result.runnerUp?.player1),
          player2: finalMatch.result.runnerUp?.player2 ? normalizeId(finalMatch.result.runnerUp?.player2?._id || finalMatch.result.runnerUp?.player2) : null,
        } : null;
      } else if (tournament.type === 'RoundRobin') {
        const allStandings = standings.flatMap((group) => group.standings);
        const sortedStandings = allStandings.sort(
          (a, b) => (b.wins || 0) - (a.wins || 0) || (b.setsWon || 0) - (a.setsWon || 0) || (b.gamesWon || 0) - (a.gamesWon || 0)
        );
        const winnerParticipant = tournament.participants.find((p) => normalizeId(p.player1?._id || p.player1) === sortedStandings[0]?.playerId);
        const runnerUpParticipant = sortedStandings[1]
          ? tournament.participants.find((p) => normalizeId(p.player1?._id || p.player1) === sortedStandings[1]?.playerId)
          : null;
        winnerPair = winnerParticipant
          ? {
              player1: normalizeId(winnerParticipant.player1?._id || winnerParticipant.player1),
              player2: winnerParticipant.player2 ? normalizeId(winnerParticipant.player2?._id || winnerParticipant.player2) : null,
            }
          : null;
        runnerUpPair = runnerUpParticipant
          ? {
              player1: normalizeId(runnerUpParticipant.player1?._id || runnerUpParticipant.player1),
              player2: runnerUpParticipant.player2 ? normalizeId(runnerUpParticipant.player2?._id || runnerUpParticipant.player2) : null,
            }
          : null;
      }

      if (
        !winnerPair ||
        !winnerPair.player1 ||
        !isValidObjectId(winnerPair.player1) ||
        (tournament.format.mode === 'Dobles' && winnerPair.player2 && !isValidObjectId(winnerPair.player2))
      ) {
        addNotification('No se pudo determinar un ganador válido.', 'error');
        return;
      }

      const updatePayload = {
        status: 'Finalizado',
        draft: false,
        winner: winnerPair,
        runnerUp: runnerUpPair || null,
      };
      await axios.put(`https://padnis.onrender.com/api/tournaments/${tournamentId}`, updatePayload, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        timeout: 60000,
      });
      await fetchTournament();

      const winnerName = getPlayerName(tournament, winnerPair.player1, winnerPair.player2);
      const runnerUpName = runnerUpPair ? getPlayerName(tournament, runnerUpPair.player1, runnerUpPair.player2) : '';

      addNotification(
        `Torneo finalizado con éxito. Ganadores: ${winnerName}${runnerUpName ? `, Segundo puesto: ${runnerUpName}` : ''}`,
        'success'
      );
      onFinishTournament(tournament);
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'No se pudo conectar con el servidor';
      if (retries > 0 && error.code === 'ERR_NETWORK') {
        setTimeout(() => handleFinishTournament(retries - 1, backoff * 2), backoff);
        return;
      }
      addNotification(`No se pudo finalizar el torneo: ${errorMessage}.`, 'error');
    }
  }, [tournament, standings, tournamentId, addNotification, onFinishTournament, fetchTournament, getPlayerName]);

  useEffect(() => {
    fetchTournament();
  }, [fetchTournament]);

  return {
    tournament,
    standings,
    isLoading,
    error,
    fetchTournament,
    generateKnockoutPhase,
    advanceEliminationRound,
    handleFinishTournament,
    getPlayerName,
    getRoundName: (numTeams) => getRoundName(numTeams, tournament?.rounds?.length || 1),
  };
};

export default useTournament;