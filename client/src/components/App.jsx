import React from 'react';
import Main from './Main';
import Login from './Login';
import Register from './Register';
import PasswordResetRequest from './PasswordResetRequest';
import history from '../history';
import { Router, Switch, Route } from 'react-router-dom';
import Particles from 'react-particles-js';
import './style.css';
import ResetPassword from './ResetPassword';

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

const App = () => {
  return (
    <Router history={history}>
      <Particles
        className='particles'
        height='100%'
        params={particlesOptions}
      />
      <Switch>
        <Route path='/resetpassword/:token' component={ResetPassword} />
        <Route path='/register' component={Register} />
        <Route path='/pwresetreq' component={PasswordResetRequest} />
        <Route path='/login' component={Login} />
        <Route exact path='/' component={Main} />
      </Switch>
      {/* <Game boardSize={19} player1={<Player name={"Player 1"} playerColor={"#453f3f"}/>} player2={<Player name={"Player 2"} playerColor={"#f7f7f7"}/>}/>*/}
    </Router>
  );
};

export default App;
