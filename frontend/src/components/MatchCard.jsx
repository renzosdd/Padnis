import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Avatar,
  Button,
  TextField,
  Select,
  MenuItem,
  Alert,
} from '@mui/material';
import HourglassEmpty from '@mui/icons-material/HourglassEmpty';
import CheckCircle from '@mui/icons-material/CheckCircle';
import { normalizeId } from './tournamentUtils.js';

const MatchCard = ({
  match,
  tournament,
  getPlayerName,
  canEdit,
  saveMatchResult,
  toggleEditMode,
  matchResult,
  matchErrors,
  isTied,
  handleInputChange,
  totalSets,
  isEditable = true,
}) => {
  const [localResult, setLocalResult] = useState(() => {
    const initialResult = { ...matchResult };
    if (!initialResult.sets || initialResult.sets.length < totalSets) {
      initialResult.sets = Array(totalSets).fill({ player1: '', player2: '', tiebreak1: '', tiebreak2: '' });
    }
    return initialResult;
  });

  console.log('MatchCard rendered:', {
    matchId: match._id,
    canEdit,
    isEditable,
    matchResultSaved: matchResult.saved,
    totalSets,
    sets: localResult.sets,
  });

  useEffect(() => {
    // Sync localResult with matchResult only if saved state changes
    if (matchResult.saved !== localResult.saved) {
      setLocalResult((prev) => {
        const updated = { ...matchResult };
        if (!updated.sets || updated.sets.length < totalSets) {
          updated.sets = Array(totalSets).fill({ player1: '', player2: '', tiebreak1: '', tiebreak2: '' });
        }
        // Preserve unsaved input values
        updated.sets = updated.sets.map((set, idx) => ({
          ...set,
          player1: prev.sets[idx]?.player1 || set.player1,
          player2: prev.sets[idx]?.player2 || set.player2,
          tiebreak1: prev.sets[idx]?.tiebreak1 || set.tiebreak1,
          tiebreak2: prev.sets[idx]?.tiebreak2 || set.tiebreak2,
        }));
        updated.winner = prev.winner || updated.winner;
        updated.matchTiebreak = prev.matchTiebreak || updated.matchTiebreak;
        console.log('Synced localResult with matchResult:', updated);
        return updated;
      });
    }
  }, [matchResult.saved, totalSets]);

  const handleLocalInputChange = (field, value, setIndex = null) => {
    console.log('handleLocalInputChange called:', { field, value, setIndex });
    const newResult = { ...localResult };
    if (field.startsWith('set')) {
      const [type, index] = field.split('-');
      const idx = parseInt(index, 10);
      newResult.sets = [...newResult.sets];
      newResult.sets[idx] = { ...newResult.sets[idx], [setIndex === 0 ? 'player1' : 'player2']: value };
    } else if (field.startsWith('tiebreak')) {
      const [type, index, player] = field.split('-');
      const idx = parseInt(index, 10);
      newResult.sets = [...newResult.sets];
      newResult.sets[idx] = { ...newResult.sets[idx], [player === '1' ? 'tiebreak1' : 'tiebreak2']: value };
    } else if (field === 'winner') {
      newResult.winner = value;
    } else if (field.startsWith('matchTiebreak')) {
      const player = field.split('-')[1];
      newResult.matchTiebreak = { ...newResult.matchTiebreak, [player]: value };
    }
    setLocalResult(newResult);
    handleInputChange(match._id, field, value, setIndex);
  };

  const handleSave = () => {
    console.log('Saving match result:', localResult);
    saveMatchResult(match._id, localResult);
  };

  return (
    <Card
      sx={{
        p: 1,
        bgcolor: '#fff',
        border: matchResult.saved ? '2px solid #388e3c' : '1px solid #e0e0e0',
        borderRadius: 2,
        width: '100%',
        minHeight: { xs: 'auto', sm: 120 },
      }}
      aria-label={`Partido ${match._id}`}
    >
      <CardContent sx={{ p: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
          <Avatar sx={{ bgcolor: '#1976d2', width: 24, height: 24, fontSize: '0.75rem' }}>
            {getPlayerName(tournament, match.player1?.player1?._id || match.player1?.player1)?.[0] || '?'}
          </Avatar>
          <Typography
            sx={{
              fontSize: { xs: '0.875rem', sm: '1rem' },
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: { xs: 'normal', sm: 'nowrap' },
              maxWidth: { xs: 'none', sm: '200px' },
              flex: 1,
            }}
          >
            {getPlayerName(tournament, match.player1?.player1?._id || match.player1?.player1) || 'Jugador no disponible'}
            {match.player1?.player2 && ` / ${getPlayerName(tournament, match.player1?.player2?._id || match.player1?.player2) || 'Jugador no disponible'}`}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
          <Avatar sx={{ bgcolor: '#424242', width: 24, height: 24, fontSize: '0.75rem' }}>
            {match.player2?.name ? 'BYE' : getPlayerName(tournament, match.player2?.player1?._id || match.player2?.player1)?.[0] || '?'}
          </Avatar>
          <Typography
            sx={{
              fontSize: { xs: '0.875rem', sm: '1rem' },
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: { xs: 'normal', sm: 'nowrap' },
              maxWidth: { xs: 'none', sm: '200px' },
              flex: 1,
            }}
          >
            {match.player2?.name || (getPlayerName(tournament, match.player2?.player1?._id || match.player2?.player1) || 'Jugador no disponible')}
            {match.player2?.player2 && !match.player2.name && ` / ${getPlayerName(tournament, match.player2?.player2?._id || match.player2?.player2) || 'Jugador no disponible'}`}
          </Typography>
        </Box>
        {canEdit && isEditable && matchResult.saved ? (
          <Typography sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, mt: 1 }}>
            {matchResult.sets.map((set, idx) => (
              <span key={idx}>
                Set {idx + 1}: {set.player1}-{set.player2}
                {set.player1 === 6 && set.player2 === 6 && ` (${set.tiebreak1}-${set.tiebreak2})`}
                {idx < matchResult.sets.length - 1 && '; '}
              </span>
            ))}
            {isTied && matchResult.matchTiebreak && `, TB ${matchResult.matchTiebreak.player1}-${matchResult.matchTiebreak.player2}`}
          </Typography>
        ) : canEdit && isEditable ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: { xs: 1, sm: 2 },
              mt: 1,
              alignItems: { xs: 'stretch', sm: 'center' },
            }}
          >
            {Array.from({ length: totalSets }, (_, idx) => (
              <Box
                key={idx}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  flexWrap: 'wrap',
                }}
              >
                <Typography sx={{ fontSize: '0.75rem', minWidth: 50 }}>
                  Set {idx + 1}:
                </Typography>
                <TextField
                  size="small"
                  type="number"
                  value={localResult.sets && localResult.sets[idx] ? localResult.sets[idx].player1 : ''}
                  onChange={(e) => handleLocalInputChange(`set${idx}-0`, e.target.value, 0)}
                  sx={{
                    width: 40,
                    '& input': { fontSize: '0.75rem', textAlign: 'center', padding: '4px' },
                  }}
                  error={!!matchErrors[`set${idx}`]}
                  aria-label={`Puntuación del equipo 1 para el set ${idx + 1}`}
                />
                <Typography sx={{ fontSize: '0.75rem' }}>-</Typography>
                <TextField
                  size="small"
                  type="number"
                  value={localResult.sets && localResult.sets[idx] ? localResult.sets[idx].player2 : ''}
                  onChange={(e) => handleLocalInputChange(`set${idx}-1`, e.target.value, 1)}
                  sx={{
                    width: 40,
                    '& input': { fontSize: '0.75rem', textAlign: 'center', padding: '4px' },
                  }}
                  error={!!matchErrors[`set${idx}`]}
                  aria-label={`Puntuación del equipo 2 para el set ${idx + 1}`}
                />
                {parseInt(localResult.sets && localResult.sets[idx] ? localResult.sets[idx].player1 : 0, 10) === 6 &&
                  parseInt(localResult.sets && localResult.sets[idx] ? localResult.sets[idx].player2 : 0, 10) === 6 && (
                  <>
                    <TextField
                      size="small"
                      type="number"
                      value={localResult.sets && localResult.sets[idx] ? localResult.sets[idx].tiebreak1 : ''}
                      onChange={(e) => handleLocalInputChange(`tiebreak${idx}-1`, e.target.value, 1)}
                      sx={{
                        width: 40,
                        '& input': { fontSize: '0.75rem', textAlign: 'center', padding: '4px' },
                      }}
                      error={!!matchErrors[`set${idx}`]}
                      aria-label={`Tiebreak del equipo 1 para el set ${idx + 1}`}
                    />
                    <Typography sx={{ fontSize: '0.75rem' }}>-</Typography>
                    <TextField
                      size="small"
                      type="number"
                      value={localResult.sets && localResult.sets[idx] ? localResult.sets[idx].tiebreak2 : ''}
                      onChange={(e) => handleLocalInputChange(`tiebreak${idx}-2`, e.target.value, 2)}
                      sx={{
                        width: 40,
                        '& input': { fontSize: '0.75rem', textAlign: 'center', padding: '4px' },
                      }}
                      error={!!matchErrors[`set${idx}`]}
                      aria-label={`Tiebreak del equipo 2 para el set ${idx + 1}`}
                    />
                  </>
                )}
              </Box>
            ))}
            {isTied && totalSets === 2 && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  flexWrap: 'wrap',
                  mt: { xs: 1, sm: 0 },
                }}
              >
                <Typography sx={{ fontSize: '0.75rem', minWidth: 50 }}>
                  Tiebreak:
                </Typography>
                <TextField
                  size="small"
                  type="number"
                  value={localResult.matchTiebreak?.player1 || ''}
                  onChange={(e) => handleLocalInputChange('matchTiebreak-player1', e.target.value)}
                  sx={{
                    width: 40,
                    '& input': { fontSize: '0.75rem', textAlign: 'center', padding: '4px' },
                  }}
                  error={!!matchErrors.matchTiebreak}
                  aria-label="Puntuación de tiebreak del partido para el equipo 1"
                />
                <Typography sx={{ fontSize: '0.75rem' }}>-</Typography>
                <TextField
                  size="small"
                  type="number"
                  value={localResult.matchTiebreak?.player2 || ''}
                  onChange={(e) => handleLocalInputChange('matchTiebreak-player2', e.target.value)}
                  sx={{
                    width: 40,
                    '& input': { fontSize: '0.75rem', textAlign: 'center', padding: '4px' },
                  }}
                  error={!!matchErrors.matchTiebreak}
                  aria-label="Puntuación de tiebreak del partido para el equipo 2"
                />
              </Box>
            )}
          </Box>
        ) : (
          <Typography sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, mt: 1 }}>
            No editable
          </Typography>
        )}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, flexWrap: 'wrap' }}>
          {matchResult.saved ? (
            <CheckCircle sx={{ color: '#388e3c', fontSize: '1rem' }} aria-label="Partido completado" />
          ) : (
            <HourglassEmpty sx={{ color: '#757575', fontSize: '1rem' }} aria-label="Partido pendiente" />
          )}
          {canEdit && isEditable && (
            <>
              <Select
                size="small"
                value={localResult.winner || ''}
                onChange={(e) => handleLocalInputChange('winner', e.target.value)}
                sx={{ width: { xs: 100, sm: 120 }, fontSize: '0.75rem' }}
                error={!!matchErrors.winner}
                aria-label="Seleccionar ganador"
              >
                <MenuItem value="">Ninguno</MenuItem>
                <MenuItem value={normalizeId(match.player1?.player1?._id || match.player1?.player1)}>
                  {getPlayerName(tournament, match.player1?.player1?._id || match.player1?.player1)}
                </MenuItem>
                <MenuItem value={normalizeId(match.player2?.player1?._id || match.player2?.player1)}>
                  {match.player2?.name || getPlayerName(tournament, match.player2?.player1?._id || match.player2?.player1)}
                </MenuItem>
              </Select>
              {matchResult.saved ? (
                <Button
                  variant="contained"
                  onClick={() => toggleEditMode(match._id)}
                  sx={{
                    bgcolor: '#388e3c',
                    ':hover': { bgcolor: '#2e7d32' },
                    fontSize: '0.75rem',
                    minHeight: 32,
                    px: 1,
                  }}
                  aria-label="Editar resultado"
                >
                  Editar
                </Button>
              ) : (
                <Button
                  variant="contained"
                  onClick={handleSave}
                  sx={{
                    bgcolor: '#1976d2',
                    ':hover': { bgcolor: '#1565c0' },
                    fontSize: '0.75rem',
                    minHeight: 32,
                    px: 1,
                  }}
                  aria-label="Guardar resultado"
                >
                  Guardar
                </Button>
              )}
            </>
          )}
          {matchErrors.general && (
            <Alert severity="error" sx={{ fontSize: '0.75rem', width: '100%' }}>{matchErrors.general}</Alert>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default MatchCard;