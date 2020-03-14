import React, { Component } from 'react';
import { Stage, Layer, Rect, Circle, Line, Group } from 'react-konva';

/**
 * actual game mechanics and rules
 */
class Game extends Component {
  /**
   * 
   * @param {number} props.boardSize - sets the size of the board during the game 
   * @param {Player} props.player1   - Player 1
   * @param {Player} props.player2   - Player 2
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
      currPlayer: this.props.player1,
      availableMoves: new Array(this.props.boardSize * this.props.boardSize).fill(true)
    }
  }

  render() {
    const history = this.state.history;
    const current = history[this.state.round];

    return (
      <div>
        <button onClick={() => this.undo(1)}>{'Undo'}</button>
        <button onClick={() => this.redo(1)}>{'Redo'}</button>
        <button onClick={() => this.pass()}>{'Pass'}</button>
        <Board
          boardSize={this.props.boardSize}
          onClick={(x, y) => this.handleInput(x, y)}
          currField={current.field}
        />
      </div>
    )
  }

  updateAvailableMoves(newField, player) {
    let avMoves = new Array(this.props.boardSize * this.props.boardSize).fill(false);
    for(let x = 0; x < this.props.boardSize; x++) {
      for(let y = 0; y < this.props.boardSize; y++) {
        if(newField[y * this.props.boardSize + x] !== null)
          continue;
        if(this.inputValid(x, y, newField, player))
          avMoves[y * this.props.boardSize + x] = true;
      }
    }
    return avMoves;
  }

  /**
   * 
   * @param {integer} x - x coordinate of the clicked Field
   * @param {integer} y - y coordinate of the clicked Field
   */
  handleInput(x, y, multi, player) {
    if(multi && player !== this.state.currPlayer)
      return;
    const history = this.state.history.slice(0, this.state.round + 1);
    const current = history[history.length - 1];
    const fields = current.field.slice();
    
    if(!this.state.availableMoves[y * this.props.boardSize + x])
      return;
    fields[y * this.props.boardSize + x] = this.state.currPlayer;
    this.onNextMove(fields);
  }
  
  pass() {
    let nextPlayer = this.state.currPlayer === this.props.player1 ? this.props.player2 : this.props.player1;
    let newMoves = this.updateAvailableMoves(this.state.history[this.state.round].field, nextPlayer);
    this.setState({
      history: this.state.history.slice(0, this.state.round + 1).concat([
        {field: this.state.history[this.state.round].field}
      ]),
      round: this.state.round + 1,
      currPlayer: nextPlayer,
      availableMoves: newMoves
    });
  }

  /**
   * undoes the last move made by a player
   */
  undo(steps) {
    if(this.state.round <= steps - 1)
      return;
    let prevPlayer = this.state.currPlayer === this.props.player1 ? this.props.player2 : this.props.player1;
    let newMoves = this.updateAvailableMoves(this.state.history[this.state.round - steps].field, prevPlayer);
    this.setState({
      history: this.state.history,
      round: this.state.round - 1,
      currPlayer: prevPlayer,
      availableMoves: newMoves
    });
  }

  /**
   * redoes the last undone move
   */
  redo(steps) {
    if(this.state.round >= this.state.history.length - steps)
      return;
    let nextPlayer = this.state.currPlayer === this.props.player1 ? this.props.player2 : this.props.player1;
    let newMoves = this.updateAvailableMoves(this.state.history[this.state.round + steps].field, nextPlayer);
    this.setState({
      history: this.state.history,
      round: this.state.round + 1,
      currPlayer: nextPlayer,
      availableMoves: newMoves
    });
  }

