import React, { useState } from 'react';

interface Player {
  firstName: string;
  lastName: string;
}

interface TournamentFormProps {
  players: Player[];
  onCreateTournament: (tournament: any) => void;
}

const TournamentForm: React.FC<TournamentFormProps> = ({ players, onCreateTournament }) => {
  const [name, setName] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
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

  const generateMatches = (pairs: string[]): any[] => {
    const matches = [];
    for (let i = 0; i < pairs.length; i++) {
      for (let j = i + 1; j < pairs.length; j++) {
        matches.push({ pair1: pairs[i], pair2: pairs[j], date: null, result: null });
      }
    }
    return matches;
  };

  const togglePlayer = (playerName: string) => {
    setSelectedPlayers(prev =>
      prev.includes(playerName)
        ? prev.filter(p => p !== playerName)
        : [...prev, playerName]
    );
  };

  return (
    <div className="row">
      <form className="col s12" onSubmit={handleSubmit}>
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
          <button className="btn teal waves-effect waves-light" type="submit">
            Crear Torneo
          </button>
        </div>
      </form>
    </div>
  );
};

export default TournamentForm;