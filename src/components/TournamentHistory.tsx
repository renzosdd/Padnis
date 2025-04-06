import React from 'react';

interface Tournament {
  _id: string;
  name: string;
  category: string;
  completed: boolean;
  startDate: string;
}

interface TournamentHistoryProps {
  tournaments: Tournament[];
}

const TournamentHistory: React.FC<TournamentHistoryProps> = ({ tournaments }) => {
  const completedTournaments = tournaments.filter(t => t.completed);

  return (
    <div className="row">
      <div className="col s12">
        <h5>Historial de Torneos</h5>
        {completedTournaments.length > 0 ? (
          <ul className="collection">
            {completedTournaments.map(tournament => (
              <li key={tournament._id} className="collection-item">
                {tournament.name} - {tournament.category} (Finalizado el {tournament.startDate})
              </li>
            ))}
          </ul>
        ) : (
          <p>No hay torneos finalizados.</p>
        )}
      </div>
    </div>
  );
};

export default TournamentHistory;