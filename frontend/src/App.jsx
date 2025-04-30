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
import TournamentForm from './components/TournamentForm';

function MainApp() {
  const { user, role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
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
        {/* ... rutas de login/register/lista/historial ... */}

        <Route
          path="/tournaments/create"
          element={
            user && (role === 'admin' || role === 'coach')
              ? (
                <TournamentForm
                  onCreateTournament={(newT) =>
                    navigate(`/tournaments/${newT._id}`, { replace: true })
                  }
                  players={[]} 
                />
              )
              : <Navigate to="/" replace />
          }
        />

        {/* Aquí cambiamos a "tournaments/:id" */}
        <Route
          path="/tournaments/:id"
          element={
            user
              ? <TournamentInProgress />
              : <Navigate to="/login" replace />
          }
        />

        {/* Si quieres mantener ésta también (opcional): */}
        <Route
          path="/tournament/:id"
          element={<Navigate to="/" replace />}
        />

        {/* Ruta comodín */}
        <Route
          path="*"
          element={<Navigate to={user ? "/" : "/login"} replace />}
        />
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
