import React, { useState } from 'react';
import { Layout, Row, Col } from 'antd';

const Clock = (playing, startTime, increment) => {
  const [minutes, setMinutes] = useState(startTime);
  const [seconds, setSeconds] = useState(0);

  const renderTimeDisplay = () => {};
  return <Col>00:00</Col>;
};

export default Clock;
