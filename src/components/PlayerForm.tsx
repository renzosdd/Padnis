import React, { useState } from 'react';

interface Player {
  firstName: string;
  lastName: string;
  matches: any[];
}

interface PlayerFormProps {
  onRegisterPlayer: (player: Player) => void;
  players: Player[];
}

const PlayerForm: React.FC<PlayerFormProps> = ({ onRegisterPlayer, players }) => {
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (firstName && lastName) {
      onRegisterPlayer({ firstName, lastName, matches: [] });
      setFirstName('');
      setLastName('');
    }
  };

  return (
    <div className="row">
      <form className="col s12" onSubmit={handleSubmit}>
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
          <button className="btn teal waves-effect waves-light" type="submit">
            Registrar Jugador
          </button>
        </div>
      </form>
      <div className="col s12">
        <h5>Jugadores Registrados</h5>
        <ul>
          {players.map((player, idx) => (
            <li key={idx}>{`${player.firstName} ${player.lastName}`}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default PlayerForm;