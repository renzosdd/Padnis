// src/frontend/src/utils/tournamentUtils.js

/**
 * normaliza un valor que puede ser string/ObjectId o un objeto { _id, ... }
 * y devuelve siempre el string ID o null.
 */
export function normalizeId(mix) {
  if (!mix) return null;
  return typeof mix === 'object'
    ? mix._id?.toString() || null
    : mix.toString();
}

/**
 * Dado el objeto completo del torneo y un playerId,
 * devuelve su nombre completo. Maneja singles y dobles.
 */
export function getPlayerName(tournament, playerId) {
  if (!playerId || !Array.isArray(tournament?.participants)) return '';
  const pt = tournament.participants.find((p) => {
    const id1 = normalizeId(p.player1);
    const id2 = normalizeId(p.player2);
    return id1 === playerId || id2 === playerId;
  });
  if (!pt) return '';

  // Individual
  if (!pt.player2) {
    const person = typeof pt.player1 === 'object' ? pt.player1 : {};
    return `${person.firstName || ''} ${person.lastName || ''}`.trim();
  }

  // Dobles
  const idA = normalizeId(pt.player1);
  const idB = normalizeId(pt.player2);
  const nameA = getPlayerName(tournament, idA);
  const nameB = getPlayerName(tournament, idB);
  return `${nameA} / ${nameB}`;
}

/**
 * Convierte un número de ronda (1,2,3...) en un nombre legible.
 */
export function getRoundName(n) {
  switch (n) {
    case 1: return 'Final';
    case 2: return 'Semifinal';
    case 3: return 'Cuartos';
    case 4: return 'Octavos';
    default: return `Ronda ${n}`;
  }
}
