import React, { Component } from 'react';
import { Stage, Layer, Rect, Circle, Line, Group } from 'react-konva';

/**
 * actual game mechanics and rules
 */
class Game extends Component {
  /**
   *
   * @param {number}   props.boardSize - sets the size of the board during the game
   * @param {Player}   props.player1   - Player 1
   * @param {Player}   props.player2   - Player 2
   * @param {Player}   props.ownPlayer - Player that is controlling
   * @param {function} props.broadcast - broadcast function
   * @param {Boolean}  props.multi     - boolean value whether game is in multiplayermode
   */
  constructor(props) {
    super(props);
    var initState = {
      field: new Array(this.props.boardSize * this.props.boardSize).fill(null),
      points: { player1score: 0, player2score: 0 }
    };
    this.state = {
      history: [
        {
          gameState: initState,
          passCount: 0
        }
      ],
      round: 0,
      currPlayer: this.props.player1,
      availableMoves: this.updateAvailableMoves(
        initState,
        initState,
        this.props.player1
      ),
      gameEnd: false
    };
  }

  getHistory() {
    return this.state.history;
  }

  render() {
    const history = this.state.history;
    const current = history[this.state.round];
    console.log(
      'this.state.round: ' +
        this.state.round +
        ', this.state.gameEnd: ' +
        this.state.gameEnd +
        ', this.history[current].passCount: ' +
        this.state.history[this.state.round].passCount
    );
    return (
      <div>
        <button onClick={() => this.undo(1)}>{'Undo'}</button>
        <button onClick={() => this.redo(1)}>{'Redo'}</button>
        <button onClick={() => this.pass()}>{'Pass'}</button>
        {this.state.gameEnd ? (
          <h1 style={{ color: 'white' }}>
            Game has ended!{' '}
            {this.state.history[this.state.round].gameState.points
              .player1score >
            this.state.history[this.state.round].gameState.points.player2score
              ? this.props.player1.props.name + ' won!'
              : this.state.history[this.state.round].gameState.points
                  .player1score ===
                this.state.history[this.state.round].gameState.points
                  .player2score
              ? 'It is a draw!'
              : this.props.player2.props.name + 'won!'}
          </h1>
        ) : null}
        <h1 style={{ color: 'white' }}>
          {'passCount = ' + this.state.history[this.state.round].passCount}
        </h1>
        <h1 style={{ color: 'white' }}>
          {'' +
            this.props.player1.props.name +
            ':' +
            this.state.history[this.state.round].gameState.points.player1score +
            ', ' +
            this.props.player2.props.name +
            ': ' +
            this.state.history[this.state.round].gameState.points.player2score}
        </h1>
        <Board
          boardSize={this.props.boardSize}
          onClick={(x, y) => this.handleClick(x, y)}
          currField={current.gameState.field}
          currPlayer={this.state.currPlayer}
        />
      </div>
    );
  }

  /**
   * @param {Field}  newField - new updated field
   * @param {Field}  oldField - field prior to pre-updated field(mainly to test if recurring moves have been made)
   * @param {Player} player   - currently playing Player
   * searches for all possible moves
   */
  updateAvailableMoves(newField, oldField, player) {
    var avMoves = new Array(this.props.boardSize * this.props.boardSize).fill(
      null
    );
    var nextPossibleStates = this.emulateGame(newField, oldField, 1, player);

    for (let i = 0; i < nextPossibleStates.length; i++) {
      var potMove = nextPossibleStates[i];
      let offset = potMove.y * this.props.boardSize + potMove.x;
      avMoves[offset] = { field: potMove.field, points: potMove.points };
    }
    return avMoves;
  }

  /**
   *
   * @param {integer} x - x coordinate of the clicked Field
   * @param {integer} y - y coordinate of the clicked Field
   */
  handleClick(x, y) {
    if ((this.props.multi && this.props.ownPlayer !== this.state.currPlayer) || this.state.gameEnd)
      return;
    this.props.broadcast(x, y);
  }


  processInput(x, y) {
    if (!this.state.availableMoves[y * this.props.boardSize + x]) this.props.err(this.state);
    this.onNextMove(this.state.availableMoves[y * this.props.boardSize + x]);
  }

