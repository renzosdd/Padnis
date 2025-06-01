import React, { useEffect, useMemo, Suspense, lazy } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate
} from 'react-router-dom';
import { Provider as ReduxProvider } from 'react-redux';
import { ThemeProvider, CssBaseline, CircularProgress, Box } from '@mui/material';
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

const TournamentInProgress = lazy(() => import('./components/TournamentInProgress'));
const TournamentForm       = lazy(() => import('./components/TournamentForm'));

function MainApp() {
  const { user, role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      const path = window.location.pathname;
      if (path === '/login' || path === '/register') {
        navigate('/', { replace: true });
      }
    } else {
      navigate('/login', { replace: true });
    }
  }, [user, navigate]);

  return (
    <>
      <NavBar />
      <Suspense fallback={
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      }>
        <Routes>
          {/* Rutas públicas */}
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

          {/* Rutas protegidas */}
          <Route
            path="/"
            element={user ? <TournamentList /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/history"
            element={user ? <TournamentHistory /> : <Navigate to="/login" replace />}
          />

          {/* Crear torneo – sólo admins/coaches */}
          <Route
            path="/tournaments/create"
            element={
              user && (role === 'admin' || role === 'coach')
                ? (
                  <TournamentForm
                    onCreateTournament={(newT) =>
                      navigate(`/tournaments/${newT._id}`, { replace: true })
                    }
                  />
                )
                : <Navigate to="/" replace />
            }
          />

          {/* Ver detalles de torneo en curso */}
          <Route
            path="/tournaments/:id"
            element={user ? <TournamentInProgress /> : <Navigate to="/login" replace />}
          />

          {/* Redirigir ruta singular antigua a plural */}
          <Route
            path="/tournament/:id"
            element={<Navigate to="/tournaments/:id" replace />}
          />

          {/* Catch‐all */}
          <Route
            path="*"
            element={<Navigate to={user ? "/" : "/login"} replace />}
          />
        </Routes>
      </Suspense>
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
