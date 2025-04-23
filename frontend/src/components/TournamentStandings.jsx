import React from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import { getPlayerName, normalizeId } from './tournamentUtils.js';

const TournamentStandings = ({ tournament, standings, getPlayerName }) => {
  if (!tournament || !standings || !Array.isArray(standings)) {
    return <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>No hay posiciones disponibles para mostrar.</Typography>;
  }

  return (
    <Box sx={{ p: { xs: 0.5, sm: 2 }, maxWidth: '100%', overflowX: 'auto' }}>
      {standings.map((group, index) => (
        <Box key={group.groupName || index} sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' }, mb: 1, color: '#1976d2' }}>
            {group.groupName || `Grupo ${index + 1}`}
          </Typography>
          <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
            <Table aria-label={`Tabla de posiciones para ${group.groupName || `Grupo ${index + 1}`}`}>
              <TableHead>
                <TableRow sx={{ bgcolor: '#1976d2' }}>
                  <TableCell sx={{ color: '#fff', fontWeight: 'bold', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Equipo</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 'bold', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Puntos</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 'bold', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Partidos Jugados</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 'bold', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Victorias</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 'bold', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Derrotas</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 'bold', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Sets Ganados</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 'bold', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Sets Perdidos</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 'bold', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Diferencia de Sets</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {group.standings && Array.isArray(group.standings) && group.standings.length > 0 ? (
                  group.standings.map((team, idx) => {
                    const player1Id = normalizeId(team.player1?._id || team.player1);
                    const teamName = getPlayerName(tournament, player1Id);
                    return (
                      <TableRow key={player1Id || idx} sx={{ bgcolor: idx % 2 === 0 ? '#fff' : '#f5f5f5' }}>
                        <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{teamName}</TableCell>
                        <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{team.points}</TableCell>
                        <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{team.matchesPlayed}</TableCell>
                        <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{team.wins}</TableCell>
                        <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{team.losses}</TableCell>
                        <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{team.setsWon}</TableCell>
                        <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{team.setsLost}</TableCell>
                        <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{team.setsWon - team.setsLost}</TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, textAlign: 'center' }}>
                      No hay posiciones disponibles
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      ))}
    </Box>
  );
};

export default TournamentStandings;