import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Avatar,
  CircularProgress,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CheckCircle from '@mui/icons-material/CheckCircle';
import HourglassEmpty from '@mui/icons-material/HourglassEmpty';

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
  canEdit,
  isEditable = true,
}) => {
  const [localResult, setLocalResult] = useState(() => {
    const initialResult = { ...matchResult };
    if (!initialResult.sets || initialResult.sets.length < totalSets) {
      initialResult.sets = Array(totalSets).fill({ player1: '', player2: '', tiebreak1: '', tiebreak2: '' });
    }
    return initialResult;
  });
  const [isEditing, setIsEditing] = useState(!matchResult.saved);
  const [isSaving, setIsSaving] = useState(false); // Estado para manejar el guardado

  const handleSave = async (event) => {
    event.preventDefault(); // Prevenir la recarga de la página
    setIsSaving(true);
    try {
      await onSave(match._id, localResult);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (event) => {
    event.preventDefault(); // Prevenir cualquier comportamiento predeterminado
    setIsEditing(true);
    onToggleEdit(match._id);
  };

  const isTied = localResult.sets?.length === 2 &&
    localResult.sets.reduce((acc, set) => {
      const p1Score = parseInt(set.player1, 10);
      const p2Score = parseInt(set.player2, 10);
      const tb1 = parseInt(set.tiebreak1, 10);
      const tb2 = parseInt(set.tiebreak2, 10);
      return acc + (p1Score > p2Score || (p1Score === p2Score && tb1 > tb2) ? 1 : p2Score > p1Score || (p1Score === p2Score && tb2 > tb1) ? -1 : 0);
    }, 0) === 0;

  return (
    <Box
      sx={{
        p: 1,
        mb: 2,
        border: matchResult.saved ? '2px solid #388e3c' : '1px solid #e0e0e0',
        borderRadius: 2,
        width: '100%',
        minHeight: { xs: 'auto', sm: 120 },
      }}
      aria-label={`Partido ${match._id}`}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
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
          {localResult.sets.map((set, idx) => (
            <span key={idx}>
              Set {idx + 1}: {set.player1 || 0}-{set.player2 || 0}
              {set.player1 === 6 && set.player2 === 6 && ` (${set.tiebreak1 || 0}-${set.tiebreak2 || 0})`}
              {idx < localResult.sets.length - 1 && '; '}
            </span>
          ))}
          {isTied && localResult.matchTiebreak && `, TB ${localResult.matchTiebreak.player1 || 0}-${localResult.matchTiebreak.player2 || 0}`}
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
                value={localResult.sets?.[idx]?.player1 || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setLocalResult((prev) => {
                    const updatedSets = [...prev.sets];
                    updatedSets[idx] = { ...updatedSets[idx], player1: value };
                    return { ...prev, sets: updatedSets };
                  });
                  handleLocalInputChange(`set${idx}-0`, value, 0);
                }}
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
                value={localResult.sets?.[idx]?.player2 || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setLocalResult((prev) => {
                    const updatedSets = [...prev.sets];
                    updatedSets[idx] = { ...updatedSets[idx], player2: value };
                    return { ...prev, sets: updatedSets };
                  });
                  handleLocalInputChange(`set${idx}-1`, value, 1);
                }}
                sx={{
                  width: 40,
                  '& input': { fontSize: '0.75rem', textAlign: 'center', padding: '4px' },
                }}
                error={!!matchErrors[`set${idx}`]}
                aria-label={`Puntuación del equipo 2 para el set ${idx + 1}`}
              />
              {parseInt(localResult.sets?.[idx]?.player1 || 0, 10) === 6 &&
                parseInt(localResult.sets?.[idx]?.player2 ||  0, 10) === 6 && (
                <>
                  <TextField
                    size="small"
                    type="number"
                    value={localResult.sets?.[idx]?.tiebreak1 || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setLocalResult((prev) => {
                        const updatedSets = [...prev.sets];
                        updatedSets[idx] = { ...updatedSets[idx], tiebreak1: value };
                        return { ...prev, sets: updatedSets };
                      });
                      handleLocalInputChange(`tiebreak${idx}-1`, value, 1);
                    }}
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
                    value={localResult.sets?.[idx]?.tiebreak2 || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setLocalResult((prev) => {
                        const updatedSets = [...prev.sets];
                        updatedSets[idx] = { ...updatedSets[idx], tiebreak2: value };
                        return { ...prev, sets: updatedSets };
                      });
                      handleLocalInputChange(`tiebreak${idx}-2`, value, 2);
                    }}
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
                onChange={(e) => {
                  const value = e.target.value;
                  setLocalResult((prev) => ({
                    ...prev,
                    matchTiebreak: { ...prev.matchTiebreak, player1: value },
                  }));
                  handleLocalInputChange('matchTiebreak-player1', value);
                }}
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
                onChange={(e) => {
                  const value = e.target.value;
                  setLocalResult((prev) => ({
                    ...prev,
                    matchTiebreak: { ...prev.matchTiebreak, player2: value },
                  }));
                  handleLocalInputChange('matchTiebreak-player2', value);
                }}
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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
        {matchResult.saved ? (
          <CheckCircle sx={{ color: '#388e3c', fontSize: '1rem' }} aria-label="Partido completado" />
        ) : (
          <HourglassEmpty sx={{ color: '#757575', fontSize: '1rem' }} aria-label="Partido pendiente" />
        )}
        {canEdit && isEditable && (
          <>
            {matchResult.saved ? (
              <IconButton
                onClick={handleEdit}
                sx={{ color: '#388e3c' }}
                aria-label="Editar resultado"
              >
                <EditIcon fontSize="small" />
              </IconButton>
            ) : (
              <IconButton
                onClick={handleSave}
                sx={{ color: '#1976d2' }}
                aria-label="Guardar resultado"
                disabled={isSaving}
              >
                {isSaving ? <CircularProgress size={20} /> : <SaveIcon fontSize="small" />}
              </IconButton>
            )}
          </>
        )}
      </Box>
    </Box>
  );
};

export default MatchCard;