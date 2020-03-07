const bodyParser = require('body-parser');
const cors = require('cors');
const express = require('express');

const app = express();

app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log('Running on port ' + PORT);
});

module.exports = app;
