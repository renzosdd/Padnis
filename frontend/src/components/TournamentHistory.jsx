// src/frontend/src/components/TournamentHistory.jsx
import React, { useEffect, useMemo } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { setPage } from '../store/store'
import { useGetTournamentsQuery } from '../store/store'
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Pagination,
  useMediaQuery
} from '@mui/material'
import { Link } from 'react-router-dom'
import theme from '../theme'

const TOURNAMENTS_PER_PAGE = 10

const TournamentHistory = () => {
  const dispatch = useDispatch()
  const currentPage = useSelector((state) => state.page.current)
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  // Fetch only finished tournaments (status=Finalizado)
  const { data: tournaments = [], isLoading, error } =
    useGetTournamentsQuery('Finalizado')

  // Compute paginated slice
  const totalPages = Math.ceil(tournaments.length / TOURNAMENTS_PER_PAGE)
  const pageTournaments = useMemo(() => {
    const start = (currentPage - 1) * TOURNAMENTS_PER_PAGE
    return tournaments.slice(start, start + TOURNAMENTS_PER_PAGE)
  }, [tournaments, currentPage])

  // Reset to first page if data changes
  useEffect(() => {
    dispatch(setPage(1))
  }, [tournaments, dispatch])

  const handlePageChange = (e, page) => {
    dispatch(setPage(page))
  }

  if (isLoading) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography>Cargando historial...</Typography>
      </Box>
    )
  }
  if (error) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography color="error">
          Error al cargar historial
        </Typography>
      </Box>
    )
  }
  if (tournaments.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography>No hay torneos finalizados todavía.</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ p: isMobile ? 1 : 2 }}>
      <Typography
        variant="h5"
        sx={{
          fontSize: isMobile ? '1.25rem' : '1.5rem',
          mb: 2,
          color: theme.palette.primary.main
        }}
      >
        Historial de Torneos
      </Typography>

      <Grid container spacing={2}>
        {pageTournaments.map((t) => (
          <Grid item key={t._id} xs={12} sm={6} md={4}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {t.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t.type} • {t.sport} ({t.format?.mode})
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Estado: {t.status}
                </Typography>
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

      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
        <Pagination
          count={totalPages}
          page={currentPage}
          onChange={handlePageChange}
          color="primary"
          size={isMobile ? 'small' : 'medium'}
        />
      </Box>
    </Box>
  )
}

export default TournamentHistory
