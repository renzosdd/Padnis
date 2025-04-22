import React from 'react';
import { Box, Typography, Grid, Card, CardContent, Avatar, Button } from '@mui/material';
import { getPlayerName } from './tournamentUtils.js';

const TournamentGroups = ({ tournament, role, openMatchDialog, generateKnockoutPhase }) => {
  return (
    <Box sx={{ p: 2, height: 'auto' }}>
      <Box sx={{ width: '100%', overflowX: 'hidden' }}>
        {tournament.groups && Array.isArray(tournament.groups) && tournament.groups.length > 0 ? (
          tournament.groups.map((group, groupIndex) => (
            <Box key={group.name || groupIndex} sx={{ mb: 3 }}>
              <Typography
                variant="h6"
                sx={{ fontSize: 'clamp(1rem, 5vw, 1.25rem)', mb: 2 }}
              >
                {group.name || `Grupo ${groupIndex + 1}`}
              </Typography>
              <Grid container spacing={2}>
                {group.matches && Array.isArray(group.matches) && group.matches.length > 0 ? (
                  group.matches.map((match, matchIndex) => (
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
                                  {match.player2?.player1 ? getPlayerName(tournament, match.player2.player1).charAt(0) : '?'}
                                </Avatar>
                                <Typography sx={{ fontSize: 'clamp(0.75rem, 3vw, 0.875rem)' }}>
                                  {match.player2?.player1 ? getPlayerName(tournament, match.player2.player1, match.player2.player2) : 'Jugador no definido'}
                                </Typography>
                              </Box>
                            </Box>
                            <Typography sx={{ fontSize: 'clamp(0.875rem, 3.5vw, 1rem)', fontWeight: 'bold', color: '#01579b' }}>
                              {match.result?.winner && match.result?.sets && match.result.sets.length > 0 ? (
                                match.result.sets.map((set, idx) => (
                                  <span key={idx}>
                                    {set.player1 || 0} - {set.player2 || 0}{' '}
                                    {set.tiebreak1 && set.tiebreak2
                                      ? `(${set.tiebreak1}-${set.tiebreak2})`
                                      : ''}
                                  </span>
                                ))
                              ) : 'Pendiente'}
                            </Typography>
                          </Box>
                          <Typography sx={{ fontSize: 'clamp(0.75rem, 3.5vw, 0.875rem)', color: 'text.secondary', mt: 1 }}>
                            Fecha: {match.date || 'No definida'}
                          </Typography>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => openMatchDialog(match, groupIndex, matchIndex)}
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
                  <Typography>No hay partidos disponibles para este grupo.</Typography>
                )}
              </Grid>
            </Box>
          ))
        ) : (
          <Typography>No hay grupos disponibles para mostrar.</Typography>
        )}
        {(role === 'admin' || role === 'coach') && (!tournament.rounds || tournament.rounds.length === 0) && (
          <Button
            variant="contained"
            onClick={generateKnockoutPhase}
            sx={{
              mt: 2,
              bgcolor: '#0288d1',
              '&:hover': { bgcolor: '#0277bd' },
              fontSize: 'clamp(0.875rem, 4vw, 1rem)',
            }}
          >
            Generar Fase Eliminatoria
          </Button>
        )}
      </Box>
    </Box>
  );
};

export default TournamentGroups;