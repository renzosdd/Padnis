import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const useTournament = (tournamentId, addNotification, onFinishTournament) => {
  const [tournament, setTournament] = useState(null);
  const [standings, setStandings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const isValidObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(id);

  const fetchTournament = async (retries = 3) => {
    setIsLoading(true);
    setError(null);
    console.log(`Fetching tournament with ID: ${tournamentId}, retries left: ${retries}`);

    if (!tournamentId || !isValidObjectId(tournamentId)) {
      console.error('Invalid tournamentId:', tournamentId);
      setError('ID de torneo inválido');
      setIsLoading(false);
      addNotification('ID de torneo inválido', 'error');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No authentication token found');
      setError('No se encontró el token de autenticación');
      setIsLoading(false);
      addNotification('Por favor, inicia sesión nuevamente', 'error');
      return;
    }

    try {
      const response = await axios.get(`https://padnis.onrender.com/api/tournaments/${tournamentId}`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 60000,
      });
      console.log('Fetch successful, response status:', response.status);
      setTournament(response.data);
      if (response.data.type === 'RoundRobin') {
        updateStandings(response.data);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Error desconocido';
      const errorDetails = {
        message: errorMessage,
        code: error.code,
        status: error.response?.status,
        responseData: error.response?.data,
        request: error.config,
      };
      console.error('Error al cargar torneo:', errorDetails);
      if (retries > 0 && error.code === 'ERR_NETWORK') {
        console.log(`Retrying fetch tournament (${retries} retries left)...`);
        setTimeout(() => fetchTournament(retries - 1), 5000);
        return;
      }
      setError(errorMessage);
      addNotification(`Error al cargar el torneo (código ${error.code || 'desconocido'}): ${errorMessage}. El servidor podría estar inactivo.`, 'error');
    } finally {
      if (retries === 0 || error?.code !== 'ERR_NETWORK') {
        setIsLoading(false);
        console.log('Fetch completed, isLoading set to false');
      }
    }
  };

  const updateStandings = (tournamentData) => {
    if (!tournamentData.groups || !Array.isArray(tournamentData.groups)) {
      console.warn('No groups found in tournament data');
      setStandings([]);
      return;
    }

    const newStandings = tournamentData.groups.map((group, groupIndex) => {
      console.log(`Processing group ${group.name || groupIndex}:`);
      const standings = group.players && Array.isArray(group.players)
        ? group.players.map(p => {
            const player1Id =
              typeof p.player1 === 'object' ? p.player1?._id?.toString() || p.player1?.$oid : p.player1?.toString();
            if (!player1Id || !isValidObjectId(player1Id)) {
              console.warn(`Invalid player1 ID in group ${group.name || groupIndex}:`, p.player1);
              return null;
            }
            return {
              playerId: player1Id,
              player2Id: p.player2
                ? typeof p.player2 === 'object'
                  ? p.player2?._id?.toString() || p.player2?.$oid
                  : p.player2?.toString()
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
            const winnerId = match.result.winner?.player1?.toString();
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
                const p1Id =
                  typeof match.player1?.player1 === 'object'
                    ? match.player1.player1?._id?.toString() || match.player1.player1?.$oid
                    : match.player1?.player1?.toString();
                const p2Id =
                  typeof match.player2?.player1 === 'object'
                    ? match.player2.player1?._id?.toString() || match.player2.player1?.$oid
                    : match.player2?.player1?.toString();
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
    console.log('Updated standings:');
    setStandings(newStandings);
  };

  const generateKnockoutPhase = async (retries = 3) => {
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
          const player1Id =
            typeof participant.player1 === 'object'
              ? participant.player1?._id?.toString() || participant.player1?.$oid
              : participant.player1?.toString();
          if (!player1Id || !isValidObjectId(player1Id)) {
            console.warn(`Invalid player1Id: ${player1Id} en grupo ${group.groupName}`);
            return null;
          }
          const player2Id =
            tournament.format.mode === 'Dobles' && participant.player2
              ? typeof participant.player2 === 'object'
                ? participant.player2?._id?.toString() || participant.player2?.$oid
                : participant.player2?.toString()
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

      console.log('Top players for knockout phase:');
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

      console.log('Generated matches:');
      const updatePayload = {
        rounds: [...tournament.rounds, { round: tournament.rounds.length + 1, matches }],
      };
      await axios.put(`https://padnis.onrender.com/api/tournaments/${tournamentId}`, updatePayload, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        timeout: 60000,
      });
      await fetchTournament();
      addNotification('Fase eliminatoria generada', 'success');
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Error desconocido';
      const statusCode = error.response?.status || 'desconocido';
      addNotification(`Error al generar la fase eliminatoria (código ${statusCode}): ${errorMessage}. El servidor podría estar inactivo.`, 'error');
      console.error('Error generating knockout phase:', error);
      if (retries > 0 && error.code === 'ERR_NETWORK') {
        console.log(`Retrying generate knockout phase (${retries} retries left)...`);
        setTimeout(() => generateKnockoutPhase(retries - 1), 5000);
      }
    }
  };

  const advanceEliminationRound = async (retries = 3) => {
    if (!tournament?.rounds?.length) {
      addNotification('No hay rondas para avanzar', 'error');
      return;
    }
    try {
      const currentRound = tournament.rounds[tournament.rounds.length - 1];
      console.log('Current round:');
      if (!currentRound.matches.every(m => m.result.winner || m.player2?.name === 'BYE')) {
        addNotification('Faltan completar partidos de la ronda actual', 'error');
        return;
      }

      const winners = currentRound.matches
        .filter(m => m.result.winner || m.player2?.name === 'BYE')
        .map(m => {
          const winnerPair = m.result.winner;
          if (
            !winnerPair ||
            !winnerPair.player1 ||
            !isValidObjectId(winnerPair.player1) ||
            (tournament.format.mode === 'Dobles' && winnerPair.player2 && !isValidObjectId(winnerPair.player2))
          ) {
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
          date: null,
        });
      }

      const existingRounds = tournament.rounds.map(round => ({
        round: round.round,
        matches: round.matches.map(match => ({
          player1: {
            player1:
              typeof match.player1.player1 === 'object'
                ? match.player1.player1?._id?.toString()
                : match.player1.player1?.toString(),
            player2: match.player1.player2
              ? typeof match.player1.player2 === 'object'
                ? match.player1.player2?._id?.toString()
                : match.player1.player2?.toString()
              : null,
          },
          player2: match.player2.name === 'BYE' ? { name: 'BYE' } : {
            player1:
              typeof match.player2.player1 === 'object'
                ? match.player2.player1?._id?.toString()
                : match.player2.player1?.toString(),
            player2: match.player2.player2
              ? typeof match.player2.player2 === 'object'
                ? match.player2.player2?._id?.toString()
                : match.player2.player2?.toString()
              : null,
          },
          result: {
            sets: match.result.sets,
            winner: match.result.winner,
            runnerUp: match.result.runnerUp,
          },
          date: match.date,
        })),
      }));

      const newRound = {
        round: nextRoundNumber,
        matches: matches,
      };

      const updatePayload = {
        rounds: [...existingRounds, newRound],
      };
      console.log('Advancing to round payload:');
      await axios.put(`https://padnis.onrender.com/api/tournaments/${tournamentId}`, updatePayload, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        timeout: 60000,
      });
      await fetchTournament();
      addNotification(`Avanzado a ${getRoundName(matches.length * 2)}`, 'success');
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Error desconocido';
      const statusCode = error.response?.status || 'desconocido';
      addNotification(`Error al avanzar la ronda (código ${statusCode}): ${errorMessage}. El servidor podría estar inactivo.`, 'error');
      console.error('Error advancing round:', error);
      if (retries > 0 && error.code === 'ERR_NETWORK') {
        console.log(`Retrying advance elimination round (${retries} retries left)...`);
        setTimeout(() => advanceEliminationRound(retries - 1), 5000);
      }
    }
  };

  const handleFinishTournament = async (retries = 3) => {
    try {
      const allMatchesCompleted =
        tournament.type === 'RoundRobin' && !tournament.rounds.length
          ? tournament.groups.every(group => group.matches.every(match => match.result.winner !== null))
          : tournament.rounds.every(round =>
              round.matches.every(match => match.result.winner !== null || match.player2?.name === 'BYE')
            );
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
        if (!finalMatch.result.sets || finalMatch.result.sets.length === 0) {
          addNotification('No se pueden finalizar partidos sin sets registrados', 'error');
          return;
        }
        winnerPair = finalMatch.result.winner;
        runnerUpPair = finalMatch.result.runnerUp;

        if (
          !winnerPair ||
          !winnerPair.player1 ||
          !isValidObjectId(winnerPair.player1) ||
          (tournament.format.mode === 'Dobles' && winnerPair.player2 && !isValidObjectId(winnerPair.player2)) ||
          (runnerUpPair &&
            (!runnerUpPair.player1 ||
              !isValidObjectId(runnerUpPair.player1) ||
              (tournament.format.mode === 'Dobles' && runnerUpPair.player2 && !isValidObjectId(runnerUpPair.player2))))
        ) {
          addNotification('IDs inválidos para ganador o subcampeón', 'error');
          return;
        }
      } else if (tournament.type === 'RoundRobin') {
        const allStandings = standings.flatMap(group => group.standings);
        const sortedStandings = allStandings.sort(
          (a, b) => b.wins - a.wins || b.setsWon - a.setsWon || b.gamesWon - a.gamesWon
        );
        const winnerParticipant = tournament.participants.find(p =>
          (typeof p.player1 === 'object' ? p.player1?._id?.toString() || p.player1?.$oid : p.player1?.toString()) ===
          sortedStandings[0]?.playerId?.toString()
        );
        const runnerUpParticipant = sortedStandings[1]
          ? tournament.participants.find(p =>
              (typeof p.player1 === 'object' ? p.player1?._id?.toString() || p.player1?.$oid : p.player1?.toString()) ===
              sortedStandings[1]?.playerId?.toString()
            )
          : null;
        winnerPair = winnerParticipant
          ? {
              player1: winnerParticipant.player1?._id?.toString(),
              player2: winnerParticipant.player2 ? winnerParticipant.player2._id.toString() : null,
            }
          : null;
        runnerUpPair = runnerUpParticipant
          ? {
              player1: runnerUpParticipant.player1?._id?.toString(),
              player2: runnerUpParticipant.player2 ? runnerUpParticipant.player2._id.toString() : null,
            }
          : null;
      }

      if (
        !winnerPair ||
        !winnerPair.player1 ||
        !isValidObjectId(winnerPair.player1) ||
        (tournament.format.mode === 'Dobles' && winnerPair.player2 && !isValidObjectId(winnerPair.player2))
      ) {
        addNotification('No se pudo determinar una pareja ganadora válida', 'error');
        return;
      }

      const updatePayload = {
        status: 'Finalizado',
        draft: false,
        winner: winnerPair,
        runnerUp: runnerUpPair || null,
      };
      console.log('Finalizing tournament payload:');
      await axios.put(`https://padnis.onrender.com/api/tournaments/${tournamentId}`, updatePayload, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        timeout: 60000,
      });
      await fetchTournament();

      const winnerPlayer1 = tournament.participants.find(p =>
        (typeof p.player1 === 'object' ? p.player1?._id?.toString() || p.player1?.$oid : p.player1?.toString()) ===
        winnerPair.player1
      );
      const runnerUpPlayer1 = runnerUpPair
        ? tournament.participants.find(p =>
            (typeof p.player1 === 'object' ? p.player1?._id?.toString() || p.player1?.$oid : p.player1?.toString()) ===
            runnerUpPair.player1
          )
        : null;

      const winnerName =
        winnerPlayer1?.player1?.firstName && winnerPlayer1?.player1?.lastName
          ? `${winnerPlayer1.player1.firstName} ${winnerPlayer1.player1.lastName}${
              winnerPlayer1.player2 ? ` / ${winnerPlayer1.player2.firstName || ''} ${winnerPlayer1.player2.lastName || ''}` : ''
            }`
          : 'Ganador no definido';
      const runnerUpName =
        runnerUpPlayer1?.player1?.firstName && runnerUpPlayer1?.player1?.lastName
          ? `${runnerUpPlayer1.player1.firstName} ${runnerUpPlayer1.player1.lastName}${
              runnerUpPlayer1.player2 ? ` / ${runnerUpPlayer1.player2.firstName || ''} ${runnerUpPlayer1.player2.lastName || ''}` : ''
            }`
          : '';

      addNotification(
        `Torneo finalizado con éxito. Ganadores: ${winnerName}${runnerUpName ? `, Segundo puesto: ${runnerUpName}` : ''}`,
        'success'
      );
      onFinishTournament(tournament);
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Error desconocido';
      const statusCode = error.response?.status || 'desconocido';
      addNotification(`Error al finalizar el torneo (código ${statusCode}): ${errorMessage}. El servidor podría estar inactivo.`, 'error');
      console.error('Error finishing tournament:', error);
      if (retries > 0 && error.code === 'ERR_NETWORK') {
        console.log(`Retrying finish tournament (${retries} retries left)...`);
        setTimeout(() => handleFinishTournament(retries - 1), 5000);
      }
    }
  };

  const getPlayerName = useCallback(
    (playerId, player2Id = null) => {
      if (!tournament || !tournament.participants) {
        return 'Cargando...';
      }
      const normalizeId = id => {
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
    },
    [tournament]
  );

  const getRoundName = useCallback(
    numTeams => {
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
    },
    [tournament?.rounds]
  );

  useEffect(() => {
    fetchTournament();
  }, [tournamentId]);

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
    getRoundName,
  };
};

export default useTournament;