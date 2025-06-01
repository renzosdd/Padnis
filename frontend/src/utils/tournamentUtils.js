//const mongoose = require('mongoose');

/**
 * Valida un resultado de partido: sets y tiebreaks.
 * Devuelve un objeto cuya clave es el nombre del parámetro (por ejemplo, "set0.player1")
 * y el valor es el mensaje de error. Si no hay errores, devuelve un objeto vacío.
 */
function validateMatchResult({ sets, matchTiebreak1, matchTiebreak2 }) {
  const errors = {};

  if (!Array.isArray(sets) || sets.length === 0) {
    errors.sets = 'El arreglo de sets es obligatorio y no puede estar vacío';
    return errors;
  }

  sets.forEach((set, idx) => {
    if (typeof set.player1 !== 'number' || typeof set.player2 !== 'number') {
      errors[`set${idx}`] = `El set ${idx + 1} debe tener puntajes numéricos para ambos jugadores`;
    } else {
      if (set.player1 < 0 || set.player2 < 0) {
        errors[`set${idx}`] = `El set ${idx + 1} no puede tener puntajes negativos`;
      }
      if (set.player1 > 7 || set.player2 > 7) {
        errors[`set${idx}`] = `El set ${idx + 1} no puede exceder 7 juegos`;
      }
      if (set.player1 === 6 && set.player2 === 6) {
        if (typeof set.tiebreak1 !== 'number' || typeof set.tiebreak2 !== 'number') {
          errors[`set${idx}.tiebreak`] = `Debe ingresar puntajes de tiebreak para el set ${idx + 1}`;
        } else if (Math.abs(set.tiebreak1 - set.tiebreak2) < 2) {
          errors[`set${idx}.tiebreak`] = `El tiebreak del set ${idx + 1} debe tener diferencia de al menos 2 puntos`;
        }
      }
    }
  });

  if (
    matchTiebreak1 != null &&
    matchTiebreak2 != null &&
    (Math.abs(matchTiebreak1 - matchTiebreak2) < 2 || matchTiebreak1 === matchTiebreak2)
  ) {
    errors.matchTiebreak = 'El tiebreak del partido debe tener diferencia de al menos 2 puntos y no puede ser empate';
  }

  return errors;
}
/**
 * Genera la fase eliminatoria completa (solo la primera ronda) a partir de un torneo RoundRobin.
 * - tournament.groups: lista de grupos con standings ya calculados.
 * - tournament.playersPerGroupToAdvance: cantidad de jugadores por grupo que avanzan.
 *
 * Devuelve un arreglo de rounds (solo round 1). Cada match incluye { player1: {...}, player2: {...}, result: {...} }.
 */
async function generateKnockoutRounds(tournament) {
  const standingsByGroup = tournament.standings || [];
  const pG = tournament.playersPerGroupToAdvance || 1;
  let avanzan = [];

  tournament.groups.forEach((gr) => {
    const tabla = standingsByGroup.find((g) => g._id?.toString() === gr._id?.toString())?.standings || [];
    for (let i = 0; i < Math.min(pG, tabla.length); i++) {
      const row = tabla[i];
      avanzan.push({
        player1: row.player1,
        player2: row.player2 || null,
      });
    }
  });

  const N = avanzan.length;
  const totalSlots = Math.pow(2, Math.ceil(Math.log2(N)));
  const byes = totalSlots - N;
  for (let i = 0; i < byes; i++) {
    avanzan.push({ player1: null, player2: null, name: 'BYE' });
  }

  const matchesRound1 = [];
  for (let i = 0; i < totalSlots / 2; i++) {
    const p1 = avanzan[i];
    const p2 = avanzan[totalSlots - 1 - i];
    matchesRound1.push({
      player1: p1,
      player2: p2,
      result: {
        sets: [],
        matchTiebreak1: null,
        matchTiebreak2: null,
        winner: { player1: null, player2: null },
        runnerUp: { player1: null, player2: null },
      },
    });
  }

  return [
    {
      round: 1,
      matches: matchesRound1,
    },
  ];
}

/**
 * Tras guardar un resultado de eliminatoria, revisa si todos los partidos de la ronda actual
 * están concluidos. Si lo están, genera la siguiente ronda (round + 1) emparejando ganadores.
 * Devuelve el arreglo completo de rounds actualizado, o null si no hay que avanzar.
 */
async function advanceEliminationRound(tournament, currentRoundIndex) {
  const rounds = tournament.rounds || [];
  if (!rounds[currentRoundIndex]) return null;

  const allFinished = rounds[currentRoundIndex].matches.every((m) => {
    return m.result && m.result.winner && (m.result.winner.player1 || m.result.winner.player2);
  });
  if (!allFinished) return null;

  const winners = rounds[currentRoundIndex].matches.map((m) => {
    const w = m.result.winner;
    return w.player1
      ? { player1: w.player1, player2: w.player2 || null }
      : { player1: w.player2, player2: w.player1 || null };
  });

  if (winners.length <= 1) {
    if (winners.length === 1) {
      tournament.winner = winners[0];
    }
    return rounds;
  }

  const nextMatches = [];
  for (let i = 0; i < winners.length / 2; i++) {
    const p1 = winners[i];
    const p2 = winners[winners.length - 1 - i];
    nextMatches.push({
      player1: p1,
      player2: p2,
      result: {
        sets: [],
        matchTiebreak1: null,
        matchTiebreak2: null,
        winner: { player1: null, player2: null },
        runnerUp: { player1: null, player2: null },
      },
    });
  }

  const newRound = {
    round: rounds.length + 1,
    matches: nextMatches,
  };

  return [...rounds, newRound];
}

module.exports = {
  validateMatchResult,
  generateKnockoutRounds,
  advanceEliminationRound,
};
