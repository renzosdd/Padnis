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

  const normalizeSets = (sets) => {
    if (Array.isArray(sets)) {
      const arr = [...sets];
      while (arr.length < totalSets) {
        arr.push({ player1: '', player2: '', tiebreak1: '', tiebreak2: '' });
      }
      return arr.slice(0, totalSets);
    }
    return Array.from({ length: totalSets }, () => ({ player1: '', player2: '', tiebreak1: '', tiebreak2: '' }));
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

  const handleLocalInputChange = (key, value) => {
    setLocalResult(prev => {
      const next = { ...prev };
      if (key.startsWith('set')) {
        const [prefix, idxStr] = key.split('-');
        const setIndex = parseInt(prefix.replace('set', ''), 10);
        const playerIndex = parseInt(idxStr, 10);
        const setObj = { ...next.sets[setIndex] };
        if (playerIndex === 0) setObj.player1 = value;
        if (playerIndex === 1) setObj.player2 = value;
        next.sets = next.sets.map((item, idx) => idx === setIndex ? setObj : item);
      } else if (key.startsWith('tiebreak')) {
        const [prefix, idxStr] = key.split('-');
        const setIndex = parseInt(prefix.replace('tiebreak', ''), 10);
        const tbIndex = parseInt(idxStr, 10);
        const setObj = { ...next.sets[setIndex] };
        if (tbIndex === 1) setObj.tiebreak1 = value;
        if (tbIndex === 2) setObj.tiebreak2 = value;
        next.sets = next.sets.map((item, idx) => idx === setIndex ? setObj : item);
      } else if (key.startsWith('matchTiebreak')) {
        const [, idxStr] = key.split('-');
        const tbIndex = parseInt(idxStr, 10);
        next.matchTiebreak = { ...next.matchTiebreak };
        if (tbIndex === 0) next.matchTiebreak.player1 = value;
        if (tbIndex === 1) next.matchTiebreak.player2 = value;
      }
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

  // Helpers to get display name and initial
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
        <Avatar sx={{ bgcolor: theme.palette.primary.main }}>{name1.charAt(0)}</Avatar>
        <Typography flex={1}>
          {name1}
          {match.player1.player2 &&
            ` / ${getPlayerName(tournament, match.player1.player2)}`
          }
        </Typography>
        <Typography>vs</Typography>
        <Typography flex={1} textAlign="right">
          {name2}
          {match.player2.player2 &&
            ` / ${getPlayerName(tournament, match.player2.player2)}`
          }
        </Typography>
      </Box>

      {/* Score or inputs */}
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
            localResult.sets.reduce((a, s) => a + ((+s.player1 > +s.player2 ? 1 : -1)), 0) === 0 &&
            `, Match TB ${localResult.matchTiebreak.player1 || 0}-${localResult.matchTiebreak.player2 || 0}`
          }
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
                      onChange={e => handleLocalInputChange(`tiebreak${i}-2`, e.target.value)}
                      inputProps={{ min: 0 }}
                      error={!!matchErrors[`set${i}`]}
                      sx={{ width: 50 }}
                    />
                  </>
                )}
              </Box>
            ))}
            {totalSets === 2 &&
              localResult.sets.reduce((a, s) => a + ((+s.player1 > +s.player2 ? 1 : -1)), 0) === 0 && (
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
