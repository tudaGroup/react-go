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

var onlinePlayers = [];

// Socket.IO
io.on('connection', socket => {
  console.log('New client connected');
  socket.username = '';
  socket.customRooms = [];
  socket.emit('challenges', getChallenges()); // Send challenges to new client

  // sets username for socket connection(later to be used for deleting all challenges from this user)
  socket.on('online', name => {socket.username = name; console.log(socket.username + ' online')});

  socket.on('updateChallenges', data => {
    // Update list of challenges when a new one is created
    setChallenges(data);
    io.emit('challenges', getChallenges()); // Broadcast updated list of challenges
  });

  socket.on('acceptChallenge', data => {
    socket.broadcast.emit('acceptChallenge', data);
  });

  socket.on('joinGame', room => {
    socket.join(room, () => {
      socket.customRooms.push(room);
      let players = room.split('-');
      let player1join = false;
      let player2join = false;
      let clientsInRoom = Object.keys(socket.adapter.rooms[room].sockets);
      for (let i = 0; i < clientsInRoom.length; i++){
        if (io.sockets.connected[clientsInRoom[i]].username == players[0])
          player1join = true;
        if (io.sockets.connected[clientsInRoom[i]].username == players[1])
          player2join = true;
      }
      if(player1join && player2join && (socket.username === players[0] || socket.username === players[1])) {
        io.in(room).emit('system', { type: 'CONNECTION_ESTABLISHED'})
      }
      socket.to(room).emit('system', { type: 'JOIN', user: socket.username });
    })
  });

  socket.on('game', data => {
    io.to(data.room).emit('game', data.message);
  });

  socket.on('chat', data => {
    io.to(data.room).emit('chat', data.data);
  })
  
  socket.on('disconnect', () => {
    console.log(socket.username  + ' disconnected');
    let filteredChallenges = getChallenges().filter(
      challenge => challenge.name !== socket.username
    );
    console.log(socket.username + '´s rooms');
    console.log(socket.customRooms);

    for (let i = 0; i < socket.customRooms.length; i++) {
      let room = socket.customRooms[i];
      io.to(room).emit('system', { type: 'DISCONNECT', user: socket.username })
    }

    setChallenges(filteredChallenges);
    io.emit('challenges', getChallenges());
    socket.disconnect();
  });

  socket.on('logout', () => {
    let filteredChallenges = getChallenges().filter(
      challenge => challenge.name !== socket.username
    );
    setChallenges(filteredChallenges);
    io.emit('challenges', getChallenges());
    socket.disconnect();
  });
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log('Running on port ' + PORT);
});

module.exports = app;
