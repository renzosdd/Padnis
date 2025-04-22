import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Paper,
} from '@mui/material';
import { getPlayerName } from './tournamentUtils.js';

const TournamentDetails = ({ tournament }) => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Filter participants based on search (match individual player names for doubles)
  const filteredParticipants = useMemo(() => {
    if (!tournament?.participants || !Array.isArray(tournament.participants)) return [];
    return tournament.participants.filter((participant) => {
      const player1Name = getPlayerName(participant.player1, tournament);
      const player2Name = participant.player2 ? getPlayerName(participant.player2, tournament) : '';
      const searchLower = search.toLowerCase();
      return (
        player1Name.toLowerCase().includes(searchLower) ||
        (player2Name && player2Name.toLowerCase().includes(searchLower))
      );
    });
  }, [tournament, search]);

  // Pagination logic
  const paginatedParticipants = filteredParticipants.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const handleSearchChange = (event) => {
    setSearch(event.target.value);
    setPage(0);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Box sx={{ p: { xs: 1, sm: 2 } }}>
      <Typography variant="h6" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' }, color: '#1976d2', mb: 2 }}>
        Detalles del Torneo
      </Typography>
      <Box sx={{ mb: 2 }}>
        <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
          <strong>Nombre:</strong> {tournament.name || 'No definido'}
        </Typography>
        <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
          <strong>Club:</strong> {tournament.club?.name || 'No definido'}
        </Typography>
        <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
          <strong>Categoría:</strong> {tournament.category || 'No definida'}
        </Typography>
        <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
          <strong>Tipo:</strong> {tournament.type || 'No definido'}
        </Typography>
        <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
          <strong>Deporte:</strong> {tournament.sport || 'No definido'}
        </Typography>
        <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
          <strong>Modalidad:</strong> {tournament.format?.mode || 'No definido'}
        </Typography>
        <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
          <strong>Sets por partido:</strong> {tournament.format?.sets || 'No definido'}
        </Typography>
        <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
          <strong>Juegos por set:</strong> {tournament.format?.gamesPerSet || 'No definido'}
        </Typography>
      </Box>
      <Typography variant="subtitle1" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' }, mb: 1, fontWeight: 'bold' }}>
        Participantes
      </Typography>
      <TextField
        label="Buscar Participante"
        value={search}
        onChange={handleSearchChange}
        fullWidth
        sx={{ mb: 2 }}
        size="small"
        aria-label="Buscar participante por nombre"
      />
      <TableContainer component={Paper}>
        <Table aria-label="Tabla de participantes">
          <TableHead>
            <TableRow sx={{ bgcolor: '#1976d2' }}>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                Nombre(s)
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedParticipants.map((participant, index) => (
              <TableRow
                key={participant.player1?._id || index}
                sx={{ bgcolor: index % 2 === 0 ? '#fff' : '#f5f5f5' }}
              >
                <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                  {getPlayerName(participant.player1, tournament)}
                  {participant.player2 && ` / ${getPlayerName(participant.player2, tournament)}`}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[10]}
        component="div"
        count={filteredParticipants.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        labelRowsPerPage="Filas por página:"
        labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
        sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
        aria-label="Paginación de participantes"
      />
    </Box>
  );
};

export default TournamentDetails;