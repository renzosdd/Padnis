import { useState, useCallback } from 'react';
import axios from 'axios';

const useTournament = (tournamentId) => {
  const [standings, setStandings] = useState([]);

  // Fetch tournament data by ID
  const fetchTournament = useCallback(async () => {
    try {
      const response = await axios.get(`https://padnis.onrender.com/api/tournaments/${tournamentId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const tournamentData = response.data;
      console.log('Fetched tournament data in useTournament:', tournamentData);
      // Compute standings if the tournament has groups
      if (tournamentData.groups && tournamentData.groups.length > 0) {
        const computedStandings = computeStandings(tournamentData);
        setStandings(computedStandings);
      }
      return tournamentData;
    } catch (error) {
      console.error('Error fetching tournament:', error);
      throw error;
    }
  }, [tournamentId]);

  // Compute standings for groups phase
  const computeStandings = (tournament) => {
    if (!tournament.groups || !Array.isArray(tournament.groups)) return [];

    return tournament.groups.map((group) => {
      const groupStandings = {};

      // Initialize standings for each participant in the group
      group.participants.forEach((participant) => {
        const player1Id = participant.player1?._id || participant.player1;
        groupStandings[player1Id] = {
          player1: participant.player1,
          points: 0,
          matchesPlayed: 0,
          wins: 0,
          losses: 0,
          setsWon: 0,
          setsLost: 0,
        };
      });

      // Process each match to update standings
      group.matches.forEach((match) => {
        if (!match.result || !match.result.winner) return;

        const winnerId = match.result.winner?.player1?._id || match.result.winner?.player1;
        const runnerUpId = match.result.runnerUp?.player1?._id || match.result.runnerUp?.player1;

        if (!winnerId || !runnerUpId) return;

        // Update matches played
        groupStandings[winnerId].matchesPlayed += 1;
        groupStandings[runnerUpId].matchesPlayed += 1;

        // Update wins and losses
        groupStandings[winnerId].wins += 1;
        groupStandings[runnerUpId].losses += 1;

        // Update points (e.g., 3 points for a win)
        groupStandings[winnerId].points += 3;

        // Update sets won and lost
        match.result.sets.forEach((set) => {
          const p1Score = parseInt(set.player1, 10);
          const p2Score = parseInt(set.player2, 10);
          const tb1 = parseInt(set.tiebreak1, 10);
          const tb2 = parseInt(set.tiebreak2, 10);

          const player1WinsSet = p1Score > p2Score || (p1Score === p2Score && tb1 > tb2);
          const player2WinsSet = p2Score > p1Score || (p1Score === p2Score && tb2 > tb1);

          if (player1WinsSet) {
            groupStandings[match.player1?.player1?._id || match.player1?.player1].setsWon += 1;
            groupStandings[match.player2?.player1?._id || match.player2?.player1].setsLost += 1;
          } else if (player2WinsSet) {
            groupStandings[match.player2?.player1?._id || match.player2?.player1].setsWon += 1;
            groupStandings[match.player1?.player1?._id || match.player1?.player1].setsLost += 1;
          }
        });
      });

      // Convert standings object to array and sort by points
      const standingsArray = Object.values(groupStandings).sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        const setDiffA = a.setsWon - a.setsLost;
        const setDiffB = b.setsWon - b.setsLost;
        return setDiffB - setDiffA;
      });

      return {
        groupName: group.groupName,
        standings: standingsArray,
      };
    });
  };

  // Generate knockout phase
  const generateKnockoutPhase = useCallback(async () => {
    try {
      await axios.post(`https://padnis.onrender.com/api/tournaments/${tournamentId}/generate-knockout`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const updatedTournament = await fetchTournament();
      return updatedTournament;
    } catch (error) {
      console.error('Error generating knockout phase:', error);
      throw error;
    }
  }, [tournamentId, fetchTournament]);

  // Advance elimination round
  const advanceEliminationRound = useCallback(async () => {
    try {
      await axios.post(`https://padnis.onrender.com/api/tournaments/${tournamentId}/advance-elimination`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const updatedTournament = await fetchTournament();
      return updatedTournament;
    } catch (error) {
      console.error('Error advancing elimination round:', error);
      throw error;
    }
  }, [tournamentId, fetchTournament]);

  return {
    standings,
    fetchTournament,
    generateKnockoutPhase,
    advanceEliminationRound,
  };
};

export default useTournament;