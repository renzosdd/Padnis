const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  playerId: { type: Number, unique: true },
  firstName: { type: String, required: true },
  lastName: { type: String },
  email: { type: String },
  phone: { type: String },
  photo: { type: String },
  dominantHand: { type: String, enum: ['right', 'left'], default: 'right' },
  racketBrand: { type: String },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  active: { type: String, enum: ['Yes', 'No'], default: 'Yes' },
  matches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Match' }],
  achievements: [{
    tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament' },
    position: { type: String, enum: ['Winner', 'RunnerUp'] },
    date: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

// Ensure playerId is auto-incremented
playerSchema.pre('save', async function (next) {
  if (this.isNew && !this.playerId) {
    const lastPlayer = await this.constructor.findOne().sort({ playerId: -1 });
    this.playerId = lastPlayer ? lastPlayer.playerId + 1 : 1;
  }
  next();
});

module.exports = mongoose.model('Player', playerSchema);