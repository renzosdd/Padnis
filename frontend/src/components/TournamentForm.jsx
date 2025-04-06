import React, { useState } from 'react';

const TournamentForm = ({ players, onCreateTournament }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [selectedPlayers, setSelectedPlayers] = useState([]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name && category && selectedPlayers.length >= 4) {
      const groups = [{
        name: 'Grupo 1',
        pairs: selectedPlayers,
        matches: generateMatches(selectedPlayers),
      }];
      onCreateTournament({ name, category, groups, knockout: [] });
      setName('');
      setCategory('');
      setSelectedPlayers([]);
    }
  };

  const generateMatches = (pairs) => {
    const matches = [];
    for (let i = 0; i < pairs.length; i++) {
      for (let j = i + 1; j < pairs.length; j++) {
        matches.push({ pair1: pairs[i], pair2: pairs[j], date: null, result: null });
      }
    }
    return matches;
  };

  const togglePlayer = (playerName) => {
    setSelectedPlayers(prev =>
      prev.includes(playerName)
        ? prev.filter(p => p !== playerName)
        : [...prev, playerName]
    );
  };

  return (
    <div className="row">
      <div className="col s12">
        <div className="input-field col s12 m6">
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <label htmlFor="name">Nombre del Torneo</label>
        </div>
        <div className="input-field col s12 m6">
          <input
            id="category"
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
          <label htmlFor="category">Categoría</label>
        </div>
        <div className="col s12">
          <h5>Seleccionar Jugadores (mínimo 4)</h5>
          {players.map((player, idx) => (
            <p key={idx}>
              <label>
                <input
                  type="checkbox"
                  checked={selectedPlayers.includes(`${player.firstName} ${player.lastName}`)}
                  onChange={() => togglePlayer(`${player.firstName} ${player.lastName}`)}
                />
                <span>{`${player.firstName} ${player.lastName}`}</span>
              </label>
            </p>
          ))}
        </div>
        <div className="col s12">
          <button className="btn teal waves-effect waves-light" onClick={handleSubmit}>
            Crear Torneo
          </button>
        </div>
      </div>
    </div>
  );
};

export default TournamentForm;