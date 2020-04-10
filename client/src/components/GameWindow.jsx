import React from 'react';
import jwt_decode from 'jwt-decode';
import history from '../history';
import api from '../api';
import socketIOClient from 'socket.io-client';
import { Game, Player } from './BoardComponents';
import { Layout, Row, Col, Button } from 'antd';
import 'antd/dist/antd.css';


const msgType = {
  MOVE:    'MOVE',
  PASS:    'PASS',
  FORFEIT: 'FORFEIT',
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
      canvasSize: 300,
      currentPlayer: null,
      loading: true,
      boardToScreenRatio: 0.85 ,
      round: 1,
      chatbuffer: [],
      stringbuffer: '',
      showEndWindow: false,
      winner: null,
      playersConnected: false,
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

    if(this.gameData.data.player1won !== undefined)
      history.push('/');

    this.p1 = <Player name={this.gameData.data.player1} playerColor={'#383b40'} data={user1.data}/>
    this.p2 = <Player name={this.gameData.data.player2} playerColor={'#f5f9ff'} data={user2.data}/>
    this.un = localStorage.getItem('username');
    this.socket.emit('online', this.un);
    this.socket.emit('joinGame', this.roomName);
    this.ownPlayer = this.p1.props.name === this.un ? this.p1 : this.p2;
    let canvassize = this.getNewCanvasSize();
    this.game  = <Game ref={ game => this.g = game } boardSize={this.gameData.data.size} player1={this.p1} player2={this.p2} ownPlayer={this.ownPlayer} boardHW={canvassize} broadcast={this.broadcastMove.bind(this)} err={this.err} pass={this.pass} multi={true} win={this.onWin}/>;

    window.addEventListener('resize', this.onResize);

    
    this.socket.on('game', this.onGameComm);
    this.socket.on('chat', this.onChatMsg);
    this.socket.on('system', this.onSystemMsg);
    this.setState({ loading: false, currentPlayer: this.p1, canvasSize: canvassize });
  }

  
  onSystemMsg = (msg) => {
    console.log('msg received');
    console.log(msg);
    if (msg.type === 'DISCONNECT') {
      this.socket.emit('chat', { data: { user: 'System', msg: `${msg.user} has disconnected.` }, room: this.roomName });
      this.onDisconnect(msg.user);
    }
    else if (msg.type === 'JOIN')
      this.socket.emit('chat', { data: { user: 'System', msg: `${msg.user} has joined the room.` }, room: this.roomName });
    else if (msg.type === 'CONNECTION_ESTABLISHED')
      this.setState({ playersConnected: true });
  }


  onDisconnect = (user) => {
    let opponent = this.un === this.p1.props.name ? this.p2 : this.p1;
    if (user === opponent.props.name)
      this.g.setImmediateWin(this.g.props.ownPlayer);
  }


  onWin = (winner) => {
    if(winner.props.name !== this.un)
      return;
    
    let player1won = this.un === this.p1.props.name ? true : false;
    let oldRatingPlayer1 = this.p1.props.data.ratings[this.p1.props.data.ratings.length - 1].rating;
    let oldRatingPlayer2 = this.p2.props.data.ratings[this.p2.props.data.ratings.length - 1].rating;
    let player1gainloss;
    let player2gainloss;
    if (player1won) {
      player1gainloss = 5 + 15 * Math.min(oldRatingPlayer2 / (oldRatingPlayer1 + 1), 1);
      player1gainloss = -(5 + 15 * Math.min(oldRatingPlayer2 / (oldRatingPlayer1 + 1), 1));
    }
    else {
      player1gainloss = -(5 + 15 * Math.min(oldRatingPlayer1 / (oldRatingPlayer2 + 1), 1));
      player1gainloss = 5 + 15 * Math.min(oldRatingPlayer1 / (oldRatingPlayer2 + 1), 1);
    }
    api.patch(`/games/${this.gameData._id}`, 
      { 
        newRatingPlayer1 : Math.max(oldRatingPlayer1 + player1gainloss, 0),
        newRatingPlayer2: Math.max(oldRatingPlayer2 + player2gainloss, 0),
        player1won: player1won
      }
    );
    this.setState({ winner: winner, showEndWindow: true })
  }

  
  onChatMsg = (msg) => {
    let newBuffer = this.state.chatbuffer.slice();
    newBuffer.push(msg);
    this.setState({ chatbuffer: newBuffer })
  }

  /**
   * Game Communication Handler(See Documentation)
   */
  onGameComm = msg => {
    console.log(this.g)
    if(msg.sender == this.un)
      return;
    if (msg.type == msgType.MOVE){
      this.g.processInput(msg.x, msg.y);
    } else if (msg.type == msgType.PASS) {
      this.g.pass();
    }
    this.setState({ round: this.state.round + 1, currentPlayer: this.g.getCurrentPlayer() });
  };

   /**
   * 
   * @param {Number} x - Integer number of x coordinate of move  
   * @param {Number} y - Integer number of y coordinate of move
   */
  broadcastMove = (x, y) => {
    let data = { message: { type: msgType.MOVE, x: x, y: y, sender: this.un }, room: this.roomName };
    this.setState({ round: this.state.round + 1, currentPlayer: this.g.getCurrentPlayer() });
    this.socket.emit('game', data);
  };


  /**
   * passes the move
   */
  pass = () => {
    this.socket.emit('game', { message: { type: msgType.PASS, sender: this.un }, room: this.roomName });
    this.socket.emit('chat', { data: { user: 'Game', msg: `${this.un} has passed.(Round ${this.state.round})` }, room: this.roomName })
    console.log(this.g.getCurrentPlayer())
    this.setState({ round: this.state.round + 1, currentPlayer: this.p1 === this.state.currentPlayer ? this.p2 : this.p1 });
  };


  /**
   * handles a key press while chat input is focused
   */
  handleInputKP = (e) => {
    if(e.key === 'Enter') {
      this.sendMessage();
    }
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
   * display game info
   */
  gameInfo = () => {
    return (
      <div className='infobox' style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px' }}>
          <div style={{ borderRadius: '50%', border: '0', backgroundColor: this.state.currentPlayer ? this.state.currentPlayer.props.playerColor : 'purple', width: '20px', height: '20px' }}></div>
          <div>Round {this.state.round}</div>
      </div>
    )
  }

  /**
   * error handler for child components
   */
  err = (state) => {
    alert('An Error occured on Game Board');
    console.log(state);
  }

  
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
    if(!player)
      return null;
    let playerColor = player.props.playerColor;
    return(
        <div className='infobox'>
          <Row type='flex' className="infoboxrow">
            <Col span={INFOBOXSYMBOLRATIO}>
              <div className='infoboxiconcontainer'>
                <div style={{ borderRadius: '50%', border: '0', backgroundColor: playerColor, width: '20px', height: '20px' }}/>
              </div>
            </Col>
            <Col>
              {player.props.name ? player.props.name : 'Undefined'}
            </Col>
          </Row>
          <Row type='flex' className="infoboxrow">
            <Col span={INFOBOXSYMBOLRATIO}>
              <div className='infoboxiconcontainer'>
                {player.props.data.country ? 
                  <div style={{ height: 'min-content', width: 'min-content'}}>
                    {this.renderFlag(player.props.data.country)}
                  </div> 
                  : 
                  <div style={{ backgroundColor: 'white', width: '30px', height: '20px' }}/>
                }
              </div>
            </Col>
            <Col>
              {player.props.data.country ? player.props.data.country : 'Undefined'}
            </Col>
          </Row>
          <Row type='flex' className="infoboxrow">
            <Col span={INFOBOXSYMBOLRATIO} className='infoboxiconcontainer'>
              <div className='infoboxicon'>
                <img src={process.env.PUBLIC_URL + '/rank_sym.png'} className='sicon'/>
              </div>
            </Col>
            <Col>
              {player.props.data.ratings[player.props.data.ratings.length - 1].rating}
            </Col>
          </Row>
          <Row type='flex' className="infoboxrow">
            <Col span={INFOBOXSYMBOLRATIO} className='infoboxiconcontainer'>
              <div className='infoboxicon'>
                <img src={process.env.PUBLIC_URL + '/time_icon.png'} className='sicon'/>
              </div>
            </Col>
            <Col>
                {/** insert time rendering component here */'00:00'}
            </Col>
          </Row>
        </div>
    )
  }


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
          {this.game}
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
          {this.chatbox()}
        </div>
      </div>
    )
  }

  /**
   * renders the chatbox
   */
  chatbox = () => {
    console.log(this.state.chatbuffer); 
    return (
      <div 
        style={{ 
          display: 'flex',
          flexGrow: 1,
          flexShrink: '1',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
          margin: '20px',
          minHeight: '300px',
          height: 'fit-content',
          overflow: 'hidden',
          padding: '20px'
          }
      }>
        <div 
          style={{ 
            display: 'flex',
            flexGrow: 1,
            flexWrap: 'wrap',
            alignItems: 'center',
            width: '100%',
            borderRadius: '10px',
            height: '100%',
            overflow: 'hidden'
          }
        }>
          <div
            style={{ 
              backgroundColor: 'grey', 
              flexBasis: '100%',
              height: '85%',
              width: '100%',
              marginBottom: '0',
              fontSize: '15px',
              color: 'white',
              padding: '12px',
              overflow: 'auto'
          }}>
            {this.state.chatbuffer.map(msg => {
              return (
                this.displayMsg(msg)
              )
            })}
          </div>
          <div 
            style={{ 
              display: 'flex',
              backgroundColor: 'grey',
              height: '15%',
              width: '100%',
              padding: '5px'
          }}>
            <input 
              className='chatInput'
              value={this.state.stringbuffer}
              onChange={e => this.setState({ stringbuffer: e.target.value })}
              onKeyPress={e => this.handleInputKP(e)}
            />
            <Button
              className='chatboxbutton'
              style={{ backgroundColor: '#34e346' }}
              onClick={this.pass}
            >
              <div>Pass</div>
            </Button>
            <Button
              className='chatboxbutton'
              style={{ backgroundColor: '#34e346' }}
            >
              <div>Forfeit</div>
            </Button>
            <Button 
              className='chatboxbutton'
            >
              <div>Send</div>
            </Button>
          </div>
        </div>
      </div>
    )
  }


  displayMsg = (msg) => {
    return(
      <p style={{ minWidth: '100%', width: 0 }}>[{msg.user}]: {msg.msg}</p>
    )
  }


  gameEnded = (player) => {
    let won = this.un === this.state.winner;
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
              color: 'black'
            }}
          >
            <div style={{ width: '100%' }}>
              <button className='close' onClick={e => this.setState({ showEndWindow: false })}>Close</button>
            </div>
            <p style={{ fontSize: '25px' }}>{won ? 'Victory' : 'Defeat'}</p>
            
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
  displayInfo =  () => {
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
  }

  increaseBoardRatio = () => {
    if(this.state.boardToScreenRatio >= 0.9) 
      return;
    this.setState({ boardToScreenRatio: this.state.boardToScreenRatio - 0.1 });
  }

  decreaseBoardRatio = () => {
    if(this.state.boardToScreenRatio <= 0.3) 
      return;
    this.setState({ boardToScreenRatio: this.state.boardToScreenRatio - 0.1 });
  }

  
  render() {
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