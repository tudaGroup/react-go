import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import Konva from 'konva';
import { render } from 'react-dom';
import { Stage, Layer, Rect, Text, Circle, Line, Group } from 'react-konva';

/**
 * actual game mechanics and rules
 */
class Game extends Component {
  constructor(props) {
    super(props);
    this.state = {
      history:[
        {
          field: new Array(this.props.boardSize * this.props.boardSize).fill(null)
        }
      ],
      round: 0,
      player1: true
    }
  }

  handleInput(x, y) {
    const history = this.state.history.slice(0, this.state.round + 1);
    const current = history[history.length - 1];
    const fields = current.field.slice();

    fields[y * this.props.boardSize + x] = this.state.player1;
    this.setState({
      history: history.concat([
        {field: fields}
      ]),
      round: history.length,
      player1: !this.state.player1
    });
  }

  render() {
    const history = this.state.history;
    const current = history[this.state.round];

    return (
      <Board
        boardSize={this.props.boardSize}
        currField={current.field}
        onClick={(x,y) => this.handleInput(x,y)}
      />
    )
  }
}

/**
 * board model
 */
class Board extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    let boardHW = window.innerHeight < window.innerWidth ? window.innerHeight : window.innerWidth;
    let boardSize = this.props.boardSize;
    let fieldSize = boardHW / boardSize;
    let player1 = this.props.player1;
    let moveMade = this.props.onClick;
    let field = this.props.currField;
    return (
      <div>
        <h1>Board View</h1>
        <Stage width={window.innerWidth} height={window.innerHeight}>
          <Layer>
            <Rect
              width={boardHW}
              height={boardHW}
              fill="#caa672"
              shadowBlur={10}
            />
            {Array.apply(0, Array(boardSize * boardSize)).map(function(x,i) {
              return (
                <Field 
                  x={Math.floor(i%boardSize)} 
                  y={Math.floor(i/boardSize)}
                  fieldSize={fieldSize} 
                  boardSize={boardSize} 
                  player1={field[i]} 
                  player1Color={'#444444'} 
                  player2Color={'#eeeeee'}
                  updateBoard={() => moveMade(Math.floor(i%boardSize), Math.floor(i/boardSize))}
                ></Field>
              )
            })}
          </Layer>
        </Stage>
      </div>
    );
  }
}

/**
 * represent a field the player can set a stone on
 */
class Field extends Component {
  constructor(props) {
    super(props);
    this.state = {
      x: this.props.x,
      y: this.props.y,
      player: this.props.player
    }
  }

  /**
   * rendering method of a field,
   * draws an invisible rectangle for input detection,
   * lines according to its position(north, east, south, west line)
   * and a circle if a stone is set
   */
  render() {
    let xStart = (this.props.x + 0.5) * this.props.fieldSize;
    let yStart = (this.props.y + 0.5) * this.props.fieldSize;
    return (
      <Group>
        <Rect
          onClick={this.props.updateBoard}
          x={this.props.x * this.props.fieldSize}
          y={this.props.y * this.props.fieldSize}
          width={this.props.fieldSize}
          height={this.props.fieldSize}
        />
        {this.props.y !== this.props.boardSize - 1 ?
           <Line x={xStart} y={yStart} points={[0,0,0,this.props.fieldSize/2]} stroke='black'/> :
           null
        }
        {this.props.y !== 0 ?
           <Line x={xStart} y={yStart} points={[0,0,0,-this.props.fieldSize/2]} stroke='black'/> :
           null
        }
        {this.props.x !== this.props.boardSize - 1 ?
           <Line x={xStart} y={yStart} points={[0,0,this.props.fieldSize/2,0]} stroke='black'/> :
           null
        }
        {this.props.x !== 0 ?
           <Line x={xStart} y={yStart} points={[0,0,-this.props.fieldSize/2,0]} stroke='black'/> :
           null
        }
        {this.props.player1 !== null ? 
          (this.props.player1 ? 
            <Circle x={xStart} y={yStart} radius={this.props.fieldSize * 0.35} fill={this.props.player1Color}/> :
            <Circle x={xStart} y={yStart} radius={this.props.fieldSize * 0.35} fill={this.props.player2Color}/> ) :
          null
        }
      </Group>
    );
  }
}

export default Game;