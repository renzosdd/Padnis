// Normalizes MongoDB ObjectId by converting to string and removing quotes
export const normalizeId = (id) => {
  if (!id) return null;
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
    return 'Desconocido';
  }

  const participant = tournament.participants.find(
    (p) => normalizeId(p.player1?._id || p.player1) === normalizeId(player1Id)
  );

  if (!participant) {
    return 'Desconocido';
  }

  const player1Name = participant.player1?.name || 'Desconocido';
  if (tournament.format?.mode === 'Dobles' && participant.player2) {
    const player2Name = participant.player2?.name || 'Desconocido';
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