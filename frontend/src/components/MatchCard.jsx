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
  handleLocalInputChange,
  matchErrors,
  getPlayerName,
  tournament,
  onSave,
  onToggleEdit,
  canEdit
}) => {
  const theme = useTheme();

  // Inicializamos matchTiebreak aunque venga undefined
  const [localResult, setLocalResult] = useState({
    ...matchResult,
    matchTiebreak1: matchResult.matchTiebreak1 ?? '',
    matchTiebreak2: matchResult.matchTiebreak2 ?? ''
  });

  const [isEditing, setIsEditing] = useState(
    !matchResult.saved && canEdit && tournament.status === 'En curso'
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    setLocalResult({
      ...matchResult,
      matchTiebreak1: matchResult.matchTiebreak1 ?? '',
      matchTiebreak2: matchResult.matchTiebreak2 ?? ''
    });
  }, [matchResult]);

  // Detectar empate si es a 2 sets
  const isTied =
    totalSets === 2 &&
    Array.isArray(localResult.sets) &&
    localResult.sets.reduce((acc, s) => {
      const p1 = +s.player1;
      const p2 = +s.player2;
      const tb1 = +s.tiebreak1;
      const tb2 = +s.tiebreak2;
      if (p1 > p2 || (p1 === p2 && tb1 > tb2)) return acc + 1;
      if (p2 > p1 || (p1 === p2 && tb2 > tb1)) return acc - 1;
      return acc;
    }, 0) === 0;

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);
    try {
      const errs = await onSave(match._id, localResult);
      if (!errs) {
        setIsEditing(false);
      } else {
        setSaveError(errs.general || 'Error al guardar');
      }
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (e) => {
    e.preventDefault();
    onToggleEdit(match._id);
    setIsEditing(true);
  };

  // Primera letra para el Avatar, con fallback a string vacío
  const name1 = getPlayerName(tournament, match.player1.player1) || '';
  const letter1 = name1.charAt(0);

  const name2 = match.player1.player2
    ? getPlayerName(tournament, match.player1.player2) || ''
    : '';
  const avatarLetter = letter1 || name2.charAt(0) || '';

  return (
    <Box
      sx={{
        p: 2,
        mb: 2,
        border: matchResult.saved
          ? `2px solid ${theme.palette.success.main}`
          : `1px solid ${theme.palette.divider}`,
        borderRadius: 2,
        bgcolor: 'background.paper',
        width: '100%'
      }}
    >
      {saveError && <Alert severity="error">{saveError}</Alert>}

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
          {avatarLetter}
        </Avatar>
        <Typography flex={1}>
          {name1}
          {match.player1.player2
            ? ` / ${getPlayerName(tournament, match.player1.player2) || ''}`
            : ''}
        </Typography>
        <Typography>vs</Typography>
        <Typography flex={1} textAlign="right">
          {getPlayerName(tournament, match.player2.player1) || ''}
          {match.player2.player2
            ? ` / ${getPlayerName(tournament, match.player2.player2) || ''}`
            : ''}
        </Typography>
      </Box>

      <Collapse in={!matchResult.saved || isEditing}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2
          }}
        >
          {localResult.sets.map((s, i) => (
            <Box
              key={i}
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <TextField
                type="number"
                size="small"
                value={s.player1}
                onChange={(e) =>
                  handleLocalInputChange(
                    match._id,
                    `set${i}-0`,
                    e.target.value
                  )
                }
                inputProps={{ min: 0 }}
                error={!!matchErrors[`set${i}`]}
                sx={{ width: 50 }}
              />
              <Typography>-</Typography>
              <TextField
                type="number"
                size="small"
                value={s.player2}
                onChange={(e) =>
                  handleLocalInputChange(
                    match._id,
                    `set${i}-1`,
                    e.target.value
                  )
                }
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
                    onChange={(e) =>
                      handleLocalInputChange(
                        match._id,
                        `tiebreak${i}-1`,
                        e.target.value
                      )
                    }
                    inputProps={{ min: 0 }}
                    error={!!matchErrors[`set${i}`]}
                    sx={{ width: 50 }}
                  />
                  <Typography>-</Typography>
                  <TextField
                    type="number"
                    size="small"
                    value={s.tiebreak2}
                    onChange={(e) =>
                      handleLocalInputChange(
                        match._id,
                        `tiebreak${i}-2`,
                        e.target.value
                      )
                    }
                    inputProps={{ min: 0 }}
                    error={!!matchErrors[`set${i}`]}
                    sx={{ width: 50 }}
                  />
                </>
              )}
            </Box>
          ))}

          {isTied && totalSets === 2 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography>TB:</Typography>
              <TextField
                type="number"
                size="small"
                value={localResult.matchTiebreak1 ?? ''}
                onChange={(e) =>
                  handleLocalInputChange(
                    match._id,
                    'matchTiebreak1',
                    e.target.value
                  )
                }
                inputProps={{ min: 0 }}
                error={!!matchErrors.matchTiebreak}
                sx={{ width: 50 }}
              />
              <Typography>-</Typography>
              <TextField
                type="number"
                size="small"
                value={localResult.matchTiebreak2 ?? ''}
                onChange={(e) =>
                  handleLocalInputChange(
                    match._id,
                    'matchTiebreak2',
                    e.target.value
                  )
                }
                inputProps={{ min: 0 }}
                error={!!matchErrors.matchTiebreak}
                sx={{ width: 50 }}
              />
            </Box>
          )}
        </Box>
      </Collapse>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
        {matchResult.saved && !isEditing && canEdit ? (
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
