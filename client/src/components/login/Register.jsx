import React, { useState } from 'react';
import { Button, Card, Input } from 'antd';
import api from '../../api';
import history from '../../history';

const Register = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleRegister = () => {
    if (username.length === 0 || email.length === 0 || password.length === 0) {
      return createErrorMessage('Please fill out all fields.');
    }
    if (password.length < 7) {
      return createErrorMessage('Please choose a longer password.');
    }

    api
      .post('/users', { username, email, password })
      .then((res) => {
        localStorage.setItem('jwt', res.data);
        history.push('/');
      })
      .catch(() => {
        createErrorMessage('Username or email not available.');
      });
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleRegister();
    }
  };

  const createErrorMessage = (error) => {
    setError(error);
    setTimeout(() => setError(''), 3000);
  };

  return (
    <div className='entry'>
      <Card>
        <h1 className='entry__title'>Register</h1>
        <p className='entry__error'>{error}</p>
        <div className='entry__input'>
          User name
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyPress={(e) => handleKeyPress(e)}
          />
        </div>
        <div className='entry__input'>
          Password
          <Input.Password
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={(e) => handleKeyPress(e)}
          />
        </div>
        <div className='entry__input'>
          Email
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyPress={(e) => handleKeyPress(e)}
          />
        </div>
        <Button
          type='primary'
          className='entry__button'
          onClick={() => handleRegister()}
        >
          Register
        </Button>
      </Card>
    </div>
  );
};

export default Register;