  pass() {
    let nextPlayer =
      this.state.currPlayer === this.props.player1
        ? this.props.player2
        : this.props.player1;
    let newMoves = this.updateAvailableMoves(
      this.state.history[this.state.round].gameState,
      this.state.history[this.state.round].gameState,
      nextPlayer
    );
    let newState = {
      history: this.state.history.slice(0, this.state.round + 1).concat([
        {
          gameState: this.state.history[this.state.round].gameState,
          passCount: this.state.history[this.state.round].passCount + 1
        }
      ]),
      round: this.state.round + 1,
      currPlayer: nextPlayer,
      availableMoves: newMoves
    };
    this.updateGame(newState);
  }

  /**
   * undoes the last move made by a player
   */
  undo(steps) {
    if (this.state.round <= steps - 1) return;
    let prevPlayer =
      steps % 2 === 1 && this.state.currPlayer === this.props.player1
        ? this.props.player2
        : this.props.player1;
    let oldState =
      this.state.round - steps > 0
        ? this.state.history[this.state.round - steps].gameState
        : this.state.history[0].gameState;
    let newMoves = this.updateAvailableMoves(
      this.state.history[this.state.round - steps].gameState,
      oldState,
      prevPlayer
    );
    let newState = {
      history: this.state.history,
      round: this.state.round - steps,
      currPlayer: prevPlayer,
      availableMoves: newMoves,
      gameEnd: false
    };
    this.updateGame(newState);
  }

  /**
   * redoes the last undone move
   */
  redo(steps) {
    if (this.state.round >= this.state.history.length - steps) return;
    let nextPlayer =
      steps % 2 === 1 && this.state.currPlayer === this.props.player1
        ? this.props.player2
        : this.props.player1;
    let oldState =
      this.state.round + steps >= this.state.history.length
        ? this.state.history[this.state.round].gameState
        : this.state.history[this.state.round + steps].gameState;
    let newMoves = this.updateAvailableMoves(
      this.state.history[this.state.round + steps].gameState,
      oldState,
      nextPlayer
    );
    let newState = {
      history: this.state.history,
      round: this.state.round + steps,
      currPlayer: nextPlayer,
      availableMoves: newMoves
    };
    this.updateGame(newState);
  }

  /**
   *
   * @param {Array<Boolean>} fields - current field to be manipulated
   * Updates current playing field, removes enemy stones that have been captured. This is done linearly scanning from top-left to bottom-right.
   */
  onNextMove(fields) {
    const history = this.state.history.slice(0, this.state.round + 1);

    let nextPlayer =
      this.state.currPlayer === this.props.player1
        ? this.props.player2
        : this.props.player1;
    let newMoves = this.updateAvailableMoves(
      fields,
      history[this.state.round].gameState,
      nextPlayer
    );
    let newState = {
      history: history.concat([
        {
          gameState: fields,
          passCount: 0
        }
      ]),
      round: history.length,
      currPlayer: nextPlayer,
      availableMoves: newMoves,
      gameEnd: false
    };
    this.updateGame(newState);
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
    if (fields[y * this.props.boardSize + x] != null) return false;

    // search for adjacent fields that are not set
    let search = this.searchForEmptySpot(
      [[x, y]],
      new Array(this.props.boardSize * this.props.boardSize).fill(false),
      player,
      fields
    );
    return search[0];
  }

