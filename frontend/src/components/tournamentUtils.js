/**
 * Utility functions for tournament-related logic in Padnis.
 */

/**
 * Normalizes an ID from various formats (object, string, MongoDB ObjectID) to a string.
 * @param {Object|string} id - The ID to normalize.
 * @returns {string} The normalized ID string.
 */
export const normalizeId = (id) => {
  if (typeof id === 'object' && id?.$oid) return id.$oid;
  if (typeof id === 'object' && id?._id) return id._id.toString();
  return id?.toString() || '';
};

/**
 * Validates if a string is a valid MongoDB ObjectID.
 * @param {string} id - The ID to validate.
 * @returns {boolean} True if the ID is a valid ObjectID, false otherwise.
 */
export const isValidObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(id);

/**
 * Generates a display name for a player or pair based on tournament format.
 * @param {Object} tournament - The tournament object.
 * @param {Object|string} player1 - The first player (object or ID).
 * @param {Object|string} [player2] - The second player for doubles (optional).
 * @returns {string} The formatted player name(s).
 */
export const getPlayerName = (tournament, player1, player2) => {
  // Validate inputs
  if (!tournament || !player1) return 'Jugador no encontrado';

  // Handle player1 as object or ID
  const player1Name = typeof player1 === 'object' && player1?.firstName
    ? `${player1.firstName} ${player1.lastName || ''}`.trim()
    : 'Jugador no encontrado';

  // Handle doubles format
  if (tournament.format?.mode === 'Dobles' && player2) {
    const player2Name = typeof player2 === 'object' && player2?.firstName
      ? `${player2.firstName} ${player2.lastName || ''}`.trim()
      : 'Jugador no encontrado';
    return `${player1Name} / ${player2Name}`;
  }

  return player1Name;
};

/**
 * Determines the name of a tournament round based on the number of teams and total rounds.
 * @param {number} numTeams - Number of teams in the round.
 * @param {number} totalRounds - Total number of rounds in the tournament.
 * @returns {string} The round name (e.g., 'Final', 'Semifinal').
 */
export const getRoundName = (numTeams, totalRounds) => {
  if (!numTeams || !totalRounds) return 'Ronda desconocida';
  if (numTeams <= 2) return 'Final';
  if (numTeams <= 4) return 'Semifinal';
  if (numTeams <= 8) return 'Cuartos de Final';
  if (numTeams <= 16) return 'Octavos de Final';
  return `Ronda ${totalRounds}`;
};

/**
 * Determines the winner of a match based on set scores and optional match tiebreak.
 * @param {Array} sets - Array of set scores [{player1, player2, tiebreak1, tiebreak2}].
 * @param {Object} player1Pair - First player/pair {player1, player2}.
 * @param {Object} player2Pair - Second player/pair {player1, player2}.
 * @param {number} totalSets - Total sets in the match (e.g., 1 or 2).
 * @param {Object} [matchTiebreak] - Match tiebreak scores {player1, player2}.
 * @returns {Object|null} The winning pair or null if no winner.
 */
export const determineWinner = (sets, player1Pair, player2Pair, totalSets, matchTiebreak) => {
  if (!sets || !Array.isArray(sets) || sets.length === 0 || !player1Pair || !player2Pair) {
    return null;
  }

  let setsWonByPlayer1 = 0;
  let setsWonByPlayer2 = 0;

  sets.forEach((set) => {
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

  // Handle two-set matches
  if (totalSets === 2 && sets.length === 2) {
    // If sets are tied at 1-1, check match tiebreak
    if (setsWonByPlayer1 === 1 && setsWonByPlayer2 === 1 && matchTiebreak) {
      if (matchTiebreak.player1 > matchTiebreak.player2) {
        return player1Pair;
      } else if (matchTiebreak.player2 > matchTiebreak.player1) {
        return player2Pair;
      }
      return null;
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