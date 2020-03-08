const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true,
    required: true,
    trim: true
  },
  email: {
    type: String,
    unique: true,
    required: true,
    trim: true,
    lowercase: true,
    validate(value) {
      if (!validator.isEmail(value)) {
        throw new Error('Email is invalid');
      }
    }
  },
  password: {
    type: String,
    required: true,
    minlength: 7,
    trim: true
  },
  tokens: [{ token: { type: String, required: true } }],
  ratings: [
    {
      rating: { type: Number, required: true },
      time: { type: Date, default: new Date() }
    }
  ],
  country: String,
  location: String,
  biography: String,
  givenName: String,
  surName: String,
  memberSince: {
    type: Date,
    default: new Date()
  }
});

const User = mongoose.model('user', UserSchema);
module.exports = User;
