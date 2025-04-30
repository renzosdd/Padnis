// src/frontend/src/components/TournamentDetails.jsx
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
import { getPlayerName, normalizeId } from './tournamentUtils';

const TournamentDetails = ({ tournament }) => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const filtered = useMemo(() => {
    if (!tournament.participants) return [];
    return tournament.participants.filter(p => {
      const name = getPlayerName(tournament, normalizeId(p.player1)).toLowerCase();
      return name.includes(search.toLowerCase());
    });
  }, [search, tournament]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = event => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const currentData = useMemo(() => {
    return filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [filtered, page, rowsPerPage]);

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Detalles del Torneo
      </Typography>
      <Typography>
        Nombre: {tournament.name}
      </Typography>
      <Typography>
        Tipo: {tournament.type}
      </Typography>
      <Typography>
        Deporte: {tournament.sport}
      </Typography>

      <TextField
        label="Buscar participante"
        value={search}
        onChange={e => setSearch(e.target.value)}
        fullWidth
        size="small"
        sx={{ mt: 2, mb: 2 }}
      />

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Participante</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {currentData.map((p, index) => (
              <TableRow key={index}>
                <TableCell>
                  {getPlayerName(tournament, normalizeId(p.player1))}
                  {p.player2
                    ? ` / ${getPlayerName(tournament, normalizeId(p.player2))}`
                    : ''}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={filtered.length}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[10]}
      />
    </Box>
);
};
export default TournamentDetails;
