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

        <Route
          path="/"
          element={user ? <TournamentList /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/history"
          element={user ? <TournamentHistory /> : <Navigate to="/login" replace />}
        />

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

        <Route
          path="/tournaments/:id"
          element={user ? <TournamentInProgress /> : <Navigate to="/login" replace />}
        />

        {/* Redirect any legacy singular path */}
        <Route
          path="/tournament/:id"
          element={<Navigate to="/tournaments/:id" replace />}
        />

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