  /**
   *
   * @param {GameState}   newState    - playing field on current path
   * @param {GameState}   oldState - old playing field prior to original playing field
   * @param {Number} depth    - how deep should the search go?
   * @param {Player}  player   - current player on current node
   * @returns {{x: Number, y: Number, field: Field, points: {player1score: Integer, player2score: Integer}}} - x and y coordinates, the modified playing field, points on modified playing field; returns all possible moves with the would-be playing field and the evaluated scores
   * emulates all possible game steps into "depth" steps using a backtracking algorithm(not suitable for ai on a big board[19 x 19]) and evaluates the points
   */
  emulateGame(newState, oldState, depth, player) {
    if (depth <= 0)
      return [
        { x: -1, y: -1, field: newState, points: this.getPoints(newState) }
      ];

    let enemy =
      player === this.props.player1 ? this.props.player2 : this.props.player1;
    let res = [];
    const playerIndex = player === this.props.player1 ? 0 : 1;

    let potentialMoves = this.getSpotsOf(newState, null);
    potentialMoves.forEach(spot => {
      let newField = newState.field.slice();
      let x = spot[0];
      let y = spot[1];
      let offset = y * this.props.boardSize + x;
      newField[offset] = player;
      this.applyRulesBoard(newField, player);
      if (newField[offset] !== player)
        // suicidal move
        return;
      if (newField.equals(oldState.field))
        // recurring moves
        return;
      let recursiveResult = this.emulateGame(
        { field: newField, points: null },
        newState,
        depth - 1,
        enemy
      ); // recursively emulate child game states
      let bestPoints = Number.MIN_VALUE;
      let best = { player1: -1, player2: -1 };
      recursiveResult.forEach((emuRes, i) => {
        // evaluate best points for current player
        if (
          (playerIndex === 0
            ? emuRes.points.player1score
            : emuRes.points.player2score) > bestPoints
        ) {
          bestPoints = emuRes.points[playerIndex];
          best = emuRes.points;
        }
        res.push({ x: x, y: y, field: newField, points: best });
      });
    });
    return res;
  }

  /**
   * score rating system(stone scoring)
   * @param {Field} field - field to be evaluated scores for
   */
  getPoints(field) {
    let player1score = this.getSpotsOf(field, this.props.player1).length;
    let player2score = this.getSpotsOf(field, this.props.player2).length;
    return { player1score: player1score, player2score: player2score };
  }

