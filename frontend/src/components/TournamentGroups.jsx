import React, { useState, useEffect } from 'react';
import MatchCard from './MatchCard';

const TournamentGroups = ({ groups, tournament }) => {
  const [matchResults, setMatchResults] = useState({});

  // Valor por defecto para totalSets si no está definido
  const totalSets = tournament?.format?.sets || 1;

  // Inicializar los resultados de los partidos
  const initializeMatchResults = () => {
    if (!Array.isArray(groups)) return; // Salir si groups no es un arreglo

    const results = {};
    groups.forEach((group) => {
      if (!Array.isArray(group.matches)) return; // Salir si matches no es un arreglo

      group.matches.forEach((match) => {
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
          winner: match.result?.winner ? match.result.winner?.player1?._id || match.result.winner?.player1 : '',
          matchTiebreak: match.result?.matchTiebreak1 ? {
            player1: match.result.matchTiebreak1.toString(),
            player2: match.result.matchTiebreak2.toString(),
          } : null,
          saved: !!match.result?.winner,
        };
      });
    });
    setMatchResults(results);
  };

  useEffect(() => {
    initializeMatchResults();
  }, [groups, totalSets]);

  const handleLocalInputChange = (field, value, playerIndex) => {
    // Lógica para manejar cambios en los inputs
  };

  // Comprobar si groups está definido y es un arreglo
  if (!Array.isArray(groups) || groups.length === 0) {
    return <div>No hay grupos disponibles.</div>;
  }

  return (
    <div>
      {groups.map((group) => (
        <div key={group._id}>
          {Array.isArray(group.matches) ? (
            group.matches.map((match) => (
              <MatchCard
                key={match._id}
                matchResult={matchResults[match._id] || { sets: Array(totalSets).fill({ player1: '', player2: '' }) }}
                totalSets={totalSets}
                handleLocalInputChange={handleLocalInputChange}
                matchErrors={{}}
              />
            ))
          ) : (
            <p>No hay partidos en este grupo.</p>
          )}
        </div>
      ))}
    </div>
  );
};

export default TournamentGroups;