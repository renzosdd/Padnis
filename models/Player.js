const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  playerId: { type: Number, unique: true, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, unique: true, sparse: true },
  phone: { type: String, sparse: true },
  photo: { type: String },
  dominantHand: { type: String, enum: ['right', 'left'], default: 'right' },
  racketBrand: { type: String, enum: ['Wilson', 'Babolat', 'Head', 'Tecnifibre', ''], default: '' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  active: { type: String, enum: ['Yes', 'No'], default: 'Yes' },
  matches: [{
    tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament' },
    opponent: { type: String },
    result: { type: String, enum: ['win', 'loss', 'pending'], default: 'pending' },
    date: { type: String },
  }],
}, { timestamps: true });

module.exports = mongoose.model('Player', playerSchema);