import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNotification } from '../contexts/NotificationContext';
import { Box, Typography, List, ListItem, ListItemText, CircularProgress } from '@mui/material';
import { Link } from 'react-router-dom';

const TournamentList = () => {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addNotification } = useNotification();

  useEffect(() => {
    const fetchActiveTournaments = async () => {
      try {
        const token = localStorage.getItem('token');
        const url = 'https://padnis.onrender.com/api/tournaments?status=En%20curso';
        console.log('Fetching tournaments from:', url, 'with token:', token ? 'present' : 'missing');
        const response = await axios.get(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        console.log('API response (TournamentList.jsx):', response.data);
        if (!Array.isArray(response.data)) {
          throw new Error('Unexpected response format: Data is not an array');
        }
        setTournaments(response.data);
      } catch (error) {
        const errorMessage = error.response?.data?.message || `Error al cargar torneos activos: ${error.message}`;
        addNotification(errorMessage, 'error');
        console.error('Error al cargar torneos:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchActiveTournaments();
  }, [addNotification]);

  return (
    <Box sx={{ p: { xs: 2, sm: 4 }, bgcolor: '#f0f4f8', minHeight: '100vh' }}>
      <Typography variant="h5" gutterBottom sx={{ color: '#333', fontWeight: 600, textAlign: 'center' }}>
        Torneos Activos
      </Typography>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : tournaments.length > 0 ? (
        <List>
          {tournaments.map(tournament => (
            <ListItem
              key={tournament._id}
              sx={{ bgcolor: '#ffffff', mb: 1, borderRadius: 2, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
              component={Link}
              to={`/tournament/${tournament._id}`}
            >
              <ListItemText
                primary={`${tournament.name} - ${tournament.sport} (${tournament.format.mode})`}
                secondary={`Categoría: ${tournament.category} | Club: ${tournament.club?.name || 'No definido'}`}
                primaryTypographyProps={{ fontWeight: 500 }}
                secondaryTypographyProps={{ color: '#666' }}
              />
            </ListItem>
          ))}
        </List>
      ) : (
        <Typography sx={{ textAlign: 'center', color: '#666', mt: 4 }}>
          No hay torneos activos en este momento.
        </Typography>
      )}
    </Box>
  );
};

export default TournamentList;