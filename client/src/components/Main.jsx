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

const Main = () => {
  const [username, setUsername] = useState(''); // Username of the user logged in
  const [userId, setUserId] = useState(''); // Id of user logged in
  const [rating, setRating] = useState(''); // Rating of the user logged in
  const [modalVisible, setModalVisible] = useState(false); // Visibility of the modal to create a game
  const [selectedBoardSize, setSelectedBoardSize] = useState(9); // 9x9, 13x13, 19x19
  const [selectedTime, setSelectedTime] = useState(1); // Time limit for each player between 5 - 40 min
  const [selectedIncrement, setSelectedIncrement] = useState(0); // Increment for each move between 0 - 40s
  const [selectedGameMode, setSelectedGameMode] = useState('casual'); // rated or casual games

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
        console.log(res);
        setUserId(res.data._id);
        setUsername(res.data.username);
        setRating(res.data.ratings[res.data.ratings.length - 1].rating);
        const socket = socketIOClient('http://localhost:8000');
        socket.on('greeting', data => console.log(data));
      });
  }, []);

  const handleLogout = () => {
    // Delete token in local storage and redirect to login
    localStorage.removeItem('jwt');
    history.push('/login');
    window.location.reload();
  };

  const showModal = () => {
    setModalVisible(true);
  };

  const handleModalOk = e => {
    setModalVisible(false);
  };

  const handleModalCancel = e => {
    setModalVisible(false);
  };

  const handleSelect = value => {
    console.log(value);
    setSelectedBoardSize(value);
  };

  const handleTimeSlider = value => {
    console.log(value);
    setSelectedTime(value);
  };

  const handleIncrementSlider = value => {
    console.log(value);
    setSelectedIncrement(value);
  };

  const handleGameModeChange = e => {
    console.log(e.target.value);
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
        <div>
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
      </div>
    </div>
  );
};

export default Main;
