const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  player1: { type: Object, required: true }, // { id: ObjectId, name: String } o pareja
  player2: { type: Object, required: true }, // { id: ObjectId|null, name: String|"BYE" }
  result: {
    sets: [{ p1: Number, p2: Number, tiebreak: Number }],
    winner: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
  },
  date: { type: Date, default: null },
});

const groupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  players: [{ type: Object }], // { id: ObjectId, name: String }
  matches: [matchSchema],
  standings: [{ playerId: mongoose.Schema.Types.ObjectId, wins: Number, gamesDiff: Number }],
});

const roundSchema = new mongoose.Schema({
  round: { type: Number, required: true },
  matches: [matchSchema],
});

const tournamentSchema = new mongoose.Schema({
  type: { type: String, enum: ['RoundRobin', 'Eliminatorio'], required: true },
  sport: { type: String, enum: ['Tenis', 'Pádel'], required: true },
  format: {
    mode: { type: String, enum: ['Singles', 'Dobles'], required: true },
    sets: { type: Number, enum: [1, 2], required: true },
    gamesPerSet: { type: Number, enum: [4, 6], required: true },
    tiebreakSet: { type: Number, min: 7, max: 25, required: true },
    tiebreakMatch: { type: Number, min: 7, max: 25, required: true },
  },
  participants: [{
    player1: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
    player2: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
    seed: { type: Boolean, default: false },
  }],
  groups: [groupSchema],
  rounds: [roundSchema],
  schedule: {
    group: { type: Date, default: null },
    matches: [{ matchId: mongoose.Schema.Types.ObjectId, date: Date }],
  },
  status: { type: String, enum: ['Pendiente', 'En curso', 'Finalizado'], default: 'Pendiente' },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  draft: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Tournament', tournamentSchema);