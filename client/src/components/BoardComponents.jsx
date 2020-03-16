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
    var initPlayingField = new Array(this.props.boardSize * this.props.boardSize).fill(null);
    this.state = {
      history:[
        {
          field: new Array(this.props.boardSize * this.props.boardSize).fill(null)
        }
      ],
      round: 0,
      currPlayer: this.props.player1,
      availableMoves: this.updateAvailableMoves(initPlayingField, initPlayingField, this.props.player1)
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
          currPlayer={this.state.currPlayer}
        />
      </div>
    )
  }

  updateAvailableMoves(newField, oldField, player) {
    var avMoves = new Array(this.props.boardSize * this.props.boardSize).fill(null);
    var nextPossibleStates = this.emulateGame(newField, oldField, 1, player);

    for(let i = 0; i < nextPossibleStates.length; i++) {
      var potMove = nextPossibleStates[i];
      let offset = potMove[1] * this.props.boardSize + potMove[0];
      avMoves[offset] = [potMove[2], potMove[3]];
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
    this.onNextMove(this.state.availableMoves[y * this.props.boardSize + x][0]);
  }
  
  pass() {
    let nextPlayer = this.state.currPlayer === this.props.player1 ? this.props.player2 : this.props.player1;
    let newMoves = this.updateAvailableMoves(this.state.history[this.state.round].field, null, nextPlayer);
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
    let prevPlayer = steps % 2 == 1 && this.state.currPlayer === this.props.player1 ? this.props.player2 : this.props.player1;
    let newMoves = this.updateAvailableMoves(this.state.history[this.state.round - steps].field, null, prevPlayer);
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
    let nextPlayer = steps % 2 == 1 && this.state.currPlayer === this.props.player1 ? this.props.player2 : this.props.player1;
    let newMoves = this.updateAvailableMoves(this.state.history[this.state.round + steps].field, null, nextPlayer);
    this.setState({
      history: this.state.history,
      round: this.state.round + 1,
      currPlayer: nextPlayer,
      availableMoves: newMoves
    });
  }

  /**
   * @deprecated
   * @param {Array<Boolean>} fields - current field to be manipulated
   * Updates current playing field, removes enemy stones that have been captured. This is done linearly scanning from top-left to bottom-right.
   */
  onNextMove(fields) {
    const history = this.state.history.slice(0, this.state.round + 1);
    
    let nextPlayer = this.state.currPlayer === this.props.player1 ? this.props.player2 : this.props.player1;
    let newMoves = this.updateAvailableMoves(fields, history[this.state.round].field, nextPlayer);
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
   * @deprecated
   * @param {integer} x - x coordinate of clicked field
   * @param {integer} y - y coordinate of clicked field
   * @returns boolean
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
   * 
   * @param {Array<Player>} field  - playing field on current path
   * @param {Integer}       depth  - how deep should the search go?
   * @param {Player}        player - current player on current node
   * @returns {[Integer, Integer, Field, Player]} - x and y coordinates, the modified playing field, the current turn player; returns all possible moves with the would-be playing field and the evaluated scores
   * emulates all possible game steps into "depth" steps using a backtracking algorithm(not suitable for ai on a big board[19 x 19]) and evaluates the points
   */
  emulateGame(field, oldField,  depth, player) {
    if(depth <= 0)
      return [[-1, -1, field, this.getPoints(field)]];

    let enemy = player === this.props.player1 ? this.props.player2 : this.props.player1;
    let res = [];
    const playerIndex = player === this.props.player1 ? 0 : 1;
    
    let potentialMoves = this.getEmptySpots(field);
    potentialMoves.forEach(spot => {
      let newField = field.slice();
      let x = spot[0];
      let y = spot[1];
      let offset = y * this.props.boardSize + x;
      newField[offset] = player;
      this.updateBoard(newField, player);
      if(newField[offset] !== player) // suicidal move
        return;
      if(newField.equals(oldField)) // recurring moves
        return;
      let recursiveResult = this.emulateGame(newField, field, depth - 1, enemy); // recursively emulate child game states
      let bestPoints = Number.MIN_VALUE; 
      let bestIndex = -1;
      recursiveResult.forEach((emuRes, i) => { // evaluate best points for current player
        if(emuRes[3][playerIndex] > bestPoints) {
          bestPoints = emuRes[3][playerIndex];
          bestIndex = i;
        }
        res.push([x, y, newField, recursiveResult[i]]);
      });
    });
    return res;
  }

  getPoints(field) {
    return [0, 0];
  }

  updateBoard(field, player) {
    const enemy = player === this.props.player1 ? this.props.player2 : this.props.player1;

    let currentPlayerStones = [];
    //first update all stones of enemy player (linear search)
    for(let x = 0; x < this.props.boardSize; x++) {
      for(let y = 0; y < this.props.boardSize; y++) {
        let currField = field[y * this.props.boardSize + x];
        if(enemy === currField) {
          let searchRes = this.searchForEmptySpot([[x, y]], new Array(this.props.boardSize * this.props.boardSize).fill(false), enemy, field);

          // if an empty spot was not found, then remove every stone on search path. 
          if(!searchRes[0])
            for(let i = 0; i < searchRes[1].length; i++) {
              let x = i % this.props.boardSize;
              let y = Math.floor(i / this.props.boardSize);
              if(searchRes[1][y * this.props.boardSize + x])
                field[y * this.props.boardSize + x] = null;
            }
        } else if(player === currField){
          currentPlayerStones.push([x, y]);
        }
      }
    }
    currentPlayerStones.forEach(pos => {
      if(field[pos[1] * this.props.boardSize + pos[0]] == player) {
        let searchRes = this.searchForEmptySpot([[pos[0], pos[1]]], new Array(this.props.boardSize * this.props.boardSize).fill(false), player, field);

          // if an empty spot was not found, then remove every stone on search path. 
          if(!searchRes[0])
            for(let i = 0; i < searchRes[1].length; i++) {
              let x = i % this.props.boardSize;
              let y = Math.floor(i / this.props.boardSize);
              if(searchRes[1][y * this.props.boardSize + x])
                field[y * this.props.boardSize + x] = null;
            }
      }
    });
  }

  /**
   * 
   * @param   {Array<Player>}           field - current playing field
   * @returns {Array<Integer, Integer>}
   */
  getEmptySpots(field) {
    let res = [];
    field.forEach((spot, index) => {
      if(spot === null)
        res.push([index % this.props.boardSize, Math.floor(index / this.props.boardSize)]);
    });
    return res;
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
   * @param {Player}         props.currPlayer - current Player
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
    let currPlayer = this.props.currPlayer;
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
                  updateBoard={() => moveMade(Math.floor(i%boardSize), Math.floor(i/boardSize, false), false, currPlayer)}
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

// Warn if overriding existing method
if(Array.prototype.equals)
    console.warn("Overriding existing Array.prototype.equals. Possible causes: New API defines the method, there's a framework conflict or you've got double inclusions in your code.");
// attach the .equals method to Array's prototype to call it on any array
Array.prototype.equals = function (array) {
    // if the other array is a falsy value, return
    if (!array)
        return false;

    // compare lengths - can save a lot of time 
    if (this.length != array.length)
        return false;

    for (var i = 0, l=this.length; i < l; i++) {
        // Check if we have nested arrays
        if (this[i] instanceof Array && array[i] instanceof Array) {
            // recurse into the nested arrays
            if (!this[i].equals(array[i]))
                return false;       
        }           
        else if (this[i] != array[i]) { 
            // Warning - two different object instances will never be equal: {x:20} != {x:20}
            return false;   
        }           
    }       
    return true;
}
// Hide method from for-in loops
Object.defineProperty(Array.prototype, "equals", {enumerable: false});

export { Game, Player };