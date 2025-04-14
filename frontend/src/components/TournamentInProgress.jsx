import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { Box, Typography, Button, Tabs, Tab, Table, TableBody, TableCell, TableHead, TableRow, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Chip } from '@mui/material';

const TournamentInProgress = ({ tournamentId, onFinishTournament }) => {
  const [tournament, setTournament] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [matchDialogOpen, setMatchDialogOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [setScores, setSetScores] = useState([{ player1: '', player2: '', tiebreak1: '', tiebreak2: '' }]);
  const { user, role } = useAuth();
  const { addNotification } = useNotification();
  const players = useSelector(state => state.players.list);

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
      console.log('Players available:', players);
    } catch (error) {
      addNotification(`Error al cargar el torneo: ${error.response?.status || error.message}`, 'error');
      console.error('Error fetching tournament:', error);
    }
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
          player1: set.player1.toString(),
          player2: set.player2.toString(),
          tiebreak1: set.tiebreak1?.toString() || '',
          tiebreak2: set.tiebreak2?.toString() || '',
        }))
      : Array(tournament?.format.sets || 1).fill({ player1: '', player2: '', tiebreak1: '', tiebreak2: '' });
    setSetScores(initialSets);
    setMatchDialogOpen(true);
  };

  const handleScoreChange = (index, field, value) => {
    setSetScores(prev => {
      const newScores = [...prev];
      newScores[index] = { ...newScores[index], [field]: value };
      return newScores;
    });
  };

  const submitMatchResult = async () => {
    const validSets = setScores.filter(set => set.player1 && set.player2);
    if (validSets.length !== tournament.format.sets) {
      addNotification(`Ingresa exactamente ${tournament.format.sets} set${tournament.format.sets > 1 ? 's' : ''} válidos`, 'error');
      return;
    }
    try {
      const { match, groupIndex, matchIndex } = selectedMatch;
      const updatedTournament = { ...tournament };
      const sets = validSets.map(set => ({
        player1: parseInt(set.player1),
        player2: parseInt(set.player2),
        tiebreak1: set.tiebreak1 ? parseInt(set.tiebreak1) : undefined,
        tiebreak2: set.tiebreak2 ? parseInt(set.tiebreak2) : undefined,
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
          updatedTournament.groups[groupIndex].matches[matchIndex].result.winner = match.player1.player1;
        } else if (setsWonByPlayer2 > setsWonByPlayer1) {
          updatedTournament.groups[groupIndex].matches[matchIndex].result.winner = match.player2.player1;
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
          updatedTournament.rounds[groupIndex].matches[matchIndex].result.winner = match.player1.player1;
        } else if (setsWonByPlayer2 > setsWonByPlayer1) {
          updatedTournament.rounds[groupIndex].matches[matchIndex].result.winner = match.player2.player1;
        }
      }

      await axios.put(`https://padnis.onrender.com/api/tournaments/${tournamentId}`, updatedTournament, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setMatchDialogOpen(false);
      fetchTournament(); // Refrescar datos después de guardar
      addNotification('Resultado de partido actualizado', 'success');
    } catch (error) {
      addNotification('Error al actualizar el resultado del partido', 'error');
      console.error('Error updating match result:', error);
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
      const response = await axios.put(`https://padnis.onrender.com/api/tournaments/${tournamentId}`, updatedTournament, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      onFinishTournament(response.data);
      addNotification('Torneo finalizado con éxito', 'success');
    } catch (error) {
      addNotification('Error al finalizar el torneo', 'error');
      console.error('Error finishing tournament:', error);
    }
  };

  if (!tournament) return <Typography>Cargando torneo...</Typography>;

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>{tournament.type} - {tournament.sport} ({tournament.format.mode})</Typography>
      <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 2 }}>
        <Tab label="Detalles" />
        <Tab label={tournament.type === 'RoundRobin' ? 'Grupos' : 'Rondas'} />
        <Tab label="Calendario" />
      </Tabs>

      {tabValue === 0 && (
        <Box>
          <Typography><strong>Tipo:</strong> {tournament.type}</Typography>
          <Typography><strong>Deporte:</strong> {tournament.sport}</Typography>
          <Typography><strong>Modalidad:</strong> {tournament.format.mode}</Typography>
          <Typography><strong>Sets por partido:</strong> {tournament.format.sets}</Typography>
          <Typography><strong>Juegos por set:</strong> {tournament.format.gamesPerSet}</Typography>
          <Typography><strong>Participantes:</strong></Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', mt: 1 }}>
            {tournament.participants.map(part => {
              const player1Name = part.player1.firstName ? `${part.player1.firstName} ${part.player1.lastName}` : 'Jugador no encontrado';
              const player2Name = tournament.format.mode === 'Dobles' && part.player2 ? `${part.player2.firstName} ${part.player2.lastName}` : '';
              const label = tournament.format.mode === 'Singles' ? player1Name : `${player1Name} / ${player2Name || 'Jugador no encontrado'}`;
              return (
                <Chip
                  key={part.player1._id || part.player1} // Usar _id si está poblado
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
                      <TableCell>Jugador 1</TableCell>
                      <TableCell>Jugador 2</TableCell>
                      <TableCell>Resultado</TableCell>
                      <TableCell>Acción</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {group.matches.map((match, matchIndex) => (
                      <TableRow key={matchIndex}>
                        <TableCell>{match.player1.firstName} {match.player1.lastName}</TableCell>
                        <TableCell>{match.player2.firstName} {match.player2.lastName}</TableCell>
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
                      <TableCell>Jugador 1</TableCell>
                      <TableCell>Jugador 2</TableCell>
                      <TableCell>Resultado</TableCell>
                      <TableCell>Acción</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {round.matches.map((match, matchIndex) => (
                      <TableRow key={matchIndex}>
                        <TableCell>{match.player1.name || `${match.player1.firstName} ${match.player1.lastName}`}</TableCell>
                        <TableCell>{match.player2.name || `${match.player2.firstName} ${match.player2.lastName}`}</TableCell>
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
                    {match.player1.firstName} {match.player1.lastName} vs {match.player2.firstName} {match.player2.lastName}
                  </TableCell>
                  <TableCell>{match.date || 'No definida'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}

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
                {selectedMatch.match.player1.firstName} {selectedMatch.match.player1.lastName} vs {selectedMatch.match.player2.firstName} {selectedMatch.match.player2.lastName}
              </Typography>
              {setScores.map((set, index) => (
                index < tournament.format.sets && (
                  <Box key={index} sx={{ mt: 2 }}>
                    <Typography>Set {index + 1}</Typography>
                    <TextField
                      label="Puntaje Jugador 1"
                      type="number"
                      value={set.player1}
                      onChange={(e) => handleScoreChange(index, 'player1', e.target.value)}
                      fullWidth
                      sx={{ mt: 1 }}
                    />
                    <TextField
                      label="Puntaje Jugador 2"
                      type="number"
                      value={set.player2}
                      onChange={(e) => handleScoreChange(index, 'player2', e.target.value)}
                      fullWidth
                      sx={{ mt: 1 }}
                    />
                    {(parseInt(set.player1) >= tournament.format.tiebreakSet && parseInt(set.player2) >= tournament.format.tiebreakSet) && (
                      <>
                        <TextField
                          label="Tiebreak Jugador 1"
                          type="number"
                          value={set.tiebreak1}
                          onChange={(e) => handleScoreChange(index, 'tiebreak1', e.target.value)}
                          fullWidth
                          sx={{ mt: 1 }}
                        />
                        <TextField
                          label="Tiebreak Jugador 2"
                          type="number"
                          value={set.tiebreak2}
                          onChange={(e) => handleScoreChange(index, 'tiebreak2', e.target.value)}
                          fullWidth
                          sx={{ mt: 1 }}
                        />
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