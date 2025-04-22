import React from 'react';
import { Box, Typography, Grid, Card, CardContent, Avatar, Button, IconButton } from '@mui/material';
import HourglassEmpty from '@mui/icons-material/HourglassEmpty';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Edit from '@mui/icons-material/Edit';

const TournamentBracket = ({ tournament, role, getPlayerName, getRoundName, openMatchDialog, advanceEliminationRound }) => {
  const canEdit = role === 'admin' || role === 'coach';

  return (
    <Box sx={{ p: { xs: 1, sm: 2 } }}>
      {tournament.rounds.map((round, roundIndex) => (
        <Box key={round.round} sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' }, color: '#1976d2', mb: 1 }}>
            {getRoundName(round.round, tournament.rounds.length)}
          </Typography>
          <Grid container spacing={2}>
            {round.matches.map((match, matchIndex) => (
              <Grid item xs={12} key={match._id}>
                <Card
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    p: 1,
                    height: '120px',
                    bgcolor: '#fff',
                    border: '1px solid #e0e0e0',
                    borderRadius: 2,
                  }}
                  aria-label={`Partido ${matchIndex + 1} de ${getRoundName(round.round, tournament.rounds.length)}`}
                >
                  <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ bgcolor: '#1976d2', width: 24, height: 24, fontSize: '0.75rem' }}>
                          {getPlayerName(match.player1?.player1, tournament)?.[0]}
                        </Avatar>
                        <Typography sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, maxWidth: '150px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {getPlayerName(match.player1?.player1, tournament)}
                          {match.player1?.player2 && ` / ${getPlayerName(match.player1?.player2, tournament)}`}
                        </Typography>
                      </Box>
                      <Typography sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>vs</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ bgcolor: '#424242', width: 24, height: 24, fontSize: '0.75rem' }}>
                          {match.player2?.name ? 'BYE' : getPlayerName(match.player2?.player1, tournament)?.[0]}
                        </Avatar>
                        <Typography sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, maxWidth: '150px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {match.player2?.name || getPlayerName(match.player2?.player1, tournament)}
                          {match.player2?.player2 && !match.player2.name && ` / ${getPlayerName(match.player2?.player2, tournament)}`}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 'auto' }}>
                      {match.result?.winner ? (
                        <CheckCircle sx={{ color: '#388e3c', fontSize: '1rem' }} aria-label="Partido completado" />
                      ) : (
                        <HourglassEmpty sx={{ color: '#757575', fontSize: '1rem' }} aria-label="Partido pendiente" />
                      )}
                      <Typography sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                        {match.result?.winner ? 'Completado' : 'Pendiente'}
                      </Typography>
                      {canEdit && (
                        <IconButton
                          onClick={() => openMatchDialog(match, null, matchIndex, roundIndex)}
                          disabled={roundIndex < tournament.rounds.length - 1 && match.result?.winner}
                          sx={{ ml: 'auto' }}
                          aria-label={match.result?.winner ? 'Editar resultado del partido' : 'Actualizar resultado del partido'}
                        >
                          {match.result?.winner ? <Edit fontSize="small" /> : <Edit fontSize="small" />}
                        </IconButton>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
          {canEdit && roundIndex === tournament.rounds.length - 1 && (
            <Button
              variant="contained"
              onClick={() => advanceEliminationRound()}
              sx={{ mt: 2, bgcolor: '#1976d2', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
              aria-label="Avanzar a la siguiente ronda"
            >
              Avanzar Ronda
            </Button>
          )}
        </Box>
      ))}
    </Box>
  );
};

export default TournamentBracket;