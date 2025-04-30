import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../api';

export default function useTournament(tournamentId) {
  const [tournament, setTournament] = useState(null);
  const [matchResults, setMatchResults] = useState({});
  const [matchErrors, setMatchErrors] = useState({});

  const fetchTournament = useCallback(async () => {
    const { data: t } = await api.get(`/tournaments/${tournamentId}`);
    // normaliza grupos y rondas...
    setTournament(t);
    // inicializa matchResults...
  }, [tournamentId]);

  useEffect(() => {
    if (tournamentId) fetchTournament();
  }, [tournamentId, fetchTournament]);

  const onResultChange = useCallback((matchId, field, value) => {
    setMatchResults(prev => {
      const mr = { ...prev[matchId] };
      // lógica de edición inline (sets/tiebreak)...
      mr.saved = false;
      return { ...prev, [matchId]: mr };
    });
  }, []);

  const onSaveResult = useCallback(async (matchId, result) => {
    try {
      // detecta KO o fase de grupos...
      await api.put(
        `/tournaments/${tournamentId}/matches/${matchId}/result`,
        {
          sets: result.sets,
          winner: result.winner,
          runnerUp: result.runnerUp,
          isKnockout,
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

  return {
    tournament,
    matchResults,
    matchErrors,
    fetchTournament,
    onResultChange,
    onSaveResult,
    generateKnockoutPhase,
    standings: useMemo(() => tournament?.standings || [], [tournament])
  };
}
