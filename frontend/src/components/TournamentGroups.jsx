import React, { useEffect } from 'react';
   import { useSelector, useDispatch } from 'react-redux';
   import axios from 'axios';
   import { Box, Typography } from '@mui/material';
   import { setMatchResult } from '../store/store'; // Correcto para src/frontend/src/store/store.js
   import MatchCard from './MatchCard';

   const BACKEND_URL = 'https://padnis.onrender.com';

   const TournamentGroups = ({
     groups,
     tournament,
     role,
     generateKnockoutPhase,
     getPlayerName,
     fetchTournament,
     addNotification,
   }) => {
     const matchResults = useSelector((state) => state.matchResults);
     const dispatch = useDispatch();
     const canEdit = role === 'admin' || role === 'coach';
     const totalSets = tournament?.format?.sets || 1;

     const initializeMatchResults = () => {
       if (!Array.isArray(groups)) return;

       groups.forEach((group) => {
         if (!Array.isArray(group.matches)) return;

         group.matches.forEach((match) => {
           if (!matchResults[match._id]) {
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

             dispatch(setMatchResult({
               matchId: match._id,
               result: {
                 sets,
                 winner: match.result?.winner ? match.result.winner?.player1?._id || match.result.winner?.player1 : '',
                 matchTiebreak: match.result?.matchTiebreak1 ? {
                   player1: match.result.matchTiebreak1.toString(),
                   player2: match.result.matchTiebreak2.toString(),
                 } : null,
                 saved: !!match.result?.winner,
               },
             }));
           }
         });
       });
     };

     useEffect(() => {
       initializeMatchResults();
     }, [groups, totalSets, matchResults, dispatch]);

     const handleInputChange = (matchId, field, value, setIndex = null) => {
       const result = { ...matchResults[matchId] };
       if (field.startsWith('set')) {
         const [type, index] = field.split('-');
         result.sets = [...result.sets];
         result.sets[parseInt(index, 10)] = {
           ...result.sets[parseInt(index, 10)],
           [setIndex === 0 ? 'player1' : 'player2']: value,
         };
       } else if (field.startsWith('tiebreak')) {
         const [type, index, player] = field.split('-');
         result.sets = [...result.sets];
         result.sets[parseInt(index, 10)] = {
           ...result.sets[parseInt(index, 10)],
           [player === '1' ? 'tiebreak1' : 'tiebreak2']: value,
         };
       } else if (field === 'winner') {
         result.winner = value;
       } else if (field.startsWith('matchTiebreak')) {
         const player = field.split('-')[1];
         result.matchTiebreak = { ...result.matchTiebreak, [player]: value };
       }
       dispatch(setMatchResult({ matchId, result }));
     };

     const toggleEditMode = (matchId) => {
       const result = { ...matchResults[matchId], saved: !matchResults[matchId].saved };
       dispatch(setMatchResult({ matchId, result }));
     };

     const saveMatchResult = async (matchId, result) => {
       if (!canEdit) return;
       if (!result) return;

       const validationErrors = validateResult(matchId, result);
       if (validationErrors) {
         addNotification('Corrige los errores antes de guardar', 'error');
         return validationErrors;
       }

       const validSets = result.sets.filter(set => parseInt(set.player1, 10) > 0 || parseInt(set.player2, 10) > 0);
       if (validSets.length !== totalSets) {
         const error = { general: `Ingresa exactamente ${totalSets} set${totalSets > 1 ? 's' : ''} válidos` };
         addNotification(error.general, 'error');
         return error;
       }

       try {
         const match = groups.flatMap(g => g.matches).find(m => m._id === matchId);
         const player1Pair = {
           player1: match.player1?.player1?._id || match.player1?.player1,
           player2: match.player1?.player2 ? match.player1?.player2?._id || match.player1?.player2 : null,
         };
         const player2Pair = match.player2?.name === 'BYE' ? { name: 'BYE' } : {
           player1: match.player2?.player1?._id || match.player2?.player1,
           player2: match.player2?.player2 ? match.player2?.player2?._id || match.player2?.player2 : null,
         };

         const payload = {
           sets: result.sets.map(set => ({
             player1: parseInt(set.player1, 10) || 0,
             player2: parseInt(set.player2, 10) || 0,
             tiebreak1: parseInt(set.tiebreak1, 10) || undefined,
             tiebreak2: parseInt(set.tiebreak2, 10) || undefined,
           })),
           winner: result.winner ? (result.winner === player1Pair.player1 ? player1Pair : player2Pair) : null,
           runnerUp: null,
           isKnockout: false,
           matchTiebreak1: result.matchTiebreak ? parseInt(result.matchTiebreak.player1, 10) : undefined,
           matchTiebreak2: result.matchTiebreak ? parseInt(result.matchTiebreak.player2, 10) : undefined,
         };

         console.log('Saving match result - Payload:', payload);

         const response = await axios.put(
           `${BACKEND_URL}/api/tournaments/${tournament._id}/matches/${matchId}/result`,
           payload,
           {
             headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
             timeout: 10000,
           }
         );

         console.log('Save match result - Response:', response.data);

         dispatch(setMatchResult({ matchId, result: { ...result, saved: true } }));
         addNotification('Resultado guardado con éxito', 'success');
         await fetchTournament(true);
         return null;
       } catch (error) {
         const errorMessage = error.response?.data?.message || error.message || 'Error al guardar resultado';
         console.error('Error saving match result:', errorMessage);
         addNotification(errorMessage, 'error');
         return { general: errorMessage };
       }
     };

     const validateSet = (set, index) => {
       const p1Score = parseInt(set.player1, 10);
       const p2Score = parseInt(set.player2, 10);
       const tb1 = parseInt(set.tiebreak1, 10);
       const tb2 = parseInt(set.tiebreak2, 10);

       if ((isNaN(p1Score) || isNaN(p2Score)) && p1Score !== 0 && p2Score !== 0) {
         return `Set ${index + 1}: Ingresa puntajes válidos`;
       }
       if (p1Score === 0 && p2Score === 0) {
         return null;
       }
       if (p1Score === 6 && p2Score <= 4) return null;
       if (p2Score === 6 && p1Score <= 4) return null;
       if (p1Score === 7 && p2Score === 5) return null;
       if (p2Score === 7 && p1Score === 5) return null;
       if (p1Score === 6 && p2Score === 6) {
         if (isNaN(tb1) || isNaN(tb2) || tb1 === tb2) {
           return `Set ${index + 1}: Ingresa tiebreak válido (diferencia de 2)`;
         }
         if (Math.abs(tb1 - tb2) < 2 || (tb1 < 7 && tb2 < 7)) {
           return `Set ${index + 1}: Tiebreak debe ser ≥7 con 2 puntos de diferencia`;
         }
         return null;
       }
       return `Set ${index + 1}: Puntaje inválido (6-4, 7-5, o 6-6 con tiebreak)`;
     };

     const validateMatchTiebreak = (matchTiebreak) => {
       if (!matchTiebreak) return null;
       const tb1 = parseInt(matchTiebreak.player1, 10);
       const tb2 = parseInt(matchTiebreak.player2, 10);
       if (isNaN(tb1) || isNaN(tb2)) {
         return 'Ingresa puntajes de tiebreak válidos';
       }
       if (tb1 === 0 && tb2 === 0) {
         return null;
       }
       if (tb1 === tb2) {
         return 'El tiebreak debe tener un ganador';
       }
       if (tb1 < 10 && tb2 < 10 || Math.abs(tb1 - tb2) < 2) {
         return 'Tiebreak debe ser ≥10 con 2 puntos de diferencia';
       }
       return null;
     };

     const validateResult = (matchId, result) => {
       const errors = {};
       const sets = result.sets || [];

       sets.forEach((set, index) => {
         const error = validateSet(set, index);
         if (error) errors[`set${index}`] = error;
       });

       if (totalSets === 2) {
         let setsWonByPlayer1 = 0;
         let setsWonByPlayer2 = 0;
         sets.forEach((set) => {
           const p1Score = parseInt(set.player1, 10);
           const p2Score = parseInt(set.player2, 10);
           const tb1 = parseInt(set.tiebreak1, 10);
           const tb2 = parseInt(set.tiebreak2, 10);
           if (p1Score > p2Score || (p1Score === p2Score && tb1 > tb2)) setsWonByPlayer1++;
           else if (p2Score > p1Score || (p1Score === p2Score && tb2 > tb1)) setsWonByPlayer2++;
         });
         if (setsWonByPlayer1 === 1 && setsWonByPlayer2 === 1) {
           const tiebreakError = validateMatchTiebreak(result.matchTiebreak);
           if (tiebreakError) errors.matchTiebreak = tiebreakError;
         }
       }

       return Object.keys(errors).length > 0 ? errors : null;
     };

     if (!Array.isArray(groups) || groups.length === 0) {
       return <Typography>No hay grupos disponibles.</Typography>;
     }

     return (
       <Box sx={{ p: { xs: 1, sm: 2 }, maxWidth: '100%', overflowX: 'hidden' }}>
         {groups.map((group, groupIndex) => (
           <Box key={group._id || groupIndex} sx={{ mb: 3 }}>
             <Typography variant="h6" sx={{ fontSize: { xs: '1.25rem', sm: '1.25rem' }, mb: 1.5, color: '#1976d2', textAlign: 'center' }}>
               {group.name || `Grupo ${groupIndex + 1}`}
             </Typography>
             {Array.isArray(group.matches) ? (
               group.matches.map((match) => (
                 <MatchCard
                   key={match._id}
                   match={match}
                   matchResult={matchResults[match._id] || { sets: Array(totalSets).fill({ player1: '', player2: '' }) }}
                   totalSets={totalSets}
                   handleLocalInputChange={(field, value, setIndex) => handleInputChange(match._id, field, value, setIndex)}
                   matchErrors={{}}
                   getPlayerName={getPlayerName}
                   tournament={tournament}
                   onSave={saveMatchResult}
                   onToggleEdit={(matchId) => toggleEditMode(matchId)}
                   canEdit={canEdit}
                 />
               ))
             ) : (
               <Typography textAlign="center">No hay partidos en este grupo.</Typography>
             )}
           </Box>
         ))}
       </Box>
     );
   };

   export default TournamentGroups;