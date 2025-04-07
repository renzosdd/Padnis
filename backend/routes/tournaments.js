const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Tournament = require('../models/Tournament');
const Player = require('../models/Player');

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

const isCreatorOrAdmin = async (req, res, next) => {
  const tournament = await Tournament.findById(req.params.id);
  if (!tournament) return res.status(404).json({ message: 'Torneo no encontrado' });
  if (req.user.role !== 'admin' && tournament.creator.toString() !== req.user._id) {
    return res.status(403).json({ message: 'No autorizado' });
  }
  req.tournament = tournament;
  next();
};

router.post('/', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'coach') {
      return res.status(403).json({ message: 'Requiere rol de admin o coach' });
    }
    const { type, sport, format, participants, groups, rounds, schedule, draft } = req.body;
    const tournament = new Tournament({
      type,
      sport,
      format,
      participants,
      groups: type === 'RoundRobin' ? groups : [],
      rounds: type === 'Eliminatorio' ? rounds : [],
      schedule,
      creator: req.user._id,
      draft: draft || false,
    });
    await tournament.save();
    res.status(201).json(tournament);
  } catch (error) {
    console.error('Error creating tournament:', error);
    res.status(500).json({ message: 'Error al crear torneo', error: error.message });
  }
});

// Otras rutas...
router.put('/:id', authenticateToken, isCreatorOrAdmin, async (req, res) => {
  try {
    const { groups, rounds, schedule, result } = req.body;
    const updateData = {};
    if (groups) updateData.groups = groups;
    if (rounds) updateData.rounds = rounds;
    if (schedule) updateData.schedule = schedule;
    if (result) {
      const tournament = req.tournament;
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
    const tournament = await Tournament.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.json(tournament);
  } catch (error) {
    console.error('Error updating tournament:', error);
    res.status(500).json({ message: 'Error al actualizar torneo', error: error.message });
  }
});

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status } = req.query;
    const query = { draft: false };
    if (status) query.status = status;
    if (req.user.role !== 'admin') query.$or = [{ creator: req.user._id }, { status: { $ne: 'Pendiente' } }];
    const tournaments = await Tournament.find(query).populate('creator', 'username');
    res.json(tournaments);
  } catch (error) {
    console.error('Error fetching tournaments:', error);
    res.status(500).json({ message: 'Error al obtener torneos', error: error.message });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id).populate('creator', 'username');
    if (!tournament) return res.status(404).json({ message: 'Torneo no encontrado' });
    if (req.user.role !== 'admin' && tournament.creator.toString() !== req.user._id && tournament.draft) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    res.json(tournament);
  } catch (error) {
    console.error('Error fetching tournament:', error);
    res.status(500).json({ message: 'Error al obtener torneo', error: error.message });
  }
});

router.post('/:id/finish', authenticateToken, isCreatorOrAdmin, async (req, res) => {
  try {
    const tournament = req.tournament;
    const allMatchesCompleted = tournament.type === 'RoundRobin' 
      ? tournament.groups.every(group => group.matches.every(match => match.result.winner))
      : tournament.rounds.every(round => round.matches.every(match => match.result.winner));
    if (!allMatchesCompleted) return res.status(400).json({ message: 'Faltan resultados de partidos' });
    tournament.status = 'Finalizado';
    await tournament.save();
    res.json(tournament);
  } catch (error) {
    console.error('Error finishing tournament:', error);
    res.status(500).json({ message: 'Error al finalizar torneo', error: error.message });
  }
});

router.post('/:id/resolve-tie', authenticateToken, isCreatorOrAdmin, async (req, res) => {
  try {
    const { groupId } = req.body;
    const tournament = req.tournament;
    if (tournament.type !== 'RoundRobin') return res.status(400).json({ message: 'Solo para Round Robin' });
    const group = tournament.groups.find(g => g._id.toString() === groupId);
    if (!group) return res.status(404).json({ message: 'Grupo no encontrado' });
    const tiedPlayers = group.standings.filter(s => s.wins === group.standings[0].wins);
    const winner = tiedPlayers[Math.floor(Math.random() * tiedPlayers.length)];
    group.standings = [winner, ...group.standings.filter(s => s.playerId !== winner.playerId)];
    await tournament.save();
    res.json(tournament);
  } catch (error) {
    console.error('Error resolving tie:', error);
    res.status(500).json({ message: 'Error al resolver empate', error: error.message });
  }
});

module.exports = router;