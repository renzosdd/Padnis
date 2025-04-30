import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Table,
  TableContainer,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TablePagination,
  TextField,
  Paper
} from '@mui/material';
import { getPlayerName, normalizeId } from './tournamentUtils.js';

const TournamentDetails = ({ tournament }) => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Filtrar participantes de forma segura
  const filteredParticipants = useMemo(() => {
    if (!Array.isArray(tournament?.participants)) return [];
    const q = search.toLowerCase();
    return tournament.participants.filter((p) => {
      const p1Id = normalizeId(p.player1?._id || p.player1);
      const p2Id = p.player2 ? normalizeId(p.player2?._id || p.player2) : null;
      const name1 = (getPlayerName(tournament, p1Id) || '').toLowerCase();
      const name2 = p2Id ? (getPlayerName(tournament, p2Id) || '').toLowerCase() : '';
      return name1.includes(q) || name2.includes(q);
    });
  }, [tournament, search]);

  // Paginación
  const paginated = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredParticipants.slice(start, start + rowsPerPage);
  }, [filteredParticipants, page, rowsPerPage]);

  return (
    <Box sx={{ p: { xs: 0.5, sm: 2 }, maxWidth: '100%', overflowX: 'auto' }}>
      <Typography variant="h6" sx={{ color: '#1976d2', mb: 1 }}>Detalles del Torneo</Typography>
      <Box sx={{ mb: 2 }}>
        <Typography><strong>Nombre:</strong> {tournament.name || '—'}</Typography>
        <Typography><strong>Club:</strong> {tournament.club?.name || '—'}</Typography>
        <Typography><strong>Categoría:</strong> {tournament.category || '—'}</Typography>
        <Typography><strong>Tipo:</strong> {tournament.type || '—'}</Typography>
        <Typography><strong>Deporte:</strong> {tournament.sport || '—'}</Typography>
        <Typography><strong>Modalidad:</strong> {tournament.format?.mode || '—'}</Typography>
        <Typography><strong>Sets por partido:</strong> {tournament.format?.sets ?? '—'}</Typography>
      </Box>

      <TextField
        label="Buscar participante"
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(0); }}
        fullWidth
        size="small"
        sx={{ mb: 2 }}
      />

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#1976d2' }}>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Participante</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell align="center">No hay participantes</TableCell>
              </TableRow>
            ) : (
              paginated.map((p, idx) => {
                const p1Id = normalizeId(p.player1?._id || p.player1);
                const p2Id = p.player2 ? normalizeId(p.player2?._id || p.player2) : null;
                const display = getPlayerName(tournament, p1Id, p2Id);
                return (
                  <TableRow key={p1Id || idx}>
                    <TableCell>{display}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={filteredParticipants.length}
        page={page}
        onPageChange={(_, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => { setRowsPerPage(+e.target.value); setPage(0); }}
        rowsPerPageOptions={[10]}
        sx={{ mt: 2 }}
      />
    </Box>
);

};

export default TournamentDetails;