  applyRulesBoard(field, player) {
    const enemy =
      player === this.props.player1 ? this.props.player2 : this.props.player1;

    let currentPlayerStones = [];
    //first update all stones of enemy player (linear search)
    for (let x = 0; x < this.props.boardSize; x++) {
      for (let y = 0; y < this.props.boardSize; y++) {
        let currField = field[y * this.props.boardSize + x];
        if (enemy === currField) {
          let searchRes = this.searchForEmptySpot(
            [[x, y]],
            new Array(this.props.boardSize * this.props.boardSize).fill(false),
            enemy,
            field
          );

          // if an empty spot was not found, then remove every stone on search path.
          if (!searchRes[0])
            for (let i = 0; i < searchRes[1].length; i++) {
              let x = i % this.props.boardSize;
              let y = Math.floor(i / this.props.boardSize);
              if (searchRes[1][y * this.props.boardSize + x])
                field[y * this.props.boardSize + x] = null;
            }
        } else if (player === currField) {
          currentPlayerStones.push([x, y]);
        }
      }
    }
    currentPlayerStones.forEach(pos => {
      if (field[pos[1] * this.props.boardSize + pos[0]] === player) {
        let searchRes = this.searchForEmptySpot(
          [[pos[0], pos[1]]],
          new Array(this.props.boardSize * this.props.boardSize).fill(false),
          player,
          field
        );

        // if an empty spot was not found, then remove every stone on search path.
        if (!searchRes[0])
          for (let i = 0; i < searchRes[1].length; i++) {
            let x = i % this.props.boardSize;
            let y = Math.floor(i / this.props.boardSize);
            if (searchRes[1][y * this.props.boardSize + x])
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
  getSpotsOf(field, player) {
    let res = [];
    field.field.forEach((spot, index) => {
      if (spot === player)
        res.push([
          index % this.props.boardSize,
          Math.floor(index / this.props.boardSize)
        ]);
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
    if (arrayOfPos.length === 0) return [false, alreadySearchedPositions];

    // for each element
    while (arrayOfPos.length > 0) {
      let element = arrayOfPos.pop();

      let x = element[0];
      let y = element[1];

      // if already searched skip
      if (alreadySearchedPositions[y * this.props.boardSize + x]) continue;
      // search for adjacent friendly stones
      for (let i = 0; i < 4; i++) {
        let firstBit = (i & 2) >> 1;
        let secondBit = i & 1;
        let xor = (firstBit ^ secondBit) > 0;
        let xOffset = (1 - 2 * secondBit) * xor;
        let yOffset = (1 - 2 * secondBit) * !xor;
        let adjacentX = x + xOffset;
        let adjacentY = y + yOffset;

        if (
          adjacentX < 0 ||
          adjacentY < 0 ||
          adjacentX >= this.props.boardSize ||
          adjacentY >= this.props.boardSize ||
          alreadySearchedPositions[adjacentY * this.props.boardSize + adjacentX]
        )
          continue;
        let adField = fields[adjacentY * this.props.boardSize + adjacentX];

        // if adjacent field is null then we have found the empty spot
        if (adField === null) found = true;
        else if (adField === player) {
          arrayOfPos.push([adjacentX, adjacentY]);
        }
      }
      alreadySearchedPositions[y * this.props.boardSize + x] = true;
    }

    return [found, alreadySearchedPositions];
  }

  updateGame(newState) {
    if (
      newState.availableMoves.length < 1 ||
      newState.history[newState.round].passCount >= 2
    )
      this.setState({
        history: newState.history,
        round: newState.round,
        currPlayer: newState.currPlayer,
        availableMoves: newState.availableMoves,
        gameEnd: true
      });
    else this.setState(newState);
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

  render() {
    let boardHW =
      window.innerHeight < window.innerWidth
        ? window.innerHeight
        : window.innerWidth;
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
              fill='#caa672'
              shadowBlur={10}
            />
            {field.map(function(who, i) {
              return (
                <Field
                  x={Math.floor(i % boardSize)}
                  y={Math.floor(i / boardSize)}
                  fieldSize={fieldSize}
                  boardSize={boardSize}
                  player={who}
                  updateBoard={() =>
                    moveMade(
                      Math.floor(i % boardSize),
                      Math.floor(i / boardSize, false),
                      false,
                      currPlayer
                    )
                  }
                ></Field>
              );
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
        {this.props.y !== this.props.boardSize - 1 ? (
          <Line
            x={xStart}
            y={yStart}
            points={[0, 0, 0, this.props.fieldSize / 2]}
            stroke='black'
          />
        ) : null}
        {this.props.y !== 0 ? (
          <Line
            x={xStart}
            y={yStart}
            points={[0, 0, 0, -this.props.fieldSize / 2]}
            stroke='black'
          />
        ) : null}
        {this.props.x !== this.props.boardSize - 1 ? (
          <Line
            x={xStart}
            y={yStart}
            points={[0, 0, this.props.fieldSize / 2, 0]}
            stroke='black'
          />
        ) : null}
        {this.props.x !== 0 ? (
          <Line
            x={xStart}
            y={yStart}
            points={[0, 0, -this.props.fieldSize / 2, 0]}
            stroke='black'
          />
        ) : null}
        {this.props.player !== null ? (
          <Circle
            x={xStart}
            y={yStart}
            radius={this.props.fieldSize * 0.35}
            fill={this.props.player.props.playerColor}
          />
        ) : null}
        <Rect
          onClick={this.props.updateBoard}
          x={(this.props.x + 0.125) * this.props.fieldSize}
          y={(this.props.y + 0.125) * this.props.fieldSize}
          width={this.props.fieldSize * 0.85}
          height={this.props.fieldSize * 0.85}
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
class Player extends Component {
  render() {
    return (
      <div>
        <h1>{this.props.name}</h1>
      </div>
    );
  }
}

// Warn if overriding existing method
if (Array.prototype.equals)
  console.warn(
    "Overriding existing Array.prototype.equals. Possible causes: New API defines the method, there's a framework conflict or you've got double inclusions in your code."
  );
// attach the .equals method to Array's prototype to call it on any array
Array.prototype.equals = function(array) {
  // if the other array is a falsy value, return
  if (!array) return false;

  // compare lengths - can save a lot of time
  if (this.length != array.length) return false;

  for (var i = 0, l = this.length; i < l; i++) {
    // Check if we have nested arrays
    if (this[i] instanceof Array && array[i] instanceof Array) {
      // recurse into the nested arrays
      if (!this[i].equals(array[i])) return false;
    } else if (this[i] != array[i]) {
      // Warning - two different object instances will never be equal: {x:20} != {x:20}
      return false;
    }
  }
  return true;
};
// Hide method from for-in loops
Object.defineProperty(Array.prototype, 'equals', { enumerable: false });

export { Game, Player };
