// src/frontend/src/useTournament.js
import { useState, useCallback } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://padnis.onrender.com';

export const computeStandings = (tournament) => {
  const groups = (tournament.groups || []).map((group) => {
    const table = {};
    group.matches.forEach((m) => {
      const r = m.result;
      if (!r || !r.winner) return;
      const winId = r.winner.player1;
      const loseId = r.runnerUp?.player1;
      [winId, loseId].forEach((pid) => {
        if (!pid) return;
        if (!table[pid]) {
          table[pid] = {
            player1: pid,
            wins: 0,
            losses: 0,
            matchesPlayed: 0,
            points: 0
          };
        }
      });
      if (table[winId]) {
        table[winId].wins += 1;
        table[winId].matchesPlayed += 1;
        table[winId].points += 3;
      }
      if (loseId && table[loseId]) {
        table[loseId].losses += 1;
        table[loseId].matchesPlayed += 1;
      }
    });
    const standings = Object.values(table).sort((a, b) => b.points - a.points);
    return { name: group.name, standings };
  });
  return { groups: groups };
};

const useTournament = (tournamentId) => {
  const [standings, setStandings] = useState({ groups: [] });

  const fetchTournament = useCallback(
    async (updateMatch = false, matchId, result) => {
      const token = localStorage.getItem('token');
      if (updateMatch && matchId && result) {
        await axios.put(
          `${API_URL}/api/tournaments/${tournamentId}/matches/${matchId}/result`,
          result,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      const res = await axios.get(
        `${API_URL}/api/tournaments/${tournamentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = res.data;
      if (data.groups) {
        setStandings(computeStandings(data));
      }
      return data;
    },
    [tournamentId]
  );

  const generateKnockoutPhase = useCallback(async () => {
    // If backend supports, call its endpoint here.
    // Otherwise, re-fetch and assume server handled it.
    await fetchTournament();
  }, [fetchTournament]);

  const advanceEliminationRound = useCallback(async () => {
    // If backend supports advance-round, call it here.
    await fetchTournament();
  }, [fetchTournament]);

  return {
    standings,
    fetchTournament,
    generateKnockoutPhase,
    advanceEliminationRound
  };
};

export default useTournament;
