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

class GameWindow extends React.Component {
   

  constructor(props) {
    super(props);
    
    this.state = {
      canvasSize: 300,
      currentPlayer: null,
      loading: true,
      currentState: commState.NONE,
      prevData: { x: NaN, y: NaN },
      boardToScreenRatio: 0.8,
      round: 1
    };
  }

  async componentDidMount() {
    let boardToScreenRatio = 0.8;
    this.token = localStorage.getItem('jwt');

    // Redirect to login page if user is without token
    if (this.token === null) {
      history.push('/login');
    }
    // Redirect to main page if user is not part of the game
    this.decoded = jwt_decode(this.token);

    if (!document.URL.includes(this.decoded.name)) {
      history.push('/');
    }

    // Get players
    let urlParams = new URLSearchParams(window.location.search);
    let pl1 = urlParams.get('player1');
    let pl2 = urlParams.get('player2');

    // Set up communication between the two players exclusively
    this.roomName = `${pl1}-${pl2}`;
    this.socket = socketIOClient('http://localhost:8000');
    this.socket.emit('joinGame', this.roomName);

    console.log(this.socket);

    const gameData = await api.get(
      `/games/active?player1=${pl1}&player2=${pl2}`,
      {
        headers: {
          Authorization: 'Bearer ' + this.token
        }
      }
    );

    const user1 = await api.get(
      `users/${pl1}`,
      {
        headers: {
          Authorization: 'Bearer ' + this.token
        }
      }
    );

    const user2 = await api.get(
      `users/${pl2}`,
      {
        headers: {
          Authorization: 'Bearer ' + this.token
        }
      }
    );

    if(gameData.data.player1won !== undefined)
      history.push('/');

    this.p1 = <Player name={gameData.data.player1} playerColor={'#383b40'} data={user1.data}/>
    this.p2 = <Player name={gameData.data.player2} playerColor={'#f5f9ff'} data={user2.data}/>
    this.un = localStorage.getItem('username');
    this.ownPlayer = this.p1.props.name === this.un ? this.p1 : this.p2;
    this.game  = <Game ref={ game => this.g = game } boardSize={gameData.data.size} player1={this.p1} player2={this.p2} ownPlayer={this.ownPlayer} boardHW={this.getOptimalCanvasSize()} broadcast={this.broadcastMove.bind(this)} pass={this.pass} multi={true}/>;

    window.addEventListener('resize', this.onResize);

    // Sample game event
    this.socket.on('game', msg => {
      if (msg.type === msgType.ERR) { // received an error, exit program
        console.log(msg);
        throw Error(msg.errmsg);
      }
      console.log('received');
      console.log(this.socket);
      console.log(msg);
      let response = null;
      switch (this.state.currentState) {
        case commState.NONE: // the current player has made no move nor passed
          if (msg.type === msgType.MOVE) {
            this.state.prevData = { x: msg.x, y: msg.y };
            response = { message: { type: msgType.MOVE_ACK, ...this.state.prevData}, room: this.roomName };
            this.setState({ currentState: commState.WAITING_MOVE_ACK_ACK });
          } else if ( msg.type === msgType.PASS ) {
            response = { message: { type: msgType.PASS_ACK }, room: this.roomName };
            this.setState({ currentState: commState.WAITING_PASS_ACK_ACK });
          }
          break;
        case commState.WAITING_MOVE_ACK: // player has sent a MOVE msg and waits for acknowledgement
          if (msg.type === msgType.MOVE_ACK) {
            if (this.state.prevData.x === msg.x && this.state.prevData.y === msg.y) {
              response = { message: { type: msgType.MOVE_ACK_ACK, ...this.state.prevData }, room: this.roomName };
              this.g.processInput(msg.x, msg.y);
              this.setState({ round: this.state.round + 1, currentState: commState.NONE, currentPlayer: this.g.getCurrentPlayer() });
            } else {
              let errmsg = 'Error occured during MOVE_ACK: expected ' + this.state.prevData.toString() + ' but received ' + { x: msg.x, y: msg.y };
              response = { message: { type: msgType.ERR, errmsg:  errmsg}, room: this.roomName };
              this.setState({ currentState: commState.NONE });
            }
          }
          break;
        case commState.WAITING_MOVE_ACK_ACK: // player has sent a MOVE_ACK and waits for acknowledgement
          if (msg.type === msgType.MOVE_ACK_ACK) {
            if (this.state.prevData.x === msg.x && this.state.prevData.y === msg.y) {
              this.g.processInput(msg.x, msg.y);
              this.setState({ round: this.state.round + 1, currentState: commState.NONE, currentPlayer: this.g.getCurrentPlayer() });
            } else {
              let errmsg = 'Error occured during MOVE_ACK_ACK: expected ' + this.state.prevData.toString() + ' but received ' + { x: msg.x, y: msg.y }.toString();
              response = { message: { type: msgType.ERR, errmsg:  errmsg}, room: this.roomName };
              this.setState({ currentState: commState.NONE });
            }
          }
          break;
        case commState.WAITING_PASS_ACK: // player has sent a PASS msg and waits for acknowledgement
          if(msg.type === msgType.PASS_ACK) {
            response = { message: { type: msgType.PASS_ACK_ACK }, room: this.roomName };
            this.g.pass();
            this.setState({ round: this.state.round + 1, currentState: commState.NONE, currentPlayer: this.g.getCurrentPlayer() });
          }
          break;
        case commState.WAITING_PASS_ACK_ACK: // player has sent a PASS_ACK msg and waits for acknowledgement
          if(msg.type === msgType.PASS_ACK_ACK) {
            this.g.pass();
            this.setState({ round: this.state.round + 1, currentState: commState.NONE, currentPlayer: this.g.getCurrentPlayer() });
          }
      }
      if(response !== null)
        this.socket.emit('game', response);
    });
    this.setState({ loading: false, currentPlayer: this.p1 });
  }

