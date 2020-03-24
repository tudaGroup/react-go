const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Game = require('../models/game');

const userOneId = new mongoose.Types.ObjectId();
const userOne = {
  _id: userOneId,
  username: 'Mike',
  email: 'mike@example.com',
  password: '56what!!',
  token: jwt.sign({ _id: userOneId }, process.env.JWT_SECRET),
  ratings: [{ rating: 10 }],
  country: 'USA',
  location: 'Los Angeles',
  givenName: 'Mike',
  surName: 'Tyson'
};

const userTwoId = new mongoose.Types.ObjectId();
const userTwo = {
  _id: userTwoId,
  username: 'Jess',
  email: 'jess@example.com',
  password: 'myhouse099@@',
  token: jwt.sign({ _id: userTwoId }, process.env.JWT_SECRET),
  ratings: [{ rating: 20 }, { rating: 50 }],
  country: 'Germany',
  location: 'München',
  givenName: 'Jessica',
  surName: 'Müller'
};

const gameOneId = new mongoose.Types.ObjectId();
const gameOne = {
  _id: gameOneId,
  player1: 'Jess',
  player2: 'Mike',
  time: 20,
  timeIncrement: 2,
  rated: true,
  oldRatingPlayer1: 20,
  oldRatingPlayer2: 5
};

const gameTwoId = new mongoose.Types.ObjectId();
const gameTwo = {
  _id: gameTwoId,
  player1: 'Mike',
  player2: 'Jess',
  time: 5,
  timeIncrement: 1,
  rated: false,
  oldRatingPlayer1: 22,
  oldRatingPlayer2: 10,
  newRatingPlayer1: 22,
  newRatingPlayer2: 10,
  player1Won: false
};

const setupDatabase = async () => {
  await User.deleteMany();
  await Game.deleteMany();
  await new User(userOne).save();
  await new User(userTwo).save();
  await new Game(gameOne).save();
  await new Game(gameTwo).save();
};

module.exports = {
  userOneId,
  userOne,
  userTwoId,
  userTwo,
  gameOneId,
  gameOne,
  gameTwoId,
  gameTwo,
  setupDatabase
};
