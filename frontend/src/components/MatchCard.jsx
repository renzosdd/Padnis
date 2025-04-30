import React, { useState, useEffect } from 'react';
import {
  Box, Typography, TextField,
  IconButton, Avatar, CircularProgress,
  Alert, Collapse
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';

const MatchCard = ({
  match,
  matchResult,
  totalSets,
  matchErrors,
  tournament,
  onResultChange,
  getPlayerName,
  onSaveResult,
  canEdit
}) => {
  const theme = useTheme();

  const normalizeSets = setsArg => {
    const arr = Array.isArray(setsArg) ? [...setsArg] : [];
    while (arr.length < totalSets) arr.push({ player1:'', player2:'', tiebreak1:'', tiebreak2:'' });
    return arr.slice(0, totalSets);
  };

  const [localResult, setLocalResult] = useState({
    ...matchResult,
    sets: normalizeSets(matchResult.sets),
    matchTiebreak: matchResult.matchTiebreak || {player1:'',player2:''},
    saved: matchResult.saved
  });
  const [isEditing, setIsEditing] = useState(!matchResult.saved && canEdit);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    setLocalResult({
      ...matchResult,
      sets: normalizeSets(matchResult.sets),
      matchTiebreak: matchResult.matchTiebreak || {player1:'',player2:''},
      saved: matchResult.saved
    });
    setIsEditing(!matchResult.saved && canEdit);
  }, [matchResult, totalSets, canEdit]);

  const handleInputChange = (field, value) => {
    setLocalResult(prev => {
      const next = {...prev, sets: normalizeSets(prev.sets), saved:false};
      if (field.startsWith('set')) {
        const [,si,pi] = field.match(/^set(\d+)-(\d)$/) || [];
        next.sets[+si][`player${+pi+1}`] = value;
      } else if (field.startsWith('tiebreak')) {
        const [,si,pi] = field.match(/^tiebreak(\d+)-(\d)$/) || [];
        next.sets[+si][`tiebreak${+pi+1}`] = value;
      } else {
        const [,pi] = field.match(/^matchTiebreak-(\d)$/) || [];
        next.matchTiebreak = {...next.matchTiebreak};
        next.matchTiebreak[`player${+pi+1}`] = value;
      }
      return next;
    });
    if (typeof onResultChange === 'function') {
      onResultChange(match._id, field, value);
    }
  };

  const calcWinner = () => {
    const w1 = localResult.sets.reduce((a,s)=>a+((+s.player1>+s.player2)?1:0),0);
    const w2 = localResult.sets.reduce((a,s)=>a+((+s.player2>+s.player1)?1:0),0);
    let win,run;
    if (w1>w2) { win=match.player1; run=match.player2; }
    else if (w2>w1) { win=match.player2; run=match.player1; }
    else if (+localResult.matchTiebreak.player1>+localResult.matchTiebreak.player2) {
      win=match.player1; run=match.player2;
    } else { win=match.player2; run=match.player1; }
    return { win, run };
  };

  const handleSave = async e => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);
    try {
      const { win: winner, run: runnerUp } = calcWinner();
      const payload = {...localResult, winner, runnerUp};
      const errs = await onSaveResult(match._id, payload);
      if (!errs) setIsEditing(false);
      else setSaveError(errs.general || 'Error al guardar');
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = e => { e.preventDefault(); setIsEditing(true); };

  // Nombres
  const { player1:p1, player2:p1B } = match.player1;
  const { player1:p2, player2:p2B } = match.player2;
  const fmt = p => (typeof p==='object'&&p.firstName)
    ? `${p.firstName} ${p.lastName}`
    : getPlayerName(tournament, p) || 'Jugador';
  const name1 = fmt(p1), name2 = fmt(p2);
  const name1B = p1B ? fmt(p1B) : null;
  const name2B = p2B ? fmt(p2B) : null;

  return (
    <Box sx={{
      p:2, mb:2,
      border: localResult.saved
        ? `2px solid ${theme.palette.success.main}`
        : `1px solid ${theme.palette.divider}`,
      borderRadius:2, bgcolor:'background.paper', width:'100%'
    }}>
      {saveError && <Alert severity="error">{saveError}</Alert>}

      <Box sx={{ display:'flex',alignItems:'center',gap:1,mb:1 }}>
        <Avatar sx={{ bgcolor:theme.palette.primary.main }}>{name1.charAt(0)}</Avatar>
        <Typography flex={1}>{name1}{name1B&&` / ${name1B}`}</Typography>
        <Typography>vs</Typography>
        <Typography flex={1} textAlign="right">{name2}{name2B&&` / ${name2B}`}</Typography>
      </Box>

      {localResult.saved && !isEditing && canEdit ? (
        <Typography sx={{ fontSize:'0.875rem', mb:1 }}>
          {localResult.sets.map((s,i) => (
            <span key={i}>
              Set {i+1}: {s.player1||0}-{s.player2||0}
              {s.player1===6&&s.player2===6 && ` (TB ${s.tiebreak1||0}-${s.tiebreak2||0})`}
              {i<localResult.sets.length-1&&'; '}
            </span>
          ))}
          {totalSets===2 &&
           localResult.sets.reduce((a,s)=>a+((+s.player1>+s.player2?1:-1)),0)===0 &&
           `, Match TB ${localResult.matchTiebreak.player1||0}-${localResult.matchTiebreak.player2||0}`
          }
        </Typography>
      ) : (
        <Collapse in={!localResult.saved||isEditing}>
          <Box sx={{ display:'flex', flexDirection:{xs:'column',sm:'row'}, gap:2 }}>
            {localResult.sets.map((s,i)=>(
              <Box key={i} sx={{ display:'flex',alignItems:'center',gap:1 }}>
                <TextField
                  type="number" size="small" value={s.player1}
                  onChange={e=>handleInputChange(`set${i}-0`,e.target.value)}
                  inputProps={{min:0}}
                  error={!!matchErrors[`set${i}`]}
                  sx={{width:50}}
                />
                <Typography>-</Typography>
                <TextField
                  type="number" size="small" value={s.player2}
                  onChange={e=>handleInputChange(`set${i}-1`,e.target.value)}
                  inputProps={{min:0}}
                  error={!!matchErrors[`set${i}`]}
                  sx={{width:50}}
                />
                {+s.player1===6&&+s.player2===6&&(
                  <>
                    <TextField
                      type="number" size="small" value={s.tiebreak1}
                      onChange={e=>handleInputChange(`tiebreak${i}-1`,e.target.value)}
                      inputProps={{min:0}}
                      error={!!matchErrors[`set${i}`]}
                      sx={{width:50}}
                    />
                    <Typography>-</Typography>
                    <TextField
                      type="number" size="small" value={s.tiebreak2}
                      onChange={e=>handleInputChange(`tiebreak${i}-2`,e.target.value)}
                      inputProps={{min:0}}
                      error={!!matchErrors[`set${i}`]}
                      sx={{width:50}}
                    />
                  </>
                )}
              </Box>
            ))}
            {totalSets===2 &&
             localResult.sets.reduce((a,s)=>a+((+s.player1>+s.player2?1:-1)),0)===0 && (
              <Box sx={{display:'flex',alignItems:'center',gap:1}}>
                <Typography>Match TB:</Typography>
                <TextField
                  type="number" size="small" value={localResult.matchTiebreak.player1}
                  onChange={e=>handleInputChange('matchTiebreak-0',e.target.value)}
                  inputProps={{min:0}}
                  error={!!matchErrors.matchTiebreak}
                  sx={{width:50}}
                />
                <Typography>-</Typography>
                <TextField
                  type="number" size="small" value={localResult.matchTiebreak.player2}
                  onChange={e=>handleInputChange('matchTiebreak-1',e.target.value)}
                  inputProps={{min:0}}
                  error={!!matchErrors.matchTiebreak}
                  sx={{width:50}}
                />
              </Box>
            )}
          </Box>
        </Collapse>
      )}

      <Box sx={{ display:'flex',justifyContent:'flex-end',mt:1 }}>
        {localResult.saved&&!isEditing&&canEdit ? (
          <IconButton onClick={handleEdit}><EditIcon/></IconButton>
        ) : canEdit ? (
          <IconButton onClick={handleSave} disabled={isSaving}>
            {isSaving ? <CircularProgress size={24}/> : <SaveIcon/>}
          </IconButton>
        ) : null}
      </Box>
    </Box>
  );
};

export default MatchCard;
