import React, { Component } from 'react';
import { Button } from 'antd';

/**
 * this.props.socket        {Socket.io}                                 - socket over which chat communicates
 * this.props.user          {String}                                    - username of chatter
 * this.props.roomName      {String}                                    - room name of chat room in socket.io
 * this.props.customButtons {[label: String, onClick: onClickHandeler]} - custom Buttons can be added in a list
 */
class Chat extends Component {
  constructor(props) {
    super(props);
    console.log(this.props.socket);
    this.socket = this.props.socket;
    this.socket.on('chat', this.onChatMsg);

    this.state = {
      stringbuffer: '',
      chatbuffer: [],
    };
  }

  onChatMsg = (msg) => {
    let newBuffer = this.state.chatbuffer.slice();
    newBuffer.push(msg);
    this.setState({ chatbuffer: newBuffer });
  };

  /**
   * formats and sends message over socket {data: {user: #username of the sending person, msg: #message to be sent}, room: #room name of current gameWindow}
   */
  sendMessage = () => {
    console.log(this.props.socket);
    if (this.state.stringbuffer.length > 0)
      this.socket.emit('chat', {
        data: { user: this.props.user, msg: this.state.stringbuffer },
        room: this.props.roomName,
      });
    this.setState({ stringbuffer: '' });
  };

  displayMsg = (msg) => {
    return (
      <div>
        <p className='chat__message'>
          <div className='chat__message__user'>{msg.user}</div>
          <div>{msg.msg}</div>
        </p>
      </div>
    );
  };

  /**
   * handles a key press while chat input is focused
   */
  handleInputKP = (e) => {
    if (e.key === 'Enter') {
      this.sendMessage();
    }
  };

  render() {
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
          padding: '20px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexGrow: 1,
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
            borderRadius: '10px',
            height: '100%',
          }}
        >
          <div
            style={{
              backgroundColor: '#433E3C',
              height: '240px',
              width: '100%',
              marginBottom: '0',
              fontSize: '15px',
              color: 'white',
              padding: '12px',
              overflow: 'scroll',
            }}
          >
            {this.state.chatbuffer.map((msg) => {
              return this.displayMsg(msg);
            })}
          </div>
          <div
            style={{
              display: 'flex',
              backgroundColor: 'grey',
              height: '15%',
              width: '100%',
              padding: '5px',
            }}
          >
            <input
              className='chatInput'
              value={this.state.stringbuffer}
              onChange={(e) => this.setState({ stringbuffer: e.target.value })}
              onKeyPress={(e) => this.handleInputKP(e)}
            />
            {this.props.customButtons
              ? this.props.customButtons.map((customButton) => {
                  return (
                    <button
                      key={customButton.label}
                      className='chatboxbutton'
                      style={{ backgroundColor: '#34e346' }}
                      onClick={customButton.onClick}
                    >
                      {customButton.label}
                    </button>
                  );
                })
              : null}
            <button className='chatboxbutton' onClick={this.sendMessage}>
              <div>Send</div>
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default Chat;
