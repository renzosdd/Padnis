import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Avatar,
  CircularProgress,
  Alert,
  Collapse
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import { useTheme } from '@mui/material/styles';
import { getPlayerName } from '../utils/tournamentUtils';

const MatchCard = ({
  match,
  matchResult,
  totalSets,
  matchErrors,
  tournament,
  onSave,
  canEdit
}) => {
  const theme = useTheme();

  // Aseguramos siempre un array de sets
  const normalizeSets = (setsArg) => {
    const sets = Array.isArray(setsArg) ? [...setsArg] : [];
    while (sets.length < totalSets) {
      sets.push({ player1: '', player2: '', tiebreak1: '', tiebreak2: '' });
    }
    return sets.slice(0, totalSets);
  };

  const [localResult, setLocalResult] = useState(() => ({
    ...matchResult,
    sets: normalizeSets(matchResult.sets),
    matchTiebreak: matchResult.matchTiebreak || { player1: '', player2: '' }
  }));
  const [isEditing, setIsEditing] = useState(
    !matchResult.saved && canEdit && tournament.status === 'En curso'
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    setLocalResult({
      ...matchResult,
      sets: normalizeSets(matchResult.sets),
      matchTiebreak: matchResult.matchTiebreak || { player1: '', player2: '' }
    });
  }, [matchResult, totalSets]);

  // Actualiza localResult según campo
  const handleLocalInputChange = (field, value) => {
    setLocalResult(prev => {
      const next = { ...prev };
      // Asegura array
      next.sets = normalizeSets(next.sets);

      if (field.startsWith('set')) {
        // setN-M => sets[N].player{M+1}
        const [, setIndexStr, playerIndexStr] = field.match(/^set(\d+)-(\d)$/) || [];
        const si = parseInt(setIndexStr, 10);
        const pi = parseInt(playerIndexStr, 10);
        next.sets[si][`player${pi + 1}`] = value;
      } else if (field.startsWith('tiebreak')) {
        const [, setIndexStr, tbIndexStr] = field.match(/^tiebreak(\d+)-(\d)$/) || [];
        const si = parseInt(setIndexStr, 10);
        const pi = parseInt(tbIndexStr, 10);
        next.sets[si][`tiebreak${pi + 1}`] = value;
      } else if (field.startsWith('matchTiebreak')) {
        const [, tbIndexStr] = field.match(/^matchTiebreak-(\d)$/) || [];
        const pi = parseInt(tbIndexStr, 10);
        next.matchTiebreak = { ...next.matchTiebreak };
        next.matchTiebreak[`player${pi + 1}`] = value;
      }

      next.saved = false;
      return next;
    });
  };

  const handleSave = async e => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);
    try {
      const errs = await onSave(match._id, localResult);
      if (!errs) setIsEditing(false);
      else setSaveError(errs.general || 'Error al guardar');
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = e => {
    e.preventDefault();
    setIsEditing(true);
  };

  // Obtiene nombre o placeholder
  const name1 = getPlayerName(tournament, match.player1.player1) || 'Jugador';
  const name2 = getPlayerName(tournament, match.player2.player1) || 'Jugador';

  return (
    <Box
      sx={{
        p: 2,
        mb: 2,
        border: localResult.saved
          ? `2px solid ${theme.palette.success.main}`
          : `1px solid ${theme.palette.divider}`,
        borderRadius: 2,
        bgcolor: 'background.paper',
        width: '100%'
      }}
    >
      {saveError && <Alert severity="error">{saveError}</Alert>}

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Avatar sx={{ bgcolor: theme.palette.primary.main }}>{name1[0]}</Avatar>
        <Typography flex={1}>
          {name1}
          {match.player1.player2 && ` / ${getPlayerName(tournament, match.player1.player2)}`}
        </Typography>
        <Typography>vs</Typography>
        <Typography flex={1} textAlign="right">
          {name2}
          {match.player2.player2 && ` / ${getPlayerName(tournament, match.player2.player2)}`}
        </Typography>
      </Box>

      {/* Score o Inputs */}
      {localResult.saved && !isEditing && canEdit ? (
        <Typography sx={{ fontSize: '0.875rem', mb: 1 }}>
          {localResult.sets.map((s, i) => (
            <span key={i}>
              Set {i + 1}: {s.player1 || 0}-{s.player2 || 0}
              {s.player1 === 6 && s.player2 === 6 &&
                ` (TB ${s.tiebreak1 || 0}-${s.tiebreak2 || 0})`}
              {i < localResult.sets.length - 1 && '; '}
            </span>
          ))}
          {totalSets === 2 &&
            localResult.sets.reduce((acc, s) => acc + ((+s.player1 > +s.player2 ? 1 : -1)), 0) === 0 &&
            `, Match TB ${localResult.matchTiebreak.player1 || 0}-${localResult.matchTiebreak.player2 || 0}`}
        </Typography>
      ) : (
        <Collapse in={!localResult.saved || isEditing}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
            {localResult.sets.map((s, i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TextField
                  type="number"
                  size="small"
                  value={s.player1}
                  onChange={e => handleLocalInputChange(`set${i}-0`, e.target.value)}
                  inputProps={{ min: 0 }}
                  error={!!matchErrors[`set${i}`]}
                  sx={{ width: 50 }}
                />
                <Typography>-</Typography>
                <TextField
                  type="number"
                  size="small"
                  value={s.player2}
                  onChange={e => handleLocalInputChange(`set${i}-1`, e.target.value)}
                  inputProps={{ min: 0 }}
                  error={!!matchErrors[`set${i}`]}
                  sx={{ width: 50 }}
                />
                {+s.player1 === 6 && +s.player2 === 6 && (
                  <>
                    <TextField
                      type="number"
                      size="small"
                      value={s.tiebreak1}
                      onChange={e => handleLocalInputChange(`tiebreak${i}-1`, e.target.value)}
                      inputProps={{ min: 0 }}
                      error={!!matchErrors[`set${i}`]}
                      sx={{ width: 50 }}
                    />
                    <Typography>-</Typography>
                    <TextField
                      type="number"
                      size="small"
                      value={s.tiebreak2}
                      onChange={e => handleLocalInputChange(`tModal${i}-2`, e.target.value)}
                      inputProps={{ min: 0 }}
                      error={!!matchErrors[`set${i}`]}
                      sx={{ width: 50 }}
                    />
                  </>
                )}
              </Box>
            ))}
            {totalSets === 2 &&
              localResult.sets.reduce((acc, s) => acc + ((+s.player1 > +s.player2 ? 1 : -1)), 0) === 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography>Match TB:</Typography>
                  <TextField
                    type="number"
                    size="small"
                    value={localResult.matchTiebreak.player1}
                    onChange={e => handleLocalInputChange('matchTiebreak-0', e.target.value)}
                    inputProps={{ min: 0 }}
                    error={!!matchErrors.matchTiebreak}
                    sx={{ width: 50 }}
                  />
                  <Typography>-</Typography>
                  <TextField
                    type="number"
                    size="small"
                    value={localResult.matchTiebreak.player2}
                    onChange={e => handleLocalInputChange('matchTiebreak-1', e.target.value)}
                    inputProps={{ min: 0 }}
                    error={!!matchErrors.matchTiebreak}
                    sx={{ width: 50 }}
                  />
                </Box>
              )}
          </Box>
        </Collapse>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
        {localResult.saved && !isEditing && canEdit ? (
          <IconButton onClick={handleEdit}>
            <EditIcon />
          </IconButton>
        ) : canEdit ? (
          <IconButton onClick={handleSave} disabled={isSaving}>
            {isSaving ? <CircularProgress size={24} /> : <SaveIcon />}
          </IconButton>
        ) : null}
      </Box>
    </Box>
  );
};

export default MatchCard;
