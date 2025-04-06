const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  matches: [{ type: Object }],
});

module.exports = mongoose.model('Player', playerSchema);