import React from 'react';
import { Box, Typography, Grid, Card, CardContent, Avatar, Button } from '@mui/material';
import { getPlayerName, getRoundName } from '../../utils/tournamentUtils';

const TournamentBracket = ({ tournament, role, openMatchDialog, advanceEliminationRound }) => {
  if (!tournament) {
    return <Typography>Cargando...</Typography>;
  }
  if (!tournament.rounds || !Array.isArray(tournament.rounds) || tournament.rounds.length === 0) {
    return <Typography>No hay rondas disponibles para mostrar.</Typography>;
  }

  return (
    <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      {tournament.rounds.map((round, roundIndex) => {
        const numTeams = round.matches?.length * 2 || 0;
        return (
          <Box key={round.round || roundIndex} sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ fontSize: 'clamp(1rem, 5vw, 1.25rem)', mb: 2 }}>
              {getRoundName(numTeams, tournament.rounds?.length)}
            </Typography>
            <Grid container spacing={2}>
              {round.matches && Array.isArray(round.matches) && round.matches.length > 0 ? (
                round.matches.map((match, matchIndex) => (
                  <Grid item xs={12} key={matchIndex}>
                    <Card sx={{ bgcolor: '#ffffff', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)', width: '100%' }}>
                      <CardContent sx={{ p: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar sx={{ bgcolor: '#01579b', width: 24, height: 24 }}>
                                {match.player1?.player1 ? getPlayerName(tournament, match.player1.player1).charAt(0) : '?'}
                              </Avatar>
                              <Typography sx={{ fontSize: 'clamp(0.75rem, 3vw, 0.875rem)' }}>
                                {match.player1?.player1 ? getPlayerName(tournament, match.player1.player1, match.player1.player2) : 'Jugador no definido'}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar sx={{ bgcolor: '#0288d1', width: 24, height: 24 }}>
                                {match.player2?.name ? 'BYE' : (match.player2?.player1 ? getPlayerName(tournament, match.player2.player1).charAt(0) : '?')}
                              </Avatar>
                              <Typography sx={{ fontSize: 'clamp(0.75rem, 3vw, 0.875rem)' }}>
                                {match.player2?.name || (match.player2?.player1 ? getPlayerName(tournament, match.player2.player1, match.player2.player2) : 'Jugador no definido')}
                              </Typography>
                            </Box>
                          </Box>
                          <Typography sx={{ fontSize: 'clamp(0.875rem, 3.5vw, 1rem)', fontWeight: 'bold', color: '#01579b' }}>
                            {match.result?.winner && match.result?.sets && match.result.sets.length > 0 ? (
                              match.result.sets.map((set, i) => (
                                <span key={i}>
                                  {set.player1 || 0}-{set.player2 || 0}
                                  {set.tiebreak1 ? ` (${set.tiebreak1}-${set.tiebreak2})` : ''}{' '}
                                </span>
                              ))
                            ) : 'Pendiente'}
                          </Typography>
                        </Box>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => openMatchDialog(match, null, matchIndex, roundIndex)}
                          disabled={match.result?.winner !== null}
                          sx={{ mt: 1, fontSize: 'clamp(0.75rem, 3.5vw, 0.875rem)' }}
                        >
                          Actualizar Resultado
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                ))
              ) : (
                <Typography>No hay partidos disponibles para esta ronda.</Typography>
              )}
            </Grid>
          </Box>
        );
      })}
      {(role === 'admin' || role === 'coach') && tournament.rounds.length > 0 && tournament.rounds[tournament.rounds.length - 1].matches.length > 1 && (
        <Button
          variant="contained"
          onClick={advanceEliminationRound}
          sx={{
            mt: 2,
            bgcolor: '#0288d1',
            '&:hover': { bgcolor: '#0277bd' },
            fontSize: 'clamp(0.875rem, 4vw, 1rem)',
          }}
        >
          Avanzar a la Siguiente Ronda
        </Button>
      )}
    </Box>
  );
};

export default TournamentBracket;