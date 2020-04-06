import React from 'react';
import jwt_decode from 'jwt-decode';
import history from '../history';
import api from '../api';
import socketIOClient from 'socket.io-client';
import { Game, Player } from './BoardComponents';
import Clock from './Clock';
import { Layout, Row, Col } from 'antd';
import 'antd/dist/antd.css';

const { Header, Content, Footer } = Layout;

const msgType = {
  MOVE: 'MOVE',
  MOVE_ACK: 'MOVE_ACK',
  MOVE_ACK_ACK: 'MOVE_ACK_ACK',
  PASS: 'PASS',
  PASS_ACK: 'PASS_ACK',
  PASS_ACK_ACK: 'PASS_ACK_ACK',
  ERR: 'ERR',
  NULL: 'NULL',
};

const commState = {
  NONE: 'NONE',
  WAITING_MOVE_ACK: 'WAITING_MOVE_ACK',
  WAITING_MOVE_ACK_ACK: 'WAITING_MOVE_ACK_ACK',
  WAITING_PASS_ACK: 'WAITING_PASS_ACK',
  WAITING_PASS_ACK_ACK: 'WAITING_PASS_ACK_ACK',
};

const INFOBOXSYMBOLRATIO = 6;
const INFOBOXWIDTH = 275;
const MARGIN = 20;
const CHATBOXWIDTH = 590;
const CHATBOXHEIGHT = 440;

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
      canvasSize: 300,
      currentPlayer: null,
      loading: true,
      currentState: commState.NONE,
      prevData: { x: NaN, y: NaN },
      boardToScreenRatio: 0.5,
      round: 1,
      viewmode: 0,
      chatbuffer: [],
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

    const gameData = await api.get(
      `/games/active?player1=${pl1}&player2=${pl2}`,
      {
        headers: {
          Authorization: 'Bearer ' + this.token,
        },
      }
    );

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

    if (gameData.data.player1won !== undefined) history.push('/');

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
    this.ownPlayer = this.p1.props.name === this.un ? this.p1 : this.p2;
    let canvassize = this.getNewCanvasSize();
    this.game = (
      <Game
        ref={(game) => (this.g = game)}
        boardSize={gameData.data.size}
        player1={this.p1}
        player2={this.p2}
        ownPlayer={this.ownPlayer}
        boardHW={canvassize}
        broadcast={this.broadcastMove.bind(this)}
        err={this.err}
        pass={this.pass}
        multi={true}
      />
    );

    window.addEventListener('resize', this.onResize);
    this.socket.on('game', this.onMessage);
    this.setState({
      loading: false,
      currentPlayer: this.p1,
      canvasSize: canvassize,
      time: gameData.data.time,
      increment: gameData.data.timeIncrement,
    });
    this.setOptimalViewMode();
  }

  /**
   * Game Communication Handler(See Documentation)
   */
  onMessage = (msg) => {
    if (msg.type === msgType.ERR) {
      // received an error, exit program
      console.log(msg);
      throw Error(msg.errmsg);
    }
    let response = null;
    switch (this.state.currentState) {
      case commState.NONE: // the current player has made no move nor passed
        if (msg.type === msgType.MOVE) {
          this.state.prevData = { x: msg.x, y: msg.y };
          response = {
            message: { type: msgType.MOVE_ACK, ...this.state.prevData },
            room: this.roomName,
          };
          this.setState({ currentState: commState.WAITING_MOVE_ACK_ACK });
        } else if (msg.type === msgType.PASS) {
          response = {
            message: { type: msgType.PASS_ACK },
            room: this.roomName,
          };
          this.setState({ currentState: commState.WAITING_PASS_ACK_ACK });
        }
        break;
      case commState.WAITING_MOVE_ACK: // player has sent a MOVE msg and waits for acknowledgement
        if (msg.type === msgType.MOVE_ACK) {
          if (
            this.state.prevData.x === msg.x &&
            this.state.prevData.y === msg.y
          ) {
            response = {
              message: { type: msgType.MOVE_ACK_ACK, ...this.state.prevData },
              room: this.roomName,
            };
            this.g.processInput(msg.x, msg.y);
            this.setState({
              round: this.state.round + 1,
              currentState: commState.NONE,
              currentPlayer: this.g.getCurrentPlayer(),
            });
          } else {
            let errmsg =
              'Error occured during MOVE_ACK: expected ' +
              this.state.prevData.toString() +
              ' but received ' +
              { x: msg.x, y: msg.y };
            response = {
              message: { type: msgType.ERR, errmsg: errmsg },
              room: this.roomName,
            };
            this.setState({ currentState: commState.NONE });
          }
        }
        break;
      case commState.WAITING_MOVE_ACK_ACK: // player has sent a MOVE_ACK and waits for acknowledgement
        if (msg.type === msgType.MOVE_ACK_ACK) {
          if (
            this.state.prevData.x === msg.x &&
            this.state.prevData.y === msg.y
          ) {
            this.g.processInput(msg.x, msg.y);
            this.setState({
              round: this.state.round + 1,
              currentState: commState.NONE,
              currentPlayer: this.g.getCurrentPlayer(),
            });
          } else {
            let errmsg =
              'Error occured during MOVE_ACK_ACK: expected ' +
              this.state.prevData.toString() +
              ' but received ' +
              { x: msg.x, y: msg.y }.toString();
            response = {
              message: { type: msgType.ERR, errmsg: errmsg },
              room: this.roomName,
            };
            this.setState({ currentState: commState.NONE });
          }
        }
        break;
      case commState.WAITING_PASS_ACK: // player has sent a PASS msg and waits for acknowledgement
        if (msg.type === msgType.PASS_ACK) {
          response = {
            message: { type: msgType.PASS_ACK_ACK },
            room: this.roomName,
          };
          this.g.pass();
          this.setState({
            round: this.state.round + 1,
            currentState: commState.NONE,
            currentPlayer: this.g.getCurrentPlayer(),
          });
        }
        break;
      case commState.WAITING_PASS_ACK_ACK: // player has sent a PASS_ACK msg and waits for acknowledgement
        if (msg.type === msgType.PASS_ACK_ACK) {
          this.g.pass();
          this.setState({
            round: this.state.round + 1,
            currentState: commState.NONE,
            currentPlayer: this.g.getCurrentPlayer(),
          });
        }
    }
    if (response !== null) this.socket.emit('game', response);
  };

  /**
   *
   * @param {Number} x - Integer number of x coordinate of move
   * @param {Number} y - Integer number of y coordinate of move
   */
  broadcastMove = (x, y) => {
    let data = {
      message: { type: msgType.MOVE, x: x, y: y },
      room: this.roomName,
    };
    this.setState({
      currentState: commState.WAITING_MOVE_ACK,
      prevData: { x: x, y: y },
    });
    this.socket.emit('game', data);
  };

  /**
   * passes the move
   */
  pass = () => {
    this.setState({ currentState: commState.WAITING_PASS_ACK });
    this.socket.emit('game', {
      message: { type: msgType.PASS },
      room: this.roomName,
    });
  };

  gameInfo = () => {
    return (
      <div
        className='infobox'
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            borderRadius: '50%',
            border: '0',
            backgroundColor: this.state.currentPlayer
              ? this.state.currentPlayer.props.playerColor
              : 'purple',
            width: '20px',
            height: '20px',
          }}
        ></div>
        <div>Round {this.state.round}</div>
      </div>
    );
  };

  err = (state) => {
    alert('An Error occured on Game Board');
    console.log(state);
  };

  err = (state) => {
    alert('An Error occured on Game Board');
    console.log(state);
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
    return window.innerWidth * this.state.boardToScreenRatio > 400
      ? window.innerWidth * this.state.boardToScreenRatio
      : 400;
  };

  setOptimalViewMode = () => {
    if (
      window.innerWidth -
        (this.state.canvasSize + INFOBOXWIDTH + CHATBOXWIDTH + 6 * MARGIN) >=
      0
    )
      this.setState({ viewmode: 0 });
    else this.setState({ viewmode: 1 });
  };

  contentView = () => {
    if (this.state.viewmode == 0)
      return (
        <div className='gamewindow-contentview'>
          <div className='player-info-box-v'>
            {this.playerInfo(this.p1)}
            {this.playerInfo(this.p2)}
          </div>
          <div className='boardview'>{this.game}</div>
          {this.chatbox()}
        </div>
      );
    else
      return (
        <div className='gamewindow-contentview'>
          <div className='boardview'>{this.game}</div>
          <div
            style={{
              flexGrow: '1',
              flexBasis: 'auto',
              width: CHATBOXWIDTH,
              height: CHATBOXHEIGHT,
              display: 'flex',
              alignContent: 'center',
              alignItems: 'center',
              justifyContent:
                this.state.viewmode === 0 ? 'flex-start' : 'center',
              margin: '20px',
            }}
          >
            {this.chatbox()}
          </div>
          <div className='player-info-box-h'>
            {this.playerInfo(this.p1)}
            {this.playerInfo(this.p2)}
          </div>
        </div>
      );
  };

  chatbox = () => {
    return (
      <div
        style={{
          backgroundColor: 'grey',
          borderRadius: '10px',
          width: CHATBOXWIDTH,
          height: CHATBOXHEIGHT,
        }}
      ></div>
    );
  };

  /**
   * resize handler
   */
  onResize = () => {
    let newSize = this.getNewCanvasSize();
    this.setState({ canvasSize: newSize });
    this.setOptimalViewMode();
    this.g.setCanvasSize(newSize);
  };

  /**
   * Player and current game information
   */
  displayInfo = () => {
    return (
      <div
        style={{ display: 'flex', flexGrow: 1, alignContent: 'space-between' }}
      >
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
    if (this.state.loading) return null;
    return (
      <div className='main'>
        <div className='gamewindow-header'>
          <div style={{ padding: '5px' }}>
            <img src={process.env.PUBLIC_URL + '/ReactGo.png'} />
            ReactGo
            <div
              style={{
                float: 'right',
                width: 400,
                height: 50,
                backgroundColor: 'white',
              }}
            ></div>
          </div>
        </div>
        {this.contentView()}
      </div>
    );
  }
}

export default GameWindow;
