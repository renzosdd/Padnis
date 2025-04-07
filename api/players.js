const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Player = require('../models/Player');
const User = require('../models/User');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Acceso denegado' });
  jwt.verify(token, 'secret_key', (err, user) => {
    if (err) return res.status(403).json({ message: 'Token inválido' });
    req.user = user;
    next();
  });
};

const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Requiere rol de admin' });
  next();
};

const isEditable = async (req, res, next) => {
  try {
    const player = await Player.findOne({ playerId: req.params.playerId });
    if (!player) return res.status(404).json({ message: 'Jugador no encontrado' });
    const user = await User.findOne({ username: req.user.username });
    if (req.user.role === 'admin' || req.user.role === 'coach' || (player.user && player.user.toString() === user._id.toString())) {
      next();
    } else {
      res.status(403).json({ message: 'No autorizado para editar este jugador' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error verificando permisos', error: error.message });
  }
};

router.get('/', async (req, res) => {
  try {
    const { showInactive } = req.query;
    let query = { active: 'Yes' };
    if (req.headers.authorization) {
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, 'secret_key', (err, user) => {
        if (!err && user.role === 'admin' && showInactive === 'true') query = {};
      });
    }
    const players = await Player.find(query).populate('user', 'username');
    res.json(players.map(player => ({
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
    console.error('Error fetching players:', error);
    res.status(500).json({ message: 'Error fetching players', error: error.message });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'coach') {
      return res.status(403).json({ message: 'Requiere rol de admin o coach' });
    }
    console.log('Registering player with data:', req.body);
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
    console.log('Player registered successfully:', player);
    res.status(201).json(player);
  } catch (error) {
    console.error('Error creating player:', error);
    if (error.code === 11000 && error.keyPattern.email) {
      res.status(400).json({ message: 'El email ya está en uso' });
    } else {
      res.status(500).json({ message: 'Error creating player', error: error.message });
    }
  }
});

router.get('/:playerId', async (req, res) => {
  try {
    const player = await Player.findOne({ playerId: req.params.playerId }).populate('user', 'username');
    if (!player) return res.status(404).json({ message: 'Jugador no encontrado' });
    const token = req.headers.authorization?.split(' ')[1];
    let responseData = {
      playerId: player.playerId,
      firstName: player.firstName,
      lastName: player.lastName,
      photo: player.photo,
      dominantHand: player.dominantHand,
      racketBrand: player.racketBrand,
      matches: player.matches,
    };
    if (token) {
      jwt.verify(token, 'secret_key', (err, user) => {
        if (!err && (user.role === 'admin' || user.role === 'coach' || (player.user && player.user.toString() === user._id))) {
          responseData = {
            ...responseData,
            email: player.email,
            phone: player.phone,
            user: player.user ? player.user.username : null,
            active: player.active,
          };
        }
      });
    }
    res.json(responseData);
  } catch (error) {
    console.error('Error fetching player:', error);
    res.status(500).json({ message: 'Error fetching player', error: error.message });
  }
});

router.put('/:playerId', authenticateToken, isEditable, async (req, res) => {
  try {
    const { firstName, lastName, email, phone, photo, dominantHand, racketBrand, userId, active } = req.body;
    const updateData = {
      firstName,
      lastName,
      email: email || undefined,
      phone: phone || undefined,
      photo: photo || undefined,
      dominantHand: dominantHand || 'right',
      racketBrand: racketBrand || '',
    };
    if (req.user.role === 'admin') {
      if (userId) updateData.user = userId === 'none' ? null : userId;
      if (active) updateData.active = active;
    }
    const player = await Player.findOneAndUpdate(
      { playerId: req.params.playerId },
      updateData,
      { new: true }
    ).populate('user', 'username');
    if (!player) return res.status(404).json({ message: 'Jugador no encontrado' });
    res.json(player);
  } catch (error) {
    console.error('Error updating player:', error);
    res.status(500).json({ message: 'Error updating player', error: error.message });
  }
});

module.exports = router;