const mongoose = require('mongoose');

/**
 * Schema for match results, including sets and optional match tiebreak.
 */
const resultSchema = new mongoose.Schema({
  sets: [{
    player1: { type: Number, min: 0 },
    player2: { type: Number, min: 0 },
    tiebreak1: { type: Number, min: 0 },
    tiebreak2: { type: Number, min: 0 },
  }],
  matchTiebreak1: { type: Number, min: 0 },
  matchTiebreak2: { type: Number, min: 0 },
  winner: {
    player1: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
    player2: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
  },
  runnerUp: {
    player1: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
    player2: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
  },
}, {
  validate: {
    validator: function (v) {
      if (v.matchTiebreak1 != null && v.matchTiebreak2 != null) {
        return v.matchTiebreak1 !== v.matchTiebreak2 && Math.abs(v.matchTiebreak1 - v.matchTiebreak2) >= 2;
      }
      return true;
    },
    message: 'El tiebreak del partido debe tener una diferencia de al menos 2 puntos y no puede ser empate',
  },
});

/**
 * Schema for individual matches within groups or rounds.
 */
const matchSchema = new mongoose.Schema({
  player1: {
    player1: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
    player2: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
  },
  player2: {
    player1: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
    player2: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
    name: String, // For "BYE"
  },
  result: resultSchema,
  date: String,
});

/**
 * Schema for tournament groups (used in RoundRobin).
 */
const groupSchema = new mongoose.Schema({
  name: String,
  players: [
    {
      player1: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
      player2: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
    },
  ],
  matches: [matchSchema],
});

/**
 * Schema for tournament rounds (used in Eliminatorio).
 */
const roundSchema = new mongoose.Schema({
  round: Number,
  matches: [matchSchema],
});

/**
 * Schema for tournament schedule.
 */
const scheduleSchema = new mongoose.Schema({
  group: String,
  matches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Match' }],
});

/**
 * Main tournament schema.
 */
const tournamentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  club: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', default: null },
  type: { type: String, enum: ['RoundRobin', 'Eliminatorio'], required: true },
  sport: { type: String, enum: ['Tenis', 'Pádel'], required: true },
  category: { type: String, required: true },
  format: {
    mode: { type: String, enum: ['Singles', 'Dobles'], required: true },
    sets: { type: Number, default: 3 },
    gamesPerSet: { type: Number, default: 6 },
  },
  participants: [
    {
      player1: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
      player2: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
    },
  ],
  groups: [groupSchema],
  rounds: [roundSchema],
  schedule: { type: scheduleSchema, default: { group: null, matches: [] } },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  draft: { type: Boolean, default: true },
  status: { type: String, enum: ['Pendiente', 'En curso', 'Finalizado'], default: 'Pendiente' },
  playersPerGroupToAdvance: { type: Number, default: 2 },
  winner: {
    player1: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
    player2: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
  },
  runnerUp: {
    player1: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
    player2: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
  },
});

module.exports = mongoose.model('Tournament', tournamentSchema);