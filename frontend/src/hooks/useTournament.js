import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../api'; // tu instancia axios configurada

export default function useTournament(tournamentId) {
  const [tournament, setTournament] = useState(null);
  const [matchResults, setMatchResults] = useState({});
  const [matchErrors, setMatchErrors] = useState({});

  // 1) Fetch y normalización
  const fetchTournament = useCallback(async () => {
    const { data: t } = await api.get(`/tournaments/${tournamentId}`);

    // Aseguramos arrays y resultados por partido
    t.groups = Array.isArray(t.groups) ? t.groups : [];
    t.groups.forEach(g => {
      g.matches = Array.isArray(g.matches) ? g.matches : [];
      g.matches.forEach(m => {
        m.result = m.result || { sets: [], matchTiebreak: { player1: '', player2: '' } };
      });
    });

    t.rounds = Array.isArray(t.rounds) ? t.rounds : [];
    t.rounds.forEach(r => {
      r.matches = Array.isArray(r.matches) ? r.matches : [];
      r.matches.forEach(m => {
        m.result = m.result || { sets: [], matchTiebreak: { player1: '', player2: '' } };
      });
    });

    setTournament(t);

    // Inicializar matchResults con flag "saved"
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

  // 2) Edición inline de resultados
  const onResultChange = useCallback((matchId, field, value) => {
    setMatchResults(prev => {
      const mr = { ...prev[matchId] };
      const ensureSet = (idx) => {
        mr.sets = Array.isArray(mr.sets) ? mr.sets : [];
        while (mr.sets.length <= idx) {
          mr.sets.push({ player1: '', player2: '', tiebreak1: '', tiebreak2: '' });
        }
      };
      if (field.startsWith('set')) {
        const [, si, pi] = field.match(/^set(\d+)-(\d)$/);
        ensureSet(+si);
        mr.sets[+si][`player${+pi+1}`] = value;
      } else if (field.startsWith('tiebreak')) {
        const [, si, pi] = field.match(/^tiebreak(\d+)-(\d)$/);
        ensureSet(+si);
        mr.sets[+si][`tiebreak${+pi+1}`] = value;
      } else if (field.startsWith('matchTiebreak')) {
        const [, pi] = field.match(/^matchTiebreak-(\d)$/);
        mr.matchTiebreak = mr.matchTiebreak || { player1: '', player2: '' };
        mr.matchTiebreak[`player${+pi+1}`] = value;
      }
      mr.saved = false;
      return { ...prev, [matchId]: mr };
    });
  }, []);

  // 3) Guardar resultado en el backend
  const onSaveResult = useCallback(async (matchId, result) => {
    try {
      const roundsArr = Array.isArray(tournament?.rounds) ? tournament.rounds : [];
      const isKO = roundsArr.some(r => r.matches.some(m => m._id === matchId));

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
      const errors = err.response?.data?.errors || [];
      const obj = errors.reduce((acc, e) => {
        acc[e.param] = e.msg;
        return acc;
      }, {});
      setMatchErrors(prev => ({ ...prev, [matchId]: obj }));
      return obj;
    }
  }, [tournament, tournamentId]);

  // 4) Generar fase eliminatoria
  const generateKnockoutPhase = useCallback(async () => {
    await api.put(`/tournaments/${tournamentId}`, { draft: false, status: 'En curso' });
    await fetchTournament();
  }, [tournamentId, fetchTournament]);

  // 5) Avanzar ronda KO
  const advanceEliminationRound = useCallback(async () => {
    await fetchTournament();
  }, [fetchTournament]);

  // 6) Standings
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
    standings
  };
}
