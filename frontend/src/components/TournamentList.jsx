// src/frontend/src/components/TournamentList.jsx
import React from 'react';
import { Box, Tabs, Tab, Grid, Card, CardContent, Typography, CardActions, Button } from '@mui/material';
import { Link } from 'react-router-dom';

const TournamentList = ({ tournaments, isMobile, view, onViewChange }) => {
  const handleTabChange = (_, newValue) => {
    onViewChange(newValue);
  };

  return (
    <Box sx={{ p: isMobile ? 1 : 2 }}>
      <Tabs
        value={view}
        onChange={handleTabChange}
        variant="fullWidth"
        sx={{ mb: 2 }}
      >
        <Tab label="Activos" value="activos" />
        <Tab label="Historial" value="historial" />
      </Tabs>

      {tournaments.length === 0 ? (
        <Typography variant="body1">
          No hay torneos {view === 'activos' ? 'activos' : 'en el historial'}.
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {tournaments.map((t) => (
            <Grid item key={t._id} xs={12} sm={6} md={4}>
              <Card elevation={2}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {t.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t.type} • {t.sport}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Estado: {t.status}
                  </Typography>
                  {t.club?.name && (
                    <Typography variant="body2" color="text.secondary">
                      Club: {t.club.name}
                    </Typography>
                  )}
                </CardContent>
                <CardActions>
                  <Button
                    component={Link}
                    to={`/tournament/${t._id}`}
                    size="small"
                  >
                    Ver detalles
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default TournamentList;
