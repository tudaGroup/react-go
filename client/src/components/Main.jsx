import React, { useState, useEffect } from "react";
import history from "../history";
import api from "../api";
import Stomp from "stompjs";
import SockJS from "sockjs-client";
import {
  Button,
  Col,
  InputNumber,
  Modal,
  Radio,
  Row,
  Slider,
  Input
} from "antd";
import {
  ClockCircleOutlined,
  DingdingOutlined,
  PoweroffOutlined,
  SearchOutlined,
  SettingOutlined,
  TrophyOutlined,
  UpCircleOutlined,
  UserOutlined
} from "@ant-design/icons";
import { Link } from "react-router-dom";

const Main = () => {
  const [username, setUsername] = useState("");
  const [userId, setUserId] = useState("");
  const [ownRating, setOwnRating] = useState("");
  const [modalVisible, setModalVisible] = useState(false); // Visibility of the modal to create a game
  const [selectedBoardSize, setSelectedBoardSize] = useState(9); // 9x9, 13x13, 19x19
  const [selectedTime, setSelectedTime] = useState(5); // Time limit for each player between 5 - 40 min
  const [selectedIncrement, setSelectedIncrement] = useState(0); // Increment for each move between 0 - 40s
  const [selectedGameMode, setSelectedGameMode] = useState("casual"); // rated or casual games
  const [challenges, setChallenges] = useState([]); // Objects with name, id, rating, size, time, increment, mode
  const [authToken, setAuthToken] = useState("");
  const [searchHidden, setSearchHidden] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [socket, setSocket] = useState(
    Stomp.over(new SockJS("http://localhost:8080/ws"))
  );

  useEffect(() => {
    const token = localStorage.getItem("jwt");
    setAuthToken(token);

    // Redirect to login page if user is without token
    if (token === null) {
      history.push("/login");
    }
    // Make a request for profile information
    api
      .get("users/me", {
        headers: {
          Authorization: "Bearer " + token
        }
      })
      .then(res => {
        const { id, username, ratings } = res.data;
        setUserId(id);
        setUsername(username);
        setOwnRating(ratings[0].rating);

        localStorage.setItem("username", username);

        // Setup STOMP client for messaging
        socket.connect({}, () => {
          // Get list of current challenges
          socket.subscribe("/topic/challenges", frame => {
            setChallenges(JSON.parse(frame.body));
          });

          // Get notified when someone accepts challenge
          socket.subscribe(`/topic/acceptChallenge/${username}`, frame => {
            let challenge = JSON.parse(frame.body);
            history.push(
              `/game?player1=${challenge.creator}&player2=${challenge.opponent}`
            );
          });
          socket.send("/app/connect");
        });

        // Delete own open challenge before leaving the site
        window.addEventListener("beforeunload", () => {
          socket.send("/app/deleteChallenge", {}, username);
        });
      })
      .catch(e => {
        console.log(e);
        history.push("/login");
      });
  }, [socket]);

  const handleLogout = async () => {
    // Delete token in local storage and redirect to login
    localStorage.removeItem("jwt");
    localStorage.removeItem("username");
    await api.get("/users/logout", {
      headers: {
        Authorization: "Bearer " + authToken
      }
    });
    history.push("/login");
  };

  const showModal = e => {
    e.preventDefault();
    setModalVisible(true);
  };

  const handleModalOk = e => {
    setModalVisible(false);
    let challenge = {
      creator: username,
      id: userId,
      rating: ownRating,
      boardSize: selectedBoardSize,
      duration: selectedTime,
      timeIncrement: selectedIncrement,
      mode: selectedGameMode
    };

    socket.send("/app/addChallenge", {}, JSON.stringify(challenge));
  };

  const handleModalCancel = e => {
    setModalVisible(false);
  };

  const handleBoardSizeSelect = e => {
    setSelectedBoardSize(e.target.value);
  };

  const handleTimeSlider = value => {
    setSelectedTime(value);
  };

  const handleIncrementSlider = value => {
    setSelectedIncrement(value);
  };

  const handleGameModeChange = e => {
    setSelectedGameMode(e.target.value);
  };

  const handleChallengeClick = async challenge => {
    socket.send("/app/deleteChallenge", {}, challenge.creator);

    if (username !== challenge.creator) {
      // If user is not the creator of the challenge
      challenge["opponent"] = username; // Set user as opponent for the challenge
      socket.send(
        `/app/acceptChallenge/${challenge.creator}`,
        {},
        JSON.stringify(challenge)
      );

      // Save game to the database
      await api.post(
        "/games",
        {
          player1: challenge.creator,
          player2: challenge.opponent,
          time: challenge.duration,
          timeIncrement: challenge.timeIncrement,
          boardSize: challenge.boardSize,
          rated: challenge.mode === "rated",
          oldRatingPlayer1: challenge.rating,
          oldRatingPlayer2: ownRating,
          timestamp: new Date()
        },
        {
          headers: {
            Authorization: "Bearer " + authToken
          }
        }
      );

      // Redirect to game page
      history.push(
        `/game?player1=${challenge.creator}&player2=${challenge.opponent}`
      );
    }
  };

  if (!username) {
    return <div className="main"></div>;
  }

  const handleKeyPress = e => {
    if (e.key === "Enter") {
      history.push(`/profile/${searchText}`);
    }
  };

  return (
    <div className="main">
      <div id="menu">
        <span className="profile__searchicon">
          <SearchOutlined onClick={() => setSearchHidden(!searchHidden)} />
        </span>
        {searchHidden ? null : (
          <Input
            placeholder="Search"
            className="profile__searchfield"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            onKeyPress={e => handleKeyPress(e)}
          />
        )}
        <Link to={{ pathname: `/profile/${username}` }}>
          <span className="menu__item">
            <UserOutlined /> {username}
          </span>
        </Link>
        <Link to="/settings">
          <span className="menu__item">
            <SettingOutlined /> Settings
          </span>
        </Link>
        <span className="menu__item" onClick={handleLogout}>
          <PoweroffOutlined /> Sign out
        </span>
      </div>

      <div id="challenge__box">
        {challenges.map(challenge => (
          <div
            className="challenge__items"
            key={challenge.id}
            onClick={() => handleChallengeClick(challenge)}
          >
            <Row justify="space-around">
              <Col>{challenge.creator}</Col>
              <Col>
                <TrophyOutlined /> {challenge.rating}
              </Col>
              <Col>
                <UpCircleOutlined /> {challenge.boardSize}x{challenge.boardSize}
              </Col>
              <Col>
                <ClockCircleOutlined /> {challenge.duration}+
                {challenge.timeIncrement}
              </Col>
              <Col>
                <DingdingOutlined /> {challenge.mode}
              </Col>
            </Row>
          </div>
        ))}

        <div className="button">
          <Button
            type="primary"
            style={{
              textTransform: "uppercase",
              marginTop: "15px"
            }}
            onClick={showModal}
          >
            Create a game
          </Button>
          <Modal
            title="Create a game"
            visible={modalVisible}
            onOk={handleModalOk}
            onCancel={handleModalCancel}
          >
            <Row gutter={[0, 20]} justify="space-around">
              <Col span={4}>Time Limit</Col>
              <Col span={8}>
                <Slider
                  min={5}
                  max={40}
                  onChange={handleTimeSlider}
                  value={typeof selectedTime === "number" ? selectedTime : 5}
                />
              </Col>
              <Col span={4}>
                <InputNumber
                  min={5}
                  max={40}
                  style={{ marginLeft: 16 }}
                  value={selectedTime}
                  onChange={handleTimeSlider}
                />
              </Col>
            </Row>
            <Row gutter={[0, 20]} justify="space-around">
              <Col span={4}>Increment</Col>
              <Col span={8}>
                <Slider
                  min={0}
                  max={40}
                  onChange={handleIncrementSlider}
                  value={
                    typeof selectedIncrement === "number"
                      ? selectedIncrement
                      : 0
                  }
                />
              </Col>
              <Col span={4}>
                <InputNumber
                  min={0}
                  max={40}
                  style={{ marginLeft: 16 }}
                  value={selectedIncrement}
                  onChange={handleIncrementSlider}
                />
              </Col>
            </Row>
            <Row gutter={[0, 20]} justify="space-around">
              <Col>
                <Radio.Group
                  value={selectedBoardSize}
                  onChange={handleBoardSizeSelect}
                >
                  <Radio.Button value={9}>Small (9x9)</Radio.Button>
                  <Radio.Button value={13}>Medium (13x13)</Radio.Button>
                  <Radio.Button value={19}>Large (19x19)</Radio.Button>
                </Radio.Group>
              </Col>
            </Row>
            <Row gutter={[0, 20]} justify="space-around">
              <Col>
                <Radio.Group
                  value={selectedGameMode}
                  onChange={handleGameModeChange}
                >
                  <Radio.Button value="casual">Casual</Radio.Button>
                  <Radio.Button value="rated">Rated</Radio.Button>
                </Radio.Group>
              </Col>
            </Row>
          </Modal>
        </div>
      </div>
    </div>
  );
};

export default Main;
