const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
  player1: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
  player2: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
  seed: { type: Boolean, default: false },
});

const setSchema = new mongoose.Schema({
  player1: { type: Number, required: true },
  player2: { type: Number, required: true },
  tiebreak1: { type: Number },
  tiebreak2: { type: Number },
});

const matchSchema = new mongoose.Schema({
  player1: { type: participantSchema, required: true },
  player2: { type: participantSchema, required: true },
  result: {
    sets: [setSchema],
    winner: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
  },
  date: { type: String },
}, { _id: true }); // Genera IDs únicos para cada partido

const groupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  players: [participantSchema],
  matches: [matchSchema],
  standings: [{
    player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
    wins: { type: Number, default: 0 },
    setsWon: { type: Number, default: 0 },
    gamesWon: { type: Number, default: 0 },
  }],
}, { _id: true }); // IDs únicos para grupos

const roundSchema = new mongoose.Schema({
  round: { type: Number, required: true },
  matches: [matchSchema],
}, { _id: true }); // IDs únicos para rondas

const tournamentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  club: { type: mongoose.Schema.Types.ObjectId, ref: 'Club' },
  type: { type: String, enum: ['RoundRobin', 'Eliminatorio'], required: true },
  sport: { type: String, enum: ['Tenis', 'Pádel'], required: true },
  winner: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
  category: {
    type: String,
    required: true,
    enum: {
      values: ['A', 'B', 'C', 'D', 'E', 'Séptima', 'Sexta', 'Quinta', 'Cuarta', 'Tercera', 'Segunda', 'Primera'],
      message: 'Categoría inválida para el deporte seleccionado',
    },
  },
  format: {
    mode: { type: String, enum: ['Singles', 'Dobles'], required: true },
    sets: { type: Number, required: true },
    gamesPerSet: { type: Number, required: true },
    tiebreakSet: { type: Number, required: true },
    tiebreakMatch: { type: Number, required: true },
  },
  participants: [participantSchema],
  groups: [groupSchema],
  rounds: [roundSchema],
  schedule: {
    group: { type: String },
    matches: [{ matchId: String, date: String }],
  },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  draft: { type: Boolean, default: true },
  status: { type: String, enum: ['Pendiente', 'En curso', 'Finalizado'], default: 'Pendiente' },
});

module.exports = mongoose.model('Tournament', tournamentSchema);