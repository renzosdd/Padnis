const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  player1: {
    player1: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
    player2: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
    seed: { type: Boolean, default: false },
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
  },
  player2: {
    player1: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
    player2: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
    name: { type: String }, // For BYE
    seed: { type: Boolean, default: false },
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
  },
  result: {
    sets: [{
      player1: Number,
      player2: Number,
      tiebreak1: Number,
      tiebreak2: Number,
      _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    }],
    winner: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
  },
  date: { type: Date },
  _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
});

const groupSchema = new mongoose.Schema({
  name: String,
  players: [{
    player1: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
    player2: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
    seed: { type: Boolean, default: false },
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
  }],
  matches: [matchSchema],
  standings: [{
    playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
    wins: Number,
    setsWon: Number,
    gamesWon: Number,
  }],
  _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
});

const roundSchema = new mongoose.Schema({
  round: Number,
  matches: [matchSchema],
  _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
});

const tournamentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  club: { type: mongoose.Schema.Types.ObjectId, ref: 'Club' },
  type: { type: String, enum: ['RoundRobin', 'Eliminatorio'], required: true },
  sport: { type: String, enum: ['Tenis', 'Pádel'], required: true },
  category: { type: String, required: true },
  format: {
    mode: { type: String, enum: ['Singles', 'Dobles'], required: true },
    sets: Number,
    gamesPerSet: Number,
    tiebreakSet: Number,
    tiebreakMatch: Number,
  },
  participants: [{
    player1: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
    player2: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
    seed: { type: Boolean, default: false },
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
  }],
  groups: [groupSchema],
  rounds: [roundSchema],
  schedule: {
    group: String,
    matches: [{
      matchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Match' },
      date: Date,
      time: String,
      court: String,
    }],
  },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  draft: { type: Boolean, default: true },
  status: { type: String, enum: ['Pendiente', 'En curso', 'Finalizado'], default: 'Pendiente' },
  playersPerGroupToAdvance: Number,
  winner: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' }, // New field for tournament winner
  runnerUp: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' }, // New field for tournament runner-up
}, { timestamps: true });

module.exports = mongoose.model('Tournament', tournamentSchema);