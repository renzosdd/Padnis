import { useState, useCallback, useEffect } from 'react';
import api from './api'; // tu configuración de Axios
import { validateMatchResult } from './tournamentUtils';

export default function useTournament(tournamentId) {
  const [tournament, setTournament] = useState(null);
  const [matchResults, setMatchResults] = useState({});
  const [matchErrors, setMatchErrors] = useState({});

  const fetchTournament = useCallback(async () => {
    if (!tournamentId) return;
    const { data } = await api.get(`/tournaments/${tournamentId}`);
    setTournament(data);

    const init = {};
    if (data.groups) {
      data.groups.forEach((grp) => {
        grp.matches.forEach((m) => {
          init[m._id] = {
            sets: m.result?.sets || [],
            matchTiebreak: {
              player1: m.result?.matchTiebreak1 || '',
              player2: m.result?.matchTiebreak2 || '',
            },
            winner: m.result?.winner || { player1: null, player2: null },
            runnerUp: m.result?.runnerUp || { player1: null, player2: null },
            saved: Array.isArray(m.result?.sets) && m.result.sets.length > 0,
          };
        });
      });
    }
    if (data.rounds) {
      data.rounds.forEach((rnd) => {
        rnd.matches.forEach((m) => {
          init[m._id] = {
            sets: m.result?.sets || [],
            matchTiebreak: {
              player1: m.result?.matchTiebreak1 || '',
              player2: m.result?.matchTiebreak2 || '',
            },
            winner: m.result?.winner || { player1: null, player2: null },
            runnerUp: m.result?.runnerUp || { player1: null, player2: null },
            saved: Array.isArray(m.result?.sets) && m.result.sets.length > 0,
          };
        });
      });
    }

    setMatchResults(init);
    setMatchErrors({});
  }, [tournamentId]);

  useEffect(() => {
    fetchTournament();
  }, [fetchTournament]);

  const onResultChange = useCallback((matchId, field, value) => {
    setMatchResults((prev) => {
      const mr = { ...(prev[matchId] || {}) };
      if (field.startsWith('set')) {
        const [setIdxStr, key] = field.split('.');
        const idx = parseInt(setIdxStr.replace('set', ''), 10);
        mr.sets = Array.isArray(mr.sets) ? [...mr.sets] : [];
        if (!mr.sets[idx]) {
          mr.sets[idx] = { player1: '', player2: '', tiebreak1: '', tiebreak2: '' };
        }
        mr.sets[idx][key] = value;
      } else if (field.startsWith('matchTiebreak')) {
        const key = field.split('.')[1];
        mr.matchTiebreak = { ...(mr.matchTiebreak || { player1: '', player2: '' }) };
        mr.matchTiebreak[key] = value;
      } else if (field === 'winner' || field === 'runnerUp') {
        mr[field] = value;
      }
      mr.saved = false;
      return { ...prev, [matchId]: mr };
    });
    setMatchErrors((prev) => ({ ...prev, [matchId]: {} }));
  }, []);

  const onSaveResult = useCallback(
    async (matchId, result) => {
      const validationErrors = validateMatchResult({
        sets: result.sets,
        matchTiebreak1: result.matchTiebreak.player1,
        matchTiebreak2: result.matchTiebreak.player2,
      });
      if (Object.keys(validationErrors).length > 0) {
        setMatchErrors((prev) => ({
          ...prev,
          [matchId]: validationErrors,
        }));
        return validationErrors;
      }

      const isKO = tournament?.rounds?.some((r) =>
        r.matches.some((m) => m._id === matchId)
      );
      try {
        await api.put(`/tournaments/${tournamentId}/matches/${matchId}/result`, {
          sets: result.sets,
          winner: result.winner,
          runnerUp: result.runnerUp,
          isKnockout: isKO,
          matchTiebreak1: result.matchTiebreak.player1,
          matchTiebreak2: result.matchTiebreak.player2,
        });

        setMatchResults((prev) => ({
          ...prev,
          [matchId]: { ...result, saved: true },
        }));
        await fetchTournament();
        return null;
      } catch (err) {
        const backendErrors = (err.response?.data?.errors || []).reduce((acc, e) => {
          acc[e.param] = e.msg;
          return acc;
        }, {});
        setMatchErrors((prev) => ({
          ...prev,
          [matchId]: backendErrors,
        }));
        return backendErrors;
      }
    },
    [tournament, tournamentId, fetchTournament]
  );

  return {
    tournament,
    matchResults,
    matchErrors,
    onResultChange,
    onSaveResult,
    refetch: fetchTournament,
  };
}
