import React, { Component } from 'react';
import { Stage, Layer, Rect, Circle, Line, Group } from 'react-konva';

/**
 * actual game mechanics and rules
 */
class Game{


  /**
   * score rating system(stone scoring)
   * @param {Field} field - field to be evaluated scores for
   */
  static getPoints(field, player) {
    return Game.getSpotsOf(field, player).length;
  }


  /**
   * @param {Field}  newField - new updated field
   * @param {Field}  oldField - field prior to pre-updated field(mainly to test if recurring moves have been made)
   * @param {Player} player   - currently playing Player
   * searches for all possible moves
   */
  static updateAvailableMoves(newField, oldField, player, enemy) {
    var avMoves = new Array(this.boardSize * this.boardSize).fill(
      null
    );
    var nextPossibleStates = Game.emulateGame.bind(this)(newField, oldField, 1, player, enemy);

    for (let i = 0; i < nextPossibleStates.length; i++) {
      var potMove = nextPossibleStates[i];
      let offset = potMove.y * this.boardSize + potMove.x;
      avMoves[offset] = { field: potMove.field, points: potMove.points };
    }
    return avMoves;
  }



  /**
   * @deprecated does not work in current state, need to be reworked if it is used(not used for applying board updates due to performance issues)
   * @param {GameState}   newState    - playing field on current path
   * @param {GameState}   oldState - old playing field prior to original playing field
   * @param {Number} depth    - how deep should the search go?
   * @param {Player}  player   - current player on current node
   * @returns {{x: Number, y: Number, field: Field, points: {player1score: Integer, player2score: Integer}}} - x and y coordinates, the modified playing field, points on modified playing field; returns all possible moves with the would-be playing field and the evaluated scores
   * emulates all possible game steps into "depth" steps using a backtracking algorithm(not suitable for ai on a big board[19 x 19]) and evaluates the points
   */
  static emulateGame(newState, oldState, depth, player, enemy) {
    if (depth <= 0)
      return [
        { x: -1, y: -1, field: newState, points: { [player.props.name]: Game.getPoints(newState, player), [enemy.props.name]: Game.getPoints(newState, enemy) } }
      ];

    let res = [];

    let potentialMoves = Game.getSpotsOf.bind(this)(newState, null);
    potentialMoves.forEach(spot => {
      let newField = newState.field.slice();
      let x = spot[0];
      let y = spot[1];
      let offset = y * this.boardSize + x;
      newField[offset] = player;
      Game.applyRulesBoard.bind(this)(newField, player, enemy);
      if (newField[offset] !== player)
        // suicidal move
        return;
      if (this.arrequals(newField, oldState.field))
        // recurring moves
        return;
      let recursiveResult = Game.emulateGame.bind(this)(
        { field: newField, points: null },
        newState,
        depth - 1,
        enemy,
        player
      ); // recursively emulate child game states
      let bestPoints = Number.MIN_VALUE;
      let best = { [player.props.name]: 0, [enemy.props.name]: Number.MAX_VALUE };
      recursiveResult.forEach((emuRes, i) => {
        // evaluate best points for current player
        if (
          emuRes.points[player.props.name] - emuRes.points[enemy.props.name] > bestPoints
        ) {
          bestPoints = emuRes.points[player.props.name] - emuRes.points[enemy.props.name];
          best = emuRes.points;
        }
        res.push({ x: x, y: y, field: newField, points: best });
      });
    });
    return res;
  }


