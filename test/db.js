const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../models/user');

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

const setupDatabase = async () => {
  await User.deleteMany();
  await new User(userOne).save();
  await new User(userTwo).save();
};

module.exports = {
  userOneId,
  userOne,
  userTwoId,
  userTwo,
  setupDatabase
};
