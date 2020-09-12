import React, { useState, useEffect } from "react";
import Stomp from "stompjs";
import SockJS from "sockjs-client";

const Chat = ({ user, player1, player2, customButtons }) => {
  const [inputText, setInputText] = useState("");
  const [chat, setChat] = useState([]);
  let socket = Stomp.over(new SockJS("http://localhost:8080/ws"));
  useEffect(() => {
    socket.connect({}, () => {
      socket.subscribe(`/topic/chat/${player1}/${player2}`, frame => {
        let message = JSON.parse(frame.body);
        setChat([...chat, message]);
      });
    });
  }, [chat]);

  const sendMessage = () => {
    if (inputText.length > 0) {
      socket.send(
        `/app/chat/${player1}/${player2}`,
        {},
        JSON.stringify({ user, text: inputText })
      );
      setInputText("");
    }
  };

  const displayMessage = message => {
    return (
      <div>
        <p className="chat__message">
          <div className="chat__message__user">{message.user}</div>
          <div>{message.text}</div>
        </p>
      </div>
    );
  };

  const handleEnter = e => {
    if (e.key === "Enter") {
      sendMessage();
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexGrow: 1,
        flexShrink: "1",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        margin: "20px",
        minHeight: "300px",
        height: "fit-content",
        overflow: "hidden",
        scrollbarWidth: "none" /* Firefox */,
        padding: "20px"
      }}
    >
      <div className="chatbox">
        <div className="chatbox__messagelist">
          {chat.map(message => {
            return displayMessage(message);
          })}
        </div>
        <div className="chatbox__panel">
          <input
            className="chatbox__input"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyPress={handleEnter}
          />
          {customButtons
            ? customButtons.map(customButton => {
                return (
                  <button
                    key={customButton.label}
                    className="chatbox__button"
                    style={{ backgroundColor: "#34e346" }}
                    onClick={customButton.onClick}
                  >
                    {customButton.label}
                  </button>
                );
              })
            : null}
          <button className="chatbox__button" onClick={sendMessage}>
            <div>Send</div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
