import React, { useEffect, useState } from 'react';
import jwt_decode from 'jwt-decode';
import history from '../history';
import api from '../api';
import socketIOClient from 'socket.io-client';
import { Game, Player } from './BoardComponents';

let socket;
let g = null;
let rn = '';

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
  const [roomName, setRoomName] = useState('');
  const [game, setGame] = useState(null);
  const [username, setUsername] = useState('');

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
      
      
      p1 = <Player name={response.data.player1} playerColor={'#383b40'}/>;
      p2 = <Player name={response.data.player2} playerColor={'#f5f9ff'}/>;
      let un = localStorage.getItem('username');
      setUsername(un);
      let ownPlayer = p1.props.name === un ? p1 : p2;
      setGame(<Game ref={(game) => g = game} boardSize={response.data.size} player1={p1} player2={p2} ownPlayer={ownPlayer} broadcast={broadcastMove} multi={true}/>;);
      
    }

    var p1;
    var p2;

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

    // Set up communication between the two players exclusively
    const room = `${player1}-${player2}`;
    rn = room;
    setRoomName(room);
    socket = socketIOClient('http://localhost:8000');
    socket.emit('joinGame', room);

    getActiveGame(player1, player2, token);
   

    // Sample game event
    socket.on('game', data => {
      console.log('received');
      console.log(data);
      console.log(g);
      if(data.type === 'move')
        g.processInput(data.x, data.y);
    });
  }, []);

  const broadcastMove = (x, y) => {
    console.log('sending');
    let data = { message: { type: 'move', x: x, y: y }, room: rn };
    console.log(data)
    console.log(socket);
    socket.emit('game', data);
  };

  const pass = () => {
    socket.emit('pass');
  };

  

  const testCommunication = () => {
    socket.emit('game', { message: 'game message', room: roomName });
  };
 

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
      <button onClick={() => broadcastMove(1, 1)}>Communicate!</button>
      {game}
    </div>
  );
};

export default GameWindow;
