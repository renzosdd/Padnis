// src/frontend/src/App.jsx
import React, { useEffect, useMemo } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate
} from 'react-router-dom';
import { Provider as ReduxProvider } from 'react-redux';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { io } from 'socket.io-client';

import store from './store/store';
import theme from './theme';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import SocketContext from './contexts/SocketContext';

import NavBar from './components/NavBar';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import TournamentList from './components/TournamentList';
import TournamentHistory from './components/TournamentHistory';
import TournamentInProgress from './components/TournamentInProgress';
import TournamentForm from './components/TournamentForm'; // <-- import form component

function MainApp() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirige a login si no está autenticado; al home si ya lo está
    if (user) {
      if (['/login', '/register'].includes(window.location.pathname)) {
        navigate('/', { replace: true });
      }
    } else {
      navigate('/login', { replace: true });
    }
  }, [user, navigate]);

  return (
    <>
      <NavBar />
      <Routes>
        <Route
          path="/login"
          element={
            !user
              ? <LoginForm onLoginSuccess={() => navigate('/', { replace: true })} />
              : <Navigate to="/" replace />
          }
        />
        <Route
          path="/register"
          element={
            !user
              ? <RegisterForm onRegisterSuccess={() => navigate('/', { replace: true })} />
              : <Navigate to="/" replace />
          }
        />

        {/* Lista de torneos activos */}
        <Route
          path="/"
          element={user ? <TournamentList /> : <Navigate to="/login" replace />}
        />

        {/* Historial de torneos */}
        <Route
          path="/history"
          element={user ? <TournamentHistory /> : <Navigate to="/login" replace />}
        />

        {/* Crear nuevo torneo (solo admin/coach) */}
        <Route
          path="/tournaments/create"
          element={
            user
              ? (
                <TournamentForm
                  // después de crear, redirige al detalle del torneo
                  onCreateTournament={(newT) =>
                    navigate(`/tournament/${newT._id}`, { replace: true })
                  }
                />
              )
              : <Navigate to="/login" replace />
          }
        />

        {/* Ver un torneo en curso */}
        <Route
          path="/tournament/:id"
          element={
            user
              ? <TournamentInProgress />
              : <Navigate to="/login" replace />
          }
        />

        {/* Cualquier otra ruta, redirige al home */}
        <Route path="*" element={<Navigate to={user ? "/" : "/login"} replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  const socket = useMemo(
    () => io(process.env.REACT_APP_API_URL || 'https://padnis.onrender.com'),
    []
  );

  return (
    <ReduxProvider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
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
