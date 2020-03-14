const request = require('supertest');
const app = require('../app');
const User = require('../models/user');
const {
  userOneId,
  userOne,
  userTwoId,
  userTwo,
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
