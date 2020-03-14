const bodyParser = require('body-parser');
const cors = require('cors');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const userRouter = require('./routes/users');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(cors());
app.use(bodyParser.json());
app.use(userRouter);

// Database connection
mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost/go', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Socket.IO
io.on('connection', socket => {
  console.log('New client connected');
  io.emit('greeting', 'Hi there, client:)');
  socket.on('disconnect', () => console.log('Client disconnected'));
});

// Listening for incoming connections
const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log('Running on port ' + PORT);
});

module.exports = app;
