// Normalizes MongoDB ObjectId by converting to string and removing quotes
export const normalizeId = (id) => {
  if (!id) {
    console.warn('normalizeId received null or undefined ID');
    return null;
  }
  if (typeof id === 'object') {
    console.warn('normalizeId received an object instead of a string:', id);
    return null;
  }
  return id.toString().replace(/"/g, '');
};

// Validates if a string is a valid MongoDB ObjectId (24-character hexadecimal)
export const isValidObjectId = (id) => {
  if (!id) return false;
  const idStr = id.toString();
  return /^[0-9a-fA-F]{24}$/.test(idStr);
};

// Gets player name from tournament participants
export const getPlayerName = (tournament, player1Id, player2Id = null) => {
  if (!tournament || !tournament.participants || !player1Id) {
    console.warn('Invalid arguments for getPlayerName:', {
      tournamentExists: !!tournament,
      participantsExists: !!tournament?.participants,
      player1Id,
      player2Id,
    });
    return 'Jugador no disponible';
  }

  const normalizedPlayer1Id = normalizeId(player1Id);
  if (!normalizedPlayer1Id) {
    console.warn('Failed to normalize player1Id:', player1Id);
    return 'Jugador no disponible';
  }

  const participant = tournament.participants.find((p) => {
    const participantPlayer1Id = normalizeId(p.player1?._id || p.player1);
    const participantPlayer2Id = p.player2 ? normalizeId(p.player2?._id || p.player2) : null;
    return participantPlayer1Id === normalizedPlayer1Id || participantPlayer2Id === normalizedPlayer1Id;
  });

  if (!participant) {
    console.warn('Participant not found for player1Id:', normalizedPlayer1Id, 'Participants:', tournament.participants);
    return 'Jugador no disponible';
  }

  const player1Name = participant.player1?.name || 
    `${participant.player1?.firstName || ''} ${participant.player1?.lastName || ''}`.trim() || 
    'Jugador no disponible';
  
  if (tournament.format?.mode === 'Dobles' && participant.player2) {
    const player2Name = participant.player2?.name || 
      `${participant.player2?.firstName || ''} ${participant.player2?.lastName || ''}`.trim() || 
      'Jugador no disponible';
    return `${player1Name} / ${player2Name}`;
  }

  return player1Name;
};

// Determines the winner based on match scores
export const determineWinner = (sets, player1Pair, player2Pair, totalSets, matchTiebreak = null) => {
  let setsWonByPlayer1 = 0;
  let setsWonByPlayer2 = 0;

  sets.forEach((set) => {
    const p1Score = parseInt(set.player1, 10);
    const p2Score = parseInt(set.player2, 10);
    const tb1 = parseInt(set.tiebreak1, 10);
    const tb2 = parseInt(set.tiebreak2, 10);
    if (p1Score > p2Score || (p1Score === p2Score && tb1 > tb2)) {
      setsWonByPlayer1 += 1;
    } else if (p2Score > p1Score || (p1Score === p2Score && tb2 > tb1)) {
      setsWonByPlayer2 += 1;
    }
  });

  if (totalSets === 2 && setsWonByPlayer1 === 1 && setsWonByPlayer2 === 1) {
    if (matchTiebreak && parseInt(matchTiebreak.player1, 10) > parseInt(matchTiebreak.player2, 10)) {
      return player1Pair;
    } else if (matchTiebreak && parseInt(matchTiebreak.player2, 10) > parseInt(matchTiebreak.player1, 10)) {
      return player2Pair;
    }
    return null;
  }

  if (setsWonByPlayer1 > setsWonByPlayer2) {
    return player1Pair;
  } else if (setsWonByPlayer2 > setsWonByPlayer1) {
    return player2Pair;
  }

  return null;
};

// Gets round name based on number of teams and rounds
export const getRoundName = (numTeams, totalRounds) => {
  const roundNames = {
    2: 'Final',
    4: 'Semifinales',
    8: 'Cuartos de Final',
    16: 'Octavos de Final',
    32: 'Dieciseisavos de Final',
    64: 'Treintadosavos de Final',
  };

  return roundNames[numTeams] || `Ronda de ${numTeams}`;
};