  /**
   * 
   * @param {Field}  field  - playing field to be updated
   * @param {Player} player - current player of to be updated field
   * @param {Player} enemy  - enemy player of curren player of to be updated field
   */
  static applyRulesBoard(field, player, enemy) {

    let currentPlayerStones = [];
    //first update all stones of enemy player (linear search)
    for (let x = 0; x < this.boardSize; x++) {
      for (let y = 0; y < this.boardSize; y++) {
        let currField = field[y * this.boardSize + x];
        if (enemy === currField) {
          let searchRes = Game.searchForEmptySpot.bind(this)(
            [[x, y]],
            new Array(this.boardSize * this.boardSize).fill(false),
            enemy,
            field
          );

          // if an empty spot was not found, then remove every stone on search path.
          if (!searchRes[0])
            for (let i = 0; i < searchRes[1].length; i++) {
              let x = i % this.boardSize;
              let y = Math.floor(i / this.boardSize);
              if (searchRes[1][y * this.boardSize + x])
                field[y * this.boardSize + x] = null;
            }
        } else if (player === currField) {
          currentPlayerStones.push([x, y]);
        }
      }
    }
    currentPlayerStones.forEach(pos => {
      if (field[pos[1] * this.boardSize + pos[0]] === player) {
        let searchRes = Game.searchForEmptySpot.bind(this)(
          [[pos[0], pos[1]]],
          new Array(this.boardSize * this.boardSize).fill(false),
          player,
          field
        );

        // if an empty spot was not found, then remove every stone on search path.
        if (!searchRes[0])
          for (let i = 0; i < searchRes[1].length; i++) {
            let x = i % this.boardSize;
            let y = Math.floor(i / this.boardSize);
            if (searchRes[1][y * this.boardSize + x])
              field[y * this.boardSize + x] = null;
          }
      }
    });
  }

  /**
   *
   * @param   {Array<Player>}           field - current playing field
   * @returns {Array<Integer, Integer>}
   */
  static getSpotsOf(field, player) {
    let res = [];
    field.forEach((spot, index) => {
      if (spot === player)
        res.push([
          index % this.boardSize,
          Math.floor(index / this.boardSize)
        ]);
    });
    return res;
  }

  /**
   * Search algorithm(DFS) for an empty spot, if empty spot is not found player loses his stones in alreadySearchedPositions
   * @param   {Array<[integer, integer]>} arrayOfPos               - adjacent Positions that need to be searched
   * @param   {Array<[integer, integer]>} alreadySearchedPositions - Positions that has already been searchde
   * @returns {Array<[Boolean, Points]>}  return boolean value whether an empty field was found, along with every stone on the search path
   */
  static searchForEmptySpot(arrayOfPos, alreadySearchedPositions, player, fields) {
    let found = false;
    if (arrayOfPos.length === 0) return [false, alreadySearchedPositions];

    // for each element
    while (arrayOfPos.length > 0) {
      let element = arrayOfPos.pop();

      let x = element[0];
      let y = element[1];

      // if already searched skip
      if (alreadySearchedPositions[y * this.boardSize + x]) continue;
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
          adjacentX >= this.boardSize ||
          adjacentY >= this.boardSize ||
          alreadySearchedPositions[adjacentY * this.boardSize + adjacentX]
        )
          continue;
        let adField = fields[adjacentY * this.boardSize + adjacentX];

        // if adjacent field is null then we have found the empty spot
        if (adField === null) found = true;
        else if (adField === player) {
          arrayOfPos.push([adjacentX, adjacentY]);
        }
      }
      alreadySearchedPositions[y * this.boardSize + x] = true;
    }

    return [found, alreadySearchedPositions];
  }

  arrequals = function(array1, array2) {
    // if the other array is a falsy value, return
    if (!array2) return false;
  
    // compare lengths - can save a lot of time
    if (array1.length !== array2.length) return false;
  
    for (var i = 0, l = array1.length; i < l; i++) {
      // Check if we have nested arrays
      if (array1[i] instanceof Array && array2[i] instanceof Array) {
        // recurse into the nested arrays
        if (!array1[i].equals(array2[i])) return false;
      } else if (array1[i] !== array2[i]) {
        // Warning - two different object instances will never be equal: {x:20} != {x:20}
        return false;
      }
    }
    return true;
  };

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
    let boardHW = this.props.boardHW;
    let boardSize = this.props.boardSize;
    let fieldSize = boardHW / boardSize;
    let moveMade = this.props.onClick;
    let field = this.props.currField;
    let currPlayer = this.props.currPlayer;
    return (
        <Stage width={boardHW} height={boardHW}>
          <Layer>
            <Rect
              width={boardHW}
              height={boardHW}
              fill='#ffc059'
              shadowBlur={10}
            />
            {field.map(function(who, i) {
              return (
                <Field
                  key={'field' + i}
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
        {this.props.player ? (
          <Circle
            x={xStart}
            y={yStart}
            radius={this.props.fieldSize * 0.42}
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
  toString() {
    return 'Player: ' + this.props.name;
  }
}



export { Game, Player, Board };
