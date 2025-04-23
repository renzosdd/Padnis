import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import { ThemeProvider } from '@mui/material/styles';
import { Snackbar, Alert, CssBaseline } from '@mui/material';
import theme from './theme.js';
import Login from './Login.jsx';
import Register from './Register.jsx';
import Dashboard from './Dashboard.jsx';
import TournamentInProgress from './TournamentInProgress.jsx';
import CreateTournament from './CreateTournament.jsx';
import TournamentHistory from './TournamentHistory.jsx';
import NavigationBar from './NavigationBar.jsx';

const App = () => {
  const [user, setUser] = useState(null);
  const [tournaments, setTournaments] = useState([]);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });

  const addNotification = (message, severity = 'info') => {
    setNotification({ open: true, message, severity });
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  const fetchTournaments = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setTournaments([]);
        return;
      }
      console.log('Fetching tournaments from: https://padnis.onrender.com/api/tournaments?status=En%20curso with token:', token ? 'present' : 'not present');
      const response = await axios.get('https://padnis.onrender.com/api/tournaments?status=En%20curso', {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('API response (App.jsx):', response.data);
      setTournaments(response.data);
      console.log('Tournaments fetched:', response.data.length);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      addNotification('Error al cargar los torneos', 'error');
      setTournaments([]);
    }
  };

  const fetchUser = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setUser(null);
        return;
      }
      const response = await axios.get('https://padnis.onrender.com/api/users/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(response.data);
    } catch (error) {
      console.error('Error fetching user:', error);
      setUser(null);
      localStorage.removeItem('token');
    }
  };

  useEffect(() => {
    fetchUser();
    fetchTournaments();
  }, []);

  const handleLogin = async (credentials) => {
    try {
      const response = await axios.post('https://padnis.onrender.com/api/users/login', credentials);
      localStorage.setItem('token', response.data.token);
      setUser(response.data.user);
      await fetchTournaments();
      addNotification('Inicio de sesión exitoso', 'success');
    } catch (error) {
      addNotification('Error al iniciar sesión', 'error');
      throw error;
    }
  };

  const handleRegister = async (userData) => {
    try {
      await axios.post('https://padnis.onrender.com/api/users/register', userData);
      addNotification('Registro exitoso, por favor inicia sesión', 'success');
    } catch (error) {
      addNotification('Error al registrarse', 'error');
      throw error;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setTournaments([]);
    addNotification('Sesión cerrada', 'info');
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <NavigationBar user={user} onLogout={handleLogout} />
        <Routes>
          <Route
            path="/login"
            element={user ? <Navigate to="/" /> : <Login onLogin={handleLogin} />}
          />
          <Route
            path="/register"
            element={user ? <Navigate to="/" /> : <Register onRegister={handleRegister} />}
          />
          <Route
            path="/"
            element={
              user ? (
                <Dashboard
                  tournaments={tournaments}
                  role={user.role}
                  fetchTournaments={fetchTournaments}
                  addNotification={addNotification}
                />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/tournaments/:id"
            element={
              user ? (
                <TournamentInProgress role={user.role} addNotification={addNotification} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/create-tournament"
            element={
              user && (user.role === 'admin' || user.role === 'coach') ? (
                <CreateTournament fetchTournaments={fetchTournaments} addNotification={addNotification} />
              ) : (
                <Navigate to="/" />
              )
            }
          />
          <Route
            path="/history"
            element={
              user ? (
                <TournamentHistory role={user.role} addNotification={addNotification} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
        </Routes>
      </Router>
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
};

export default App;