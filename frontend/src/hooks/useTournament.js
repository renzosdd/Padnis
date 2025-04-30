// src/frontend/src/hooks/useTournament.js
import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../api';

export default function useTournament(tournamentId) {
  const [tournament, setTournament] = useState(null);
  const [matchResults, setMatchResults] = useState({});
  const [matchErrors, setMatchErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTournament = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: t } = await api.get(`/tournaments/${tournamentId}`);
      // Normalize groups and rounds
      t.groups = Array.isArray(t.groups) ? t.groups : [];
      t.groups.forEach(g => {
        g.matches = Array.isArray(g.matches) ? g.matches : [];
      });
      t.rounds = Array.isArray(t.rounds) ? t.rounds : [];
      t.rounds.forEach(r => {
        r.matches = Array.isArray(r.matches) ? r.matches : [];
      });
      setTournament(t);

      // Initialize matchResults
      const init = {};
      [...t.groups, ...t.rounds].forEach(section =>
        section.matches.forEach(m => {
          init[m._id] = {
            ...m.result,
            saved: Array.isArray(m.result.sets) && m.result.sets.length > 0
          };
        })
      );
      setMatchResults(init);
      setMatchErrors({});
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    if (tournamentId) {
      fetchTournament();
    }
  }, [tournamentId, fetchTournament]);

  const onResultChange = useCallback((matchId, field, value) => {
    setMatchResults(prev => {
      const mr = { ...prev[matchId] };
      mr.sets = Array.isArray(mr.sets) ? mr.sets : [];
      // inline edit logic (sets, tiebreaks) here...
      mr.saved = false;
      return { ...prev, [matchId]: mr };
    });
  }, []);

  const onSaveResult = useCallback(async (matchId, result) => {
    try {
      const isKO = tournament?.rounds?.some(r =>
        r.matches.some(m => m._id === matchId)
      );
      await api.put(
        `/tournaments/${tournamentId}/matches/${matchId}/result`,
        {
          sets: result.sets,
          winner: result.winner,
          runnerUp: result.runnerUp,
          isKnockout: isKO,
          matchTiebreak1: result.matchTiebreak.player1,
          matchTiebreak2: result.matchTiebreak.player2
        }
      );
      setMatchResults(prev => ({
        ...prev,
        [matchId]: { ...result, saved: true }
      }));
      return null;
    } catch (err) {
      const errs = (err.response?.data?.errors || []).reduce((acc, e) => {
        acc[e.param] = e.msg;
        return acc;
      }, {});
      setMatchErrors(prev => ({ ...prev, [matchId]: errs }));
      return errs;
    }
  }, [tournament, tournamentId]);

  const generateKnockoutPhase = useCallback(async () => {
    await api.put(`/tournaments/${tournamentId}`, { draft: false, status: 'En curso' });
    await fetchTournament();
  }, [tournamentId, fetchTournament]);

  const advanceEliminationRound = useCallback(async () => {
    await fetchTournament();
  }, [fetchTournament]);

  return {
    tournament,
    matchResults,
    matchErrors,
    loading,
    error,
    fetchTournament,
    onResultChange,
    onSaveResult,
    generateKnockoutPhase,
    advanceEliminationRound,
    standings: useMemo(() => tournament?.standings || [], [tournament])
  };
}
