const mongoose = require('mongoose');

/**
 * Schema for players in the Padnis application.
 */
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
    tournamentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tournament',
      required: true,
      validate: {
        validator: async function (value) {
          const tournament = await mongoose.model('Tournament').findById(value);
          return !!tournament;
        },
        message: 'El torneo referenciado en logros no existe',
      },
    },
    position: { type: String, enum: ['Winner', 'RunnerUp'], required: true },
    date: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

/**
 * Auto-increment playerId for new players.
 */
playerSchema.pre('save', async function (next) {
  if (this.isNew && !this.playerId) {
    const lastPlayer = await this.constructor.findOne({}, 'playerId').sort({ playerId: -1 }).lean();
    this.playerId = lastPlayer ? lastPlayer.playerId + 1 : 1;
  }
  next();
});

module.exports = mongoose.model('Player', playerSchema);