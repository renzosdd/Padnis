// normalizeId: acepta string/ObjectId o { _id, … } y devuelve string o null
export function normalizeId(mix) {
  if (!mix) return null;
  return typeof mix === 'object'
    ? mix._id?.toString() || null
    : mix.toString();
}

/**
 * Dado un torneo y un playerId (string), devuelve:
 *  - "Nombre Apellido" para individuales
 *  - "NombreA ApellidoA / NombreB ApellidoB" para dobles
 */
export function getPlayerName(tournament, playerId) {
  if (!playerId || !Array.isArray(tournament?.participants)) return '';

  const part = tournament.participants.find((p) => {
    const a = normalizeId(p.player1);
    const b = normalizeId(p.player2);
    return a === playerId || b === playerId;
  });
  if (!part) return '';

  // Individual
  if (!part.player2) {
    const p = part.player1;
    return typeof p === 'object'
      ? `${p.firstName || ''} ${p.lastName || ''}`.trim()
      : '';
  }

  // Dobles
  const A = part.player1, B = part.player2;
  const nameA = typeof A === 'object' ? `${A.firstName} ${A.lastName}`.trim() : '';
  const nameB = typeof B === 'object' ? `${B.firstName} ${B.lastName}`.trim() : '';
  return `${nameA} / ${nameB}`;
}

/**
 * Convierte un número de ronda (1,2,3,…) en un nombre legible
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
