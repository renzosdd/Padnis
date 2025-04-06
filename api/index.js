const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const playerSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  matches: Array,
});

const tournamentSchema = new mongoose.Schema({
  name: String,
  category: String,
  completed: Boolean,
  startDate: String,
  groups: Array,
  knockout: Array,
});

const Player = mongoose.model('Player', playerSchema);
const Tournament = mongoose.model('Tournament', tournamentSchema);

app.get('/players', async (req, res) => {
  const players = await Player.find();
  res.json(players);
});

app.post('/players', async (req, res) => {
  const player = new Player(req.body);
  await player.save();
  res.json(player);
});

app.get('/tournaments', async (req, res) => {
  const tournaments = await Tournament.find();
  res.json(tournaments);
});

app.post('/tournaments', async (req, res) => {
  const tournament = new Tournament(req.body);
  await tournament.save();
  res.json(tournament);
});

app.put('/tournaments/:id', async (req, res) => {
  const tournament = await Tournament.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(tournament);
});

app.delete('/tournaments/:id', async (req, res) => {
  await Tournament.findByIdAndDelete(req.params.id);
  res.status(204).send();
});

module.exports = app;