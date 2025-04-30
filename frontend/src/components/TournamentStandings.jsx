// src/frontend/src/components/TournamentStandings.jsx
import React from 'react';
import {
  Box,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Paper
} from '@mui/material';

const TournamentStandings = ({ standings, getPlayerName }) => {
  if (!standings || !standings.groups) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography>No hay posiciones disponibles.</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {standings.groups.map((group, gi) => (
        <Box key={group._id || gi} sx={{ mb: 4 }}>
          <Typography variant="h6" textAlign="center" gutterBottom>
            {group.name}
          </Typography>
          <TableContainer component={Paper}>
            <Table size="small" aria-label={`Posiciones del grupo ${group.name}`}>
              <TableHead>
                <TableRow>
                  <TableCell>Jugador</TableCell>
                  <TableCell align="right">Puntos</TableCell>
                  <TableCell align="right">PJ</TableCell>
                  <TableCell align="right">PG</TableCell>
                  <TableCell align="right">PP</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {group.standings.map((row, ri) => (
                  <TableRow key={row.player1 || ri}>
                    <TableCell>
                      {getPlayerName(group, row.player1)}
                      {row.player2 ? ` / ${getPlayerName(group, row.player2)}` : ''}
                    </TableCell>
                    <TableCell align="right">{row.points}</TableCell>
                    <TableCell align="right">{row.matchesPlayed}</TableCell>
                    <TableCell align="right">{row.wins}</TableCell>
                    <TableCell align="right">{row.losses}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      ))}
    </Box>
  );
};

export default TournamentStandings;
