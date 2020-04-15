const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Game = require('../models/game');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    unique: true,
    required: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 7,
    trim: true,
  },
  reset: { type: Boolean, default: false },
  resettime: Date,
  token: String,
  country: String,
  location: String,
  biography: String,
  givenName: String,
  surName: String,
  memberSince: {
    type: Date,
    default: new Date(),
  },
});

UserSchema.methods.toJSON = function () {
  const user = this;
  const userObject = user.toObject();

  delete userObject.password;
  delete userObject.token;

  //let ratings = user.getRatings();
  //userObject['ratings'] = ratings;
  return userObject;
};

UserSchema.methods.getRatings = async function () {
  const user = this;

  // Get all the games the user has played
  let games = await Game.find({
    $or: [{ player1: user.username }, { player2: user.username }],
  }).sort({ _id: -1 });

  // Create an array of time and resulting rating for all the games
  ratings = games.map(function (game) {
    time = game.timestamp;
    rating =
      game.player1 === user.username
        ? game.newRatingPlayer1
        : game.newRatingPlayer2;
    return { time, rating };
  });

  // Only save the most recent for each day
  let dailyRatings = [];
  if (ratings.length !== 0) {
    dailyRatings.push(ratings[0]);
  }
  for (let i = 1; i < ratings.length; i++) {
    if (
      !(
        ratings[i].time.getDate() === ratings[i - 1].time.getDate() &&
        ratings[i].time.getMonth() === ratings[i - 1].time.getMonth() &&
        ratings[i].time.getFullYear() === ratings[i - 1].time.getFullYear()
      )
    ) {
      dailyRatings.push(ratings[i]);
    }
  }

  // Starting with rating 0, the last, hence oldest rating in the list
  dailyRatings.push({ time: user.memberSince, rating: 0 });
  return dailyRatings;
};

UserSchema.methods.generateAuthToken = async function () {
  const user = this;
  const token = jwt.sign(
    { _id: user._id.toString(), name: user.username },
    process.env.JWT_SECRET
  );

  user.token = token;
  await user.save();

  return token;
};

UserSchema.statics.findByCredentials = async (name, password) => {
  const user = await User.findOne({
    $or: [{ email: name }, { username: name }],
  });

  if (!user) {
    throw new Error('Unable to login');
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    throw new Error('Unable to login');
  }

  return user;
};

//
UserSchema.statics.findByLoginID = async (id) => {
  return await User.findOne({ $or: [{ email: id }, { username: id }] });
};

// Hash the plain text password before saving
UserSchema.pre('save', async function (next) {
  const user = this;

  if (user.isModified('password')) {
    user.password = await bcrypt.hash(user.password, 8);
  }

  next();
});

const User = mongoose.model('user', UserSchema);
module.exports = User;
