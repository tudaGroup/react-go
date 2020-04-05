import React, { useEffect, useState } from 'react';
import jwt_decode from 'jwt-decode';
import history from '../history';
import api from '../api';
import socketIOClient from 'socket.io-client';
import { Game, Player } from './BoardComponents';
import { Layout, Menu, Breadcrumb } from 'antd';
import 'antd/dist/antd.css';

const { Header, Content, Footer } = Layout;

const msgType = {
  MOVE:         'MOVE',
  MOVE_ACK:     'MOVE_ACK',
  MOVE_ACK_ACK: 'MOVE_ACK_ACK',
  PASS:         'PASS',
  PASS_ACK:     'PASS_ACK',
  PASS_ACK_ACK: 'PASS_ACK_ACK',
  ERR:          'ERR',
  NULL:         'NULL'
}

const commState = {
  NONE:                 'NONE',
  WAITING_MOVE_ACK:     'WAITING_MOVE_ACK',
  WAITING_MOVE_ACK_ACK: 'WAITING_MOVE_ACK_ACK',
  WAITING_PASS_ACK:     'WAITING_PASS_ACK',
  WAITING_PASS_ACK_ACK: 'WAITING_PASS_ACK_ACK'
}

let socket;
let g = null;
let rn = '';
let prevData = {x: NaN, y: NaN};
let currentState = commState.NONE;
let boardToScreenRatio = 0.8;

var p1;
var p2;

/**
 * all messages in the room have the structur { message: data of to be sent message, room: room number }
 */

