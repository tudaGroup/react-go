const bodyParser = require('body-parser');
const cors = require('cors');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const userRouter = require('./routes/users');
const gameRouter = require('./routes/games');
require('dotenv').config();
const { setChallenges, getChallenges } = require('./challenges');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(cors());
app.use(bodyParser.json());
app.use(userRouter);
app.use(gameRouter);

// Database connection
mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost/go', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Socket.IO
io.on('connection', socket => {
  socket.emit('challenges', getChallenges()); // Send challenges to new client

  socket.on('updateChallenges', data => {
    // Update list of challenges when a new one is created
    setChallenges(data);
    io.emit('challenges', getChallenges()); // Broadcast updated list of challenges
  });

  socket.on('acceptChallenge', data => {
    socket.broadcast.emit('acceptChallenge', data);
  });

  socket.on('joinGame', room => {
    socket.join(room);
  });

  socket.on('game', data => {
    io.to(data.room).emit('game', data.message);
  });
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log('Running on port ' + PORT);
});

module.exports = app;
