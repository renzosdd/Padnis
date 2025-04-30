// src/frontend/src/components/TournamentList.jsx
import React, { useState, useEffect } from 'react'
import axios from 'axios'
import {
  Box,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  Typography,
  CardActions,
  Button,
  CircularProgress,
  useMediaQuery,
} from '@mui/material'
import { Link } from 'react-router-dom'
import { useTheme } from '@mui/material/styles'

const TournamentList = () => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  // Estado local
  const [view, setView] = useState('activos')
  const [tournaments, setTournaments] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Cuando cambie la vista ("activos" o "historial"), o al montar
  useEffect(() => {
    const fetchTournaments = async () => {
      setLoading(true)
      setError('')
      try {
        const status = view === 'activos' ? 'En curso' : 'Finalizado'
        const token = localStorage.getItem('token')
        const headers = token ? { Authorization: `Bearer ${token}` } : {}
        const { data } = await axios.get(
          `${process.env.REACT_APP_API_URL || 'https://padnis.onrender.com'}/api/tournaments?status=${status}`,
          { headers }
        )
        setTournaments(data)
      } catch (err) {
        setError(err.response?.data?.message || err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchTournaments()
  }, [view])

  // Cambio de pestaña
  const handleTabChange = (_, newValue) => {
    setView(newValue)
  }

  // Renderizado condicional
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography color="error">{error}</Typography>
      </Box>
    )
  }

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
                  <Button component={Link} to={`/tournament/${t._id}`} size="small">
                    Ver detalles
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  )
}

export default TournamentList
