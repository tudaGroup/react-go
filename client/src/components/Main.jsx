import React, { useState, useEffect } from 'react';
import history from '../history';
import api from '../api';
import socketIOClient from 'socket.io-client';
import {
  Button,
  Col,
  InputNumber,
  Modal,
  Radio,
  Row,
  Slider,
  Input,
} from 'antd';
import {
  ClockCircleOutlined,
  DingdingOutlined,
  PoweroffOutlined,
  SearchOutlined,
  SettingOutlined,
  TrophyOutlined,
  UpCircleOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';

let socket;

const Main = () => {
  const [username, setUsername] = useState(''); // Username of the user logged in
  const [userId, setUserId] = useState(''); // Id of user logged in
  const [ownRating, setOwnRating] = useState(''); // Rating of the user logged in
  const [modalVisible, setModalVisible] = useState(false); // Visibility of the modal to create a game
  const [selectedBoardSize, setSelectedBoardSize] = useState(9); // 9x9, 13x13, 19x19
  const [selectedTime, setSelectedTime] = useState(5); // Time limit for each player between 5 - 40 min
  const [selectedIncrement, setSelectedIncrement] = useState(0); // Increment for each move between 0 - 40s
  const [selectedGameMode, setSelectedGameMode] = useState('casual'); // rated or casual games
  const [challenges, setChallenges] = useState([]); // Objects with name, id, rating, size, time, increment, mode
  const [authToken, setAuthToken] = useState('');
  const [searchHidden, setSearchHidden] = useState(true);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('jwt');
    setAuthToken(token);

    // Redirect to login page if user is without token
    if (token === null) {
      history.push('/login');
    }
    // Make a request for profile information
    api
      .get('users/me', {
        headers: {
          Authorization: 'Bearer ' + token,
        },
      })
      .then((res) => {
        const user = res.data.user;
        const ratings = res.data.ratings;

        setUserId(user._id);
        setUsername(user.username);
        setOwnRating(ratings[0].rating);

        localStorage.setItem('username', user.username);
        socket = socketIOClient('http://localhost:8000');

        // submit username to server
        socket.emit('online', user.username);
        socket.on('challenges', (data) => {
          // Receive open challenges
          setChallenges(data);
        });
        // Get Notified that challenge got accepted
        socket.on('acceptChallenge', (data) => {
          // If the accepted challenge was the current user's challenge
          if (data.createdChallenge === res.data.username) {
            alert(data.acceptedChallenge + ' has accepted your challenge!');
          }
          // Redirect to game page
          history.push(
            `/game?player1=${data.createdChallenge}&player2=${data.acceptedChallenge}`
          );
        });
      })
      .catch((e) => {
        console.log(e);
        history.push('/login');
      });
  }, []);

  const handleLogout = () => {
    // Delete all open challenges
    socket.emit('logout');

    // Delete token in local storage and redirect to login
    localStorage.removeItem('jwt');
    localStorage.removeItem('username');
    history.push('/login');
  };

  const showModal = (e) => {
    e.preventDefault();
    setModalVisible(true);
  };

  const handleModalOk = (e) => {
    setModalVisible(false);
    let challenge = {
      name: username,
      id: userId,
      rating: ownRating,
      size: selectedBoardSize,
      time: selectedTime,
      increment: selectedIncrement,
      mode: selectedGameMode,
    };

    // Delete old created challenge if there is any
    let filteredChallenges = challenges.filter(
      (challenge) => challenge.name !== username
    );

    // Send new challenge to server
    setChallenges([...filteredChallenges, challenge]);
    socket.emit('updateChallenges', [...filteredChallenges, challenge]);
  };

  const handleModalCancel = (e) => {
    setModalVisible(false);
  };

  const handleBoardSizeSelect = (e) => {
    setSelectedBoardSize(e.target.value);
  };

  const handleTimeSlider = (value) => {
    setSelectedTime(value);
  };

  const handleIncrementSlider = (value) => {
    setSelectedIncrement(value);
  };

  const handleGameModeChange = (e) => {
    setSelectedGameMode(e.target.value);
  };

  const handleChallengeClick = async (
    name,
    id,
    rating,
    size,
    time,
    increment,
    mode
  ) => {
    // Remove clicked challenge from state and update server
    let filteredChallenges = challenges.filter(
      (challenge) => challenge.name !== name
    );
    setChallenges(filteredChallenges);
    socket.emit('updateChallenges', filteredChallenges);

    // If clicked by a user who did not create the challenge
    if (username !== name) {
      socket.emit('acceptChallenge', {
        createdChallenge: name,
        acceptedChallenge: username,
      });

      // Save game to the database
      await api.post(
        '/games',
        {
          player1: name,
          player2: username,
          time: time,
          timeIncrement: increment,
          size: size,
          rated: mode === 'rated',
          oldRatingPlayer1: rating,
          oldRatingPlayer2: ownRating,
          timestamp: new Date(),
        },
        {
          headers: {
            Authorization: 'Bearer ' + authToken,
          },
        }
      );

      // Redirect to game page
      history.push(`/game?player1=${name}&player2=${username}`);
    }
  };

  if (!username) {
    return <div className='main'></div>;
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      history.push(`/profile/${searchText}`);
    }
  };

  return (
    <div className='main'>
      <div id='menu'>
        <span className='profile__searchicon'>
          <SearchOutlined onClick={() => setSearchHidden(!searchHidden)} />
        </span>
        {searchHidden ? null : (
          <Input
            placeholder='Search'
            className='profile__searchfield'
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyPress={(e) => handleKeyPress(e)}
          />
        )}
        <Link to={{ pathname: `/profile/${username}` }}>
          <span className='menu__item'>
            <UserOutlined /> {username}
          </span>
        </Link>
        <Link to='/settings'>
          <span className='menu__item'>
            <SettingOutlined /> Settings
          </span>
        </Link>
        <span className='menu__item' onClick={handleLogout}>
          <PoweroffOutlined /> Sign out
        </span>
      </div>

      <div id='challenge__box'>
        {challenges.map(({ name, id, rating, size, time, increment, mode }) => (
          <div
            className='challenge__items'
            onClick={() =>
              handleChallengeClick(
                name,
                id,
                rating,
                size,
                time,
                increment,
                mode
              )
            }
          >
            <Row justify='space-around'>
              <Col>{name}</Col>
              <Col>
                <TrophyOutlined /> {rating}
              </Col>
              <Col>
                <UpCircleOutlined /> {size}x{size}
              </Col>
              <Col>
                <ClockCircleOutlined /> {time}+{increment}
              </Col>
              <Col>
                <DingdingOutlined /> {mode}
              </Col>
            </Row>
          </div>
        ))}
        <div className='button'>
          <Button
            type='primary'
            style={{
              textTransform: 'uppercase',
              marginTop: '15px',
            }}
            onClick={showModal}
          >
            Create a game
          </Button>
          <Modal
            title='Create a game'
            visible={modalVisible}
            onOk={handleModalOk}
            onCancel={handleModalCancel}
          >
            <Row gutter={[0, 20]} justify='space-around'>
              <Col span={4}>Time Limit</Col>
              <Col span={8}>
                <Slider
                  min={5}
                  max={40}
                  onChange={handleTimeSlider}
                  value={typeof selectedTime === 'number' ? selectedTime : 5}
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
            <Row gutter={[0, 20]} justify='space-around'>
              <Col span={4}>Increment</Col>
              <Col span={8}>
                <Slider
                  min={0}
                  max={40}
                  onChange={handleIncrementSlider}
                  value={
                    typeof selectedIncrement === 'number'
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
            <Row gutter={[0, 20]} justify='space-around'>
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
            <Row gutter={[0, 20]} justify='space-around'>
              <Col>
                <Radio.Group
                  value={selectedGameMode}
                  onChange={handleGameModeChange}
                >
                  <Radio.Button value='casual'>Casual</Radio.Button>
                  <Radio.Button value='rated'>Rated</Radio.Button>
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
