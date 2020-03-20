const mongoose = require('mongoose');

const GameSchema = new mongoose.Schema({
  player1: String,
  player2: String,
  time: Number,
  timeIncrement: Number,
  size: Number,
  rated: Boolean,
  oldRatingPlayer1: Number,
  newRatingPlayer1: Number,
  oldRatingPlayer2: Number,
  newRatingPlayer2: Number,
  timestamp: {
    type: Date,
    default: new Date()
  },
  player1Won: Boolean
});

const Game = mongoose.model('game', GameSchema);
module.exports = Game;
