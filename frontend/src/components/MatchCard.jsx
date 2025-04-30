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

const MatchCard = ({
  match,
  matchResult,
  totalSets,
  matchErrors,
  tournament,
  onResultChange,
  getPlayerName,
  onSave,
  canEdit
}) => {
  const theme = useTheme();

  // Asegura siempre un array de tamaño totalSets
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
    matchTiebreak: matchResult.matchTiebreak || { player1: '', player2: '' },
    saved: matchResult.saved
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
      matchTiebreak: matchResult.matchTiebreak || { player1: '', player2: '' },
      saved: matchResult.saved
    });
  }, [matchResult, totalSets]);

  const handleInputChange = (field, value) => {
    setLocalResult(prev => {
      const next = { ...prev, sets: normalizeSets(prev.sets), saved: false };
      if (field.startsWith('set')) {
        const [, si, pi] = field.match(/^set(\d+)-(\d)$/) || [];
        next.sets[+si][`player${+pi + 1}`] = value;
      } else if (field.startsWith('tiebreak')) {
        const [, si, pi] = field.match(/^tiebreak(\d+)-(\d)$/) || [];
        next.sets[+si][`tiebreak${+pi + 1}`] = value;
      } else if (field.startsWith('matchTiebreak')) {
        const [, pi] = field.match(/^matchTiebreak-(\d)$/) || [];
        next.matchTiebreak = { ...next.matchTiebreak };
        next.matchTiebreak[`player${+pi + 1}`] = value;
      }
      return next;
    });
    if (typeof onResultChange === 'function') {
      onResultChange(match._id, field, value);
    }
  };

  // Calcula ganador y runnerUp basados en sets y tiebreak
  const calculateWinner = () => {
    const wins1 = localResult.sets.reduce((a, s) => a + ((+s.player1 > +s.player2) ? 1 : 0), 0);
    const wins2 = localResult.sets.reduce((a, s) => a + ((+s.player2 > +s.player1) ? 1 : 0), 0);
    let winner, runnerUp;
    if (wins1 > wins2) {
      winner = match.player1;
      runnerUp = match.player2;
    } else if (wins2 > wins1) {
      winner = match.player2;
      runnerUp = match.player1;
    } else {
      if (+localResult.matchTiebreak.player1 > +localResult.matchTiebreak.player2) {
        winner = match.player1;
        runnerUp = match.player2;
      } else {
        winner = match.player2;
        runnerUp = match.player1;
      }
    }
    return { winner, runnerUp };
  };

  const handleSaveClick = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);
    try {
      const { winner, runnerUp } = calculateWinner();
      const resultToSave = { ...localResult, winner, runnerUp };
      const errs = await onSave(match._id, resultToSave);
      if (!errs) setIsEditing(false);
      else setSaveError(errs.general || 'Error al guardar');
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditClick = (e) => {
    e.preventDefault();
    setIsEditing(true);
  };

  // Nombres (usa datos poblados o getPlayerName como fallback)
  const { player1: p1, player2: p1B } = match.player1;
  const { player1: p2, player2: p2B } = match.player2;
  const name1 = typeof p1 === 'object' && p1.firstName
    ? `${p1.firstName} ${p1.lastName}`
    : getPlayerName(tournament, p1) || 'Jugador';
  const name2 = typeof p2 === 'object' && p2.firstName
    ? `${p2.firstName} ${p2.lastName}`
    : getPlayerName(tournament, p2) || 'Jugador';
  const name1B = p1B
    ? (typeof p1B === 'object' && p1B.firstName
      ? `${p1B.firstName} ${p1B.lastName}`
      : getPlayerName(tournament, p1B))
    : null;
  const name2B = p2B
    ? (typeof p2B === 'object' && p2B.firstName
      ? `${p2B.firstName} ${p2B.lastName}`
      : getPlayerName(tournament, p2B))
    : null;

  return (
    <Box sx={{
      p: 2,
      mb: 2,
      border: localResult.saved
        ? `2px solid ${theme.palette.success.main}`
        : `1px solid ${theme.palette.divider}`,
      borderRadius: 2,
      bgcolor: 'background.paper',
      width: '100%'
    }}>
      {saveError && <Alert severity="error">{saveError}</Alert>}

      {/* Header de jugadores */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Avatar sx={{ bgcolor: theme.palette.primary.main }}>{name1.charAt(0)}</Avatar>
        <Typography flex={1}>
          {name1}{name1B && ` / ${name1B}`}
        </Typography>
        <Typography>vs</Typography>
        <Typography flex={1} textAlign="right">
          {name2}{name2B && ` / ${name2B}`}
        </Typography>
      </Box>

      {/* Score o Inputs */}
      {localResult.saved && !isEditing && canEdit ? (
        <Typography sx={{ fontSize: '0.875rem', mb: 1 }}>
          {localResult.sets.map((s, i) => (
            <span key={i}>
              Set {i + 1}: {s.player1 || 0}-{s.player2 || 0}
              {s.player1 === 6 && s.player2 === 6 && ` (TB ${s.tiebreak1 || 0}-${s.tiebreak2 || 0})`}
              {i < localResult.sets.length - 1 && '; '}
            </span>
          ))}
          {totalSets === 2 && localResult.sets.reduce((a, s) => a + ((+s.player1 > +s.player2 ? 1 : -1)), 0) === 0 &&
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
                  onChange={e => handleInputChange(`set${i}-0`, e.target.value)}
                  inputProps={{ min: 0 }}
                  error={!!matchErrors[`set${i}`]}
                  sx={{ width: 50 }}
                />
                <Typography>-</Typography>
                <TextField
                  type="number"
                  size="small"
                  value={s.player2}
                  onChange={e => handleInputChange(`set${i}-1`, e.target.value)}
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
                      onChange={e => handleInputChange(`tiebreak${i}-1`, e.target.value)}
                      inputProps={{ min: 0 }}
                      error={!!matchErrors[`set${i}`]}
                      sx={{ width: 50 }}
                    />
                    <Typography>-</Typography>
                    <TextField
                      type="number"
                      size="small"
                      value={s.tiebreak2}
                      onChange={e => handleInputChange(`tiebreak${i}-2`, e.target.value)}
                      inputProps={{ min: 0 }}
                      error={!!matchErrors[`set${i}`]}
                      sx={{ width: 50 }}
                    />
                  </>
                )}
              </Box>
            ))}
            {totalSets === 2 && localResult.sets.reduce((a, s) => a + ((+s.player1 > +s.player2 ? 1 : -1)), 0) === 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography>Match TB:</Typography>
                <TextField
                  type="number"
                  size="small"
                  value={localResult.matchTiebreak.player1}
                  onChange={e => handleInputChange('matchTiebreak-0', e.target.value)}
                  inputProps={{ min: 0 }}
                  error={!!matchErrors.matchTiebreak}
                  sx={{ width: 50 }}
                />
                <Typography>-</Typography>
                <TextField
                  type="number"
                  size="small"
                  value={localResult.matchTiebreak.player2}
                  onChange={e => handleInputChange('matchTiebreak-1', e.target.value)}
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
          <IconButton onClick={handleEditClick}>
            <EditIcon />
          </IconButton>
        ) : canEdit ? (
          <IconButton onClick={handleSaveClick} disabled={isSaving}>
            {isSaving ? <CircularProgress size={24} /> : <SaveIcon />}
          </IconButton>
        ) : null}
      </Box>
    </Box>
  );
};

export default MatchCard;
