import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSelector, useDispatch } from 'react-redux';
import { setPlayers } from './store';
import { ThemeProvider, createTheme, CssBaseline, AppBar, Toolbar, Typography, Box, Menu, MenuItem, Button, IconButton, Dialog, DialogTitle, DialogContent, useMediaQuery } from '@mui/material';
import { People, EmojiEvents, Settings, ExpandMore } from '@mui/icons-material';
import ErrorBoundary from './components/ErrorBoundary';
import PlayerForm from './components/PlayerForm';
import TournamentForm from './components/TournamentForm';
import TournamentHistory from './components/TournamentHistory';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import ManageRoles from './components/ManageRoles';
import { useAuth } from './contexts/AuthContext';
import { useNotification } from './contexts/NotificationContext';

const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#424242' },
    accent: { main: '#c0ca33' },
    background: { default: '#fff', paper: '#f5f5f5' },
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
  const { user, role, logout } = useAuth();
  const { addNotification } = useNotification();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const players = useSelector(state => state.players.list);
  const dispatch = useDispatch();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    console.log('App useEffect triggered with user:', user, 'role:', role);
    const fetchData = async () => {
      try {
        console.log('Fetching initial data...');
        await fetchTournaments();
        if (user) {
          await Promise.all([
            role !== 'player' ? fetchPlayers() : Promise.resolve(),
            (role === 'admin' || role === 'coach') ? fetchUsers() : Promise.resolve(),
          ]);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error in fetchData:', err);
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
      console.log('Fetching players with token:', token);
      const response = await axios.get('/api/players', { // Ruta relativa
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });
      console.log('Players fetched:', response.data);
      dispatch(setPlayers(response.data));
    } catch (error) {
      console.error('Error fetching players:', error.message);
      addNotification('No se pudieron cargar los jugadores.', 'error');
      dispatch(setPlayers([]));
    }
  };

  const fetchTournaments = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('Fetching tournaments with token:', token || 'No token (spectator mode)');
      const response = await axios.get('/api/tournaments', { // Ruta relativa
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        timeout: 10000,
      });
      console.log('Tournaments fetched:', response.data);
      setTournaments(response.data);
    } catch (error) {
      console.error('Error fetching tournaments:', error.message);
      addNotification('No se pudieron cargar los torneos.', 'error');
      setTournaments([]);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token available');
      console.log('Fetching users with token:', token);
      const response = await axios.get('/api/users', { // Ruta relativa
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('Users fetched:', response.data);
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error.message);
      addNotification('No se pudieron cargar los usuarios.', 'error');
      setUsers([]);
    }
  };

  const registerPlayer = async (player) => {};
  const updatePlayer = (updatedPlayer) => {};
  const createTournament = async (tournament) => {
    setTournaments(prev => [...prev, tournament]);
    fetchTournaments();
  };

  const handlePlayerAdded = () => {
    fetchPlayers();
  };

  const handleTournamentClick = (event) => {
    setTournamentAnchor(event.currentTarget);
  };

  const handleSettingsClick = (event) => {
    setSettingsAnchor(event.currentTarget);
  };

  const handleUserClick = (event) => {
    setUserAnchor(event.currentTarget);
  };

  const handleClose = () => {
    setTournamentAnchor(null);
    setSettingsAnchor(null);
    setUserAnchor(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    logout();
  };

  const handleLoginSuccess = () => {
    setAuthDialogOpen(false);
  };

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" color="error">Error: {error}</Typography>
        <Button variant="contained" color="primary" onClick={() => window.location.reload()} sx={{ mt: 2 }}>
          Recargar
        </Button>
      </Box>
    );
  }

  if (loading) return <Box sx={{ p: 3 }}><Typography variant="h5">Cargando...</Typography></Box>;

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
                  <Button
                    color="inherit"
                    startIcon={<People />}
                    onClick={() => setView('jugadores')}
                    sx={{ mx: 1 }}
                  >
                    {!isSmallScreen && 'Jugadores'}
                  </Button>
                )}
                <Button
                  color="inherit"
                  startIcon={<EmojiEvents />}
                  onClick={handleTournamentClick}
                  endIcon={!isSmallScreen && <ExpandMore />}
                  sx={{ mx: 1 }}
                >
                  {!isSmallScreen && 'Torneos'}
                </Button>
                <Menu
                  anchorEl={tournamentAnchor}
                  open={Boolean(tournamentAnchor)}
                  onClose={handleClose}
                >
                  {(role === 'admin' || role === 'coach') && (
                    <MenuItem onClick={() => { setView('crear'); handleClose(); }}>Crear Torneo</MenuItem>
                  )}
                  <MenuItem onClick={() => { setView('activos'); handleClose(); }}>Torneos Activos</MenuItem>
                  <MenuItem onClick={() => { setView('historial'); handleClose(); }}>Historial</MenuItem>
                </Menu>
                {role === 'admin' && (
                  <Button
                    color="inherit"
                    startIcon={<Settings />}
                    onClick={handleSettingsClick}
                    endIcon={!isSmallScreen && <ExpandMore />}
                    sx={{ mx: 1 }}
                  >
                    {!isSmallScreen && 'Settings'}
                  </Button>
                )}
                <Menu
                  anchorEl={settingsAnchor}
                  open={Boolean(settingsAnchor)}
                  onClose={handleClose}
                >
                  {role === 'admin' && (
                    <MenuItem onClick={() => { setView('roles'); handleClose(); }}>Gestionar Roles</MenuItem>
                  )}
                </Menu>
              </>
            ) : (
              <Button
                color="inherit"
                startIcon={<EmojiEvents />}
                onClick={() => setView('activos')}
                sx={{ mx: 1 }}
              >
                {!isSmallScreen && 'Torneos Activos'}
              </Button>
            )}
            <Box sx={{ flexGrow: 1 }} />
            {user ? (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Button
                  color="inherit"
                  onClick={handleUserClick}
                  endIcon={<ExpandMore />}
                  sx={{ mx: 1 }}
                >
                  <Typography sx={{ color: '#f5f5f5', mr: 1 }}>{user}</Typography>
                </Button>
                <Menu
                  anchorEl={userAnchor}
                  open={Boolean(userAnchor)}
                  onClose={handleClose}
                >
                  <MenuItem onClick={() => { setView('perfil'); handleClose(); }}>
                    <People sx={{ mr: 1 }} /> Perfil
                  </MenuItem>
                  <MenuItem onClick={handleLogout}>Cerrar Sesión</MenuItem>
                </Menu>
              </Box>
            ) : (
              <Button
                variant="contained"
                sx={{ bgcolor: 'accent.main', color: 'secondary.main' }}
                onClick={() => setAuthDialogOpen(true)}
              >
                Iniciar Sesión
              </Button>
            )}
          </Toolbar>
        </AppBar>
        <Box sx={{ mt: 8, p: 3 }}>
          {user ? (
            <>
              {view === 'jugadores' && <PlayerForm onRegisterPlayer={registerPlayer} onUpdatePlayer={updatePlayer} onPlayerAdded={handlePlayerAdded} />}
              {view === 'crear' && (role === 'admin' || role === 'coach') && <TournamentForm players={players} onCreateTournament={createTournament} />}
              {view === 'activos' && <Typography>Torneos Activos (a desarrollar)</Typography>}
              {view === 'historial' && <TournamentHistory tournaments={tournaments} />}
              {view === 'roles' && role === 'admin' && <ManageRoles />}
              {view === 'perfil' && (
                <Box>
                  <Typography variant="h5" gutterBottom>Perfil</Typography>
                  <Typography>Modifica tus datos personales y preferencias (a desarrollar)</Typography>
                </Box>
              )}
            </>
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Box sx={{ p: 3 }}>
                <Typography variant="h5" gutterBottom>Torneos Activos</Typography>
                <Typography>(Vista de espectador - a desarrollar)</Typography>
              </Box>
            </Box>
          )}
        </Box>
        <Dialog
          open={authDialogOpen}
          onClose={() => setAuthDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          sx={{ '& .MuiDialog-paper': { borderTop: `4px solid ${theme.palette.primary.main}` } }}
        >
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