import React from 'react';
import Main from './Main';
import Login from './login/Login';
import Register from './login/Register';
import GameWindow from './board/GameWindow';
import PasswordResetRequest from './login/PasswordResetRequest';
import Profile from './profile/Profile';
import Settings from './profile/Settings';
import NotFound from './profile/NotFound';
import EasterEgg from './EasterEgg';
import history from '../history';
import { Router, Switch, Route } from 'react-router-dom';
import Particles from 'react-particles-js';
import './style.css';
import ResetPassword from './login/ResetPassword';

const particlesOptions = {
  particles: {
    number: {
      value: 80,
      density: {
        enable: true,
        value_area: 800,
      },
    },
  },
};

const App = () => {
  return (
    <Router history={history}>
      <Particles
        style={{ position: 'fixed', width: '100%', height: '100%' }}
        params={particlesOptions}
      />
      <Switch>
        <Route path='/resetpassword/:token' component={ResetPassword} />
        <Route path='/register' component={Register} />
        <Route path='/pwresetreq' component={PasswordResetRequest} />
        <Route path='/login' component={Login} />
        <Route path='/game' component={GameWindow} />
        <Route path='/profile/:id' component={Profile} />
        <Route path='/settings' component={Settings} />
        <Route path='/notfound' component={NotFound} />
        <Route path='/easteregg' component={EasterEgg} />
        <Route exact path='/' component={Main} />
      </Switch>
    </Router>
  );
};

export default App;
