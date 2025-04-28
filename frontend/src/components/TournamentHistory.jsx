import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setPage } from '../store/store';
import { Box, Typography, Pagination, useMediaQuery } from '@mui/material';

const TournamentHistory = ({ tournaments }) => {
  const dispatch = useDispatch();
  const currentPage = useSelector((state) => state.page.currentPage);
  const [pageTournaments, setPageTournaments] = useState([]);
  const tournamentsPerPage = 10;
  const isMobile = useMediaQuery(theme => theme.breakpoints.down('sm'));

  useEffect(() => {
    if (!Array.isArray(tournaments)) return;

    const startIndex = (currentPage - 1) * tournamentsPerPage;
    const endIndex = startIndex + tournamentsPerPage;
    setPageTournaments(tournaments.slice(startIndex, endIndex));
  }, [currentPage, tournaments]);

  const handlePageChange = (event, value) => {
    dispatch(setPage(value));
  };

  const totalPages = Math.ceil((tournaments?.length || 0) / tournamentsPerPage);

  if (!tournaments || tournaments.length === 0) {
    return (
      <Box sx={{ p: { xs: 1, sm: 2 }, textAlign: 'center' }}>
        <Typography sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
          No hay torneos en el historial.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1, sm: 2 } }}>
      <Typography variant="h5" sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' }, mb: 2, color: '#1976d2' }}>
        Historial de Torneos
      </Typography>
      {pageTournaments.map((tournament) => (
        <Box
          key={tournament._id}
          sx={{
            mb: 2,
            p: { xs: 1, sm: 2 },
            border: '1px solid #e0e0e0',
            borderRadius: 2,
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            bgcolor: 'background.paper',
          }}
        >
          <Typography variant={isMobile ? 'subtitle1' : 'h6'}>{tournament.name}</Typography>
          <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
            {tournament.type} - {tournament.sport} ({tournament.format.mode})
          </Typography>
          <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
            Estado: {tournament.status}
          </Typography>
        </Box>
      ))}
      <Pagination
        count={totalPages}
        page={currentPage}
        onChange={handlePageChange}
        color="primary"
        size={isMobile ? 'small' : 'medium'}
        sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}
      />
    </Box>
  );
};

export default TournamentHistory;