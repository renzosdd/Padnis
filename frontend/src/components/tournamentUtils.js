// normalizeId: admite tanto string/ObjectId como objeto { _id, ... }
export function normalizeId(mix) {
  if (!mix) return null;
  return typeof mix === 'object'
    ? mix._id?.toString() || null
    : mix.toString();
}

/**
 * Dado el objeto completo del torneo y un playerId,
 * busca en participants (singles o dobles) y devuelve un string:
 * - Para individuales: "First Last"
 * - Para dobles:       "FirstA LastA / FirstB LastB"
 */
export function getPlayerName(tournament, playerId) {
  if (!playerId || !Array.isArray(tournament?.participants)) return '';
  const p = tournament.participants.find((pt) => {
    const id1 = normalizeId(pt.player1);
    const id2 = normalizeId(pt.player2);
    return id1 === playerId || id2 === playerId;
  });
  if (!p) return '';
  // Individual
  if (!p.player2) {
    const person = typeof p.player1 === 'object' ? p.player1 : p.player1Data;
    return `${person.firstName} ${person.lastName}`;
  }
  // Dobles
  const idA = normalizeId(p.player1);
  const idB = normalizeId(p.player2);
  const nameA = getPlayerName(tournament, idA);
  const nameB = getPlayerName(tournament, idB);
  return `${nameA} / ${nameB}`;
}

/**
 * Opcional: convierte un número de ronda en un nombre legible.
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
