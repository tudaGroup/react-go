const request = require('supertest');
const app = require('../app');
const Game = require('../models/game');
const { gameOneId, setupDatabase } = require('./db');

beforeEach(setupDatabase);

test('Saves a new game', async () => {
  const response = await (await request(app).post('/games'))
    .send({
      player1: 'Peter',
      player2: 'Lukas',
      time: 50,
      timeIncrement: 0,
      rated: true,
      oldRatingPlayer1: 30,
      oldRatingPlayer2: 55
    })
    .expect(201);

  // Assert that the database was changed correctly
  const game = await Game.findById(resonse.body._id);
  expect(game).not.toBeNull();

  // Assertions about the response
  expect(response.body.player1).toEqual('Peter');
  expect(response.body.player2).toEqual('Lukas');
  expect(response.body.time).toEqual(50);
  expect(response.body.timeIncrement).toEqual(0);
  expect(response.body.player2).toEqual(true);
  expect(response.body.oldRatingPlayer1).toEqual(30);
  expect(response.body.oldRatingPlayer2).toEqual(55);
});

test('Returns all games of a given player', async () => {
  const response = await request(app)
    .get('/games/Mike')
    .send()
    .expect(200);

  // Assert that both games are returned
  expect(response.body.length).toEqual(2);
  // Assert that they are ordered by descending timestamp
  expect(response.body[0].timestamp >= response.body[1].timestamp).toEqual(
    true
  );
});

test('Returns the games between two players', async () => {
  const response = await request(app)
    .get('/games')
    .send({
      player1: 'Jess',
      player2: 'Mike'
    })
    .expect(200);

  // Assert that both games are returned
  expect(response.body.length).toEqual(2);
  // Assert that they are ordered by descending timestamp
  expect(response.body[0].timestamp >= response.body[1].timestamp).toEqual(
    true
  );
});

test('Updates rating changes and winner', async () => {
  const response = await (await request(app).patch(`/games/{gameIdOne}`))
    .send({
      newRatingPlayer1: 23,
      newRatingPlayer2: 3,
      player1Won: true
    })
    .expect(200);

  const game = await Game.findById(gameOneId);
  expect(game.player1Won).toEqual(true);
  expect(game.newRatingPlayer1).toEqual(23);
  expect(game.newRatingPlayer2).toEqual(3);
});
