import React, { useState } from 'react';
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
  const [localResult, setLocalResult] = useState(matchResult);

  const handleLocalInputChange = (field, value, setIndex = null) => {
    const newResult = { ...localResult };
    if (field.startsWith('set')) {
      const [type, index] = field.split('-');
      newResult.sets = [...newResult.sets];
      newResult.sets[parseInt(index, 10)] = { ...newResult.sets[index], [setIndex === 0 ? 'player1' : 'player2']: value };
    } else if (field.startsWith('tiebreak')) {
      const [type, index, player] = field.split('-');
      newResult.sets = [...newResult.sets];
      newResult.sets[parseInt(index, 10)] = { ...newResult.sets[index], [player === '1' ? 'tiebreak1' : 'tiebreak2']: value };
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
        minHeight: { xs: 'auto', sm: 120 }, // Allow card to grow with content on mobile
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
              whiteSpace: { xs: 'normal', sm: 'nowrap' }, // Wrap on mobile, nowrap on larger screens
              maxWidth: { xs: 'none', sm: '160px' }, // Allow full width on mobile
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
              maxWidth: { xs: 'none', sm: '160px' },
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
        ) : (
          canEdit && isEditable && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
              {localResult.sets?.slice(0, totalSets).map((set, idx) => (
                <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                  <Typography sx={{ fontSize: '0.75rem', minWidth: 50 }}>Set {idx + 1}:</Typography>
                  <TextField
                    size="small"
                    type="number"
                    value={set.player1}
                    onChange={(e) => handleLocalInputChange(`set${idx}-0`, e.target.value, 0)}
                    sx={{ width: 40, '& input': { fontSize: '0.75rem', textAlign: 'center', padding: '4px' } }}
                    error={!!matchErrors[`set${idx}`]}
                    aria-label={`Puntuación del equipo 1 para el set ${idx + 1}`}
                  />
                  <Typography sx={{ fontSize: '0.75rem' }}>-</Typography>
                  <TextField
                    size="small"
                    type="number"
                    value={set.player2}
                    onChange={(e) => handleLocalInputChange(`set${idx}-1`, e.target.value, 1)}
                    sx={{ width: 40, '& input': { fontSize: '0.75rem', textAlign: 'center', padding: '4px' } }}
                    error={!!matchErrors[`set${idx}`]}
                    aria-label={`Puntuación del equipo 2 para el set ${idx + 1}`}
                  />
                  {parseInt(set.player1, 10) === 6 && parseInt(set.player2, 10) === 6 && (
                    <>
                      <TextField
                        size="small"
                        type="number"
                        value={set.tiebreak1}
                        onChange={(e) => handleLocalInputChange(`tiebreak${idx}-1`, e.target.value, 1)}
                        sx={{ width: 40, '& input': { fontSize: '0.75rem', textAlign: 'center', padding: '4px' } }}
                        error={!!matchErrors[`set${idx}`]}
                        aria-label={`Tiebreak del equipo 1 para el set ${idx + 1}`}
                      />
                      <Typography sx={{ fontSize: '0.75rem' }}>-</Typography>
                      <TextField
                        size="small"
                        type="number"
                        value={set.tiebreak2}
                        onChange={(e) => handleLocalInputChange(`tiebreak${idx}-2`, e.target.value, 2)}
                        sx={{ width: 40, '& input': { fontSize: '0.75rem', textAlign: 'center', padding: '4px' } }}
                        error={!!matchErrors[`set${idx}`]}
                        aria-label={`Tiebreak del equipo 2 para el set ${idx + 1}`}
                      />
                    </>
                  )}
                </Box>
              ))}
              {isTied && totalSets === 2 && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                  <Typography sx={{ fontSize: '0.75rem', minWidth: 50 }}>Tiebreak:</Typography>
                  <TextField
                    size="small"
                    type="number"
                    value={localResult.matchTiebreak?.player1 || ''}
                    onChange={(e) => handleLocalInputChange('matchTiebreak-player1', e.target.value)}
                    sx={{ width: 40, '& input': { fontSize: '0.75rem', textAlign: 'center', padding: '4px' } }}
                    error={!!matchErrors.matchTiebreak}
                    aria-label="Puntuación de tiebreak del partido para el equipo 1"
                  />
                  <Typography sx={{ fontSize: '0.75rem' }}>-</Typography>
                  <TextField
                    size="small"
                    type="number"
                    value={localResult.matchTiebreak?.player2 || ''}
                    onChange={(e) => handleLocalInputChange('matchTiebreak-player2', e.target.value)}
                    sx={{ width: 40, '& input': { fontSize: '0.75rem', textAlign: 'center', padding: '4px' } }}
                    error={!!matchErrors.matchTiebreak}
                    aria-label="Puntuación de tiebreak del partido para el equipo 2"
                  />
                </Box>
              )}
            </Box>
          )
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