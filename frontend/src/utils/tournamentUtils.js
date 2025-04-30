// normalizeId: acepta string/ObjectId o { _id, ... } y devuelve string o null
export function normalizeId(mix) {
  if (!mix) return null;
  return typeof mix === 'object'
    ? mix._id?.toString() || null
    : mix.toString();
}

/**
 * Dado un torneo y un playerId (string), devuelve:
 * - "First Last" para individuales
 * - "FirstA LastA / FirstB LastB" para dobles
 */
export function getPlayerName(tournament, playerId) {
  if (!playerId || !Array.isArray(tournament?.participants)) return '';

  // Buscamos el participante que contiene ese ID
  const pt = tournament.participants.find((p) => {
    const id1 = normalizeId(p.player1);
    const id2 = normalizeId(p.player2);
    return id1 === playerId || id2 === playerId;
  });
  if (!pt) return '';

  // Si es individual
  if (!pt.player2) {
    const p = pt.player1;
    if (typeof p === 'object') {
      return `${p.firstName || ''} ${p.lastName || ''}`.trim();
    }
    return '';
  }

  // Si es dobles: asumimos que player1 y player2 son objetos { firstName, lastName }
  const pA = pt.player1;
  const pB = pt.player2;
  const nameA = typeof pA === 'object' ? `${pA.firstName} ${pA.lastName}`.trim() : '';
  const nameB = typeof pB === 'object' ? `${pB.firstName} ${pB.lastName}`.trim() : '';
  return `${nameA} / ${nameB}`;
}

/**
 * Convierte un número de ronda (1,2,3,...) en un nombre legible.
 */
export function getRoundName(round) {
  switch (round) {
    case 1: return 'Final';
    case 2: return 'Semifinal';
    case 3: return 'Cuartos';
    case 4: return 'Octavos';
    default: return `Ronda ${round}`;
  }
}
