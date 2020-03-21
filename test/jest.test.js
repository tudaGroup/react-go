const request = require('supertest');
const app = require('../app');
const User = require('../models/user');
const Game = require('../models/game');
const {
  userOneId,
  userOne,
  userTwoId,
  userTwo,
  gameOneId,
  setupDatabase
} = require('./db');

beforeEach(setupDatabase);

test('Signs up a new user', async () => {
  const response = await request(app)
    .post('/users')
    .send({
      username: 'Bert',
      email: 'bert@example.com',
      password: 'MyPass777!'
    })
    .expect(201);

  // Assert that the database was changed correctly
  const user = await User.findById(response.body.user._id);
  expect(user).not.toBeNull();

  // Assertions about the response
  expect(response.body.user.username).toEqual('Bert');
  expect(response.body.user.email).toEqual('bert@example.com');
  expect(response.body.token).toEqual(user.token);
  expect(user.password).not.toEqual('MyPass777!');
});

test('Logs in existing user with email', async () => {
  const response = await request(app)
    .post('/users/login')
    .send({
      name: userOne.email,
      password: userOne.password
    })
    .expect(200);
  const user = await User.findById(userOneId);
  expect(response.body.token).toBe(user.token);
});

test('Logs in existing user with username', async () => {
  const response = await request(app)
    .post('/users/login')
    .send({
      name: userOne.username,
      password: userOne.password
    })
    .expect(200);
  const user = await User.findById(userOneId);
  expect(response.body.token).toBe(user.token);
});

test('Does not login non-existent user', async () => {
  await request(app)
    .post('/users/login')
    .send({
      name: 'non_existent_user',
      password: 'random_password'
    })
    .expect(400);
});

test('Does not login with wrong password', async () => {
  await request(app)
    .post('/users/login')
    .send({
      name: userOne.email,
      password: 'thisisnotmypass'
    })
    .expect(400);
});

test('Gets profile for user', async () => {
  await request(app)
    .get('/users/me')
    .set('Authorization', `Bearer ${userOne.token}`)
    .send()
    .expect(200);
});

test('Does not get profile for unauthenticated user', async () => {
  await request(app)
    .get('/users/me')
    .send()
    .expect(401);
});

test('Deletes account for user', async () => {
  await request(app)
    .delete('/users/me')
    .set('Authorization', `Bearer ${userOne.token}`)
    .send()
    .expect(200);
  const user = await User.findById(userOneId);
  expect(user).toBeNull();
});

test('Does not delete account for unauthenticated user', async () => {
  await request(app)
    .delete('/users/me')
    .send()
    .expect(401);
});

test('Updates valid user fields', async () => {
  await request(app)
    .patch('/users/me')
    .set('Authorization', `Bearer ${userTwo.token}`)
    .send({
      country: 'Korea',
      location: 'Seoul',
      biography: 'I study computer science and I like to play Go.'
    })
    .expect(200);
  const user = await User.findById(userTwoId);
  expect(user.username).toEqual('Jess');
  expect(user.country).toEqual('Korea');
  expect(user.location).toEqual('Seoul');
  expect(user.biography).toEqual(
    'I study computer science and I like to play Go.'
  );
});

test('Does not update invalid user fields', async () => {
  await request(app)
    .patch('/users/me')
    .set('Authorization', `Bearer ${userOne.token}`)
    .send({
      memberSince: new Date()
    })
    .expect(400);
});

test('Saves a new game', async () => {
  const response = await request(app)
    .post('/games')
    .set('Authorization', `Bearer ${userOne.token}`)
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
  const game = await Game.findById(response.body._id);
  expect(game).not.toBeNull();

  // Assertions about the response
  expect(response.body.player1).toEqual('Peter');
  expect(response.body.player2).toEqual('Lukas');
  expect(response.body.time).toEqual(50);
  expect(response.body.timeIncrement).toEqual(0);
  expect(response.body.rated).toEqual(true);
  expect(response.body.oldRatingPlayer1).toEqual(30);
  expect(response.body.oldRatingPlayer2).toEqual(55);
});

test('Returns all games of a given player', async () => {
  const response = await request(app)
    .get('/games/Mike')
    .set('Authorization', `Bearer ${userOne.token}`)
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
    .get('/games?player1=Jess&player2=Mike')
    .set('Authorization', `Bearer ${userOne.token}`)
    .send()
    .expect(200);

  // Assert that both games are returned
  expect(response.body.length).toEqual(2);
  // Assert that they are ordered by descending timestamp
  expect(response.body[0].timestamp >= response.body[1].timestamp).toEqual(
    true
  );
});

test('Gets the active game between two players', async () => {
  const response = await request(app)
    .get('/games/active?player1=Mike&player2=Jess')
    .set('Authorization', `Bearer ${userOne.token}`)
    .send()
    .expect(200);

  expect(response.body.player1).toEqual('Jess');
  expect(response.body.player2).toEqual('Mike');
  expect(response.body.time).toEqual(20);
  expect(response.body.timeIncrement).toEqual(2);
  expect(response.body.rated).toEqual(true);
  expect(response.body.oldRatingPlayer1).toEqual(20);
  expect(response.body.oldRatingPlayer2).toEqual(5);
  expect(response.body.newRatingPlayer1).toEqual(undefined);
  expect(response.body.newRatingPlayer2).toEqual(undefined);
  expect(response.body.player1Won).toEqual(undefined);
});

test('Returns nothing if there is no active game', async () => {
  await Game.findByIdAndDelete(gameOneId);
  const response = await request(app)
    .get('/games/active?player1=Mike&player2=Jess')
    .set('Authorization', `Bearer ${userOne.token}`)
    .send()
    .expect(204);
});

test('Updates rating changes and winner', async () => {
  const response = await request(app)
    .patch(`/games/${gameOneId}`)
    .set('Authorization', `Bearer ${userOne.token}`)
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
