import React, { useEffect, useState } from 'react';
import jwt_decode from 'jwt-decode';
import history from '../history';
import api from '../api';

const GameWindow = () => {
  const [authToken, setAuthToken] = useState('');
  const [player1, setPlayer1] = useState('');
  const [player2, setPlayer2] = useState('');
  const [time, setTime] = useState(0);
  const [increment, setIncrement] = useState(0);
  const [size, setSize] = useState(0);
  const [rated, setRated] = useState(false);
  const [oldRatingPlayer1, setOldRatingPlayer1] = useState(0);
  const [oldRatingPlayer2, setOldRatingPlayer2] = useState(0);

  useEffect(() => {
    async function getActiveGame(player1, player2, token) {
      const response = await api.get(
        `/games/active?player1=${player1}&player2=${player2}`,
        {
          headers: {
            Authorization: 'Bearer ' + token
          }
        }
      );

      // // Redirect to main page if there is no active game
      if (response.data.player1Won !== undefined) {
        history.push('/');
      }

      // Save active game in state
      setPlayer1(response.data.player1);
      setPlayer2(response.data.player2);
      setTime(response.data.time);
      setIncrement(response.data.timeIncrement);
      setSize(response.data.size);
      setRated(response.data.rated);
      setOldRatingPlayer1(response.data.oldRatingPlayer1);
      setOldRatingPlayer2(response.data.oldRatingPlayer2);
      console.log(response.data);
    }

    const token = localStorage.getItem('jwt');
    setAuthToken(token);

    // Redirect to login page if user is without token
    if (token === null) {
      history.push('/login');
    }
    // Redirect to main page if user is not part of the game
    const decoded = jwt_decode(token);

    if (!document.URL.includes(decoded.name)) {
      history.push('/');
    }

    // Get players
    let urlParams = new URLSearchParams(window.location.search);
    let player1 = urlParams.get('player1');
    let player2 = urlParams.get('player2');

    getActiveGame(player1, player2, token);
  }, []);

  return (
    <div className='main'>
      <div style={{ textDecoration: 'underline' }}>Challenge</div>
      <div>Player 1: {player1}</div>
      <div>Player 2: {player2}</div>
      <div>Time: {time}</div>
      <div>Increment: {increment}</div>
      <div>Size: {size}</div>
      <div>Mode: {rated ? 'rated' : 'casual'}</div>
      <div>Old Rating Player 1: {oldRatingPlayer1}</div>
      <div>Old Rating Player 2: {oldRatingPlayer2}</div>
    </div>
  );
};

export default GameWindow;
