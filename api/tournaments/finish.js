const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Tournament = require('../../models/Tournament');

mongoose.connect(process.env.MONGO_URI);

const authenticateToken = (req) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) throw new Error('Acceso denegado');
  return jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
};

const isCreatorOrAdmin = async (req, user) => {
  const tournament = await Tournament.findById(req.query.id);
  if (!tournament) throw new Error('Torneo no encontrado');
  if (user.role !== 'admin' && tournament.creator.toString() !== user._id) {
    throw new Error('No autorizado');
  }
  return tournament;
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Método no permitido' });
  const { id } = req.query;
  try {
    const user = authenticateToken(req);
    const tournament = await isCreatorOrAdmin(req, user);
    const allMatchesCompleted = tournament.type === 'RoundRobin' 
      ? tournament.groups.every(group => group.matches.every(match => match.result.winner))
      : tournament.rounds.every(round => round.matches.every(match => match.result.winner));
    if (!allMatchesCompleted) return res.status(400).json({ message: 'Faltan resultados de partidos' });
    tournament.status = 'Finalizado';
    await tournament.save();
    res.status(200).json(tournament);
  } catch (error) {
    res.status(error.message === 'Acceso denegado' ? 401 : error.message === 'Torneo no encontrado' ? 404 : 500).json({ message: error.message });
  }
};