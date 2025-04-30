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

const TournamentDetails = ({ tournament = {} }) => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Asegurarnos de tener siempre un array
  const participants = useMemo(
    () => Array.isArray(tournament.participants) ? tournament.participants : [],
    [tournament.participants]
  );

  // Filtrado por nombre, usando toLowerCase() sólo cuando name existe
  const filtered = useMemo(() => {
    return participants.filter((p) => {
      const raw = getPlayerName(tournament, normalizeId(p.player1));
      const name = raw ? raw.toLowerCase() : '';
      return name.includes(search.toLowerCase());
    });
  }, [search, participants, tournament]);

  // Paginación
  const currentData = useMemo(() => {
    const start = page * rowsPerPage;
    return filtered.slice(start, start + rowsPerPage);
  }, [filtered, page, rowsPerPage]);

  const handleChangePage = (_, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (e) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Detalles del Torneo
      </Typography>
      <Typography>Nombre: {tournament.name || '-'}</Typography>
      <Typography>Tipo: {tournament.type || '-'}</Typography>
      <Typography>Deporte: {tournament.sport || '-'}</Typography>

      <TextField
        label="Buscar participante"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
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
            {currentData.map((p, idx) => {
              const name1 = getPlayerName(tournament, normalizeId(p.player1)) || '';
              const name2 = p.player2
                ? getPlayerName(tournament, normalizeId(p.player2)) || ''
                : '';
              return (
                <TableRow key={idx}>
                  <TableCell>
                    {name2 ? `${name1} / ${name2}` : name1}
                  </TableCell>
                </TableRow>
              );
            })}
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
