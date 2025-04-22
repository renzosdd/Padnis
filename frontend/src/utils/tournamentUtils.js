import axios from 'axios';

// Validate if a string is a valid MongoDB ObjectId
export const isValidObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(id);

// Fetch tournament data from the API
export const fetchTournament = async (tournamentId, setTournament, setStandings, setError, setIsLoading, addNotification, updateStandings, retries = 3) => {
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
    if (process.env.NODE_ENV === 'development') {
      console.log('Tournament data:', JSON.stringify(response.data, null, 2));
    }
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
      setTimeout(() => fetchTournament(tournamentId, setTournament, setStandings, setError, setIsLoading, addNotification, updateStandings, retries - 1), 5000);
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

// Update standings for RoundRobin tournaments
export const updateStandings = (tournamentData, setStandings, isValidObjectId) => {
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
              ? (typeof p.player2 === 'object' ? p.player2?._id?.toString() || p.player2?.$oid : p.player2?.toString())
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

  setStandings(newStandings);
};

// Determine the winner of a match based on set scores
export const determineWinner = (sets, player1Pair, player2Pair, formatSets) => {
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
  if (formatSets === 2 && sets.length === 2) {
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
};

// Get player names for display
export const getPlayerName = (tournament, playerId, player2Id = null) => {
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
};

// Get round name based on the number of teams
export const getRoundName = (numTeams, roundsLength) => {
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
      return `Ronda ${roundsLength + 1 || 1}`;
  }
};