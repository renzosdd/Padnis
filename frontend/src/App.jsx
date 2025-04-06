import React, { useState, useEffect } from 'react';
import axios from 'axios';
import M from 'materialize-css';
import ErrorBoundary from './components/ErrorBoundary';
import NavBar from './components/NavBar';
import PlayerForm from './components/PlayerForm';
import TournamentForm from './components/TournamentForm';
import TournamentHistory from './components/TournamentHistory';
import LoginForm from './components/LoginForm';
import { useAuth } from './contexts/AuthContext';
import { useNotification } from './contexts/NotificationContext';

const App = () => {
  const [players, setPlayers] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [view, setView] = useState('activos');
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    M.Collapsible.init(document.querySelectorAll('.collapsible'), { accordion: true });
    M.Modal.init(document.querySelectorAll('.modal'));
    M.updateTextFields();
    fetchPlayers();
    fetchTournaments();
  }, []);

  const fetchPlayers = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/players');
      setPlayers(response.data);
    } catch (error) {
      console.error('Error fetching players:', error);
      addNotification('No se pudieron cargar los jugadores', 'error');
      setPlayers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTournaments = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/tournaments');
      setTournaments(response.data);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      addNotification('No se pudieron cargar los torneos', 'error');
      setTournaments([]);
    }
  };

  const registerPlayer = async (player) => {
    try {
      const response = await axios.post('http://localhost:5001/api/players', { ...player, matches: [] });
      setPlayers(prev => [...prev, response.data]);
      addNotification(`Jugador ${player.firstName} ${player.lastName} registrado`, 'success');
    } catch (error) {
      console.error('Error registering player:', error);
      addNotification('Error al registrar jugador', 'error');
    }
  };

  const createTournament = async (tournament) => {
    try {
      const response = await axios.post('http://localhost:5001/api/tournaments', {
        ...tournament,
        completed: false,
        startDate: new Date().toISOString().split('T')[0],
      });
      setTournaments(prev => [...prev, response.data]);
      addNotification(`Torneo ${tournament.name} creado exitosamente`, 'success');
    } catch (error) {
      console.error('Error creating tournament:', error);
      addNotification('Error al crear torneo', 'error');
    }
  };

  if (loading) return <div className="container"><h5>Cargando...</h5></div>;

  return (
    <ErrorBoundary>
      <NavBar />
      <div className="container" style={{ marginTop: '20px' }}>
        {user ? (
          <div className="row">
            <div className="col s12">
              <ul className="tabs tabs-fixed-width" style={{ backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
                <li className="tab col s3">
                  <a href="#jugadores" className={view === 'jugadores' ? 'active teal-text' : 'grey-text'} onClick={() => setView('jugadores')}>
                    Jugadores
                  </a>
                </li>
                <li className="tab col s3">
                  <a href="#crear" className={view === 'crear' ? 'active teal-text' : 'grey-text'} onClick={() => setView('crear')}>
                    Crear torneo
                  </a>
                </li>
                <li className="tab col s3">
                  <a href="#activos" className={view === 'activos' ? 'active teal-text' : 'grey-text'} onClick={() => setView('activos')}>
                    Torneos activos
                  </a>
                </li>
                <li className="tab col s3">
                  <a href="#historial" className={view === 'historial' ? 'active teal-text' : 'grey-text'} onClick={() => setView('historial')}>
                    Historial
                  </a>
                </li>
              </ul>
            </div>
            {view === 'jugadores' && <PlayerForm onRegisterPlayer={registerPlayer} players={players} />}
            {view === 'crear' && <TournamentForm players={players} onCreateTournament={createTournament} />}
            {view === 'activos' && <div>Torneos activos (a desarrollar)</div>}
            {view === 'historial' && <TournamentHistory tournaments={tournaments} />}
          </div>
        ) : (
          <div className="row">
            <div className="col s12">
              <div className="card">
                <div className="card-content">
                  <span className="card-title">Bienvenido a Padnis</span>
                  <p>Inicia sesión para gestionar torneos.</p>
                  <LoginForm />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default App;