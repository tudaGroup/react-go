import React from 'react';
import Main from './Main';
import Login from './Login';
import Register from './Register';
import PasswordReset from './PasswordReset';
import history from '../history';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';
import Particles from 'react-particles-js';
import './style.css';
import { Game, Player } from './BoardComponents';

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
    <Game boardSize={6} player1={<Player name={"p1"} playerColor={444444}/>} player2={<Player name={"p2"} playerColor={'#eeeeee'}/>}></Game>
  )
  /*
  return (
    <Router history={history}>
      <Particles
        className='particles'
        height='100%'
        params={particlesOptions}
      />
      <Switch>
        <Route path='/register' component={Register} />
        <Route path='/reset' component={PasswordReset} />
        <Route path='/login' component={Login} />
        <Route path='/' component={Main} />
      </Switch>
    </Router>
  );
  */
};

export default App;