   /**
   * 
   * @param {Number} x - Integer number of x coordinate of move  
   * @param {Number} y - Integer number of y coordinate of move
   */
  broadcastMove = (x, y) => {
    let data = { message: { type: msgType.MOVE, x: x, y: y }, room: this.roomName };
    this.setState({ currentState: commState.WAITING_MOVE_ACK, prevData: { x: x, y: y } });
    this.socket.emit('game', data);
    console.log('send');
    console.log(this.socket);
    console.log(data);
  };

  pass = () => {
    this.setState({ currentState: commState.WAITING_PASS_ACK });
    this.socket.emit('game', {message: { type: msgType.PASS }, room: this.roomName });
  };

  displayInfo =  () => {
    return (
      <div style={{ display: 'flex', flexGrow: 1 }}>
        {this.playerInfo(this.p1)}
        <div className='infobox' style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ borderRadius: '50%', border: '0', backgroundColor: this.state.currentPlayer ? this.state.currentPlayer.props.playerColor : 'purple', width: '20px', height: '20px' }}></div>
          <div>Round {this.state.round}</div>
        </div>
        {this.playerInfo(this.p2)}
      </div>
    );
  }

  renderFlag = (country) => {
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

  playerInfo = (player) => {
    if(!player)
      return null;
    let playerColor = player.props.playerColor;
    return(
        <div className='infobox'> 
          <div className='userinfocolsym'>
            <div style={{ borderRadius: '50%', border: '0', backgroundColor: playerColor, width: '20px', height: '20px' }}/>
            <div>{this.renderFlag(player.props.data.country)}</div>
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

  getOptimalCanvasSize = () => {
    const minSize = 300;
    let smallerAxis = window.innerHeight > window.innerLength ? window.innerLength : window.innerHeight;
    return smallerAxis * this.state.boardToScreenRatio > minSize ? smallerAxis * this.state.boardToScreenRatio : minSize;
  }

  onResize = () => {
    let newSize = this.getOptimalCanvasSize();
    this.g.setCanvasSize(newSize);
  }

  render() {
    if(this.state.loading)
      return null;
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
              {this.game}
            </div>
            <div className='info-chat-box'>
              {this.displayInfo()}
            </div>
          </div>
      </div>
    );
  }
}

export default GameWindow;