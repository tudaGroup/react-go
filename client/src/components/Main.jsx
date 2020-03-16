import React, { useState, useEffect } from 'react';
import history from '../history';
import api from '../api';
import socketIOClient from 'socket.io-client';
import {
  Button,
  Col,
  InputNumber,
  Menu,
  Modal,
  Radio,
  Row,
  Select,
  Slider
} from 'antd';
import {
  ClockCircleOutlined,
  DingdingOutlined,
  PoweroffOutlined,
  SettingOutlined,
  TrophyOutlined,
  UpCircleOutlined,
  UserOutlined
} from '@ant-design/icons';
const { Option } = Select;

let socket;

const Main = () => {
  const [username, setUsername] = useState(''); // Username of the user logged in
  const [userId, setUserId] = useState(''); // Id of user logged in
  const [rating, setRating] = useState(''); // Rating of the user logged in
  const [modalVisible, setModalVisible] = useState(false); // Visibility of the modal to create a game
  const [selectedBoardSize, setSelectedBoardSize] = useState(9); // 9x9, 13x13, 19x19
  const [selectedTime, setSelectedTime] = useState(1); // Time limit for each player between 5 - 40 min
  const [selectedIncrement, setSelectedIncrement] = useState(0); // Increment for each move between 0 - 40s
  const [selectedGameMode, setSelectedGameMode] = useState('casual'); // rated or casual games
  const [challenges, setChallenges] = useState([]); // Objects with name, id, rating, size, time, increment, mode

  useEffect(() => {
    const token = localStorage.getItem('jwt');
    // Redirect to login page if user is without token
    if (token === null) {
      history.push('/login');
      window.location.reload();
    }
    // Make a request for profile information
    api
      .get('users/me', {
        headers: {
          Authorization: 'Bearer ' + token
        }
      })
      .then(res => {
        setUserId(res.data._id);
        setUsername(res.data.username);
        setRating(res.data.ratings[res.data.ratings.length - 1].rating);
        socket = socketIOClient('http://localhost:8000');
        socket.on('challenges', data => {
          // Receive open challenges
          console.log(data);
          setChallenges(data);
        });
      });
  }, []);

  const handleLogout = () => {
    // Delete token in local storage and redirect to login
    localStorage.removeItem('jwt');
    history.push('/login');
    window.location.reload();
  };

  const showModal = e => {
    e.preventDefault();
    setModalVisible(true);
  };

  const handleModalOk = e => {
    setModalVisible(false);
    let challenge = {
      name: username,
      id: userId,
      rating: rating,
      size: selectedBoardSize,
      time: selectedTime,
      increment: selectedIncrement,
      mode: selectedGameMode
    };
    // send new challenge to server
    setChallenges([...challenges, challenge]);
    socket.emit('createChallenge', [...challenges, challenge]);
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

  if (!username) {
    return (
      <div
        style={{
          position: 'absolute',
          top: 0,
          backgroundColor: '#151515',
          width: '100%',
          height: '100%',
          color: 'white'
        }}
      ></div>
    );
  }

  return (
    <div className='main'>
      <div id='menu'>
        <span className='menu__item'>
          <UserOutlined /> {username}
        </span>
        <span className='menu__item'>
          <SettingOutlined /> Preferences
        </span>
        <span className='menu__item' onClick={handleLogout}>
          <PoweroffOutlined /> Sign out
        </span>
      </div>

      <div id='challenge__box'>
        {challenges.map(({ name, rating, size, time, increment, mode }) => (
          <div className='challenge__items'>
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
        <div id='challenge_create'>
          <Button
            type='primary'
            style={{
              textTransform: 'uppercase',
              marginTop: '15px'
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
