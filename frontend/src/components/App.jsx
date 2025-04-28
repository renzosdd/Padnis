import React, { useState, useEffect, useCallback, useMemo } from 'react';
   import axios from 'axios';
   import { useSelector, useDispatch } from 'react-redux';
   import { setPlayers } from '../store/store'; // Correcto para src/frontend/src/store/store.js
   import {
     ThemeProvider,
     createTheme,
     CssBaseline,
     AppBar,
     Toolbar,
     Typography,
     Box,
     Menu,
     MenuItem,
     Button,
     Dialog,
     DialogTitle,
     DialogContent,
     useMediaQuery,
     CircularProgress,
     Alert,
   } from '@mui/material';
   import { People, EmojiEvents, Settings, ExpandMore } from '@mui/icons-material';
   import ErrorBoundary from './ErrorBoundary';
   import PlayerForm from './PlayerForm';
   import TournamentForm from './TournamentForm';
   import TournamentHistory from './TournamentHistory';
   import TournamentInProgress from './TournamentInProgress';
   import LoginForm from './LoginForm';
   import RegisterForm from './RegisterForm';
   import ManageRoles from './ManageRoles';
   import ClubManagement from './ClubManagement';
   import { useAuth } from '../contexts/AuthContext';
   import { useNotification } from '../contexts/NotificationContext';

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
     const [loading, setLoading] = useState(true);
     const [error, setError] = useState(null);
     const [retryCount, setRetryCount] = useState(0);
     const maxRetries = 3;
     const initialRetryDelay = 2000;

     const { user, role, logout } = useAuth();
     const { addNotification } = useNotification();
     const players = useSelector((state) => state.players.list);
     const dispatch = useDispatch();
     const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

     const fetchPlayers = useCallback(async () => {
       try {
         const token = localStorage.getItem('token');
         if (!token) throw new Error('No token available');
         const response = await axios.get(`${BACKEND_URL}/api/players`, {
           headers: { Authorization: `Bearer ${token}` },
           timeout: 10000,
         });
         const normalizedPlayers = response.data.map((player) => ({ ...player, _id: String(player._id) }));
         dispatch(setPlayers(normalizedPlayers));
       } catch (error) {
         addNotification('No se pudieron cargar los jugadores: ' + (error.response?.data?.message || error.message), 'error');
         dispatch(setPlayers([]));
       }
     }, [addNotification, dispatch]);

     const fetchTournaments = useCallback(async (retries = maxRetries, backoff = initialRetryDelay) => {
       try {
         const token = localStorage.getItem('token');
         const url = `${BACKEND_URL}/api/tournaments?status=En%20curso`;
         console.log('Fetching tournaments from:', url, 'with token:', token ? 'present' : 'missing');
         const response = await axios.get(url, {
           headers: token ? { Authorization: `Bearer ${token}` } : {},
           timeout: 10000,
         });
         console.log('API response (App.jsx):', response.data);
         if (!Array.isArray(response.data)) {
           throw new Error('Unexpected response format: Data is not an array');
         }
         const validTournaments = response.data.filter((t) => {
           const isValid = t._id && typeof t._id === 'string' && t.name && t.participants;
           if (!isValid) {
             console.warn('Invalid tournament entry:', t);
           }
           return isValid;
         });
         if (validTournaments.length !== response.data.length) {
           console.warn('Some tournaments have invalid data:', response.data);
           addNotification('Algunos torneos tienen datos inválidos y fueron omitidos', 'warning');
         }
         if (validTournaments.length === 0) {
           console.log('No tournaments found for query:', { status: 'En curso', draft: false, user: user ? user._id : 'none' });
         }
         validTournaments.forEach((t) => {
           console.log(`Tournament ${t._id} participants:`, t.participants);
         });
         setTournaments(validTournaments);
         setError(null);
         setRetryCount(0);
         setLoading(false);
       } catch (error) {
         const errorMessage = error.response?.data?.message || error.message || 'Error desconocido';
         const errorDetails = {
           message: errorMessage,
           code: error.code,
           status: error.response?.status,
           responseData: error.response?.data,
           request: error.config,
         };
         console.error('Error fetching tournaments:', errorDetails);
         let userMessage = `Error al cargar torneos (código ${error.code || 'desconocido'}): ${errorMessage}`;
         if (error.code === 'ERR_NETWORK') {
           userMessage += '. El servidor podría estar inactivo. Por favor, intenta recargar la página o verifica el estado del servidor.';
         }
         if (retries > 0) {
           console.log(`Retrying fetch tournaments (${retries} retries left)...`);
           setTimeout(() => {
             setRetryCount(prev => prev + 1);
             fetchTournaments(retries - 1, backoff * 2);
           }, backoff);
         } else {
           setTournaments([]);
           setSelectedTournamentId(null);
           setView('activos');
           setError(userMessage);
           setLoading(false);
         }
       }
     }, [user, addNotification]);

     const fetchUsers = useCallback(async () => {
       try {
         const token = localStorage.getItem('token');
         if (!token) throw new Error('No token available');
         const response = await axios.get(`${BACKEND_URL}/api/users`, {
           headers: { Authorization: `Bearer ${token}` },
           timeout: 10000,
         });
         setUsers(response.data);
       } catch (error) {
         addNotification('No se pudieron cargar los usuarios: ' + (error.response?.data?.message || error.message), 'error');
         setUsers([]);
       }
     }, [addNotification]);

     useEffect(() => {
       const fetchData = async () => {
         setLoading(true);
         try {
           await fetchTournaments();
           if (user) {
             await Promise.all([
               role !== 'player' ? fetchPlayers() : Promise.resolve(),
               role === 'admin' || role === 'coach' ? fetchUsers() : Promise.resolve(),
             ]);
           }
         } catch (err) {
           setError(err.message);
           addNotification('Error al cargar datos iniciales: ' + err.message, 'error');
         } finally {
           setLoading(false);
         }
       };
       fetchData();
     }, [user, role, fetchTournaments, fetchPlayers, fetchUsers, addNotification]);

     const updatePlayer = useCallback((updatedPlayer) => {
       dispatch(setPlayers(players.map((p) => (p.playerId === updatedPlayer.playerId ? { ...updatedPlayer, _id: String(updatedPlayer._id) } : p))));
     }, [players, dispatch]);

     const createTournament = useCallback(async () => {
       await fetchTournaments();
     }, [fetchTournaments]);

     const handlePlayerAdded = useCallback(() => {
       fetchPlayers();
     }, [fetchPlayers]);

     const handleFinishTournament = useCallback((finishedTournament) => {
       setTournaments((prev) => prev.filter((t) => t._id !== finishedTournament._id));
       setSelectedTournamentId(null);
       setView('activos');
     }, []);

     const handleTournamentClick = useCallback((event) => {
       setTournamentAnchor(event.currentTarget);
     }, []);

     const handleSettingsClick = useCallback((event) => {
       setSettingsAnchor(event.currentTarget);
     }, []);

     const handleUserClick = useCallback((event) => {
       setUserAnchor(event.currentTarget);
     }, []);

     const handleClose = useCallback(() => {
       setTournamentAnchor(null);
       setSettingsAnchor(null);
       setUserAnchor(null);
     }, []);

     const handleLogout = useCallback(() => {
       localStorage.removeItem('token');
       logout();
       setSelectedTournamentId(null);
       setView('activos');
     }, [logout]);

     const handleLoginSuccess = useCallback(() => {
       setAuthDialogOpen(false);
     }, []);

     const handleTournamentSelect = useCallback((tournamentId) => {
       if (tournamentId && typeof tournamentId === 'string') {
         setSelectedTournamentId(tournamentId);
         setView('activos');
       } else {
         console.warn('Invalid tournamentId:', tournamentId);
         addNotification('No se pudo seleccionar el torneo', 'error');
       }
     }, [addNotification]);

     const tournamentList = useMemo(() => {
       return tournaments.map((tournament) => (
         <Box
           key={tournament._id}
           sx={{
             mb: 2,
             p: isMobile ? 1 : 2,
             border: '1px solid #e0e0e0',
             borderRadius: 2,
             boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
             bgcolor: 'background.paper',
           }}
         >
           <Typography variant={isMobile ? 'subtitle1' : 'h6'}>{tournament.name}</Typography>
           <Typography sx={{ fontSize: isMobile ? '0.875rem' : '1rem' }}>
             {tournament.type} - {tournament.sport} ({tournament.format.mode})
           </Typography>
           <Typography sx={{ fontSize: isMobile ? '0.875rem' : '1rem' }}>
             Club: {tournament.club?.name || 'No definido'}
           </Typography>
           <Typography sx={{ fontSize: isMobile ? '0.875rem' : '1rem' }}>
             Categoría: {tournament.category || 'No definida'}
           </Typography>
           {user ? (
             <Button
               variant="outlined"
               onClick={() => handleTournamentSelect(tournament._id)}
               sx={{ mt: 1, fontSize: isMobile ? '0.75rem' : '0.875rem' }}
               aria-label={`Ver detalles de ${tournament.name}`}
             >
               Ver Detalles
             </Button>
           ) : (
             <Typography sx={{ fontSize: isMobile ? '0.875rem' : '1rem' }}>
               Estado: {tournament.status}
             </Typography>
           )}
         </Box>
       ));
     }, [tournaments, user, handleTournamentSelect, isMobile]);

     if (loading) {
       return (
         <Box
           sx={{
             display: 'flex',
             flexDirection: 'column',
             alignItems: 'center',
             justifyContent: 'center',
             minHeight: '100vh',
             p: 2,
             bgcolor: '#f5f5f5',
           }}
         >
           <CircularProgress aria-label="Cargando aplicación" />
           <Typography sx={{ mt: 2, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
             Cargando datos...
           </Typography>
         </Box>
       );
     }

     if (error) {
       return (
         <Box
           sx={{
             display: 'flex',
             flexDirection: 'column',
             alignItems: 'center',
             justifyContent: 'center',
             minHeight: '100vh',
             p: 2,
             bgcolor: '#f5f5f5',
             textAlign: 'center',
           }}
         >
           <Alert severity="error" sx={{ mb: 2 }}>
             {error}
           </Alert>
           <Button
             variant="contained"
             color="primary"
             onClick={() => {
               setLoading(true);
               setError(null);
               setRetryCount(0);
               fetchTournaments();
             }}
             sx={{ fontSize: { xs: '0.875rem', sm: '1rem' }, px: 3, py: 1 }}
             aria-label="Reintentar cargar torneos"
           >
             Reintentar
           </Button>
           <Button
             variant="outlined"
             color="secondary"
             onClick={() => window.location.reload()}
             sx={{ mt: 2, fontSize: { xs: '0.875rem', sm: '1rem' }, px: 3, py: 1 }}
             aria-label="Recargar página"
           >
             Recargar Página
           </Button>
         </Box>
       );
     }

     return (
       <ThemeProvider theme={theme}>
         <CssBaseline />
         <ErrorBoundary>
           <AppBar position="fixed">
             <Toolbar>
               <Typography variant="h6" sx={{ mr: 2 }} aria-label="Padnis">
                 Padnis
               </Typography>
               {user ? (
                 <>
                   {role !== 'player' && (
                     <Button
                       color="inherit"
                       startIcon={<People />}
                       onClick={() => {
                         setView('jugadores');
                         setSelectedTournamentId(null);
                       }}
                       sx={{ mx: 1 }}
                       aria-label="Ver jugadores"
                     >
                       {!isMobile && 'Jugadores'}
                     </Button>
                   )}
                   <Button
                     color="inherit"
                     startIcon={<EmojiEvents />}
                     onClick={handleTournamentClick}
                     endIcon={!isMobile && <ExpandMore />}
                     sx={{ mx: 1 }}
                     aria-label="Menú de torneos"
                     aria-haspopup="true"
                   >
                     {!isMobile && 'Torneos'}
                   </Button>
                   <Menu anchorEl={tournamentAnchor} open={Boolean(tournamentAnchor)} onClose={handleClose}>
                     {(role === 'admin' || role === 'coach') && (
                       <MenuItem
                         onClick={() => {
                           setView('crear');
                           setSelectedTournamentId(null);
                           handleClose();
                         }}
                       >
                         Crear Torneo
                       </MenuItem>
                     )}
                     <MenuItem
                       onClick={() => {
                         setView('activos');
                         setSelectedTournamentId(null);
                         handleClose();
                       }}
                     >
                       Torneos Activos
                     </MenuItem>
                     <MenuItem
                       onClick={() => {
                         setView('historial');
                         setSelectedTournamentId(null);
                         handleClose();
                       }}
                     >
                       Historial
                     </MenuItem>
                   </Menu>
                   {role === 'admin' && (
                     <Button
                       color="inherit"
                       startIcon={<Settings />}
                       onClick={handleSettingsClick}
                       endIcon={!isMobile && <ExpandMore />}
                       sx={{ mx: 1 }}
                       aria-label="Menú de configuraciones"
                       aria-haspopup="true"
                     >
                       {!isMobile && 'Settings'}
                     </Button>
                   )}
                   <Menu anchorEl={settingsAnchor} open={Boolean(settingsAnchor)} onClose={handleClose}>
                     {role === 'admin' && (
                       <>
                         <MenuItem
                           onClick={() => {
                             setView('roles');
                             setSelectedTournamentId(null);
                             handleClose();
                           }}
                         >
                           Gestionar Roles
                         </MenuItem>
                         <MenuItem
                           onClick={() => {
                             setView('clubs');
                             setSelectedTournamentId(null);
                             handleClose();
                           }}
                         >
                           Gestionar Clubes
                         </MenuItem>
                       </>
                     )}
                   </Menu>
                 </>
               ) : (
                 <Button
                   color="inherit"
                   startIcon={<EmojiEvents />}
                   onClick={() => {
                     setView('activos');
                     setSelectedTournamentId(null);
                   }}
                   sx={{ mx: 1 }}
                   aria-label="Ver torneos activos"
                 >
                   {!isMobile && 'Torneos Activos'}
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
                     aria-label={`Menú de usuario ${user}`}
                     aria-haspopup="true"
                   >
                     <Typography sx={{ color: '#f5f5f5', mr: 1 }}>{user}</Typography>
                   </Button>
                   <Menu anchorEl={userAnchor} open={Boolean(userAnchor)} onClose={handleClose}>
                     <MenuItem
                       onClick={() => {
                         setView('perfil');
                         setSelectedTournamentId(null);
                         handleClose();
                       }}
                     >
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
                   aria-label="Iniciar sesión"
                 >
                   Iniciar Sesión
                 </Button>
               )}
             </Toolbar>
           </AppBar>
           <Box sx={{ mt: 8, p: isMobile ? 2 : 3, bgcolor: '#f5f5f5', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
             {user ? (
               <>
                 {view === 'jugadores' && (
                   <PlayerForm onRegisterPlayer={() => {}} onUpdatePlayer={updatePlayer} onPlayerAdded={handlePlayerAdded} users={users} />
                 )}
                 {view === 'crear' && (role === 'admin' || role === 'coach') && (
                   <TournamentForm players={players} onCreateTournament={createTournament} />
                 )}
                 {view === 'activos' && !selectedTournamentId && (
                   <Box>
                     <Typography variant={isMobile ? 'h6' : 'h5'} gutterBottom sx={{ color: '#1976d2' }}>
                       Torneos Activos
                     </Typography>
                     {tournaments.length === 0 ? (
                       <Box sx={{ textAlign: 'center' }}>
                         <Typography sx={{ mb: 2, fontSize: isMobile ? '1rem' : '1.25rem' }}>
                           No hay torneos activos actualmente.{' '}
                           {(role === 'admin' || role === 'coach')
                             ? 'Crea uno nuevo seleccionando "Crear Torneo" en el menú.'
                             : 'Intenta recargar la página o contacta al administrador.'}
                         </Typography>
                         <Button
                           variant="contained"
                           color="primary"
                           onClick={() => fetchTournaments()}
                           sx={{ bgcolor: '#1976d2' }}
                           aria-label="Reintentar cargar torneos"
                         >
                           Reintentar
                         </Button>
                       </Box>
                     ) : (
                       tournamentList
                     )}
                   </Box>
                 )}
                 {view === 'activos' && selectedTournamentId && (
                   <TournamentInProgress
                     tournamentId={selectedTournamentId}
                     onFinishTournament={handleFinishTournament}
                     role={role}
                     addNotification={addNotification}
                   />
                 )}
                 {view === 'historial' && <TournamentHistory tournaments={tournaments} />}
                 {view === 'roles' && role === 'admin' && <ManageRoles />}
                 {view === 'clubs' && role === 'admin' && <ClubManagement />}
                 {view === 'perfil' && (
                   <Box
                     sx={{
                       p: isMobile ? 1 : 2,
                       border: '1px solid #e0e0e0',
                       borderRadius: 2,
                       boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                       bgcolor: 'background.paper',
                     }}
                   >
                     <Typography variant={isMobile ? 'h6' : 'h5'} gutterBottom sx={{ color: '#1976d2' }}>
                       Perfil
                     </Typography>
                     <Typography sx={{ fontSize: isMobile ? '0.875rem' : '1rem' }}>
                       Modifica tus datos personales y preferencias (a desarrollar)
                     </Typography>
                   </Box>
                 )}
               </>
             ) : (
               <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                 <Box sx={{ p: isMobile ? 2 : 3, maxWidth: 600, width: '100%' }}>
                   <Typography variant={isMobile ? 'h6' : 'h5'} gutterBottom sx={{ color: '#1976d2' }}>
                     Torneos Activos
                   </Typography>
                   {tournaments.length === 0 ? (
                     <Box sx={{ textAlign: 'center' }}>
                       <Typography sx={{ mb: 2, fontSize: isMobile ? '1rem' : '1.25rem' }}>
                         No hay torneos activos actualmente. Inicia sesión para crear uno o contacta al administrador.
                       </Typography>
                       <Button
                         variant="contained"
                         color="primary"
                         onClick={() => fetchTournaments()}
                         sx={{ bgcolor: '#1976d2' }}
                         aria-label="Reintentar cargar torneos"
                       >
                         Reintentar
                       </Button>
                     </Box>
                   ) : (
                     tournamentList
                   )}
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
             aria-labelledby="auth-dialog-title"
           >
             <DialogTitle id="auth-dialog-title">{authView === 'login' ? 'Iniciar Sesión' : 'Registrarse'}</DialogTitle>
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