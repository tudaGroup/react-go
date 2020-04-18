import React, { useState, useEffect } from 'react';
import history from '../../history';
import api from '../../api';
import { CheckOutlined } from '@ant-design/icons';
import { Button, Input, Select, Row, Col } from 'antd';
const { Option } = Select;
const { TextArea } = Input;

const Settings = () => {
  const [country, setCountry] = useState('Germany');
  const [location, setLocation] = useState('');
  const [biography, setBiography] = useState('');
  const [givenName, setGivenName] = useState('');
  const [surName, setSurName] = useState('');
  const [authToken, setAuthToken] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('jwt');
    setAuthToken(token);

    // Redirect to login page if user is without token
    if (token === null) {
      history.push('/login');
    }

    // Set input defaults
    api
      .get('users/me', {
        headers: {
          Authorization: 'Bearer ' + token,
        },
      })
      .then((result) => {
        const user = result.data.user;
        if (user.country) {
          setCountry(user.country);
        }
        if (user.location) {
          setLocation(user.location);
        }
        if (user.biography) {
          setBiography(user.biography);
        }
        if (user.givenName) {
          setGivenName(user.givenName);
        }
        if (user.surName) {
          setSurName(user.surName);
        }
      });
  }, []);

  const handleSubmit = () => {
    // Update profile information
    api
      .patch(
        'users/me',
        { country, givenName, surName, biography, location },
        {
          headers: {
            Authorization: 'Bearer ' + authToken,
          },
        }
      )
      .then(() => {
        history.push('/');
      });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className='main'>
      <div className='container'>
        <Row gutter={[40, 40]}>
          <Col span={24}>
            <div className='edit__title'>Edit Profile</div>
          </Col>
        </Row>
        <Row gutter={[40, 40]}>
          <Col span={12}>
            <div className='edit__label'>Country</div>
            <Select
              defaultValue={country}
              onChange={(value) => setCountry(value)}
              style={{ width: '50%' }}
            >
              <Option value='Germany'>Germany</Option>
              <Option value='USA'>USA</Option>
              <Option value='Korea'>Korea</Option>
              <Option value='Taiwan'>Taiwan</Option>
              <Option value='Sweden'>Sweden</Option>
              <Option value='France'>France</Option>
            </Select>
          </Col>
          <Col span={12}>
            <div className='edit__label'>Location</div>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onKeyPress={(e) => handleKeyPress(e)}
            />
          </Col>
        </Row>
        <Row gutter={[40, 40]}>
          <Col span={24}>
            <div className='edit__label'>Biography</div>
            <TextArea
              value={biography}
              onChange={(e) => setBiography(e.target.value)}
              rows={4}
              onKeyPress={(e) => handleKeyPress(e)}
            />
          </Col>
        </Row>
        <Row gutter={[40, 40]}>
          <Col span={12}>
            <div className='edit__label'>Given Name</div>
            <Input
              value={givenName}
              onChange={(e) => setGivenName(e.target.value)}
              onKeyPress={(e) => handleKeyPress(e)}
            />
          </Col>
          <Col span={12}>
            <div className='edit__label'>Last name</div>
            <Input
              value={surName}
              onChange={(e) => setSurName(e.target.value)}
              onKeyPress={(e) => handleKeyPress(e)}
            />
          </Col>
        </Row>
        <Row justify='end'>
          <Col>
            <Button type='primary' size='large' onClick={handleSubmit}>
              <CheckOutlined /> Submit
            </Button>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default Settings;