  /**
   * @param {Array<Boolean>} fields - current field to be manipulated
   * Updates current playing field, removes enemy stones that have been captured. This is done linearly scanning from top-left to bottom-right.
   */
  onNextMove(fields) {
    const history = this.state.history.slice(0, this.state.round + 1);
    const enemy = this.state.currPlayer === this.props.player1 ? this.props.player2 : this.props.player1;

    // find all stones of enemy player (linear search)
    for(let x = 0; x < this.props.boardSize; x++) {
      for(let y = 0; y < this.props.boardSize; y++) {
        if(enemy === fields[y * this.props.boardSize + x]) {
          let searchRes = this.searchForEmptySpot([[x, y]], new Array(this.props.boardSize * this.props.boardSize).fill(false), enemy, fields);

          // if an empty spot was not found, then remove every stone on search path. 
          if(!searchRes[0])
            for(let i = 0; i < searchRes[1].length; i++) {
              let x = i % this.props.boardSize;
              let y = Math.floor(i / this.props.boardSize);
              if(searchRes[1][y * this.props.boardSize + x])
                fields[y * this.props.boardSize + x] = null;
            }
        }
      }
    }
    
    
    let nextPlayer = this.state.currPlayer === this.props.player1 ? this.props.player2 : this.props.player1;
    let newMoves = this.updateAvailableMoves(fields, nextPlayer);
    this.setState({
      history: history.concat([
        {field: fields}
      ]),
      round: history.length,
      currPlayer: nextPlayer,
      availableMoves: newMoves
    });
  }

  /**
   * 
   * @param {integer} x - x coordinate of clicked field
   * @param {integer} y - y coordinate of clicked field
   * checks if input, returns true if valid and false elsewise(suicide prevention)
   */
  inputValid(x, y, fields, player) {

    // field is already set -> invalid move
    if(fields[y * this.props.boardSize + x] != null)  
      return false;
    
    // search for adjacent fields that are not set
    let search = this.searchForEmptySpot([[x, y]], new Array(this.props.boardSize * this.props.boardSize).fill(false), player, fields);
    return search[0]; 
  }

  /**
   * Search algorithm(DFS) for an empty spot, if empty spot is not found player loses his stones in alreadySearchedPositions(not fully implemented yet, coming soon)
   * @param   {Array<[integer, integer]>} arrayOfPos               - adjacent Positions that need to be searched
   * @param   {Array<[integer, integer]>} alreadySearchedPositions - Positions that has already been searchde
   * @returns {Array<[Boolean, Points]>}  return boolean value whether an empty field was found, along with every stone on the search path
   */
  searchForEmptySpot(arrayOfPos, alreadySearchedPositions, player, fields) {
    let found = false;
    if(arrayOfPos.length === 0)
      return [false, alreadySearchedPositions];

    // for each element
    while(arrayOfPos.length > 0) {
      let element = arrayOfPos.pop();
      
      let x = element[0];
      let y = element[1];

      // if already searched skip
      if(alreadySearchedPositions[y * this.props.boardSize + x])
        continue;
      // search for adjacent friendly stones
      for(let i = 0; i < 4; i++) {
        let firstBit = ((i & 2) >> 1);
        let secondBit = i & 1;
        let xor = (firstBit ^ secondBit) > 0;
        let xOffset = (1 - 2 * secondBit) * xor;
        let yOffset = (1 - 2 * secondBit) * (!xor);
        let adjacentX = x + xOffset;
        let adjacentY = y + yOffset;

        if(adjacentX < 0 || adjacentY < 0 || adjacentX >= this.props.boardSize || adjacentY >= this.props.boardSize || alreadySearchedPositions[adjacentY * this.props.boardSize + adjacentX])
          continue;
        let adField = fields[adjacentY * this.props.boardSize + adjacentX];

        // if adjacent field is null then we have found the empty spot
        if(adField === null)
          found = true;
        else if(adField === player) {
          arrayOfPos.push([adjacentX, adjacentY]);
        }
      }
      alreadySearchedPositions[y * this.props.boardSize + x] = true;
    }

    return[found, alreadySearchedPositions];
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
                  player={who} 
                  updateBoard={() => moveMade(Math.floor(i%boardSize), Math.floor(i/boardSize, false))}
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
   * @param {Player}  props.player      - boolean value whether stone on current field is from player 1, null if no stones are set on this field
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
        {this.props.player !== null ?
          <Circle x={xStart} y={yStart} radius={this.props.fieldSize * 0.35} fill={this.props.player.props.playerColor}/>:
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

/**
 * props.playerColor    
 * props.name           
 * state.availableMoves 
 */
class Player extends Component{
  render() {
    return (
      <div>
        <h1>
          {this.props.name}
        </h1>
      </div>
    )
  }
}

export { Game, Player };