// Caro (Gomoku) game logic module
// Implement turn-based logic, move validation, win check, etc.

export function validateMove(
  board: string[][],
  x: number,
  y: number,
  player: string
): boolean {
  // Check if move is inside the board
  if (
    x < 0 ||
    y < 0 ||
    x >= board.length ||
    y >= board[0].length ||
    board[x][y] !== ""
  ) {
    return false;
  }
  // Optionally: check if it's the correct player's turn
  return true;
}

export function checkWin(
  board: string[][],
  x: number,
  y: number,
  player: string
): boolean {
  // Check 5 in a row in all directions
  const directions = [
    [1, 0], // horizontal
    [0, 1], // vertical
    [1, 1], // diagonal down
    [1, -1], // diagonal up
  ];
  for (const [dx, dy] of directions) {
    let count = 1;
    for (let dir = -1; dir <= 1; dir += 2) {
      let nx = x + dx * dir;
      let ny = y + dy * dir;
      while (
        nx >= 0 &&
        ny >= 0 &&
        nx < board.length &&
        ny < board[0].length &&
        board[nx][ny] === player
      ) {
        count++;
        nx += dx * dir;
        ny += dy * dir;
      }
    }
    if (count >= 5) return true;
  }
  return false;
}

export function formatMovePayload(
  board: string[][],
  x: number,
  y: number,
  player: string
) {
  const isWin = checkWin(board, x, y, player);
  return { board, x, y, player, isWin };
}

export function formatChatPayload(user: string, message: string) {
  return { user, message };
}