const GameWindow = () => {
  const [authToken, setAuthToken] = useState('');
  const [player1, setPlayer1] = useState('');
  const [player2, setPlayer2] = useState('');
  const [P1, setP1] = useState(null);
  const [P2, setP2] = useState(null);
  const [time, setTime] = useState(0);
  const [increment, setIncrement] = useState(0);
  const [size, setSize] = useState(0);
  const [rated, setRated] = useState(false);
  const [oldRatingPlayer1, setOldRatingPlayer1] = useState(0);
  const [oldRatingPlayer2, setOldRatingPlayer2] = useState(0);
  const [roomName, setRoomName] = useState('');
  const [game, setGame] = useState(null);
  const [round, setRound] = useState(-1);
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
      
      const user1 = await api.get(
        `users/${player1}`,
        {
          headers: {
            Authorization: 'Bearer ' + token
          }
        }
      );

      const user2 = await api.get(
        `users/${player2}`,
        {
          headers: {
            Authorization: 'Bearer ' + token
          }
        }
      );

      console.log(user1);
      console.log(user2);

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
      

      p1 = <Player ref={p => p1 = p} name={response.data.player1} playerColor={'#383b40'} data={user1.data}/>;
      p2 = <Player ref={p => p2 = p} name={response.data.player2} playerColor={'#f5f9ff'} data={user2.data}/>;
      setP1(p1);
      setP2(p2);

      let un = localStorage.getItem('username');
      setUsername(un);
      let ownPlayer = p1.props.name === un ? p1 : p2;
      g = <Game ref={(game) => g = game} boardSize={response.data.size} player1={p1} player2={p2} ownPlayer={ownPlayer} boardHW={getOptimalCanvasSize()} broadcast={broadcastMove} pass={pass} multi={true}/>
      setRound(1);
      setGame(g);
      
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
    let pl1 = urlParams.get('player1');
    let pl2 = urlParams.get('player2');

    // Set up communication between the two players exclusively
    const room = `${pl1}-${pl2}`;
    rn = room;
    setRoomName(room);
    socket = socketIOClient('http://localhost:8000');
    socket.emit('joinGame', room);

    getActiveGame(pl1, pl2, token);
   
    window.addEventListener('resize', onResize);

    // Sample game event
    socket.on('game', msg => {
      if (msg.type === msgType.ERR) { // received an error, exit program
        console.log(msg);
        throw Error(msg.errmsg);
      }
      let response = null;
      switch (currentState) {
        case commState.NONE: // the current player has made no move nor passed
          if (msg.type === msgType.MOVE) {
            prevData = { x: msg.x, y: msg.y };
            response = { message: { type: msgType.MOVE_ACK, ...prevData}, room: rn };
            currentState = commState.WAITING_MOVE_ACK_ACK;
          } else if ( msg.type === msgType.PASS ) {
            response = { message: { type: msgType.PASS_ACK }, room: rn };
            currentState = commState.WAITING_PASS_ACK_ACK;
          }
          break;
        case commState.WAITING_MOVE_ACK: // player has sent a MOVE msg and waits for acknowledgement
          if (msg.type === msgType.MOVE_ACK) {
            if (prevData.x === msg.x && prevData.y === msg.y) {
              response = { message: { type: msgType.MOVE_ACK_ACK, ...prevData }, room: rn };
              currentState = commState.NONE;
              setRound(round + 1);
              g.processInput(msg.x, msg.y);
            } else {
              let errmsg = 'Error occured during MOVE_ACK: expected ' + prevData.toString() + ' but received ' + { x: msg.x, y: msg.y }.toString();
              response = { message: { type: msgType.ERR, errmsg:  errmsg}, room: rn };
              currentState = commState.NONE;
            }
          }
          break;
        case commState.WAITING_MOVE_ACK_ACK: // player has sent a MOVE_ACK and waits for acknowledgement
          if (msg.type === msgType.MOVE_ACK_ACK) {
            if (prevData.x === msg.x && prevData.y === msg.y) {
              g.processInput(msg.x, msg.y);
              setRound(round + 1);
              currentState = commState.NONE;
            } else {
              let errmsg = 'Error occured during MOVE_ACK_ACK: expected ' + prevData.toString() + ' but received ' + { x: msg.x, y: msg.y }.toString();
              response = { message: { type: msgType.ERR, errmsg:  errmsg}, room: rn };
              currentState = commState.NONE;
            }
          }
          break;
        case commState.WAITING_PASS_ACK: // player has sent a PASS msg and waits for acknowledgement
          if(msg.type === msgType.PASS_ACK) {
            response = { message: { type: msgType.PASS_ACK_ACK }, room :rn };
            currentState = commState.NONE;
            g.pass();
            setRound(round + 1);
          }
          break;
        case commState.WAITING_PASS_ACK_ACK: // player has sent a PASS_ACK msg and waits for acknowledgement
          if(msg.type === msgType.PASS_ACK_ACK) {
            currentState = commState.NONE;
            g.pass();
            setRound(round + 1);
          }
      }
      if(response !== null)
        socket.emit('game', response);
    });
  }, []);

  /**
   * 
   * @param {Number} x - Integer number of x coordinate of move  
   * @param {Number} y - Integer number of y coordinate of move
   */
  const broadcastMove = (x, y) => {
    let data = { message: { type: msgType.MOVE, x: x, y: y }, room: rn };
    currentState = commState.WAITING_MOVE_ACK;
    prevData = { x: x, y: y };
    socket.emit('game', data);
  };

  const pass = () => {
    currentState = commState.WAITING_PASS_ACK;
    socket.emit('game', {message: { type: msgType.PASS }, room: rn });
  };

  const displayInfo = () => {
    console.log(game)
    return (
      <div style={{ display: 'flex', flexGrow: 1 }}>
        {playerInfo(p1)}
        <div className='infobox' style={{ flexDirection: 'column' }}>
          <div>Round {round}</div>
        </div>
        {playerInfo(p2)}
      </div>
    );
  }

  const renderFlag = country => {
    let altText, countryID;
    switch (country) {
      case 'Germany':
        altText = 'Germany';
        countryID = 'DE';
        break;
      case 'Korea':
        altText = 'Korea';
        countryID = 'KR';
        break;
      case 'Taiwan':
        altText = 'Taiwan';
        countryID = 'TW';
        break;
      case 'Sweden':
        altText = 'Sweden';
        countryID = 'SE';
        break;
      case 'France':
        altText = 'France';
        countryID = 'FR';
        break;
      default:
        altText = 'USA';
        countryID = 'US';
        break;
    }
    return (
      <img
        width='5%'
        alt={altText}
        src={`http://catamphetamine.gitlab.io/country-flag-icons/3x2/${countryID}.svg`}
        style={{ width: '30px', height: '20px' }}
      />
    );
  };

  const playerInfo = player => {
    if(!player)
      return null;
    let playerColor = player.props.playerColor;
    return(
        <div className='infobox'> 
          <div className='userinfocolsym'>
            <div style={{ borderRadius: '50%', border: '0', backgroundColor: playerColor, width: '20px', height: '20px' }}/>
            <div>{renderFlag(player.props.data.country)}</div>
            <div><img src={process.env.PUBLIC_URL + '/rank_sym.png'} widht='20px' height='20px'></img></div>
          </div>
          <div className='userinfocol'> 
            <div>{player.props.name}</div>
            <div>{player.props.data.country}</div>
            <div>{player.props.data.ratings[player.props.data.ratings.length - 1].rating}</div>
          </div>
        </div>
    )
  }

  const getOptimalCanvasSize = () => {
    const minSize = 300;
    let smallerAxis = window.innerHeight > window.innerLength ? window.innerLength : window.innerHeight;
    return smallerAxis * boardToScreenRatio > minSize ? smallerAxis * boardToScreenRatio : minSize;
  }

  const onResize = () => {
    let newSize = getOptimalCanvasSize();
    g.setCanvasSize(newSize);
  }
 

  return (
    <div className='main'>
        <Layout className='ant-layout'>
          <Header className='gamewindow-header'>
              <img src={process.env.PUBLIC_URL + '/ReactGo.png'} />
              ReactGo
          </Header>
        </Layout>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
          <div className='boardview'>
            {game}
          </div>
          <div className='info-chat-box'>
            {displayInfo()}
          </div>
        </div>
    </div>
  );
};

export default GameWindow;
