import React, { useState } from 'react';

const PlayerForm = ({ onRegisterPlayer, players }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (firstName && lastName) {
      onRegisterPlayer({ firstName, lastName, matches: [] });
      setFirstName('');
      setLastName('');
    }
  };

  return (
    <div className="row">
      <div className="col s12">
        <div className="input-field col s12 m6">
          <input
            id="firstName"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
          <label htmlFor="firstName">Nombre</label>
        </div>
        <div className="input-field col s12 m6">
          <input
            id="lastName"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
          <label htmlFor="lastName">Apellido</label>
        </div>
        <div className="col s12">
          <button className="btn teal waves-effect waves-light" onClick={handleSubmit}>
            Registrar Jugador
          </button>
        </div>
        <div className="col s12">
          <h5>Jugadores Registrados</h5>
          <ul>
            {players.map((player, idx) => (
              <li key={idx}>{`${player.firstName} ${player.lastName}`}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PlayerForm;