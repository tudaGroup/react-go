const express = require('express');
const Game = require('../models/game');
const User = require('../models/user');
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

// Return the games between two players
router.get('/games', auth, async (req, res) => {
  let player1 = req.query.player1;
  let player2 = req.query.player2;

  let games = await Game.find({
    $or: [
      { $and: [{ player1: player1 }, { player2: player2 }] },
      { $and: [{ player1: player2 }, { player2: player1 }] }
    ]
  }).sort({ _id: -1 });
  res.send(games);
});

// Return the active game between two players
router.get('/games/active', auth, async (req, res) => {
  let player1 = req.query.player1;
  let player2 = req.query.player2;
  let games = await await Game.find({
    $or: [
      { $and: [{ player1: player1 }, { player2: player2 }] },
      { $and: [{ player1: player2 }, { player2: player1 }] }
    ]
  }).sort({ _id: -1 });
  let mostRecentGame = games[0];

  if (mostRecentGame.player1Won === undefined) {
    res.send(mostRecentGame); // game is not finished yet
  } else {
    res.status(204).send(); // no active game
  }
});

// Return all games of a given player
router.get('/games/:player', auth, async (req, res) => {
  let player = req.params.player;
  console.log(player);
  let games = await Game.find({
    $or: [{ player1: player }, { player2: player }]
  }).sort({ _id: -1 });

  console.log('games:')
  console.log(games);
  
  let wins = games.filter(game => {
    console.log((game.player1 === player && game.player1Won) ||
    (game.player1 !== player && !game.player1Won));
    return (game.player1 === player && game.player1Won) ||
      (game.player1 !== player && !game.player1Won);
  }).length;
  console.log(wins)
  let losses = games.length - wins;
  res.send({ games, wins, losses });
});

// Update rating changes and winner after completion of the game
router.patch('/games/:id', auth, async (req, res) => {
  let player1Won = req.body.player1Won;
  console.log('Game Patch Received')
  console.log(req.body)
  console.log(req.params)
  let game = await Game.findById(
    req.params.id,
  );

  console.log(game)

  let player1 = await User.findByLoginID(game.player1);
  let player2 = await User.findByLoginID(game.player2);


  let oldRatingPlayer1 = game.oldRatingPlayer1;
  let oldRatingPlayer2 = game.oldRatingPlayer2;
  let newRatingPlayer1;
  let newRatingPlayer2;
  if(game.rated) {
    if(player1Won) {
      newRatingPlayer1 = Math.max(oldRatingPlayer1 + 5 + 15 * Math.min(oldRatingPlayer2 / (oldRatingPlayer1 + 1), 1), 0);
      newRatingPlayer2 = Math.max(oldRatingPlayer2 - (5 + 15 * Math.min(oldRatingPlayer2 / (oldRatingPlayer1 + 1), 1)), 0);
    } 
    else {
      newRatingPlayer1 = Math.max(oldRatingPlayer1 - (5 + 15 * Math.min(oldRatingPlayer1 / (oldRatingPlayer2 + 1), 1)), 0);
      newRatingPlayer2 = Math.max(oldRatingPlayer2 + 5 + 15 * Math.min(oldRatingPlayer1 / (oldRatingPlayer2 + 1), 1), 0);
    }
    player1.ratings.push({ rating: newRatingPlayer1, time: new Date()});
    player2.ratings.push({ rating: newRatingPlayer2, time: new Date()});
    
    console.log(player1)
    console.log(player2)
    player1.save();
    player2.save();
  }
  else {
    newRatingPlayer1 = oldRatingPlayer1;
    newRatingPlayer2 = oldRatingPlayer2;
  }

  game.newRatingPlayer1 = newRatingPlayer1;
  game.newRatingPlayer2 = newRatingPlayer2;
  game.player1Won = player1Won;
  game.save();
  res.send(game);
});

module.exports = router;
