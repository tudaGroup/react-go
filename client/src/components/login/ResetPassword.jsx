import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button, Card, Input } from 'antd';
import api from '../../api';
import history from '../../history';

export default class ResetPassword extends Component {
  constructor() {
    super();

    this.state = {
      username: '',
      password: '',
      passwordcheck: '',
      updated: false,
      servererror: false,
      isLoading: true,
      servererrormsg: '',
      error: '',
    };
  }

  /**
   * when component is mount, make a get request to get username
   */
  async componentDidMount() {
    const {
      match: {
        params: { token },
      },
    } = this.props;
    try {
      const response = await api
        .get(`/users/resetpassword/${token}`)
        .catch((err) => {
          console.log(err.stack);
        });
      if (response.status === 201) {
        this.setState({
          username: response.data.username,
          isLoading: false,
        });
      } else {
        throw response.data;
      }
    } catch (err) {
      console.log(err);
      this.setState({
        isLoading: false,
        servererror: true,
        servererrormsg:
          'Reset Token is invalid. Try again by requesting another password reset.',
      });
    }
  }

  handleChange = (name) => (event) => {
    this.setState({
      [name]: event.target.value,
    });
  };

  updatePassword() {
    const {
      match: {
        params: { token },
      },
    } = this.props;
    if (this.state.password.length < 7) {
      this.setState({ error: 'Password must be at least 7 characters long.' });
      setTimeout(() => this.setState({ error: '' }), 4000);
      return;
    }
    if (this.state.password !== this.state.passwordcheck) {
      this.setState({ error: "Passwords don't match!" });
      setTimeout(() => this.setState({ error: '' }), 4000);
      return;
    }
    api
      .patch('/users/resetpassword', {
        username: this.state.username,
        password: this.state.password,
      },{
        headers: {
          Authorization: 'Bearer ' + token,
        }
      })
      .then((res) => {
        if (res.status === 201) {
          this.setState({ updated: true });
        } else {
          this.setState({
            servererror: true,
            servererrormsg:
              'Invalid Token. Try again by requesting another password reset!',
          });
        }
      })
      .catch((err) => {
        console.log(err.stack);
      });
  }

  returnToLogin() {
    history.push('/');
  }

  handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      this.updatePassword();
    }
  };

  render() {
    if (this.state.isLoading) {
      return (
        <div className='entry'>
          <Card>
            <h1 className='entry__title'>Loading</h1>
            <p className='entry__message'>
              Please wait while the server is processing your request.
            </p>
          </Card>
        </div>
      );
    }
    if (this.state.servererror) {
      return (
        <div className='entry'>
          <Card>
            <h2 className='entry__title'>Something went wrong!</h2>
            <p style={{ fontSize: 'medium' }}>{this.state.servererrormsg}</p>
            <Button
              type='primary'
              className='entry__button'
              onClick={() => this.returnToLogin()}
            >
              Return to login Page
            </Button>
          </Card>
        </div>
      );
    }
    if (this.state.updated) {
      return (
        <div className='entry'>
          <Card>
            <h2 className='entry__title'>Password Updated!</h2>
            <Button
              type='primary'
              className='entry__button'
              onClick={() => this.returnToLogin()}
            >
              Return to login Page
            </Button>
          </Card>
        </div>
      );
    }
    return (
      <div className='entry'>
        <Card>
          <h1 className='entry__title'>Password Reset</h1>
          <p className='entry__error'>{this.state.error}</p>
          <div className='entry__input'>
            New Password
            <Input.Password
              value={this.state.password}
              onChange={this.handleChange('password')}
              onKeyPress={this.handleKeyPress}
            />
          </div>
          <div className='entry__input'>
            Reenter new Password
            <Input.Password
              value={this.state.passwordcheck}
              onChange={this.handleChange('passwordcheck')}
              onKeyPress={this.handleKeyPress}
            />
          </div>
          <Button
            type='primary'
            className='entry__button'
            onClick={() => this.updatePassword()}
          >
            Change password
          </Button>
        </Card>
      </div>
    );
  }
}

ResetPassword.propTypes = {
  match: PropTypes.shape({
    params: PropTypes.shape({
      token: PropTypes.string.isRequired,
    }),
  }),
};
