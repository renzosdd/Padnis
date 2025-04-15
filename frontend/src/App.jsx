import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSelector, useDispatch } from 'react-redux';
import { setPlayers } from './store';
import { ThemeProvider, createTheme, CssBaseline, AppBar, Toolbar, Typography, Box, Menu, MenuItem, Button, Dialog, DialogTitle, DialogContent, useMediaQuery } from '@mui/material';
import { People, EmojiEvents, Settings, ExpandMore } from '@mui/icons-material';
import ErrorBoundary from './components/ErrorBoundary';
import PlayerForm from './components/PlayerForm';
import TournamentForm from './components/TournamentForm';
import TournamentHistory from './components/TournamentHistory';
import TournamentInProgress from './components/TournamentInProgress';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import ManageRoles from './components/ManageRoles';
import ClubManagement from './components/ClubManagement';
import { useAuth } from './contexts/AuthContext';
import { useNotification } from './contexts/NotificationContext';

const BACKEND_URL = 'https://padnis.onrender.com';

const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#424242' },
    accent: { main: '#c0ca33' },
    background: { default: '#f5f5f5', paper: '#fff' },
  },
  typography: { fontFamily: 'Roboto, sans-serif' },
  shape: { borderRadius: 8 },
  components: {
    MuiButton: { styleOverrides: { root: { minWidth: 48, minHeight: 48 } } },
  },
});

