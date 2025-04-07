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
  const { id } = req.query;
  if (req.method === 'GET') {
    try {
      const user = authenticateToken(req);
      const tournament = await Tournament.findById(id).populate('creator', 'username');
      if (!tournament) return res.status(404).json({ message: 'Torneo no encontrado' });
      if (user.role !== 'admin' && tournament.creator.toString() !== user._id && tournament.draft) {
        return res.status(403).json({ message: 'No autorizado' });
      }
      res.status(200).json(tournament);
    } catch (error) {
      res.status(error.message === 'Acceso denegado' ? 401 : error.message === 'Torneo no encontrado' ? 404 : 500).json({ message: error.message });
    }
  } else if (req.method === 'PUT') {
    try {
      const user = authenticateToken(req);
      const tournament = await isCreatorOrAdmin(req, user);
      const { groups, rounds, schedule, result } = req.body;
      const updateData = {};
      if (groups) updateData.groups = groups;
      if (rounds) updateData.rounds = rounds;
      if (schedule) updateData.schedule = schedule;
      if (result) {
        if (tournament.status === 'Pendiente') updateData.status = 'En curso';
        if (tournament.type === 'RoundRobin') {
          tournament.groups.forEach(group => {
            group.matches.forEach(match => {
              if (match._id.toString() === result.matchId) match.result = result.result;
            });
          });
          updateData.groups = tournament.groups;
        } else {
          tournament.rounds.forEach(round => {
            round.matches.forEach(match => {
              if (match._id.toString() === result.matchId) match.result = result.result;
            });
          });
          updateData.rounds = tournament.rounds;
        }
      }
      const updatedTournament = await Tournament.findByIdAndUpdate(id, updateData, { new: true });
      res.status(200).json(updatedTournament);
    } catch (error) {
      res.status(error.message === 'Acceso denegado' ? 401 : error.message === 'Torneo no encontrado' ? 404 : 500).json({ message: error.message });
    }
  } else {
    res.status(405).json({ message: 'Método no permitido' });
  }
};