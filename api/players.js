const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Player = require('../models/Player');

mongoose.connect(process.env.MONGO_URI);

const authenticateToken = (req) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) throw new Error('Acceso denegado');
  return jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
};

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    try {
      const { showInactive } = req.query;
      let query = { active: 'Yes' };
      if (req.headers.authorization) {
        const user = authenticateToken(req);
        if (user.role === 'admin' && showInactive === 'true') query = {};
      }
      const players = await Player.find(query).populate('user', 'username');
      res.status(200).json(players.map(player => ({
        playerId: player.playerId,
        firstName: player.firstName,
        lastName: player.lastName,
        email: player.email,
        phone: player.phone,
        photo: player.photo,
        dominantHand: player.dominantHand,
        racketBrand: player.racketBrand,
        user: player.user ? player.user.username : null,
        active: player.active,
        matches: player.matches,
      })));
    } catch (error) {
      res.status(error.message === 'Acceso denegado' ? 401 : 500).json({ message: error.message });
    }
  } else if (req.method === 'POST') {
    try {
      const user = authenticateToken(req);
      if (user.role !== 'admin' && user.role !== 'coach') {
        return res.status(403).json({ message: 'Requiere rol de admin o coach' });
      }
      const { firstName, lastName, email, phone, photo, dominantHand, racketBrand } = req.body;
      const lastPlayer = await Player.findOne({}, 'playerId', { sort: { playerId: -1 } });
      const playerId = lastPlayer && lastPlayer.playerId >= 0 ? lastPlayer.playerId + 1 : 1;
      const player = new Player({
        playerId,
        firstName,
        lastName,
        email: email || undefined,
        phone: phone || undefined,
        photo: photo || undefined,
        dominantHand: dominantHand || 'right',
        racketBrand: racketBrand || '',
        matches: [],
      });
      await player.save();
      res.status(201).json(player);
    } catch (error) {
      res.status(error.message === 'Acceso denegado' ? 401 : 500).json({ message: error.message });
    }
  } else {
    res.status(405).json({ message: 'Método no permitido' });
  }
};