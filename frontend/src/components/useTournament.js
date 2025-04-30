import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../api'; // tu instancia axios con baseURL y token

/**
 * Hook para manejar:
 * - fetch del torneo
 * - generación de eliminatorias
 * - avance de rondas
 * - estado local de resultados de partidos (edición inline)
 * - errores de validación de cada partido
 */
export default function useTournament(tournamentId) {
  const [tournament, setTournament] = useState(null);
  const [matchResults, setMatchResults] = useState({});   // { [matchId]: { sets:[], matchTiebreak:{}, saved:bool } }
  const [matchErrors, setMatchErrors] = useState({});     // { [matchId]: { field: message } }

  // 1) Fetch y normalización inicial
  const fetchTournament = useCallback(async () => {
    const resp = await api.get(`/tournaments/${tournamentId}`);
    const t = resp.data;

    // Asegurar arrays
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

    // Inicializar matchResults: traemos cada resultado existente
    const init = {};
    [...t.groups, ...t.rounds].forEach(section => {
      section.matches.forEach(m => {
        init[m._id] = {
          ...m.result,
          saved: Array.isArray(m.result.sets) && m.result.sets.length > 0
        };
      });
    });
    setMatchResults(init);
    setMatchErrors({});
    return t;
  }, [tournamentId]);

  // Al montar / cuando cambie el ID
  useEffect(() => {
    if (tournamentId) fetchTournament();
  }, [tournamentId, fetchTournament]);

  // 2) Cambios inline de un partido
  const onResultChange = useCallback((matchId, field, value) => {
    setMatchResults(prev => {
      const mr = { ...prev[matchId] };
      // field: "set{i}-0"|"set{i}-1"|"tiebreak{i}-0"|"..."|"matchTiebreak-0"|"matchTiebreak-1"
      const setMatchT = (idx, key, val) => {
        mr.sets = Array.isArray(mr.sets) ? mr.sets : [];
        while (mr.sets.length <= idx) {
          mr.sets.push({ player1: '', player2: '', tiebreak1: '', tiebreak2: '' });
        }
        mr.sets[idx] = { ...mr.sets[idx], [key]: val };
      };

      if (field.startsWith('set')) {
        const [, si, pi] = field.match(/^set(\d+)-(\d)$/);
        setMatchT(+si, `player${+pi + 1}`, value);
      } else if (field.startsWith('tiebreak')) {
        const [, si, pi] = field.match(/^tiebreak(\d+)-(\d)$/);
        setMatchT(+si, `tiebreak${+pi + 1}`, value);
      } else if (field.startsWith('matchTiebreak')) {
        const [, pi] = field.match(/^matchTiebreak-(\d)$/);
        mr.matchTiebreak = mr.matchTiebreak || { player1: '', player2: '' };
        mr.matchTiebreak[`player${+pi + 1}`] = value;
      }

      // Al editar, marcamos como no guardado
      mr.saved = false;
      return { ...prev, [matchId]: mr };
    });
  }, []);

  // 3) Guardar en backend
  const onSaveResult = useCallback(async (matchId, result) => {
    try {
      // ¿Es fase eliminatoria?
      const isKO = tournament.rounds.some(r => r.matches.some(m => m._id === matchId));
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
      // marcar como guardado
      setMatchResults(prev => ({
        ...prev,
        [matchId]: { ...result, saved: true }
      }));
      return null;
    } catch (err) {
      // si vinieron errores de validación
      const errs = err.response?.data?.errors || [];
      const obj = errs.reduce((acc, e) => {
        acc[e.param] = e.msg;
        return acc;
      }, {});
      setMatchErrors(prev => ({ ...prev, [matchId]: obj }));
      return obj;
    }
  }, [tournamentId, tournament.rounds]);

  // 4) Generar eliminatorias (botón único)
  const generateKnockoutPhase = useCallback(async () => {
    // Si prefieres que el backend genere, haz un endpoint específico.
    // Aquí overrideamos todo el objeto "rounds" usando la lógica de tu front.
    // Por simplicidad recargamos el torneo:
    await api.put(`/tournaments/${tournamentId}`, { 
      // rounds: generate frontend, o backend lo hace
      draft: false,
      status: 'En curso',
    });
    await fetchTournament();
  }, [tournamentId, fetchTournament]);

  // 5) Avanzar rondas de eliminación
  const advanceEliminationRound = useCallback(async () => {
    // Si backend lo soporta vía endpoint, úsalo.
    // Si no, recargamos:
    await fetchTournament();
  }, [fetchTournament]);

  // 6) standings (por si lo usas en TournamentStandings)
  const standings = useMemo(() => {
    return tournament?.standings || [];
  }, [tournament]);

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
