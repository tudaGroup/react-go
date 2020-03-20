const express = require('express');
const User = require('../models/user');
const auth = require('../middleware/auth');
const gapi = require('../middleware/gapi');
const jwt = require('jsonwebtoken');
const router = new express.Router();
const fs = require('fs');

// Registers the user with username, password and email and sends back the jwt
router.post('/users', async (req, res) => {
  const user = new User(req.body);

  try {
    await user.save();
    const token = await user.generateAuthToken();
    res.status(201).send({ user, token });
  } catch (e) {
    res.status(400).send(e);
  }
});

// Logs the user in with email/username and password and sends back the jwt
router.post('/users/login', async (req, res) => {
  try {
    const user = await User.findByCredentials(req.body.name, req.body.password);
    const token = await user.generateAuthToken();
    res.send({ user, token });
  } catch (e) {
    res.status(400).send();
  }
});

// Sends back the profile information of the current user
router.get('/users/me', auth, async (req, res) => {
  res.send(req.user);
});

// Updates any whitelisted attributes of the user
router.patch('/users/me', auth, async (req, res) => {
  const updates = Object.keys(req.body);
  const allowedUpdates = [
    'email',
    'password',
    'country',
    'location',
    'biography',
    'givenName',
    'surName'
  ];
  const isValidOperation = updates.every(update =>
    allowedUpdates.includes(update)
  );

  if (!isValidOperation) {
    return res.status(400).send({ error: 'Invalid updates!' });
  }

  try {
    updates.forEach(update => (req.user[update] = req.body[update]));
    await req.user.save();
    res.send(req.user);
  } catch (e) {
    res.status(400).send(e);
  }
});

// resets password, generates a new random password, sends it per email then forces a password change on next login
router.post('/users/forgotpassword', async (req, res) => {
  const email = req.body.email;
  const user = await User.findByLoginID(email);
  if(!user)
    return res.status(400).send("USERNOTFOUND");
  user.resettime = new Date(Date.now());
  user.reset = true;
  await user.save();
  var token = jwt.sign({email: user.email}, user.resettime.toISOString(), {expiresIn: '24h'});
  gapi.sendResetEmail(user.email, user.username, token);
  res.send("SUCCESS");
})

// checks if reset password token is valid and sends matching username
router.get('/users/resetpassword', async (req, res) => {
  var decoded = jwt.decode(req.query.token);
  const user = await User.findByLoginID(decoded.email);
  try {
    jwt.verify(req.query.token, user.resettime.toISOString());
    await user.save();
    res.status(201).send({username: user.username});
  } catch(err) {
    if(err.name === 'TokenExpiredError')
      res.status(400).send('EXPIRED');
    else if(err.name === 'JsonWebTokenError')
      res.status(400).send('TOKENERROR');
    user.reset = false;
    user.save();
  }
})

// updates password(password reset)
router.patch('/users/resetpassword', async (req, res) => {
  const username = req.body.username;
  var user;
  try {
    user = await User.findByLoginID(username);
  } catch(err) {
    console.log(err.stack)
  }
  if(!user.reset) {
    res.status(400).send('INVALIDREQUEST');
    return;
  }
  try{
    await jwt.verify(req.body.token, user.resettime.toISOString());
  } catch(err) {
    res.status(400).send('TOKENERR');
    user.reset = false;
    user.save();
    fs.writeFileSync('./errorLog.txt', "line 117 reached!\n" + err.stack.toString());
    return;
  }
  user.password = req.body.password;
  user.reset = false;
  fs.writeFileSync('./errorLog.txt', "line 122 reached!");
  console.log(user);
  try {
    await user.save();
  } catch(err) {
    res.status(400).send('DBERR');
    fs.writeFileSync('./errorLog.txt', "line 127 reached!\n" + err.stack.toString() + '\n' + user);
    return;
  }
  fs.writeFileSync('./errorLog.txt', "line 130 reached!");
  res.status(201).send('SUCCESS');
  fs.writeFileSync('./errorLog.txt', "line 132 reached!");
})

// Deletes the user
router.delete('/users/me', auth, async (req, res) => {
  try {
    await req.user.remove();
    res.send(req.user);
  } catch (e) {
    res.status(500).send();
  }
});

module.exports = router;
