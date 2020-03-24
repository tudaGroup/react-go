const mongoose = require('mongoose');
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
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 7,
    trim: true
  },
  reset: {type: Boolean, default: false},
  resettime: Date,
  token: String,
  ratings: {
    type: [
      {
        rating: { type: Number, required: true },
        time: { type: Date, default: new Date() }
      }
    ],
    default: [{ rating: 0, time: new Date() }]
  },
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

UserSchema.methods.toJSON = function() {
  const user = this;
  const userObject = user.toObject();

  delete userObject.password;
  delete userObject.token;

  return userObject;
};

UserSchema.methods.generateAuthToken = async function() {
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
    $or: [{ email: name }, { username: name }]
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
  return await User.findOne({$or: [{email: id}, {username: id}]});
}



// Hash the plain text password before saving
UserSchema.pre('save', async function(next) {
  const user = this;

  if (user.isModified('password')) {
    user.password = await bcrypt.hash(user.password, 8);
  }

  next();
});

const User = mongoose.model('user', UserSchema);
module.exports = User;
