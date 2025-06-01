import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  TextField,
  Button,
  Grid,
  Typography,
} from '@mui/material';
import PropTypes from 'prop-types';

/**
 * MatchCard muestra inputs de sets, tiebreak del partido y permite guardar resultados.
 *
 * Props esperadas:
 * - match: objeto con datos del partido (player1, player2, result, etc.)
 * - matchResult: { sets, matchTiebreak: { player1, player2 }, winner, runnerUp, saved }
 * - totalSets: número de sets correspondientes al torneo
 * - onResultChange(matchId, campo, valor): callback para actualizar matchResults en el hook
 * - onSaveResult(): callback para guardar el resultado (ya incluye matchId internamente)
 * - matchErrors: objeto con errores de validación (p. ej. { 'set0': 'Error mensaje' })
 * - getPlayerName: función para obtener el nombre visible de un jugador (se pasa desde parent)
 * - canEdit: boolean que indica si el usuario puede editar resultados
 */
const MatchCard = ({
  match,
  matchResult,
  totalSets,
  onResultChange,
  onSaveResult,
  matchErrors,
  getPlayerName,
  canEdit,
}) => {
  const [isEditing, setIsEditing] = useState(!matchResult.saved && canEdit);

  useEffect(() => {
    // Si el partido ya está guardado, no permitir editar
    setIsEditing(!matchResult.saved && canEdit);
  }, [matchResult.saved, canEdit]);

  const handleChange = (field) => (e) => {
    onResultChange(match._id, field, e.target.value);
  };

  const handleTiebreakChange = (playerKey) => (e) => {
    onResultChange(match._id, `matchTiebreak.${playerKey}`, e.target.value);
  };

  const handleWinnerSelection = (playerKey) => () => {
    const newWinner = { player1: null, player2: null };
    newWinner[playerKey] = match?.[playerKey]?.player1 || null;
    onResultChange(match._id, 'winner', newWinner);
  };

  const handleSave = async () => {
    await onSaveResult(match._id);
  };

  return (
    <Card sx={{ width: 300 }}>
      <CardContent>
        <Typography variant="subtitle1">
          {getPlayerName(match.player1)} vs {getPlayerName(match.player2)}
        </Typography>

        <Grid container spacing={1} sx={{ mt: 1 }}>
          {[...Array(totalSets)].map((_, idx) => (
            <React.Fragment key={`set-row-${idx}`}>
              <Grid item xs={5}>
                <TextField
                  label={`Set ${idx + 1} - P1`}
                  type="number"
                  size="small"
                  fullWidth
                  disabled={!isEditing}
                  value={matchResult.sets[idx]?.player1 || ''}
                  onChange={handleChange(`set${idx}.player1`)}
                  error={!!matchErrors[`set${idx}`]}
                  helperText={matchErrors[`set${idx}`]}
                />
              </Grid>
              <Grid item xs={5}>
                <TextField
                  label={`Set ${idx + 1} - P2`}
                  type="number"
                  size="small"
                  fullWidth
                  disabled={!isEditing}
                  value={matchResult.sets[idx]?.player2 || ''}
                  onChange={handleChange(`set${idx}.player2`)}
                  error={!!matchErrors[`set${idx}`]}
                  helperText={matchErrors[`set${idx}`]}
                />
              </Grid>
              {matchResult.sets[idx]?.player1 === 6 &&
                matchResult.sets[idx]?.player2 === 6 && (
                  <>
                    <Grid item xs={1}>
                      <Typography>TB</Typography>
                    </Grid>
                    <Grid item xs={5}>
                      <TextField
                        label="Tie P1"
                        type="number"
                        size="small"
                        fullWidth
                        disabled={!isEditing}
                        value={matchResult.sets[idx]?.tiebreak1 || ''}
                        onChange={handleChange(`set${idx}.tiebreak1`)}
                        error={!!matchErrors[`set${idx}.tiebreak`]}
                        helperText={matchErrors[`set${idx}.tiebreak`]}
                      />
                    </Grid>
                    <Grid item xs={5}>
                      <TextField
                        label="Tie P2"
                        type="number"
                        size="small"
                        fullWidth
                        disabled={!isEditing}
                        value={matchResult.sets[idx]?.tiebreak2 || ''}
                        onChange={handleChange(`set${idx}.tiebreak2`)}
                        error={!!matchErrors[`set${idx}.tiebreak`]}
                        helperText={matchErrors[`set${idx}.tiebreak`]}
                      />
                    </Grid>
                  </>
                )}
            </React.Fragment>
          ))}

          {/* Tiebreak de partido (si aplica) */}
          <Grid item xs={6} sx={{ mt: 1 }}>
            <TextField
              label="Match Tie P1"
              type="number"
              size="small"
              fullWidth
              disabled={!isEditing}
              value={matchResult.matchTiebreak.player1 || ''}
              onChange={handleTiebreakChange('player1')}
              error={!!matchErrors.matchTiebreak}
              helperText={matchErrors.matchTiebreak}
            />
          </Grid>
          <Grid item xs={6} sx={{ mt: 1 }}>
            <TextField
              label="Match Tie P2"
              type="number"
              size="small"
              fullWidth
              disabled={!isEditing}
              value={matchResult.matchTiebreak.player2 || ''}
              onChange={handleTiebreakChange('player2')}
              error={!!matchErrors.matchTiebreak}
              helperText={matchErrors.matchTiebreak}
            />
          </Grid>
        </Grid>

        {isEditing && (
          <Button
            variant="contained"
            color="primary"
            fullWidth
            sx={{ mt: 2 }}
            onClick={handleSave}
          >
            Guardar
          </Button>
        )}
        {!isEditing && canEdit && (
          <Typography variant="caption" color="textSecondary" sx={{ mt: 1 }}>
            Resultado guardado
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

MatchCard.propTypes = {
  match: PropTypes.object.isRequired,
  matchResult: PropTypes.shape({
    sets: PropTypes.arrayOf(
      PropTypes.shape({
        player1: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
        player2: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
        tiebreak1: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
        tiebreak2: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      })
    ),
    matchTiebreak: PropTypes.shape({
      player1: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      player2: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    }),
    winner: PropTypes.object,
    runnerUp: PropTypes.object,
    saved: PropTypes.bool,
  }).isRequired,
  totalSets: PropTypes.number.isRequired,
  onResultChange: PropTypes.func.isRequired,
  onSaveResult: PropTypes.func.isRequired,
  matchErrors: PropTypes.object.isRequired,
  getPlayerName: PropTypes.func.isRequired,
  canEdit: PropTypes.bool.isRequired,
};

export default MatchCard;
