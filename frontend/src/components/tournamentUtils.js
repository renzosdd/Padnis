// src/frontend/src/tournamentUtils.js
export const normalizeId = (id) => {
  if (!id || typeof id === 'object') return null;
  return id.toString().replace(/"/g, '');
};

export const isValidObjectId = (id) =>
  typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);

export const getPlayerName = (tournament, id) => {
  if (!tournament || !tournament.participants) return id;
  const pid = normalizeId(id);
  for (const p of tournament.participants) {
    if (normalizeId(p.player1?._id || p.player1) === pid) {
      return `${p.player1.firstName} ${p.player1.lastName}`;
    }
    if (
      tournament.format.mode === 'Dobles' &&
      normalizeId(p.player2?._id || p.player2) === pid
    ) {
      return `${p.player2.firstName} ${p.player2.lastName}`;
    }
  }
  return pid;
};

export const getRoundName = (roundIndex, totalRounds) => {
  const teamsCount = 2 ** (totalRounds - roundIndex);
  const names = {
    2: 'Final',
    4: 'Semifinales',
    8: 'Cuartos de Final',
    16: 'Octavos de Final',
    32: 'Dieciseisavos de Final',
    64: 'Treintadosavos de Final'
  };
  return names[teamsCount] || `Ronda de ${teamsCount}`;
};
