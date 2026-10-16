// Pure game logic decoupled for unit testing
export const GRID_SIZE = 20;
export const BASE_SPEED = 140;
export const MIN_SPEED = 65;
export const SPEED_DECREMENT = 2.5;
export const POINTS_PER_FOOD = 10;

export const DIR = {
  UP: { x: 0, y: -1, name: 'UP' },
  DOWN: { x: 0, y: 1, name: 'DOWN' },
  LEFT: { x: -1, y: 0, name: 'LEFT' },
  RIGHT: { x: 1, y: 0, name: 'RIGHT' },
};

export function isValidDirectionChange(currentDir, nextDir) {
  if (!nextDir) return false;
  // Cannot reverse 180 degrees
  if (nextDir.x === -currentDir.x && nextDir.y === 0) return false;
  if (nextDir.y === -currentDir.y && nextDir.x === 0) return false;
  return true;
}

export function checkWallCollision(head, gridSize = GRID_SIZE) {
  return head.x < 0 || head.x >= gridSize || head.y < 0 || head.y >= gridSize;
}

export function checkSelfCollision(newHead, snakeBody) {
  return snakeBody.some(segment => segment.x === newHead.x && segment.y === newHead.y);
}

export function calculateSpeed(foodsEaten) {
  const speed = BASE_SPEED - foodsEaten * SPEED_DECREMENT;
  return Math.max(MIN_SPEED, Math.round(speed));
}

export function calculateLevel(score) {
  return Math.floor(score / 50) + 1;
}

export function getAvailableCells(gridSize, snake) {
  const occupied = new Set(snake.map(s => `${s.x},${s.y}`));
  const available = [];
  for (let x = 0; x < gridSize; x++) {
    for (let y = 0; y < gridSize; y++) {
      if (!occupied.has(`${x},${y}`)) {
        available.push({ x, y });
      }
    }
  }
  return available;
}

export class SnakeSimulation {
  constructor(gridSize = GRID_SIZE) {
    this.gridSize = gridSize;
    this.reset();
  }

  reset() {
    this.snake = [
      { x: 6, y: 10 },
      { x: 5, y: 10 },
      { x: 4, y: 10 },
    ];
    this.direction = DIR.RIGHT;
    this.score = 0;
    this.foodsEaten = 0;
    this.isGameOver = false;
    this.food = { x: 10, y: 10 };
  }

  step(nextDir = null) {
    if (this.isGameOver) return { moved: false, ate: false, collision: true };

    if (nextDir && isValidDirectionChange(this.direction, nextDir)) {
      this.direction = nextDir;
    }

    const newHead = {
      x: this.snake[0].x + this.direction.x,
      y: this.snake[0].y + this.direction.y,
    };

    if (checkWallCollision(newHead, this.gridSize) || checkSelfCollision(newHead, this.snake)) {
      this.isGameOver = true;
      return { moved: false, ate: false, collision: true };
    }

    const ate = newHead.x === this.food.x && newHead.y === this.food.y;
    this.snake.unshift(newHead);

    if (ate) {
      this.score += POINTS_PER_FOOD;
      this.foodsEaten += 1;
      const available = getAvailableCells(this.gridSize, this.snake);
      if (available.length > 0) {
        this.food = available[0];
      }
    } else {
      this.snake.pop();
    }

    return { moved: true, ate, collision: false };
  }
}
