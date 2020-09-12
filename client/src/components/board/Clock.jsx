import React, { Component } from 'react';

export default class Clock extends Component {
  state = {
    minutes: this.props.startTime,
    seconds: 0,
  };

  pad(num) {
    return num < 10 ? '0' + num : num;
  }

  componentDidMount() {
    this.interval = setInterval(() => {
      const { seconds, minutes } = this.state;
      if (this.props.isActive) {
        if (seconds > 0) {
          this.setState({ seconds: seconds - 1 });
        }
        if (seconds === 0) {
          if (minutes === 0) {
            clearInterval(this.interval);
            this.props.onTimeout();
          } else {
            this.setState({ minutes: minutes - 1, seconds: 59 });
          }
        }
      }
    }, 1000);
  }

  componentDidUpdate(prevProps) {
    const { seconds, minutes } = this.state;
    if (prevProps.isActive && !this.props.isActive) {
      const incremented = seconds + this.props.increment;
      if (incremented < 60) {
        this.setState({ seconds: incremented });
      } else {
        this.setState({
          minutes: minutes + 1,
          seconds: incremented % 60,
        });
      }
    }
  }

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  render() {
    const { minutes, seconds } = this.state;
    if (this.props.isActive) {
      return (
        <div style={{ backgroundColor: '#629923', padding: ' 0 15px' }}>
          {this.pad(minutes)}:{this.pad(seconds)}
        </div>
      );
    } else {
      return (
        <div style={{ padding: ' 0 15px' }}>
          {this.pad(minutes)}:{this.pad(seconds)}
        </div>
      );
    }
  }
}
