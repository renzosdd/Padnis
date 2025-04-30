// src/frontend/src/App.jsx
import React, { useEffect, useMemo, useContext, createContext, useState, useCallback } from 'react';
import axios from 'axios';
import { Provider as ReduxProvider } from 'react-redux';
import {
  ThemeProvider,
  createTheme,
  useMediaQuery,
  Snackbar,
  Alert
} from '@mui/material';
import { io } from 'socket.io-client';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import store from './store/store';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider, useNotification } from './contexts/NotificationContext';
import TournamentList from './components/TournamentList';
import TournamentHistory from './components/TournamentHistory';
import TournamentInProgress from './components/TournamentInProgress';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';

export const SocketContext = createContext();

const BACKEND_URL = process.env.REACT_APP_API_URL || 'https://padnis.onrender.com';

const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#424242' },
  },
});

function NotificationSnackbars() {
  const { notifications } = useNotification();
  return (
    <>
      {notifications.map(({ key, message, severity }) => (
        <Snackbar
          key={key}
          open
          autoHideDuration={3000}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert severity={severity} variant="filled">
            {message}
          </Alert>
        </Snackbar>
      ))}
    </>
  );
}

function MainApp() {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const socket = useContext(SocketContext);
  const [tournaments, setTournaments] = useState([]);
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const fetchTournaments = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(
        `${BACKEND_URL}/api/tournaments?status=En curso`,
        { headers }
      );
      setTournaments(res.data);
    } catch (err) {
      console.error(err);
      addNotification('Error al cargar torneos', 'error');
    }
  }, [addNotification]);

  useEffect(() => {
    if (user) {
      fetchTournaments();
    } else {
      setTournaments([]);
    }
  }, [user, fetchTournaments]);

  useEffect(() => {
    if (!socket) return;
    const onMatchUpdated = () => {
      fetchTournaments();
      addNotification('Resultado actualizado', 'success');
    };
    const onRoundChanged = () => {
      fetchTournaments();
      addNotification('Nueva ronda generada', 'info');
    };
    socket.on('match:updated', onMatchUpdated);
    socket.on('tournament:roundChanged', onRoundChanged);
    return () => {
      socket.off('match:updated', onMatchUpdated);
      socket.off('tournament:roundChanged', onRoundChanged);
    };
  }, [socket, fetchTournaments, addNotification]);

  return (
    <>
      <Routes>
        <Route
          path="/login"
          element={!user ? <LoginForm /> : <Navigate to="/" replace />}
        />
        <Route
          path="/register"
          element={!user ? <RegisterForm /> : <Navigate to="/" replace />}
        />
        <Route
          path="/"
          element={
            user ? (
              <TournamentList
                tournaments={tournaments}
                isMobile={isMobile}
                view="activos"
                onViewChange={() => {}}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/history"
          element={
            user ? <TournamentHistory /> : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/tournament/:id"
          element={
            user ? <TournamentInProgress /> : <Navigate to="/login" replace />
          }
        />
      </Routes>
      <NotificationSnackbars />
    </>
  );
}

export default function App() {
  const socket = useMemo(() => io(BACKEND_URL), []);

  return (
    <ReduxProvider store={store}>
      <ThemeProvider theme={theme}>
        <AuthProvider>
          <NotificationProvider>
            <SocketContext.Provider value={socket}>
              <Router>
                <MainApp />
              </Router>
            </SocketContext.Provider>
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </ReduxProvider>
  );
}
