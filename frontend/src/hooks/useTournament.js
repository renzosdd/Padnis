// src/frontend/src/hooks/useTournament.js

import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../api';

export default function useTournament(tournamentId) {
  const [tournament, setTournament] = useState(null);
  const [matchResults, setMatchResults] = useState({});
  const [matchErrors, setMatchErrors] = useState({});

  // 1) Fetch + normalizar
  const fetchTournament = useCallback(async () => {
    const { data: t } = await api.get(`/tournaments/${tournamentId}`);
    // asegurar arrays y resultados
    t.groups = Array.isArray(t.groups) ? t.groups : [];
    t.groups.forEach((g) =>
      g.matches = Array.isArray(g.matches) ? g.matches.map(m => ({
        ...m,
        result: m.result || { sets: [], matchTiebreak: { player1:'', player2:'' } }
      })) : []
    );
    t.rounds = Array.isArray(t.rounds) ? t.rounds : [];
    t.rounds.forEach((r) =>
      r.matches = Array.isArray(r.matches) ? r.matches.map(m => ({
        ...m,
        result: m.result || { sets: [], matchTiebreak: { player1:'', player2:'' } }
      })) : []
    );

    setTournament(t);

    // init matchResults
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
    return t;
  }, [tournamentId]);

  useEffect(() => {
    if (tournamentId) fetchTournament();
  }, [tournamentId, fetchTournament]);

  // 2) inline edit
  const onResultChange = useCallback((matchId, field, value) => {
    setMatchResults(prev => {
      const mr = { ...prev[matchId] };
      const setMatchT = (idx, key, val) => {
        mr.sets = Array.isArray(mr.sets) ? mr.sets : [];
        while (mr.sets.length <= idx) {
          mr.sets.push({ player1:'', player2:'', tiebreak1:'', tiebreak2:'' });
        }
        mr.sets[idx] = { ...mr.sets[idx], [key]: val };
      };
      if (field.startsWith('set')) {
        const [, si, pi] = field.match(/^set(\d+)-(\d)$/);
        setMatchT(+si, `player${+pi+1}`, value);
      } else if (field.startsWith('tiebreak')) {
        const [, si, pi] = field.match(/^tiebreak(\d+)-(\d)$/);
        setMatchT(+si, `tiebreak${+pi+1}`, value);
      } else if (field.startsWith('matchTiebreak')) {
        const [, pi] = field.match(/^matchTiebreak-(\d)$/);
        mr.matchTiebreak = mr.matchTiebreak || { player1:'', player2:'' };
        mr.matchTiebreak[`player${+pi+1}`] = value;
      }
      mr.saved = false;
      return { ...prev, [matchId]: mr };
    });
  }, []);

  // 3) guardar
  const onSaveResult = useCallback(async (matchId, result) => {
    try {
      // protejo rounds cuando aún no cargó
      const roundsArr = Array.isArray(tournament?.rounds) ? tournament.rounds : [];
      const isKO = roundsArr.some(r => r.matches.some(m => m._id === matchId));

      await api.put(`/tournaments/${tournamentId}/matches/${matchId}/result`, {
        sets: result.sets,
        winner: result.winner,
        runnerUp: result.runnerUp,
        isKnockout: isKO,
        matchTiebreak1: result.matchTiebreak.player1,
        matchTiebreak2: result.matchTiebreak.player2,
      });
      setMatchResults(prev => ({
        ...prev,
        [matchId]: { ...result, saved: true }
      }));
      return null;
    } catch (err) {
      const errs = err.response?.data?.errors || [];
      const obj = errs.reduce((a,e) => ({...a, [e.param]: e.msg}), {});
      setMatchErrors(prev => ({ ...prev, [matchId]: obj }));
      return obj;
    }
  }, [tournament, tournamentId]);

  // 4) generar KO
  const generateKnockoutPhase = useCallback(async () => {
    await api.put(`/tournaments/${tournamentId}`, { draft:false, status:'En curso' });
    await fetchTournament();
  }, [tournamentId, fetchTournament]);

  // 5) avanzar ronda
  const advanceEliminationRound = useCallback(async () => {
    await fetchTournament();
  }, [fetchTournament]);

  const standings = useMemo(() => tournament?.standings || [], [tournament]);

  return {
    tournament,
    matchResults,
    matchErrors,
    fetchTournament,
    onResultChange,
    onSaveResult,
    generateKnockoutPhase,
    advanceEliminationRound,
    standings,
  };
}
