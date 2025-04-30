// normalizeId: admite tanto string/ObjectId como objeto { _id, ... }
export function normalizeId(mix) {
  if (!mix) return null;
  return typeof mix === 'object'
    ? mix._id?.toString() || null
    : mix.toString();
}

/**
 * Dado un torneo y un playerId, devuelve el nombre completo.
 * Maneja individuales y dobles.
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
