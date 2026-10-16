import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GRID_SIZE,
  BASE_SPEED,
  MIN_SPEED,
  DIR,
  isValidDirectionChange,
  checkWallCollision,
  checkSelfCollision,
  calculateSpeed,
  calculateLevel,
  getAvailableCells,
  SnakeSimulation,
} from './snake_logic.js';

test('Direction validation prevents 180-degree instant reversal', () => {
  // Moving RIGHT, cannot turn LEFT
  assert.equal(isValidDirectionChange(DIR.RIGHT, DIR.LEFT), false);
  // Moving RIGHT, can turn UP or DOWN
  assert.equal(isValidDirectionChange(DIR.RIGHT, DIR.UP), true);
  assert.equal(isValidDirectionChange(DIR.RIGHT, DIR.DOWN), true);
  // Moving UP, cannot turn DOWN
  assert.equal(isValidDirectionChange(DIR.UP, DIR.DOWN), false);
  // Moving UP, can turn LEFT or RIGHT
  assert.equal(isValidDirectionChange(DIR.UP, DIR.LEFT), true);
  assert.equal(isValidDirectionChange(DIR.UP, DIR.RIGHT), true);
});

test('Wall collision detection accurately identifies boundary breaches', () => {
  assert.equal(checkWallCollision({ x: 0, y: 0 }, GRID_SIZE), false);
  assert.equal(checkWallCollision({ x: 19, y: 19 }, GRID_SIZE), false);
  // Off bounds
  assert.equal(checkWallCollision({ x: -1, y: 5 }, GRID_SIZE), true);
  assert.equal(checkWallCollision({ x: 20, y: 5 }, GRID_SIZE), true);
  assert.equal(checkWallCollision({ x: 5, y: -1 }, GRID_SIZE), true);
  assert.equal(checkWallCollision({ x: 5, y: 20 }, GRID_SIZE), true);
});

test('Self collision detects intersection with snake body', () => {
  const body = [
    { x: 5, y: 5 },
    { x: 4, y: 5 },
    { x: 3, y: 5 },
    { x: 3, y: 6 },
    { x: 4, y: 6 },
  ];
  // Attempting to move into (4, 6) hits body
  assert.equal(checkSelfCollision({ x: 4, y: 6 }, body), true);
  // Moving into open space (5, 4) is safe
  assert.equal(checkSelfCollision({ x: 5, y: 4 }, body), false);
});

test('Speed progression decreases interval with score down to MIN_SPEED', () => {
  const startSpeed = calculateSpeed(0);
  assert.equal(startSpeed, BASE_SPEED);

  const midSpeed = calculateSpeed(10);
  assert.equal(midSpeed < startSpeed, true);

  const maxSpeed = calculateSpeed(100);
  assert.equal(maxSpeed, MIN_SPEED);
});

test('Level calculation increments every 50 points', () => {
  assert.equal(calculateLevel(0), 1);
  assert.equal(calculateLevel(40), 1);
  assert.equal(calculateLevel(50), 2);
  assert.equal(calculateLevel(100), 3);
});

test('Food candidate generator never selects cells occupied by snake', () => {
  const smallGrid = 4; // 16 cells total
  const snake = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
  ];
  const candidates = getAvailableCells(smallGrid, snake);
  assert.equal(candidates.length, 16 - 3);
  const overlaps = candidates.some(c => snake.some(s => s.x === c.x && s.y === c.y));
  assert.equal(overlaps, false);
});

test('SnakeSimulation steps, turns, eats, grows, and ends on crash', () => {
  const sim = new SnakeSimulation(20);
  assert.equal(sim.snake.length, 3);
  assert.equal(sim.score, 0);

  // Place food directly 1 tile in front of the head (head is at 6, 10 moving RIGHT -> next is 7, 10)
  sim.food = { x: 7, y: 10 };

  const res1 = sim.step();
  assert.equal(res1.moved, true);
  assert.equal(res1.ate, true);
  assert.equal(sim.score, 10);
  assert.equal(sim.snake.length, 4); // Grew!

  // Next step without food
  sim.food = { x: 0, y: 0 };
  const res2 = sim.step();
  assert.equal(res2.moved, true);
  assert.equal(res2.ate, false);
  assert.equal(sim.snake.length, 4); // Length preserved

  // Turn UP
  const res3 = sim.step(DIR.UP);
  assert.equal(res3.moved, true);
  assert.equal(sim.direction.name, 'UP');

  // Drive snake into top wall (y goes from 9 to -1)
  for (let i = 0; i < 15; i++) {
    sim.step();
  }
  assert.equal(sim.isGameOver, true);
});
