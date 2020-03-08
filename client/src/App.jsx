import React from 'react';
import { Game, Player } from './BoardComponents';
import Main from './Main';

import { BrowserRouter as Router, Switch, Route, Link } from 'react-router-dom';
import Particles from 'react-particles-js';
import { Button, Card, Input } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import './App.css';

const particlesOptions = {
  particles: {
    number: {
      value: 80,
      density: {
        enable: true,
        value_area: 800
      }
    }
  }
};

const Login = () => (
  <div className='entry'>
    <Card>
      <h1 className='entry__title'>Sign In</h1>
      <div className='entry__input'>
        User name or email
        <Input />
      </div>
      <div className='entry__input'>
        Password
        <Input.Password />
      </div>
      <Button type='primary' className='entry__button'>
        <Link to='/main'>Sign in</Link>
      </Button>
      <div className='entry__links'>
        <Link to='/register'>Register</Link>
        <Link to='/reset'>Password reset</Link>
      </div>
    </Card>
  </div>
);

const Reset = () => (
  <div className='entry'>
    <Card>
      <h1 className='entry__title'>Password reset</h1>
      <div className='entry__input'>
        Email
        <Input />
      </div>
      <Button type='primary' className='entry__button'>
        <Link to='/main'>
          <CheckOutlined /> Email me a link
        </Link>
      </Button>
    </Card>
  </div>
);

const Register = () => (
  <div className='entry'>
    <Card>
      <h1 className='entry__title'>Register</h1>
      <div className='entry__input'>
        User name
        <Input />
      </div>
      <div className='entry__input'>
        Password
        <Input.Password />
      </div>
      <div className='entry__input'>
        Email
        <Input />
      </div>
      <Button type='primary' className='entry__button'>
        <Link to='/main'>Register</Link>
      </Button>
    </Card>
  </div>
);

const App = () => {
  return (
    <Router>
      <Switch>
        <Route path='/main'>
          <Game boardSize={9} player1={<Player name={'p1'} playerColor={'#444444'}/>} player2={<Player name={'p2'} playerColor={'#eeeeee'}/>}/>
        </Route>

        <Route path='/register'>
          <Particles
            className='particles'
            height='100%'
            params={particlesOptions}
          />
          <Register />
        </Route>

        <Route path='/reset'>
          <Particles
            className='particles'
            height='100%'
            params={particlesOptions}
          />
          <Reset />
        </Route>

        <Route path='/'>
          <Particles
            className='particles'
            height='100%'
            params={particlesOptions}
          />
          <Login />
        </Route>
      </Switch>
    </Router>
  );
};

export default App;
