const express = require('express');
const Game = require('../models/game');
const auth = require('../middleware/auth');
const router = new express.Router();

// Saves the necessary information upon start of the game
router.post('/games', auth, async (req, res) => {
  const game = new Game(req.body);

  try {
    await game.save();
    res.status(201).send(game);
  } catch (e) {
    res.status(400).send(e);
  }
});

// Return all games of a given player
router.get('/games/:player', auth, async (req, res) => {
  let player = req.params.player;
  let games = await Game.find({
    $or: [{ player1: player }, { player2: player }]
  }).sort({ timestamp: 'desc' });
  res.send(games);
});

// Return the games between two players
router.get('/games', auth, async (req, res) => {
  let player1 = req.query.player1;
  let player2 = req.query.player2;

  let games = await Game.find({
    $or: [
      { $and: [{ player1: player1 }, { player2: player2 }] },
      { $and: [{ player1: player2 }, { player2: player1 }] }
    ]
  }).sort({ timestamp: 'desc' });
  res.send(games);
});

// Update rating changes and winner after completion of the game
router.patch('/games/:id', auth, async (req, res) => {
  let newRatingPlayer1 = req.body.newRatingPlayer1;
  let newRatingPlayer2 = req.body.newRatingPlayer2;
  let player1Won = req.body.player1Won;
  try {
    let game = await Game.findByIdAndUpdate(
      req.params.id,
      { newRatingPlayer1, newRatingPlayer2, player1Won },
      { new: true }
    );
    res.send(game);
  } catch (e) {
    res.status(500).send();
  }
});

module.exports = router;
