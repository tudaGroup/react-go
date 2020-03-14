import React, { useState, useEffect } from 'react';
import history from '../history';
import api from '../api';
import { Button } from 'antd';

const Main = () => {
  const [username, setUsername] = useState('');
  const [userId, setUserId] = useState('');
  const [rating, setRating] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('jwt');

    // Redirect to login page if user is without token
    if (token === null) {
      history.push('/login');
      window.location.reload();
    }

    // Make a request for profile information
    api
      .get('users/me', {
        headers: {
          Authorization: 'Bearer ' + token
        }
      })
      .then(res => {
        console.log(res);
        setUserId(res.data._id);
        setUsername(res.data.username);
        setRating(res.data.ratings[res.data.ratings.length - 1].rating);
      });
  }, []);

  const handleLogout = () => {
    // Delete token in local storage and redirect to login
    localStorage.removeItem('jwt');
    history.push('/login');
    window.location.reload();
  };

  if (!username) {
    return (
      <div
        style={{
          position: 'absolute',
          top: 0,
          backgroundColor: '#151515',
          width: '100%',
          height: '100%',
          color: 'white'
        }}
      ></div>
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        backgroundColor: '#151515',
        width: '100%',
        height: '100%',
        color: 'white'
      }}
    >
      <div style={{ textDecoration: 'underline' }}>Logged in as</div>
      <div>Username: {username}</div>
      <div>User-ID: {userId}</div>
      <div>Rating: {rating}</div>
      <Button onClick={() => handleLogout()}>Logout</Button>
    </div>
  );
};

export default Main;
