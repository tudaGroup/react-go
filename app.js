const bodyParser = require('body-parser');
const cors = require('cors');
const express = require('express');
const mongoose = require('mongoose');
const userRouter = require('./routes/users');
require('dotenv').config();

const app = express();

mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost/go', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

app.use(cors());
app.use(bodyParser.json());
app.use(userRouter);

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log('Running on port ' + PORT);
});

module.exports = app;
