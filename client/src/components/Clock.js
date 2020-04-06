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
          } else {
            this.setState({ minutes: minutes - 1, seconds: 59 });
          }
        }
      }
    }, 1000);
  }

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  render() {
    const { minutes, seconds } = this.state;

    return (
      <div>
        {this.pad(minutes)}:{this.pad(seconds)}
      </div>
    );
  }
}
