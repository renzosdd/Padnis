const mongoose = require('mongoose');

const tournamentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  completed: { type: Boolean, default: false },
  startDate: { type: String, required: true },
  groups: [{
    name: String,
    pairs: [String],
    matches: [{
      pair1: String,
      pair2: String,
      date: String,
      result: Object,
    }],
  }],
  knockout: [{
    matches: [{
      pair1: String,
      pair2: String,
      date: String,
      result: Object,
    }],
  }],
});

module.exports = mongoose.model('Tournament', tournamentSchema);