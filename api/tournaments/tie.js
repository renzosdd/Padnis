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
  const { groupId } = req.body;
  try {
    const user = authenticateToken(req);
    const tournament = await isCreatorOrAdmin(req, user);
    if (tournament.type !== 'RoundRobin') return res.status(400).json({ message: 'Solo para Round Robin' });
    const group = tournament.groups.find(g => g._id.toString() === groupId);
    if (!group) return res.status(404).json({ message: 'Grupo no encontrado' });
    const tiedPlayers = group.standings.filter(s => s.wins === group.standings[0].wins);
    const winner = tiedPlayers[Math.floor(Math.random() * tiedPlayers.length)];
    group.standings = [winner, ...group.standings.filter(s => s.playerId !== winner.playerId)];
    await tournament.save();
    res.status(200).json(tournament);
  } catch (error) {
    res.status(error.message === 'Acceso denegado' ? 401 : error.message === 'Torneo no encontrado' ? 404 : 500).json({ message: error.message });
  }
};