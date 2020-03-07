import React, { Component } from 'react';
import { Stage, Layer, Rect, Text, Circle, Line, Group } from 'react-konva';

/**
 * actual game mechanics and rules
 */
class Game extends Component {
  /**
   * 
   * @param {number} props.boardSize  -sets the size of the board during the game 
   */
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

  /**
   * 
   * @param {integer} x - x coordinate of the clicked Field
   * @param {integer} y - y coordinate of the clicked Field
   */
  handleInput(x, y) {
    const history = this.state.history.slice(0, this.state.round + 1);
    const current = history[history.length - 1];
    const fields = current.field.slice();
    
    if(!this.inputValid(x, y))
      return;
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

  /**
   * 
   * @param {integer} x - x coordinate of clicked field
   * @param {integer} y - y coordinate of clicked field
   * checks if input, returns true if valid and false elsewise
   */
  inputValid(x, y) {
    const history = this.state.history.slice(0, this.state.round + 1);
    const current = history[history.length - 1];
    const fields = current.field.slice();
    if(fields[y * this.props.boardSize + x] != null) // field is already set -> invalid move 
      return false;
    return true; 
  }

  /**
   * Search algorithm(BFS) for an empty spot, if empty spot is not found player loses his stones in alreadySearchedPositions(not fully implemented yet, coming soon)
   * @param {Array<[integer, integer]>} arrayOfPos 
   * @param {Array<[integer, integer]>} alreadySearchedPositions 
   */
  searchForEmptySpot(arrayOfPos, alreadySearchedPositions) {
    let found = false;
    if(arrayOfPos.length == 0)
      return [false, alreadySearchedPositions];
  }

}

/**
 * board model
 */
class Board extends Component {
  /**
   * 
   * @param {integer}        props.boardsSize - size of the board in fields
   * @param {function}       props.onClick    - function to be called if input is detected
   * @param {Array<Boolean>} props.currField  - current setting of the field
   */
  constructor(props) {
    super(props);
  }

  render() {
    let boardHW = window.innerHeight < window.innerWidth ? window.innerHeight : window.innerWidth;
    let boardSize = this.props.boardSize;
    let fieldSize = boardHW / boardSize;
    let moveMade = this.props.onClick;
    let field = this.props.currField;
    return (
      <div>
        <Stage width={boardHW} height={boardHW}>
          <Layer>
            <Rect
              width={boardHW}
              height={boardHW}
              fill="#caa672"
              shadowBlur={10}
            />
            {field.map(function(who,i) {
              return (
                <Field 
                  x={Math.floor(i%boardSize)} 
                  y={Math.floor(i/boardSize)}
                  fieldSize={fieldSize} 
                  boardSize={boardSize} 
                  player1={who} 
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
  /**
   * 
   * @param {integer}  props.x            - x coordinate of this field
   * @param {integer}  props.y            - y coordinate of this field
   * @param {number}   props.fieldSize    - size of the field in pixels
   * @param {integer}  props.boardSize    - size of the board in fields
   * @param {Color}    props.player1Color - color of player 1's stones
   * @param {Color}    props.player2Color - color of player 2's stones
   * @param {Boolean}  props.player1      - boolean value whether stone on current field is from player 1, null if no stones are set on this field
   * @param {function} props.updateBoard  - function to be called if this field is called
   */
  constructor(props) {
    super(props);
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
        <Rect
          onClick={this.props.updateBoard}
          x={(this.props.x + 0.125) * this.props.fieldSize}
          y={(this.props.y + 0.125) * this.props.fieldSize}
          width={this.props.fieldSize * 0.75}
          height={this.props.fieldSize * 0.75}
        />
      </Group>
    );
  }
}

export default Game;