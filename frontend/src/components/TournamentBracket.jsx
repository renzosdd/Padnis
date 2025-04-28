import React, { useState, useEffect } from 'react';
import MatchCard from './MatchCard';

const TournamentBracket = ({ matches, tournament }) => {
  const [matchResults, setMatchResults] = useState({});

  // Establecemos un valor por defecto para totalSets si tournament.format.sets no está definido
  const totalSets = tournament?.format?.sets || 1;

  const initializeMatchResults = () => {
    // Si matches no es un arreglo, salimos temprano
    if (!Array.isArray(matches)) return;

    const results = {};
    matches.forEach((match) => {
      const sets = match.result?.sets?.length > 0
        ? match.result.sets.map(set => ({
            player1: set.player1?.toString() || '',
            player2: set.player2?.toString() || '',
            tiebreak1: set.tiebreak1?.toString() || '',
            tiebreak2: set.tiebreak2?.toString() || '',
          }))
        : Array(totalSets).fill({ player1: '', player2: '', tiebreak1: '', tiebreak2: '' });

      while (sets.length < totalSets) {
        sets.push({ player1: '', player2: '', tiebreak1: '', tiebreak2: '' });
      }
      if (sets.length > totalSets) {
        sets.length = totalSets;
      }

      results[match._id] = {
        sets,
        winner: match.result?.winner ? normalizeId(match.result.winner?.player1?._id || match.result.winner?.player1) : '',
        matchTiebreak: match.result?.matchTiebreak1 ? {
          player1: match.result.matchTiebreak1.toString(),
          player2: match.result.matchTiebreak2.toString(),
        } : null,
        saved: !!match.result?.winner,
      };
    });
    setMatchResults(results);
  };

  useEffect(() => {
    initializeMatchResults();
  }, [matches, totalSets]);

  const handleLocalInputChange = (field, value, playerIndex) => {
    // Lógica para manejar cambios en los inputs
  };

  return (
    <div>
      {Array.isArray(matches) ? (
        matches.map((match) => (
          <MatchCard
            key={match._id}
            matchResult={matchResults[match._id] || { sets: Array(totalSets).fill({ player1: '', player2: '' }) }}
            totalSets={totalSets}
            handleLocalInputChange={handleLocalInputChange}
            matchErrors={{}}
          />
        ))
      ) : (
        <p>No hay partidos disponibles.</p>
      )}
    </div>
  );
};

const normalizeId = (id) => id; // Placeholder para normalización de IDs

export default TournamentBracket;