const App = () => {
  const [tournaments, setTournaments] = useState([]);
  const [users, setUsers] = useState([]);
  const [view, setView] = useState('activos');
  const [authView, setAuthView] = useState('login');
  const [tournamentAnchor, setTournamentAnchor] = useState(null);
  const [settingsAnchor, setSettingsAnchor] = useState(null);
  const [userAnchor, setUserAnchor] = useState(null);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [selectedTournamentId, setSelectedTournamentId] = useState(null);
  const { user, role, logout } = useAuth();
  const { addNotification } = useNotification();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const players = useSelector(state => state.players.list);
  const dispatch = useDispatch();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    const fetchData = async () => {
      try {
        await fetchTournaments();
        if (user) {
          await Promise.all([
            role !== 'player' ? fetchPlayers() : Promise.resolve(),
            (role === 'admin' || role === 'coach') ? fetchUsers() : Promise.resolve(),
          ]);
        }
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
        addNotification('Error al cargar datos iniciales', 'error');
      }
    };
    fetchData();
  }, [user, role]);

  const fetchPlayers = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token available');
      const response = await axios.get(`${BACKEND_URL}/api/players`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 30000,
      });
      const normalizedPlayers = response.data.map(player => ({ ...player, _id: String(player._id) }));
      dispatch(setPlayers(normalizedPlayers));
    } catch (error) {
      addNotification('No se pudieron cargar los jugadores.', 'error');
      dispatch(setPlayers([]));
    }
  };

  const fetchTournaments = async (retries = 2) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${BACKEND_URL}/api/tournaments`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        timeout: 30000,
      });
      setTournaments(response.data);
    } catch (error) {
      if (retries > 0 && error.code === 'ERR_NETWORK') {
        setTimeout(() => fetchTournaments(retries - 1), 2000);
      } else {
        addNotification('No se pudieron cargar los torneos.', 'error');
        setTournaments([]);
      }
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token available');
      const response = await axios.get(`${BACKEND_URL}/api/users`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 30000,
      });
      setUsers(response.data);
    } catch (error) {
      addNotification('No se pudieron cargar los usuarios.', 'error');
      setUsers([]);
    }
  };

  const updatePlayer = (updatedPlayer) => {
    dispatch(setPlayers(players.map(p => p.playerId === updatedPlayer.playerId ? { ...updatedPlayer, _id: String(updatedPlayer._id) } : p)));
  };

  const createTournament = async () => {
    await fetchTournaments();
  };

  const handlePlayerAdded = () => fetchPlayers();

  const handleFinishTournament = (finishedTournament) => {
    setTournaments(prev => prev.map(t => t._id === finishedTournament._id ? finishedTournament : t));
    setSelectedTournamentId(null);
    setView('activos');
  };

  const handleTournamentClick = (event) => setTournamentAnchor(event.currentTarget);
  const handleSettingsClick = (event) => setSettingsAnchor(event.currentTarget);
  const handleUserClick = (event) => setUserAnchor(event.currentTarget);
  const handleClose = () => {
    setTournamentAnchor(null);
    setSettingsAnchor(null);
    setUserAnchor(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    logout();
  };

  const handleLoginSuccess = () => setAuthDialogOpen(false);

  if (error) {
    return (
      <Box sx={{ p: 3, bgcolor: '#f5f5f5', minHeight: '100vh' }}>
        <Typography variant="h5" color="error">Error: {error}</Typography>
        <Button variant="contained" color="primary" onClick={() => window.location.reload()} sx={{ mt: 2 }}>
          Recargar
        </Button>
      </Box>
    );
  }

  if (loading) return <Box sx={{ p: 3, bgcolor: '#f5f5f5', minHeight: '100vh' }}><Typography variant="h5">Cargando...</Typography></Box>;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary>
        <AppBar position="fixed">
          <Toolbar>
            <Typography variant="h6" sx={{ mr: 2 }}>Padnis</Typography>
            {user ? (
              <>
                {role !== 'player' && (
                  <Button color="inherit" startIcon={<People />} onClick={() => setView('jugadores')} sx={{ mx: 1 }}>
                    {!isSmallScreen && 'Jugadores'}
                  </Button>
                )}
                <Button color="inherit" startIcon={<EmojiEvents />} onClick={handleTournamentClick} endIcon={!isSmallScreen && <ExpandMore />} sx={{ mx: 1 }}>
                  {!isSmallScreen && 'Torneos'}
                </Button>
                <Menu anchorEl={tournamentAnchor} open={Boolean(tournamentAnchor)} onClose={handleClose}>
                  {(role === 'admin' || role === 'coach') && (
                    <MenuItem onClick={() => { setView('crear'); setSelectedTournamentId(null); handleClose(); }}>Crear Torneo</MenuItem>
                  )}
                  <MenuItem onClick={() => { setView('activos'); setSelectedTournamentId(null); handleClose(); }}>Torneos Activos</MenuItem>
                  <MenuItem onClick={() => { setView('historial'); setSelectedTournamentId(null); handleClose(); }}>Historial</MenuItem>
                </Menu>
                {role === 'admin' && (
                  <Button color="inherit" startIcon={<Settings />} onClick={handleSettingsClick} endIcon={!isSmallScreen && <ExpandMore />} sx={{ mx: 1 }}>
                    {!isSmallScreen && 'Settings'}
                  </Button>
                )}
                <Menu anchorEl={settingsAnchor} open={Boolean(settingsAnchor)} onClose={handleClose}>
                  {role === 'admin' && (
                    <>
                      <MenuItem onClick={() => { setView('roles'); setSelectedTournamentId(null); handleClose(); }}>Gestionar Roles</MenuItem>
                      <MenuItem onClick={() => { setView('clubs'); setSelectedTournamentId(null); handleClose(); }}>Gestionar Clubes</MenuItem>
                    </>
                  )}
                </Menu>
              </>
            ) : (
              <Button color="inherit" startIcon={<EmojiEvents />} onClick={() => setView('activos')} sx={{ mx: 1 }}>
                {!isSmallScreen && 'Torneos Activos'}
              </Button>
            )}
            <Box sx={{ flexGrow: 1 }} />
            {user ? (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Button color="inherit" onClick={handleUserClick} endIcon={<ExpandMore />} sx={{ mx: 1 }}>
                  <Typography sx={{ color: '#f5f5f5', mr: 1 }}>{user}</Typography>
                </Button>
                <Menu anchorEl={userAnchor} open={Boolean(userAnchor)} onClose={handleClose}>
                  <MenuItem onClick={() => { setView('perfil'); setSelectedTournamentId(null); handleClose(); }}>
                    <People sx={{ mr: 1 }} /> Perfil
                  </MenuItem>
                  <MenuItem onClick={handleLogout}>Cerrar Sesión</MenuItem>
                </Menu>
              </Box>
            ) : (
              <Button variant="contained" sx={{ bgcolor: 'accent.main', color: 'secondary.main' }} onClick={() => setAuthDialogOpen(true)}>
                Iniciar Sesión
              </Button>
            )}
          </Toolbar>
        </AppBar>
        <Box sx={{ mt: 8, p: 3, bgcolor: '#f5f5f5', minHeight: '100vh' }}>
          {user ? (
            <>
              {view === 'jugadores' && <PlayerForm onRegisterPlayer={() => {}} onUpdatePlayer={updatePlayer} onPlayerAdded={handlePlayerAdded} users={users} />}
              {view === 'crear' && (role === 'admin' || role === 'coach') && <TournamentForm players={players} onCreateTournament={createTournament} />}
              {view === 'activos' && !selectedTournamentId && (
                <Box>
                  <Typography variant="h5" gutterBottom>Torneos Activos</Typography>
                  {tournaments.filter(t => t.status === 'En curso' && !t.draft).length === 0 ? (
                    <Typography>No hay torneos activos actualmente.</Typography>
                  ) : (
                    tournaments.filter(t => t.status === 'En curso' && !t.draft).map(tournament => (
                      <Box key={tournament._id} sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 2, boxShadow: '0 2px 4px rgba(0,0,0,0.1)', bgcolor: 'background.paper' }}>
                        <Typography variant="h6">{tournament.name}</Typography>
                        <Typography>{tournament.type} - {tournament.sport} ({tournament.format.mode})</Typography>
                        <Typography>Club: {tournament.club?.name || 'No definido'}</Typography>
                        <Typography>Categoría: {tournament.category || 'No definida'}</Typography>
                        <Button
                          variant="outlined"
                          onClick={() => setSelectedTournamentId(tournament._id)}
                          sx={{ mt: 1 }}
                        >
                          Ver Detalles
                        </Button>
                      </Box>
                    ))
                  )}
                </Box>
              )}
              {view === 'activos' && selectedTournamentId && (
                <TournamentInProgress
                  tournamentId={selectedTournamentId}
                  onFinishTournament={handleFinishTournament}
                />
              )}
              {view === 'historial' && <TournamentHistory tournaments={tournaments} />}
              {view === 'roles' && role === 'admin' && <ManageRoles />}
              {view === 'clubs' && role === 'admin' && <ClubManagement />}
              {view === 'perfil' && (
                <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 2, boxShadow: '0 2px 4px rgba(0,0,0,0.1)', bgcolor: 'background.paper' }}>
                  <Typography variant="h5" gutterBottom>Perfil</Typography>
                  <Typography>Modifica tus datos personales y preferencias (a desarrollar)</Typography>
                </Box>
              )}
            </>
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Box sx={{ p: 3 }}>
                <Typography variant="h5" gutterBottom>Torneos Activos</Typography>
                {tournaments.filter(t => t.status === 'En curso' && !t.draft).length === 0 ? (
                  <Typography>No hay torneos activos actualmente.</Typography>
                ) : (
                  tournaments.filter(t => t.status === 'En curso' && !t.draft).map(tournament => (
                    <Box key={tournament._id} sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 2, boxShadow: '0 2px 4px rgba(0,0,0,0.1)', bgcolor: 'background.paper' }}>
                      <Typography variant="h6">{tournament.name}</Typography>
                      <Typography>{tournament.type} - {tournament.sport} ({tournament.format.mode})</Typography>
                      <Typography>Club: {tournament.club?.name || 'No definido'}</Typography>
                      <Typography>Categoría: {tournament.category || 'No definida'}</Typography>
                      <Typography>Estado: {tournament.status}</Typography>
                    </Box>
                  ))
                )}
              </Box>
            </Box>
          )}
        </Box>
        <Dialog open={authDialogOpen} onClose={() => setAuthDialogOpen(false)} maxWidth="sm" fullWidth sx={{ '& .MuiDialog-paper': { borderTop: `4px solid ${theme.palette.primary.main}` } }}>
          <DialogTitle>{authView === 'login' ? 'Iniciar Sesión' : 'Registrarse'}</DialogTitle>
          <DialogContent>
            {authView === 'login' ? (
              <LoginForm onSwitchToRegister={() => setAuthView('register')} onLoginSuccess={handleLoginSuccess} />
            ) : (
              <RegisterForm onSwitchToLogin={() => setAuthView('login')} />
            )}
          </DialogContent>
        </Dialog>
      </ErrorBoundary>
    </ThemeProvider>
  );
};

export default App;