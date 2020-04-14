import React from 'react';
import jwt_decode from 'jwt-decode';
import history from '../history';
import api from '../api';
import socketIOClient from 'socket.io-client';
import { Game, Player } from './BoardComponents';
import Clock from './Clock';
import { Layout, Row, Col } from 'antd';
import 'antd/dist/antd.css';
import Chat from './Chat';



const msgType = {
  MOVE:    'MOVE',
  PASS:    'PASS',
  FORFEIT: 'FORFEIT',
  RESULT: 'RESULT',
  ERR:     'ERR',
  NULL:    'NULL'
}

const INFOBOXSYMBOLRATIO = 6;

/**
 * this.g                   - game object to call methods of BoardComponent.Game
 * this.game                - game object for rendering the game
 * this.state.canvasSize    - size of rendered board in pixel
 * this.state.currentPlayer - current Player
 * this.state.prevData      - previous transmitted move data
 * this.socket              - socket
 * this.decoded             - JSONWebToken
 * this.roomName            - roomName for Game Communication
 * this.p1                  - BoardComponents.Player instance of Player 1
 * this.p2                  - BoardComponents.Player instance of Player 2
 * this.un                  - username of own Player
 * this.ownPlayer           -
 *
 */
class GameWindow extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      history: null,
      round: 0,
      currentPlayer: null,
      winner: null,
      gameEnd: false,
      loading: true,

      boardToScreenRatio: 0.85 ,
      chatbuffer: [],
      stringbuffer: '',
      canvasSize: 300,
      showEndWindow: false,
      playersConnected: false,
      waitingForResult: true,
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

    this.gameData = await api.get(
      `/games/active?player1=${pl1}&player2=${pl2}`,
      {
        headers: {
          Authorization: 'Bearer ' + this.token,
        },
      }
    );


    if(this.gameData.status === 204){
      history.push('/');
      return;
    }
      

    const user1 = await api.get(
      `users/${pl1}`,
      {
        headers: {
          Authorization: 'Bearer ' + this.token
        }
      }

    );
    this.p2 = (
      <Player
        name={gameData.data.player2}
        playerColor={'#f5f9ff'}
        data={user2.data}
      />
    );

    if(this.gameData.data.player1won !== undefined)
      history.push('/');

    


    window.addEventListener('resize', this.onResize);

    
    this.socket.on('game', this.onGameComm);
    this.socket.on('chat', this.onChatMsg);
    this.socket.on('system', this.onSystemMsg);
    console.log(this.p1);
    this.init(this.gameData, user1, user2);
  }


  init(gameData, user1, user2) {
    console.log(gameData);
    this.p1 = <Player name={gameData.data.player1} playerColor={'#383b40'} data={user1.data}/>;
    this.p2 = <Player name={gameData.data.player2} playerColor={'#f5f9ff'} data={user2.data}/>;
    this.un = localStorage.getItem('username');
    this.socket.emit('online', this.un);
    this.socket.emit('joinGame', this.roomName);
    if (this.un === this.p1.props.name)
      this.ownPlayer = this.p1;
    else if (this.un === this.p2.props.name)
      this.ownPlayer = this.p2;
    else
      this.ownPlayer = null;
    let canvassize = this.getNewCanvasSize();
    this.boardSize = gameData.data.size;
    let initState = {
      field: new Array(this.boardSize * this.boardSize).fill(null),
      points: { [this.p1.props.name] : 0, [this.p2.props.name]: 0 },
    }

    this.setState({
      loading: false,
      currentPlayer: this.p1,
      canvasSize: canvassize,

      history: [
        {
          gameState: initState,
          passCount: 0
        }
      ],
      availableMoves: Game.updateAvailableMoves.bind(this)(initState, initState, this.p1, this.p2)
    });
  }

  /**
   * #### methods handeling communications ####
   */


   /**
    * @param {Message} msg - a system Message received
    */
  onSystemMsg = (msg) => {
    console.log(msg);
    if (msg.type === 'DISCONNECT') {
      this.socket.emit('chat', { data: { user: 'System', msg: `${msg.user} has disconnected.` }, room: this.roomName });
      this.onDisconnect(msg.user);
    }
    else if (msg.type === 'JOIN'){
      // this.socket.emit('chat', { data: { user: 'System', msg: `${msg.user} has joined the room.` }, room: this.roomName });
    }
    else if (msg.type === 'CONNECTION_ESTABLISHED')
      this.setState({ playersConnected: true });
  }


  /**
   * @param {User} user - disconnected user
   */
  onDisconnect = (user) => {
    if (user === this.p1.props.name)
      this.setImmediateWin(this.p2);
    else if (user === this.p2.props.name)
      this.setImmediateWin(this.p1);
  }


  
  /**
   * Game Communication Handler(See Documentation)
   */
  onGameComm = msg => {
    console.log(msg)
    if(msg.sender === this.un)
      return;
    if (msg.type === msgType.MOVE){
      this.processInput(msg.x, msg.y, msg.sender);
    } 
    else if (msg.type === msgType.PASS) {
      this.pass(msg.sender);
    }
    else if (msg.type === msgType.FORFEIT) {
      let winner = msg.sender === this.p1.props.name ? this.p2 : this.p1;
      this.setImmediateWin(winner);
    }
    else if (msg.type === msgType.RESULT && this.state.gameEnd && this.state.waitngForResult) {
      this.onResult(msg.data);
    }
  };


  onResult = (updatedGame) => {
    this.newRatingPlayer1 = updatedGame.newRatingPlayer1;
    this.newRatingPlayer2 = updatedGame.newRatingPlayer2;
    this.setState({ waitingForResult: false, showEndWindow: true });
  }


  /**
   * formats and sends message over socket {data: {user: #username of the sending person, msg: #message to be sent}, room: #room name of current gameWindow}
   */
  sendMessage = () => {
    if(this.state.stringbuffer.length > 0)
      this.socket.emit('chat', { data: {user: this.un, msg: this.state.stringbuffer}, room: this.roomName });
    this.setState({ stringbuffer: '' });
  }

  /**
   * 
   * @param {Number} x - Integer number of x coordinate of move  
   * @param {Number} y - Integer number of y coordinate of move
   */
  broadcastMove = (x, y) => {
    let data = { message: { type: msgType.MOVE, x: x, y: y, sender: this.un, }, room: this.roomName };

    this.socket.emit('game', data);
  };

  /**
   * passes the move
   */
  broadcastPass = () => {
    this.socket.emit('game', { message: { type: msgType.PASS, sender: this.un, player: this.ownPlayer }, room: this.roomName });
    this.socket.emit('chat', { data: { user: 'Game', msg: `${this.un} has passed.(Round ${this.state.round})` }, room: this.roomName });
  };

  
  /**
   * error handler for child components
   */
  err = (state) => {
    alert('An Error occured on Child component');
    console.log(state);
  }


  /**
   * methods manipulating / using GameStates
   */


  setImmediateWin(player) {
    this.setState({ winner: player, gameEnd: true });
    this.onWin(player);
  } 


  processInput = (x, y, player) => {
    if (player !== this.state.currentPlayer.props.name || this.state.gameEnd || !this.state.availableMoves[y * this.boardSize + x])
      return;
    this.onNextMove(this.state.availableMoves[y * this.boardSize + x]);
    this.broadcastMove(x, y);
  }


  handlePass = (player) => {
    if (player !== this.state.currentPlayer.props.name || this.state.gameEnd)
      return;
    this.pass();
    this.broadcastPass();
  }


  pass = () => {
    let nextPlayer = this.getNextPlayer();
    let newMoves = Game.updateAvailableMoves.bind(this)(
      this.state.history[this.state.round].gameState,
      this.state.history[this.state.round].gameState,
      nextPlayer,
      this.state.currentPlayer
    );
    let newState = {
      history: this.state.history.slice(0, this.state.round + 1).concat([
        {
          gameState: this.state.history[this.state.round].gameState,
          passCount: this.state.history[this.state.round].passCount + 1
        }
      ]),
      round: this.state.round + 1,
      currentPlayer: nextPlayer,
      availableMoves: newMoves
    };
    console.log(newState);
    this.updateGame(newState);
  }


  /**
   * update game state when move is made
   */
  onNextMove = (fields) => {
    const history = this.state.history.slice(0, this.state.round + 1);

    let nextPlayer = this.getNextPlayer();
    let newMoves = Game.updateAvailableMoves.bind(this)(fields, history[this.state.round].gameState, nextPlayer, this.state.currentPlayer);
    let newState = {
      history: history.concat([
        {
          gameState: fields,
          passCount: 0,
        }
      ]),
      round: history.length,
      currentPlayer: nextPlayer,
      availableMoves: newMoves,
    }
    this.updateGame(newState);
  }


  getNextPlayer() {
    return this.state.currentPlayer === this.p1 ? this.p2 : this.p1;
  }


  onForfeit = () => {
    if(!this.ownPlayer || this.state.gameEnd)
      return;
    this.setImmediateWin(this.ownPlayer === this.p1 ? this.p2 : this.p1);
    this.socket.emit('game', { message: { type: msgType.FORFEIT, sender: this.ownPlayer.props.name }, room: this.roomName });
  }


  /**
   * won player send results to server, the other player does not do anything
   */
  onWin = (winner) => {
    if(winner.props.name !== this.un)
      return;
    
    api.patch(`/games/${this.gameData.data._id}`,
      { player1Won: winner === this.p1 },
      {
        headers: {
          Authorization: 'Bearer ' + this.token
        }
      },
    ).then(
      res => {
        console.log(res);
        this.socket.emit('game', { message: { type: msgType.RESULT, data: res.data }, room: this.roomName });
        this.onResult(res.data);
      }
    )
    .catch(e => {console.log(e)});
  }


  /**
   * updates game accordingly to new game state(terminates game if passCount >= 2), automatically passes if there are no moves to be made for current player
   * @param {GameState} newState - new game state 
   */
  updateGame(newState) {
    let whoIsWinning = null;
    let newGameState = newState.history[newState.round].gameState;
    if (newGameState.points[this.p1.props.name] > newGameState.points[this.p2.props.name])
      whoIsWinning = this.p1;
    else if (newGameState.points[this.p1.props.name] < newGameState.points[this.p2.props.name])
      whoIsWinning = this.p2;

    if (newState.availableMoves.length < 1) {
      this.setState(newState);
      if(newState.currentPlayer === this.ownPlayer)
        this.socket.emit('chat', { data: { user: 'Game', msg: 'Automatic Pass because there were no moves that can be made.' }, room: this.roomName })
      this.pass();
    }
    if(newState.history[newState.round].passCount >= 2){
      this.setState({ ...newState, gameEnd: true, winner: whoIsWinning });
      this.onWin(whoIsWinning);
    }
    else
    this.setState(newState);
  }



  /**
   * rendering stuff
   */


  /**
   * display game info
   */
  gameInfo = () => {
    return (
      <div className='infobox' style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px' }}>
          <div style={{ borderRadius: '50%', border: '0', backgroundColor: this.state.currentPlayer ? this.state.currentPlayer.props.playerColor : 'purple', width: '20px', height: '20px' }}></div>
          <div>Round {this.state.round + 1}</div>
      </div>
    );
  };

  /**
   * Renders a image of flag of given country(default US)
   * Grabbbed from Profile.jsx
   */
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
        className='flag'
      />
    );
  };

  /**
   * displays player information
   */
  playerInfo = (player) => {
    if (!player) return null;
    let playerColor = player.props.playerColor;
    return (
      <div className='infobox'>
        <Row type='flex' className='infoboxrow'>
          <Col span={INFOBOXSYMBOLRATIO}>
            <div className='infoboxiconcontainer'>
              <div
                style={{
                  borderRadius: '50%',
                  border: '0',
                  backgroundColor: playerColor,
                  width: '20px',
                  height: '20px',
                }}
              />
            </div>
          </Col>
          <Col>{player.props.name ? player.props.name : 'Undefined'}</Col>
        </Row>
        <Row type='flex' className='infoboxrow'>
          <Col span={INFOBOXSYMBOLRATIO}>
            <div className='infoboxiconcontainer'>
              {player.props.data.country ? (
                <div style={{ height: 'min-content', width: 'min-content' }}>
                  {this.renderFlag(player.props.data.country)}
                </div>
              ) : (
                <div
                  style={{
                    backgroundColor: 'white',
                    width: '30px',
                    height: '20px',
                  }}
                />
              )}
            </div>
          </Col>
          <Col>
            {player.props.data.country
              ? player.props.data.country
              : 'Undefined'}
          </Col>
        </Row>
        <Row type='flex' className='infoboxrow'>
          <Col span={INFOBOXSYMBOLRATIO} className='infoboxiconcontainer'>
            <div className='infoboxicon'>
              <img
                src={process.env.PUBLIC_URL + '/rank_sym.png'}
                className='sicon'
              />
            </div>
          </Col>
          <Col>
            {
              player.props.data.ratings[player.props.data.ratings.length - 1]
                .rating
            }
          </Col>
        </Row>
        <Row type='flex' className='infoboxrow'>
          <Col span={INFOBOXSYMBOLRATIO} className='infoboxiconcontainer'>
            <div className='infoboxicon'>
              <img
                src={process.env.PUBLIC_URL + '/time_icon.png'}
                className='sicon'
              />
            </div>
          </Col>
          <Col>
            <Clock
              isActive={
                player.props.name === this.state.currentPlayer.props.name &&
                this.game._self.state.round !== 1
              }
              startTime={this.state.time}
              increment={this.state.increment}
            />
          </Col>
        </Row>
      </div>
    );
  };

  /**
   * calculates optimal canvas size depending on window size
   */
  getNewCanvasSize = () => {

    let smallerAxis = window.innerWidth > window.innerHeight ? window.innerHeight : window.innerWidth;
    if(this.gameView && this.infoview) {
      if(this.gameView.getBoundingClientRect().top < this.infoview.getBoundingClientRect().top)
        this.setState({ boardToScreenRatio: 0.85 });
    }
    return smallerAxis * this.state.boardToScreenRatio > 400 ? smallerAxis * this.state.boardToScreenRatio : 400;
  }



  /**
   * renders the content view(the board and the info / chat)
   */
  contentView = () => {
    let newHeight = this.state.canvasSize * 0.7;
    return(
      <div
        style={
          {
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            alignItems: 'center'
          }
        }
      >
        <div ref={el => this.gameView = el} className='boardview'>
          <Board
            boardSize={this.boardSize}
            onClick={(x, y) => this.processInput(x, y, this.un)}
            currField={this.state.history[this.state.round].gameState.field}
            currPlayer={this.state.currentPlayer}
            boardHW={this.state.canvasSize}
          />
        </div>
        <div ref={el => this.infoview = el} 
          style={{
            margin: '30px',
            display: 'flex',
            flexDirection: 'column',
            alignContent: 'center',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            backgroundColor: '#262320',
            borderRadius: '10px',
            height: `${this.state.canvasSize * 0.7}px`
        }}>
          {this.displayInfo()}
          <Chat user={this.un} socket={this.socket} roomName={this.roomName} customButtons={this.ownPlayer !== null ? [{ label: 'Pass', onClick: this.handlePass }, { label: 'Forfeit', onClick: this.onForfeit }] : []}/>
        </div>
      </div>
    )
  }


  gameEnded = () => {
    if(this.state.showEndWindow)
      return (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'rgba(0, 0, 0, 0.7)',
          }}
        >
          <div
            style={{
              width: '40%',
              height: '30%',
              background: '#fff',
              border: 0,
              borderRadius: '10px',
              padding: '15px',
              color: 'black',
              fontSize: '25px',
            }}
          >
            <div style={{ width: '100%' }}>
              <button 
                className='close'
                onClick={e => this.setState({ showEndWindow: false })}>
                Close
              </button>
            </div>
            <p>{this.ownPlayer === null ? 'Game ended.' : this.state.winner === this.ownPlayer ? 'Victory' : 'Defeat'}</p>
            <p>
              {this.p1.props.name}: 
              <span style={{ color: this.p1 === this.state.winner ? 'green' : 'red' }}>
              {this.newRatingPlayer1}
              ({this.newRatingPlayer1 - this.gameData.data.oldRatingPlayer1 >= 0 ? '+' + (this.newRatingPlayer1 - this.gameData.data.oldRatingPlayer1) : this.newRatingPlayer1 - this.gameData.data.oldRatingPlayer1})
              </span>
            </p>
            <p>
              {this.p2.props.name}: 
              <span style={{ color: this.p2 === this.state.winner ? 'green' : 'red' }}>
              {this.newRatingPlayer2}
              ({this.newRatingPlayer2 - this.gameData.data.oldRatingPlayer2 >= 0 ? '+' + (this.newRatingPlayer2 - this.gameData.data.oldRatingPlayer2) : this.newRatingPlayer2 - this.gameData.data.oldRatingPlayer2})
              </span>
            </p>
          </div>
        </div>
      ) 
  }

  /**
   * resize handler
   */
  onResize = () => {
    let newSize = this.getNewCanvasSize();
    this.setState({ canvasSize: newSize });
    if(this.g) this.g.setCanvasSize(newSize);
  }


  /**
   * Player and current game information
   */
  displayInfo = () => {
    return (
      <div 
        	style={{ 
            display: 'flex',
            alignContent: 'space-between',
            width: '100%'
      }}>

        {this.playerInfo(this.p1)}
        {this.gameInfo()}
        {this.playerInfo(this.p2)}
      </div>
    );
  };

  increaseBoardRatio = () => {
    if (this.state.boardToScreenRatio >= 0.9) return;
    this.setState({ boardToScreenRatio: this.state.boardToScreenRatio - 0.1 });
  };

  decreaseBoardRatio = () => {
    if (this.state.boardToScreenRatio <= 0.3) return;
    this.setState({ boardToScreenRatio: this.state.boardToScreenRatio - 0.1 });
  };

  render() {
    console.log(this.state)
    if(this.state.loading)
      return null;
    if(!this.state.playersConnected)
      return (
        <div>Waiting for players to be connected...</div>
      );
    return (
      <div className='gameView'>
          <div className='gamewindow-header'>
            <div style={{ padding: '5px' }}>
              <img src={process.env.PUBLIC_URL + '/ReactGo.png'} />
              ReactGo
            </div>
          </div>
          {this.contentView()}
          {this.gameEnded(this.p1)}
      </div>
    );
  }
}

export default GameWindow;
