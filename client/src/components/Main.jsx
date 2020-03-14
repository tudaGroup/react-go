import React, { useState, useEffect } from 'react';
import history from '../history';
import api from '../api';
import socketIOClient from 'socket.io-client';
import {
  Modal,
  Button,
  Select,
  Slider,
  InputNumber,
  Row,
  Col,
  Radio
} from 'antd';
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

  const handleSelect = value => {
    setSelectedBoardSize(parseInt(value));
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
    <div
      style={{
        position: 'absolute',
        top: 0,
        backgroundColor: '#151515',
        width: '100%',
        height: '100%',
        color: 'white'
      }}
    >
      <div style={{ textDecoration: 'underline' }}>Logged in as</div>
      <div>Username: {username}</div>
      <div>User-ID: {userId}</div>
      <div>Rating: {rating}</div>
      <Button onClick={handleLogout}>Logout</Button>

      <div style={{ marginTop: '40px' }}>
        <Button type='primary' onClick={showModal}>
          CREATE A GAME
        </Button>
        <Modal
          title='Create a game'
          visible={modalVisible}
          onOk={handleModalOk}
          onCancel={handleModalCancel}
        >
          <Row>
            <Col span={4}>Board Size</Col>
            <Col span={12}>
              <Select
                defaultValue='9'
                style={{ width: 150 }}
                onChange={handleSelect}
              >
                <Option value='9'>Small (9x9)</Option>
                <Option value='13'>Medium (13x13)</Option>
                <Option value='19'>Large (19x19)</Option>
              </Select>
            </Col>
          </Row>
          <Row>
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
          <Row>
            <Col span={4}>Increment</Col>
            <Col span={8}>
              <Slider
                min={0}
                max={40}
                onChange={handleIncrementSlider}
                value={
                  typeof selectedIncrement === 'number' ? selectedIncrement : 0
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
          <Row>
            <Radio.Group
              value={selectedGameMode}
              onChange={handleGameModeChange}
            >
              <Radio.Button value='casual'>Casual</Radio.Button>
              <Radio.Button value='rated'>Rated</Radio.Button>
            </Radio.Group>
          </Row>
        </Modal>
      </div>
      <div style={{ marginTop: '30px' }}>
        <div style={{ textDecoration: 'underline' }}>Challenges</div>
        {challenges.map(({ name, id, rating, size, time, increment, mode }) => (
          <div style={{ margin: '10px', border: '1px solid white' }}>
            Name: {name} | Rating: {rating} | Mode: {mode} | Size: {size} |
            Time: {time}
            min | Increment: {increment}s
          </div>
        ))}
      </div>
    </div>
  );
};

export default Main;
