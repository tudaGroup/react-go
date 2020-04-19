import React from 'react';
import jwt_decode from 'jwt-decode';
import history from '../../history';
import api from '../../api';
import socketIOClient from 'socket.io-client';
import { Game, Player, Board } from './BoardComponents';
import Clock from './Clock';
import { Row, Col, Button } from 'antd';
import 'antd/dist/antd.css';
import Chat from './Chat';
import { Prompt } from 'react-router';

const msgType = {
  MOVE: 'MOVE',
  PASS: 'PASS',
  FORFEIT: 'FORFEIT',
  RESULT: 'RESULT',
  ERR: 'ERR',
  NULL: 'NULL',
};

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

    this.p1ClockRef = React.createRef();
    this.p2ClockRef = React.createRef();

    this.state = {
      history: null,
      round: 0,
      currentPlayer: null,
      winner: null,
      gameEnd: false,
      loading: true,
      rated: false,

      boardToScreenRatio: 0.85,
      chatbuffer: [],
      stringbuffer: '',
      canvasSize: 300,
      showEndWindow: false,
      playersConnected: false,
      waitingForResult: true,
    };
  }

  async componentDidMount() {
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

    if (this.gameData.status === 204) {
      history.push('/');
      return;
    }

    this.setState({ rated: this.gameData.data.rated });

    console.log(this.gameData);

    const user1 = await api.get(`users/${pl1}`, {
      headers: {
        Authorization: 'Bearer ' + this.token,
      },
    });

    const user2 = await api.get(`users/${pl2}`, {
      headers: {
        Authorization: 'Bearer ' + this.token,
      },
    });
    this.p2 = (
      <Player
        name={this.gameData.data.player2}
        playerColor={'#f5f9ff'}
        data={user2.data}
      />
    );

    if (this.gameData.data.player1won !== undefined) history.push('/');

    window.addEventListener('resize', this.onResize);

    this.socket.on('game', this.onGameComm);
    this.socket.on('system', this.onSystemMsg);
    this.init(this.gameData, user1, user2);
  }

  componentWillUnmount() {
    this.onForfeit();
  }

  init(gameData, user1, user2) {
    this.p1 = (
      <Player
        name={gameData.data.player1}
        playerColor={'#383b40'}
        data={user1.data}
      />
    );
    this.p2 = (
      <Player
        name={gameData.data.player2}
        playerColor={'#f5f9ff'}
        data={user2.data}
      />
    );
    this.un = localStorage.getItem('username');
    this.socket.emit('online', this.un);
    this.socket.emit('joinGame', this.roomName);
    if (this.un === this.p1.props.name) this.ownPlayer = this.p1;
    else if (this.un === this.p2.props.name) this.ownPlayer = this.p2;
    else this.ownPlayer = null;
    let canvassize = this.getNewCanvasSize();
    this.boardSize = gameData.data.size;
    let initState = {
      field: new Array(this.boardSize * this.boardSize).fill(null),
      points: { [this.p1.props.name]: 0, [this.p2.props.name]: 0 },
    };

    this.setState({
      loading: false,
      currentPlayer: this.p1,
      canvasSize: canvassize,
      time: gameData.data.time,
      increment: gameData.data.timeIncrement,
      history: [
        {
          gameState: initState,
          passCount: 0,
        },
      ],
    });
  }

  /**
   * #### methods handeling communications ####
   */

  /**
   * @param {Message} msg - a system Message received
   */
  onSystemMsg = (msg) => {
    if (msg.type === 'DISCONNECT') {
      this.socket.emit('chat', {
        data: { user: 'System', msg: `${msg.user} has disconnected.` },
        room: this.roomName,
      });
      this.onDisconnect(msg.user);
    } else if (msg.type === 'JOIN') {
      // this.socket.emit('chat', { data: { user: 'System', msg: `${msg.user} has joined the room.` }, room: this.roomName });
    } else if (msg.type === 'CONNECTION_ESTABLISHED') {
      this.setState({ playersConnected: true });
    }
  };

  /**
   * @param {User} user - disconnected user
   */
  onDisconnect = (user) => {
    if (this.state.gameEnd) return;
    if (user === this.p1.props.name) this.gameHasEnded(this.state, this.p2);
    else if (user === this.p2.props.name) this.gameHasEnded(this.state, this.p1);
  };

  /**
   * Game Communication Handler(See Documentation)
   */
  onGameComm = (msg) => {
    console.log(msg);
    console.log(this.state);
    if (msg.sender === this.un) return;
    if (msg.type === msgType.MOVE) {
      this.processInput(msg.x, msg.y, msg.sender);
    } else if (msg.type === msgType.PASS) {
      this.pass(msg.sender);
    } else if (msg.type === msgType.FORFEIT) {
      let winner = msg.sender === this.p1.props.name ? this.p2 : this.p1;
      this.gameHasEnded(this.state, winner);
    } else if (
      msg.type === msgType.RESULT &&
      this.state.gameEnd &&
      this.state.waitingForResult
    ) {
      this.onResult(msg.data);
    }
  };

  onResult = (updatedGame) => {
    this.newRatingPlayer1 = updatedGame.newRatingPlayer1;
    this.newRatingPlayer2 = updatedGame.newRatingPlayer2;
    this.setState({ waitingForResult: false, showEndWindow: true });
  };


  onTimeout = () => {
    this.gameHasEnded(this.state, this.state.currentPlayer === this.p2 ? this.p1 : this.p2);
  }

  /**
   * formats and sends message over socket {data: {user: #username of the sending person, msg: #message to be sent}, room: #room name of current gameWindow}
   */
  sendMessage = () => {
    if (this.state.stringbuffer.length > 0)
      this.socket.emit('chat', {
        data: { user: this.un, msg: this.state.stringbuffer },
        room: this.roomName,
      });
    this.setState({ stringbuffer: '' });
  };

  /**
   *
   * @param {Number} x - Integer number of x coordinate of move
   * @param {Number} y - Integer number of y coordinate of move
   */
  broadcastMove = (x, y) => {
    let data = {
      message: { type: msgType.MOVE, x: x, y: y, sender: this.un },
      room: this.roomName,
    };

    this.socket.emit('game', data);
  };

  /**
   * passes the move
   */
  broadcastPass = () => {
    this.socket.emit('game', {
      message: { type: msgType.PASS, sender: this.un, player: this.ownPlayer },
      room: this.roomName,
    });
    this.socket.emit('chat', {
      data: {
        user: 'Game',
        msg: `${this.un} has passed.(Round ${this.state.round})`,
      },
      room: this.roomName,
    });
  };

  /**
   * error handler for child components
   */
  err = (state) => {
    alert('An Error occured on Child component');
    console.log(state);
  };

  /**
   * methods manipulating / using GameStates
   */

  setImmediateWin = (player) => {
    this.setState({ winner: player, gameEnd: true });
    this.onEnd(player);
  }

  processInput = (x, y, player) => {
    if (player !== this.state.currentPlayer.props.name || this.state.gameEnd)
      return;

    let playerObject = this.p1.props.name === player ? this.p1 : this.p2;

    let newField = this.state.history[this.state.round].gameState.field.slice();
    let enemy = this.p1 === playerObject ? this.p2 : this.p1;
    if (newField[y * this.boardSize + x] !== null) return;

    newField[y * this.boardSize + x] = playerObject;
    Game.applyRulesBoard.bind(this)(newField, playerObject, enemy);

    if (newField[y * this.boardSize + x] !== playerObject) {
      alert('Move is suicidal.');
      return;
    }

    let prevRound = this.state.round - 1 >= 0 ? this.state.round - 1 : 0;
    if (
      this.arrequals(newField, this.state.history[prevRound].gameState.field)
    ) {
      alert('Illegal Ko move.');
      return;
    }

    this.onNextMove(newField);
    this.broadcastMove(x, y);
  };

  handlePass = (player) => {
    if (player !== this.state.currentPlayer || this.state.gameEnd) return;
    this.pass();
    this.broadcastPass();
  };

  pass = () => {
    let nextPlayer = this.getNextPlayer();
    let newState = {
      history: this.state.history.slice(0, this.state.round + 1).concat([
        {
          gameState: this.state.history[this.state.round].gameState,
          passCount: this.state.history[this.state.round].passCount + 1,
        },
      ]),
      round: this.state.round + 1,
      currentPlayer: nextPlayer,
    };
    this.updateGame(newState);
  };

  /**
   * update game state when move is made
   */
  onNextMove = (fields) => {
    const history = this.state.history.slice(0, this.state.round + 1);

    let nextPlayer = this.getNextPlayer();
    let newState = {
      history: history.concat([
        {
          gameState: {
            field: fields,
            points: {
              [this.p1.props.name]: Game.getPoints(fields, this.p1),
              [this.p2.props.name]: Game.getPoints(fields, this.p2),
            },
          },
          passCount: 0,
        },
      ]),
      round: history.length,
      currentPlayer: nextPlayer,
    };
    this.updateGame(newState);
  };

  getNextPlayer() {
    return this.state.currentPlayer === this.p1 ? this.p2 : this.p1;
  }

  onForfeit = () => {
    if (!this.ownPlayer || this.state.gameEnd) return;
    this.gameHasEnded(this.state, this.ownPlayer === this.p1 ? this.p2 : this.p1);
    this.socket.emit('game', {
      message: { type: msgType.FORFEIT, sender: this.ownPlayer.props.name },
      room: this.roomName,
    });
  };


  /**
   * updates game accordingly to new game state(terminates game if passCount >= 2), automatically passes if there are no moves to be made for current player
   * @param {GameState} newState - new game state
   */
  updateGame(newState) {
    this.setState(newState);

    if (newState.history[newState.round].passCount >= 2) {
      // game Ended
      this.gameHasEnded(newState);
    }
  }


  /**
   * method called when game has ended
   */
  gameHasEnded = (newState, player) => {
    let whoIsWinning = null;
    let newGameState = newState.history[newState.round].gameState;
    if (
      newGameState.points[this.p1.props.name] >
      newGameState.points[this.p2.props.name]
    )
      whoIsWinning = this.p1;
    else if (
      newGameState.points[this.p1.props.name] <
      newGameState.points[this.p2.props.name]
    )
      whoIsWinning = this.p2;

    whoIsWinning = !player ? whoIsWinning : player;
    this.setState({ gameEnd: true, winner:  whoIsWinning});


    if (whoIsWinning === null) {
      whoIsWinning = this.p2; // if there is a draw, white wins because of starting disadvantage
    }
    if (whoIsWinning.props.name !== this.un) return;

    api
      .patch(
        `/games/${this.gameData.data._id}`,
        { player1Won: whoIsWinning === this.p1 },
        {
          headers: {
            Authorization: 'Bearer ' + this.token,
          },
        }
      )
      .then((res) => {
        this.socket.emit('game', {
          message: { type: msgType.RESULT, data: res.data },
          room: this.roomName,
        });
        this.onResult(res.data);
      })
      .catch((e) => {
        console.log(e);
      });
  }


  detectAnomaly(newState) {
    let newGameState = newState.history[newState.round].gameState;
    let enemy = this.p1 === newState.currentPlayer ? this.p2 : this.p1;

    let avMoves = Game.availableMoves(
      newGameState.field,
      newState.currentPlayer,
      enemy
    );

    if (!avMoves) {
      this.setState(newState);
      if (newState.currentPlayer === this.ownPlayer)
        this.socket.emit('chat', {
          data: {
            user: 'Game',
            msg: 'Automatic Pass because there were no moves that can be made.',
          },
          room: this.roomName,
        });
      this.pass();
      return;
    }
  }

  /**
   * Renders a image of flag of given country(default US)
   */
  renderFlag = (country) => {
    let altText, countryID;
    switch (country) {
      case 'Germany':
        altText = 'USA';
        countryID = 'US';
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
        altText = 'Germany';
        countryID = 'DE';
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
            {player.props.data.country ? player.props.data.country : 'Unknown'}
          </Col>
        </Row>
        <Row type='flex' className='infoboxrow'>
          <Col span={INFOBOXSYMBOLRATIO} className='infoboxiconcontainer'>
            <div className='infoboxicon'>
              <img
                src={process.env.PUBLIC_URL + '/rank_sym.png'}
                alt='rank_sym'
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
                alt='time_icon'
                className='sicon'
              />
            </div>
          </Col>
          <Col>
            <Clock
              ref={player === this.p1 ? this.p1ClockRef : this.p2ClockRef}
              isActive={
                player.props.name === this.state.currentPlayer.props.name
              }
              startTime={this.state.time}
              increment={this.state.increment}
              onTimeout={this.onTimeout}
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
    let smallerAxis =
      window.innerWidth > window.innerHeight
        ? window.innerHeight
        : window.innerWidth;
    if (this.gameView && this.infoview) {
      if (
        this.gameView.getBoundingClientRect().top <
        this.infoview.getBoundingClientRect().top
      )
        this.setState({ boardToScreenRatio: 0.85 });
    }
    return smallerAxis * this.state.boardToScreenRatio > 400
      ? smallerAxis * this.state.boardToScreenRatio
      : 400;
  };

  /**
   * renders the content view(the board and the info / chat)
   */
  renderContentView = () => {
    return (
      <div>
        <Row>
          <Col span={12}>
            <div ref={(el) => (this.gameView = el)} className='boardview'>
              <Board
                boardSize={this.boardSize}
                onClick={(x, y) => this.processInput(x, y, this.un)}
                currField={this.state.history[this.state.round].gameState.field}
                currPlayer={this.state.currentPlayer}
                boardHW={this.state.canvasSize}
              />
            </div>
          </Col>
          <Col>
            <div
              ref={(el) => (this.infoview = el)}
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
                minHeight: `${this.state.canvasSize * 0.7}px`,
              }}
            >
              {this.displayInfo()}
              <Chat
                user={this.un}
                socket={this.socket}
                roomName={this.roomName}
                customButtons={
                  this.ownPlayer !== null
                    ? [
                        {
                          label: 'Pass',
                          onClick: () => this.handlePass(this.ownPlayer),
                        },
                        { label: 'Forfeit', onClick: this.onForfeit },
                      ]
                    : []
                }
              />
            </div>
          </Col>
        </Row>
      </div>
    );
  };

  pad(num) {
    return num < 10 ? '0' + num : num;
  }

  gameEnded = () => {
    let player1gainloss =
      this.newRatingPlayer1 - this.gameData.data.oldRatingPlayer1;
    let player2gainloss =
      this.newRatingPlayer2 - this.gameData.data.oldRatingPlayer2;

    if (this.state.showEndWindow)
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
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
          }}
        >
          <div className='endgame__popup'>
            <p style={{ textAlign: 'center', marginTop: 0 }}>
              {this.ownPlayer === null ? (
                'Game ended'
              ) : this.ownPlayer === this.state.winner ? (
                <span style={{ color: '#629923' }}>You won.</span>
              ) : (
                <span style={{ color: '#CC3233' }}>You lost.</span>
              )}
            </p>
            {this.ownPlayer === this.p1 ? (
              <p className='endgame__info'>
                <div>New rating: {this.newRatingPlayer1} </div>
                <div>
                  Time left:{' '}
                  {this.pad(this.p1ClockRef.current.state.minutes) +
                    ':' +
                    this.pad(this.p1ClockRef.current.state.seconds)}{' '}
                </div>
                <div>
                  Game score:{' '}
                  {
                    this.state.history[this.state.round].gameState.points[
                      this.p1.props.name
                    ]
                  }
                </div>
              </p>
            ) : (
              <p className='endgame__info'>
                <div>New rating: {this.newRatingPlayer2} </div>
                <div>
                  Time left:{' '}
                  {this.pad(this.p2ClockRef.current.state.minutes) +
                    ':' +
                    this.pad(this.p2ClockRef.current.state.seconds)}
                </div>
                <div>
                  Game score:{' '}
                  {
                    this.state.history[this.state.round].gameState.points[
                      this.p2.props.name
                    ]
                  }
                </div>
              </p>
            )}
            <div className='button'>
              <Button
                type='primary'
                style={{
                  marginTop: '15px',
                }}
                onClick={() => {
                  history.push('/');
                  window.location.reload();
                }}
              >
                Back to Waiting Room
              </Button>
            </div>
          </div>
        </div>
      );
  };

  /**
   * resize handler
   */
  onResize = () => {
    let newSize = this.getNewCanvasSize();
    this.setState({ canvasSize: newSize });
  };

  /**
   * Player and current game information
   */
  displayInfo = () => {
    return (
      <div
        style={{
          display: 'flex',
          alignContent: 'space-between',
          width: '100%',
        }}
      >
        {this.playerInfo(this.p1)}
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

  /**
   * equals function for arrays
   */
  arrequals = function (array1, array2) {
    // if the other array is a falsy value, return
    if (!array2) return false;

    // compare lengths - can save a lot of time
    if (array1.length !== array2.length) return false;

    for (var i = 0, l = array1.length; i < l; i++) {
      // Check if we have nested arrays
      if (array1[i] instanceof Array && array2[i] instanceof Array) {
        // recurse into the nested arrays
        if (!array1[i].equals(array2[i])) return false;
      } else if (array1[i] !== array2[i]) {
        // Warning - two different object instances will never be equal: {x:20} != {x:20}
        return false;
      }
    }
    return true;
  };

  render() {
    if (this.state.loading) return null;
    if (!this.state.playersConnected)
      return <div>Waiting for players to be connected...</div>;
    return (
      <React.Fragment>
        <Prompt
          when={this.state.winner === null}
          message='Warning: You lose when leaving the game!'
        />
        <div className='gameView'>
          <div className='gamewindow-header'>
            <div style={{ padding: '5px' }}>
              <img
                src={process.env.PUBLIC_URL + '/ReactGo.png'}
                alt='React_Go'
              />
              ReactGo
            </div>
          </div>
          {this.renderContentView()}
          {this.gameEnded(this.p1)}
        </div>
      </React.Fragment>
    );
  }
}

export default GameWindow;
