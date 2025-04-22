import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Avatar,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import HourglassEmpty from '@mui/icons-material/HourglassEmpty';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Edit from '@mui/icons-material/Edit';

const TournamentGroups = ({ tournament, role, openMatchDialog, generateKnockoutPhase }) => {
  const [confirmKnockoutOpen, setConfirmKnockoutOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const canEdit = role === 'admin' || role === 'coach';
  const hasKnockout = tournament.rounds && tournament.rounds.length > 0;

  const groups = useMemo(() => {
    if (!tournament?.groups || !Array.isArray(tournament.groups)) return [];
    return tournament.groups;
  }, [tournament]);

  const handleConfirmKnockout = async () => {
    setIsLoading(true);
    try {
      await generateKnockoutPhase();
      setConfirmKnockoutOpen(false);
    } catch (error) {
      // Error handling is managed by useTournament
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
        <CircularProgress aria-label="Generando fase eliminatoria" />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1, sm: 2 } }}>
      {groups.length > 0 ? (
        groups.map((group, groupIndex) => (
          <Box key={group.name || groupIndex} sx={{ mb: 3 }}>
            <Typography
              variant="h6"
              sx={{ fontSize: { xs: '1rem', sm: '1.25rem' }, mb: 2, color: '#1976d2' }}
            >
              {group.name || `Grupo ${groupIndex + 1}`}
            </Typography>
            <Grid container spacing={2}>
              {group.matches && Array.isArray(group.matches) && group.matches.length > 0 ? (
                group.matches.map((match, matchIndex) => (
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
                      aria-label={`Partido ${matchIndex + 1} del ${group.name}`}
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
                              onClick={() => openMatchDialog(match, groupIndex, matchIndex)}
                              disabled={hasKnockout && match.result?.winner}
                              sx={{ ml: 'auto' }}
                              aria-label={match.result?.winner ? 'Editar resultado del partido' : 'Actualizar resultado del partido'}
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))
              ) : (
                <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                  No hay partidos disponibles para este grupo.
                </Typography>
              )}
            </Grid>
          </Box>
        ))
      ) : (
        <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
          No hay grupos disponibles para mostrar.
        </Typography>
      )}
      {canEdit && tournament.type === 'RoundRobin' && !hasKnockout && (
        <Button
          variant="contained"
          onClick={() => setConfirmKnockoutOpen(true)}
          sx={{ mt: 2, bgcolor: '#1976d2', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
          aria-label="Generar fase eliminatoria"
        >
          Generar Fase Eliminatoria
        </Button>
      )}
      <Dialog open={confirmKnockoutOpen} onClose={() => setConfirmKnockoutOpen(false)} aria-labelledby="confirm-knockout-dialog-title">
        <DialogTitle id="confirm-knockout-dialog-title">Confirmar Fase Eliminatoria</DialogTitle>
        <DialogContent>
          <Typography>¿Estás seguro de que quieres generar la fase eliminatoria? Esto puede modificar la estructura del torneo.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmKnockoutOpen(false)} aria-label="Cancelar generación de fase eliminatoria">Cancelar</Button>
          <Button onClick={handleConfirmKnockout} variant="contained" aria-label="Confirmar generación de fase eliminatoria">
            Generar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TournamentGroups;