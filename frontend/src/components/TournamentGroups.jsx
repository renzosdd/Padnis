import React, { useState, useEffect } from 'react';
import MatchCard from './MatchCard';

const TournamentGroups = ({ groups, tournament }) => {
  const [matchResults, setMatchResults] = useState({});

  const totalSets = tournament.format.sets;

  const initializeMatchResults = () => {
    const results = {};
    groups.forEach((group) => {
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
          winner: match.result?.winner ? normalizeId(match.result.winner?.player1?._id || match.result.winner?.player1) : '',
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

  return (
    <div>
      {groups.map((group) => (
        <div key={group._id}>
          {group.matches.map((match) => (
            <MatchCard
              key={match._id}
              matchResult={matchResults[match._id] || { sets: Array(totalSets).fill({ player1: '', player2: '' }) }}
              totalSets={totalSets}
              handleLocalInputChange={handleLocalInputChange}
              matchErrors={{}}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

const normalizeId = (id) => id; // Placeholder para normalización de IDs

export default TournamentGroups;