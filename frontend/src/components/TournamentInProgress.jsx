import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { Box, Typography, Button, Tabs, Tab, Table, TableBody, TableCell, TableHead, TableRow, Dialog, DialogTitle, DialogContent, DialogActions, Chip, IconButton } from '@mui/material';
import { Add, Remove } from '@mui/icons-material';

const TournamentInProgress = ({ tournamentId, onFinishTournament }) => {
  const [tournament, setTournament] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [matchDialogOpen, setMatchDialogOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [setScores, setSetScores] = useState([]);
  const [standings, setStandings] = useState([]);
  const { user, role } = useAuth();
  const { addNotification } = useNotification();

  useEffect(() => {
    fetchTournament();
  }, [tournamentId]);

  const fetchTournament = async () => {
    try {
      const response = await axios.get(`https://padnis.onrender.com/api/tournaments/${tournamentId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setTournament(response.data);
      console.log('Tournament fetched:', response.data);
      if (response.data.type === 'RoundRobin') {
        console.log('Group matches:', response.data.groups.map(g => g.matches.map(m => ({
          player1: m.player1,
          player2: m.player2,
        }))));
        updateStandings(response.data);
      }
    } catch (error) {
      addNotification(`Error al cargar el torneo: ${error.response?.status || error.message}`, 'error');
      console.error('Error fetching tournament:', error);
    }
  };

  const updateStandings = (tournamentData) => {
    const newStandings = tournamentData.groups.map(group => {
      const standings = group.players.map(p => ({
        playerId: p.player1,
        player2Id: p.player2,
        wins: 0,
        setsWon: 0,
        gamesWon: 0,
      }));
      group.matches.forEach(match => {
        if (match.result.winner) {
          const winner = standings.find(s => s.playerId === match.result.winner);
          if (winner) {
            winner.wins += 1;
          }
          match.result.sets.forEach(set => {
            const p1 = standings.find(s => s.playerId === match.player1?.player1);
            const p2 = standings.find(s => s.playerId === match.player2?.player1);
            if (p1 && p2) {
              p1.gamesWon += set.player1;
              p2.gamesWon += set.player2;
              if (set.player1 > set.player2 || (set.player1 === set.player2 && set.tiebreak1 > set.tiebreak2)) {
                p1.setsWon += 1;
              } else if (set.player2 > set.player1 || (set.player1 === set.player2 && set.tiebreak2 > set.tiebreak1)) {
                p2.setsWon += 1;
              }
            }
          });
        }
      });
      return {
        groupName: group.name,
        standings: standings.sort((a, b) => b.wins - a.wins || b.setsWon - a.setsWon || b.gamesWon - a.gamesWon),
      };
    });
    setStandings(newStandings);
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const openMatchDialog = (match, groupIndex, matchIndex) => {
    if (role !== 'admin' && role !== 'coach') {
      addNotification('Solo admin o coach pueden actualizar partidos', 'error');
      return;
    }
    setSelectedMatch({ match, groupIndex, matchIndex });
    const initialSets = match.result.sets.length > 0 
      ? match.result.sets.map(set => ({
          player1: set.player1,
          player2: set.player2,
          tiebreak1: set.tiebreak1 || 0,
          tiebreak2: set.tiebreak2 || 0,
        }))
      : Array(tournament?.format.sets || 1).fill({ player1: 0, player2: 0, tiebreak1: 0, tiebreak2: 0 });
    setSetScores(initialSets);
    setMatchDialogOpen(true);
  };

  const handleScoreChange = (index, field, value) => {
    setSetScores(prev => {
      const newScores = [...prev];
      newScores[index] = { ...newScores[index], [field]: Math.max(0, parseInt(value) || 0) };
      return newScores;
    });
  };

  const incrementScore = (index, field) => {
    setSetScores(prev => {
      const newScores = [...prev];
      newScores[index] = { ...newScores[index], [field]: newScores[index][field] + 1 };
      return newScores;
    });
  };

  const decrementScore = (index, field) => {
    setSetScores(prev => {
      const newScores = [...prev];
      newScores[index] = { ...newScores[index], [field]: Math.max(0, newScores[index][field] - 1) };
      return newScores;
    });
  };

  const submitMatchResult = async (retries = 2) => {
    const validSets = setScores.filter(set => set.player1 > 0 || set.player2 > 0);
    if (validSets.length !== tournament.format.sets) {
      addNotification(`Ingresa exactamente ${tournament.format.sets} set${tournament.format.sets > 1 ? 's' : ''} válidos`, 'error');
      return;
    }
    for (const set of validSets) {
      if (set.player1 === set.player2 && set.player1 >= tournament.format.tiebreakSet && (!set.tiebreak1 || !set.tiebreak2)) {
        addNotification('Debes ingresar puntajes de tiebreak para sets empatados', 'error');
        return;
      }
    }
    try {
      const { match, groupIndex, matchIndex } = selectedMatch;
      const updatedTournament = { ...tournament };
      const sets = validSets.map(set => ({
        player1: set.player1,
        player2: set.player2,
        tiebreak1: set.tiebreak1 > 0 ? set.tiebreak1 : undefined,
        tiebreak2: set.tiebreak2 > 0 ? set.tiebreak2 : undefined,
      }));

      if (tournament.type === 'RoundRobin') {
        updatedTournament.groups[groupIndex].matches[matchIndex].result.sets = sets;
        const setsWonByPlayer1 = sets.filter(set => 
          set.player1 > set.player2 || (set.player1 === set.player2 && set.tiebreak1 > set.tiebreak2)
        ).length;
        const setsWonByPlayer2 = sets.filter(set => 
          set.player1 < set.player2 || (set.player1 === set.player2 && set.tiebreak1 < set.tiebreak2)
        ).length;
        if (setsWonByPlayer1 > setsWonByPlayer2) {
          updatedTournament.groups[groupIndex].matches[matchIndex].result.winner = match.player1?.player1;
        } else if (setsWonByPlayer2 > setsWonByPlayer1) {
          updatedTournament.groups[groupIndex].matches[matchIndex].result.winner = match.player2?.player1;
        }
      } else {
        updatedTournament.rounds[groupIndex].matches[matchIndex].result.sets = sets;
        const setsWonByPlayer1 = sets.filter(set => 
          set.player1 > set.player2 || (set.player1 === set.player2 && set.tiebreak1 > set.tiebreak2)
        ).length;
        const setsWonByPlayer2 = sets.filter(set => 
          set.player1 < set.player2 || (set.player1 === set.player2 && set.tiebreak1 < set.tiebreak2)
        ).length;
        if (setsWonByPlayer1 > setsWonByPlayer2) {
          updatedTournament.rounds[groupIndex].matches[matchIndex].result.winner = match.player1?.player1;
        } else if (setsWonByPlayer2 > setsWonByPlayer1) {
          updatedTournament.rounds[groupIndex].matches[matchIndex].result.winner = match.player2?.player1;
        }
      }

      await axios.put(`https://padnis.onrender.com/api/tournaments/${tournamentId}`, updatedTournament, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setMatchDialogOpen(false);
      await fetchTournament();
      addNotification('Resultado de partido actualizado', 'success');
    } catch (error) {
      if (retries > 0 && error.code === 'ERR_NETWORK') {
        console.log(`Retrying submitMatchResult (${retries} attempts left)...`);
        setTimeout(() => submitMatchResult(retries - 1), 2000);
      } else {
        addNotification(`Error al actualizar el resultado del partido: ${error.message}`, 'error');
        console.error('Error updating match result:', error);
      }
    }
  };

  const generateKnockoutPhase = async () => {
    if (tournament.type !== 'RoundRobin') return;
    try {
      const topPlayers = standings.flatMap(group => 
        group.standings.slice(0, 2).map(s => ({
          player1: s.playerId,
          player2: tournament.format.mode === 'Dobles' ? s.player2Id : null,
        }))
      );
      if (topPlayers.length < 2) {
        addNotification('No hay suficientes clasificados para generar la fase eliminatoria', 'error');
        return;
      }
      const shuffled = topPlayers.sort(() => 0.5 - Math.random());
      const matches = [];
      for (let i = 0; i < shuffled.length; i += 2) {
        if (i + 1 < shuffled.length) {
          matches.push({
            player1: shuffled[i],
            player2: shuffled[i + 1],
            result: { sets: [], winner: null },
            date: null,
          });
        }
      }
      const updatedTournament = {
        ...tournament,
        rounds: [...tournament.rounds, { round: tournament.rounds.length + 1, matches }],
      };
      await axios.put(`https://padnis.onrender.com/api/tournaments/${tournamentId}`, updatedTournament, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      await fetchTournament();
      addNotification('Fase eliminatoria generada', 'success');
    } catch (error) {
      addNotification('Error al generar la fase eliminatoria', 'error');
      console.error('Error generating knockout phase:', error);
    }
  };

  const advanceEliminationRound = async () => {
    if (tournament.type !== 'Eliminatorio') return;
    try {
      const currentRound = tournament.rounds[tournament.rounds.length - 1];
      if (!currentRound.matches.every(m => m.result.winner)) {
        addNotification('Faltan completar partidos de la ronda actual', 'error');
        return;
      }
      const winners = currentRound.matches
        .filter(m => m.result.winner) // Solo incluir partidos con ganador válido
        .map(m => ({
          player1: m.result.winner,
          player2: tournament.format.mode === 'Dobles' 
            ? tournament.participants.find(p => p.player1 === m.result.winner)?.player2 || null
            : null,
        }));
      if (winners.length < 2) {
        addNotification('No hay suficientes ganadores para avanzar', 'error');
        return;
      }
      const matches = [];
      for (let i = 0; i < winners.length; i += 2) {
        if (i + 1 < winners.length) {
          matches.push({
            player1: winners[i],
            player2: winners[i + 1],
            result: { sets: [], winner: null },
            date: null,
          });
        } else {
          matches.push({
            player1: winners[i],
            player2: { player1: null, name: 'BYE' },
            result: { sets: [], winner: winners[i].player1 },
            date: null,
          });
        }
      }
      const updatedTournament = {
        ...tournament,
        rounds: [...tournament.rounds, { round: tournament.rounds.length + 1, matches }],
      };
      console.log('Advancing round with tournament:', updatedTournament);
      await axios.put(`https://padnis.onrender.com/api/tournaments/${tournamentId}`, updatedTournament, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      await fetchTournament();
      addNotification('Ronda avanzada con éxito', 'success');
    } catch (error) {
      addNotification(`Error al avanzar la ronda: ${error.response?.data?.message || error.message}`, 'error');
      console.error('Error advancing round:', error);
    }
  };

  const handleFinishTournament = async () => {
    try {
      const allMatchesCompleted = tournament.type === 'RoundRobin'
        ? tournament.groups.every(group => group.matches.every(match => match.result.winner !== null))
        : tournament.rounds.every(round => round.matches.every(match => match.result.winner !== null));
      if (!allMatchesCompleted) {
        addNotification('Faltan completar algunos partidos', 'error');
        return;
      }
      const updatedTournament = { ...tournament, status: 'Finalizado', draft: false };
      await axios.put(`https://padnis.onrender.com/api/tournaments/${tournamentId}`, updatedTournament, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      onFinishTournament(updatedTournament);
      addNotification('Torneo finalizado con éxito', 'success');
    } catch (error) {
      addNotification('Error al finalizar el torneo', 'error');
      console.error('Error finishing tournament:', error);
    }
  };

  const renderBracket = () => {
    if (tournament.type !== 'Eliminatorio') return null;
    const rounds = tournament.rounds;
    return (
      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
        {rounds.map((round, index) => (
          <Box key={round.round} sx={{ mx: 2 }}>
            <Typography variant="h6">Ronda {round.round}</Typography>
            {round.matches.map((match, idx) => (
              <Box key={idx} sx={{ my: 2, p: 1, border: '1px solid #e0e0e0', borderRadius: 2 }}>
                <Typography>
                  {match.player1?.name || `${match.player1?.player1?.firstName || 'Jugador no encontrado'} ${match.player1?.player1?.lastName || ''}`}
                  {tournament.format.mode === 'Dobles' && match.player1?.player2 && (
                    <> / {match.player1?.player2?.firstName || 'Jugador no encontrado'} ${match.player1?.player2?.lastName || ''}</>
                  )}
                  {' vs '}
                  {match.player2?.name || `${match.player2?.player1?.firstName || 'Jugador no encontrado'} ${match.player2?.player1?.lastName || ''}`}
                  {tournament.format.mode === 'Dobles' && match.player2?.player2 && (
                    <> / {match.player2?.player2?.firstName || 'Jugador no encontrado'} ${match.player2?.player2?.lastName || ''}</>
                  )}
                </Typography>
                <Typography>
                  {match.result.sets.length > 0 ? match.result.sets.map((set, i) => (
                    <span key={i}>{set.player1}-{set.player2}{set.tiebreak1 ? ` (${set.tiebreak1}-${set.tiebreak2})` : ''} </span>
                  )) : 'Pendiente'}
                </Typography>
              </Box>
            ))}
          </Box>
        ))}
      </Box>
    );
  };

  if (!tournament) return <Typography>Cargando torneo...</Typography>;

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        {tournament.name} - {tournament.sport} ({tournament.format.mode}) en {tournament.club?.name || 'Club desconocido'}
      </Typography>
      <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 2 }}>
        <Tab label="Detalles" />
        <Tab label={tournament.type === 'RoundRobin' ? 'Grupos' : 'Rondas'} />
        <Tab label="Calendario" />
        {tournament.type === 'RoundRobin' && <Tab label="Standings" />}
        {tournament.type === 'Eliminatorio' && <Tab label="Llave" />}
      </Tabs>

      {tabValue === 0 && (
        <Box>
          <Typography><strong>Nombre:</strong> {tournament.name}</Typography>
          <Typography><strong>Club:</strong> {tournament.club?.name || 'No definido'}</Typography>
          <Typography><strong>Categoría:</strong> {tournament.category || 'No definida'}</Typography>
          <Typography><strong>Tipo:</strong> {tournament.type}</Typography>
          <Typography><strong>Deporte:</strong> {tournament.sport}</Typography>
          <Typography><strong>Modalidad:</strong> {tournament.format.mode}</Typography>
          <Typography><strong>Sets por partido:</strong> {tournament.format.sets}</Typography>
          <Typography><strong>Juegos por set:</strong> {tournament.format.gamesPerSet}</Typography>
          <Typography><strong>Participantes:</strong></Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', mt: 1 }}>
            {tournament.participants.map(part => {
              const player1Name = part.player1?.firstName ? `${part.player1.firstName} ${part.player1.lastName}` : 'Jugador no encontrado';
              const player2Name = tournament.format.mode === 'Dobles' && part.player2 ? `${part.player2.firstName} ${part.player2.lastName}` : '';
              const label = tournament.format.mode === 'Singles' ? player1Name : `${player1Name} / ${player2Name || 'Jugador no encontrado'}`;
              return (
                <Chip
                  key={part.player1?._id || part.player1}
                  label={label}
                  sx={{ m: 0.5 }}
                />
              );
            })}
          </Box>
        </Box>
      )}

      {tabValue === 1 && (
        <Box>
          {tournament.type === 'RoundRobin' ? (
            tournament.groups.map((group, groupIndex) => (
              <Box key={group.name} sx={{ mb: 3 }}>
                <Typography variant="h6">{group.name}</Typography>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>{tournament.format.mode === 'Singles' ? 'Jugador 1' : 'Equipo 1'}</TableCell>
                      <TableCell>{tournament.format.mode === 'Singles' ? 'Jugador 2' : 'Equipo 2'}</TableCell>
                      <TableCell>Resultado</TableCell>
                      <TableCell>Acción</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {group.matches.map((match, matchIndex) => (
                      <TableRow key={matchIndex}>
                        <TableCell>
                          {match.player1?.player1?.firstName || 'Jugador no encontrado'} {match.player1?.player1?.lastName || ''}
                          {tournament.format.mode === 'Dobles' && match.player1?.player2 && (
                            <> / {match.player1?.player2?.firstName || 'Jugador no encontrado'} {match.player1?.player2?.lastName || ''}</>
                          )}
                        </TableCell>
                        <TableCell>
                          {match.player2?.player1?.firstName || 'Jugador no encontrado'} {match.player2?.player1?.lastName || ''}
                          {tournament.format.mode === 'Dobles' && match.player2?.player2 && (
                            <> / {match.player2?.player2?.firstName || 'Jugador no encontrado'} {match.player2?.player2?.lastName || ''}</>
                          )}
                        </TableCell>
                        <TableCell>
                          {match.result.sets.length > 0 ? match.result.sets.map((set, idx) => (
                            <Typography key={idx}>
                              {set.player1} - {set.player2} {set.tiebreak1 && set.tiebreak2 ? `(${set.tiebreak1}-${set.tiebreak2})` : ''}
                            </Typography>
                          )) : 'Pendiente'}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => openMatchDialog(match, groupIndex, matchIndex)}
                            disabled={match.result.winner !== null}
                          >
                            Actualizar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            ))
          ) : (
            tournament.rounds.map((round, roundIndex) => (
              <Box key={round.round} sx={{ mb: 3 }}>
                <Typography variant="h6">Ronda {round.round}</Typography>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>{tournament.format.mode === 'Singles' ? 'Jugador 1' : 'Equipo 1'}</TableCell>
                      <TableCell>{tournament.format.mode === 'Singles' ? 'Jugador 2' : 'Equipo 2'}</TableCell>
                      <TableCell>Resultado</TableCell>
                      <TableCell>Acción</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {round.matches.map((match, matchIndex) => (
                      <TableRow key={matchIndex}>
                        <TableCell>
                          {match.player1?.name || `${match.player1?.player1?.firstName || 'Jugador no encontrado'} ${match.player1?.player1?.lastName || ''}`}
                          {tournament.format.mode === 'Dobles' && match.player1?.player2 && (
                            <> / {match.player1?.player2?.firstName || 'Jugador no encontrado'} ${match.player1?.player2?.lastName || ''}</>
                          )}
                        </TableCell>
                        <TableCell>
                          {match.player2?.name || `${match.player2?.player1?.firstName || 'Jugador no encontrado'} ${match.player2?.player1?.lastName || ''}`}
                          {tournament.format.mode === 'Dobles' && match.player2?.player2 && (
                            <> / {match.player2?.player2?.firstName || 'Jugador no encontrado'} ${match.player2?.player2?.lastName || ''}</>
                          )}
                        </TableCell>
                        <TableCell>
                          {match.result.sets.length > 0 ? match.result.sets.map((set, idx) => (
                            <Typography key={idx}>
                              {set.player1} - {set.player2} {set.tiebreak1 && set.tiebreak2 ? `(${set.tiebreak1}-${set.tiebreak2})` : ''}
                            </Typography>
                          )) : 'Pendiente'}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => openMatchDialog(match, roundIndex, matchIndex)}
                            disabled={match.result.winner !== null}
                          >
                            Actualizar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            ))
          )}
          {tournament.type === 'Eliminatorio' && (role === 'admin' || role === 'coach') && (
            <Button
              variant="contained"
              onClick={advanceEliminationRound}
              sx={{ mt: 2 }}
            >
              Avanzar a la Siguiente Ronda
            </Button>
          )}
          {tournament.type === 'RoundRobin' && (role === 'admin' || role === 'coach') && (
            <Button
              variant="contained"
              onClick={generateKnockoutPhase}
              sx={{ mt: 2, ml: 2 }}
            >
              Generar Fase Eliminatoria
            </Button>
          )}
        </Box>
      )}

      {tabValue === 2 && (
        <Box>
          <Typography><strong>Fecha General:</strong> {tournament.schedule.group || 'No definida'}</Typography>
          <Typography variant="subtitle1" sx={{ mt: 2 }}>Partidos Programados</Typography>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Partido</TableCell>
                <TableCell>Fecha</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(tournament.type === 'RoundRobin' ? tournament.groups.flatMap(g => g.matches) : tournament.rounds.flatMap(r => r.matches)).map((match, idx) => (
                <TableRow key={idx}>
                  <TableCell>
                    {match.player1?.player1?.firstName || 'Jugador no encontrado'} {match.player1?.player1?.lastName || ''}
                    {tournament.format.mode === 'Dobles' && match.player1?.player2 && (
                      <> / {match.player1?.player2?.firstName || 'Jugador no encontrado'} ${match.player1?.player2?.lastName || ''}</>
                    )}
                    {' vs '}
                    {match.player2?.player1?.firstName || 'Jugador no encontrado'} {match.player2?.player1?.lastName || ''}
                    {tournament.format.mode === 'Dobles' && match.player2?.player2 && (
                      <> / {match.player2?.player2?.firstName || 'Jugador no encontrado'} ${match.player2?.player2?.lastName || ''}</>
                    )}
                  </TableCell>
                  <TableCell>{match.date || 'No definida'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}

      {tabValue === 3 && tournament.type === 'RoundRobin' && (
        <Box>
          <Typography variant="h5" gutterBottom>Standings</Typography>
          {standings.map(group => (
            <Box key={group.groupName} sx={{ mb: 3 }}>
              <Typography variant="h6">{group.groupName}</Typography>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>{tournament.format.mode === 'Singles' ? 'Jugador' : 'Equipo'}</TableCell>
                    <TableCell>Victorias</TableCell>
                    <TableCell>Sets Ganados</TableCell>
                    <TableCell>Juegos Ganados</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {group.standings.map((player, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        {tournament.participants.find(p => p.player1 === player.playerId)?.player1.firstName || 'Jugador no encontrado'} {tournament.participants.find(p => p.player1 === player.playerId)?.player1.lastName || ''}
                        {tournament.format.mode === 'Dobles' && player.player2Id && (
                          <> / {tournament.participants.find(p => p.player1 === player.playerId)?.player2.firstName || 'Jugador no encontrado'} {tournament.participants.find(p => p.player1 === player.playerId)?.player2.lastName || ''}</>
                        )}
                      </TableCell>
                      <TableCell>{player.wins}</TableCell>
                      <TableCell>{player.setsWon}</TableCell>
                      <TableCell>{player.gamesWon}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          ))}
        </Box>
      )}

      {tabValue === 4 && tournament.type === 'Eliminatorio' && renderBracket()}

      {(role === 'admin' || role === 'coach') && (
        <Button
          variant="contained"
          color="success"
          onClick={handleFinishTournament}
          sx={{ mt: 2 }}
        >
          Finalizar Torneo
        </Button>
      )}

      <Dialog open={matchDialogOpen} onClose={() => setMatchDialogOpen(false)}>
        <DialogTitle>Actualizar Resultado del Partido</DialogTitle>
        <DialogContent>
          {selectedMatch && (
            <>
              <Typography>
                {selectedMatch.match.player1?.player1?.firstName || 'Jugador no encontrado'} {selectedMatch.match.player1?.player1?.lastName || ''}
                {tournament.format.mode === 'Dobles' && selectedMatch.match.player1?.player2 && (
                  <> / {selectedMatch.match.player1?.player2?.firstName || 'Jugador no encontrado'} ${selectedMatch.match.player1?.player2?.lastName || ''}</>
                )}
                {' vs '}
                {selectedMatch.match.player2?.player1?.firstName || 'Jugador no encontrado'} {selectedMatch.match.player2?.player1?.lastName || ''}
                {tournament.format.mode === 'Dobles' && selectedMatch.match.player2?.player2 && (
                  <> / {selectedMatch.match.player2?.player2?.firstName || 'Jugador no encontrado'} ${selectedMatch.match.player2?.player2?.lastName || ''}</>
                )}
              </Typography>
              {setScores.map((set, index) => (
                index < tournament.format.sets && (
                  <Box key={index} sx={{ mt: 2 }}>
                    <Typography>Set {index + 1}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                      <IconButton onClick={() => decrementScore(index, 'player1')} size="small">
                        <Remove />
                      </IconButton>
                      <TextField
                        label="Puntaje Jugador 1"
                        type="number"
                        value={set.player1}
                        onChange={(e) => handleScoreChange(index, 'player1', e.target.value)}
                        inputProps={{ min: 0 }}
                        sx={{ width: 100, mx: 1 }}
                      />
                      <IconButton onClick={() => incrementScore(index, 'player1')} size="small">
                        <Add />
                      </IconButton>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                      <IconButton onClick={() => decrementScore(index, 'player2')} size="small">
                        <Remove />
                      </IconButton>
                      <TextField
                        label="Puntaje Jugador 2"
                        type="number"
                        value={set.player2}
                        onChange={(e) => handleScoreChange(index, 'player2', e.target.value)}
                        inputProps={{ min: 0 }}
                        sx={{ width: 100, mx: 1 }}
                      />
                      <IconButton onClick={() => incrementScore(index, 'player2')} size="small">
                        <Add />
                      </IconButton>
                    </Box>
                    {set.player1 >= tournament.format.tiebreakSet && set.player2 >= tournament.format.tiebreakSet && (
                      <>
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                          <IconButton onClick={() => decrementScore(index, 'tiebreak1')} size="small">
                            <Remove />
                          </IconButton>
                          <TextField
                            label="Tiebreak Jugador 1"
                            type="number"
                            value={set.tiebreak1}
                            onChange={(e) => handleScoreChange(index, 'tiebreak1', e.target.value)}
                            inputProps={{ min: 0 }}
                            sx={{ width: 100, mx: 1 }}
                          />
                          <IconButton onClick={() => incrementScore(index, 'tiebreak1')} size="small">
                            <Add />
                          </IconButton>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                          <IconButton onClick={() => decrementScore(index, 'tiebreak2')} size="small">
                            <Remove />
                          </IconButton>
                          <TextField
                            label="Tiebreak Jugador 2"
                            type="number"
                            value={set.tiebreak2}
                            onChange={(e) => handleScoreChange(index, 'tiebreak2', e.target.value)}
                            inputProps={{ min: 0 }}
                            sx={{ width: 100, mx: 1 }}
                          />
                          <IconButton onClick={() => incrementScore(index, 'tiebreak2')} size="small">
                            <Add />
                          </IconButton>
                        </Box>
                      </>
                    )}
                  </Box>
                )
              ))}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMatchDialogOpen(false)}>Cancelar</Button>
          <Button onClick={submitMatchResult} color="primary">Guardar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TournamentInProgress;