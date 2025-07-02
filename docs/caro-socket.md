# Caro Game Socket API Documentation

This document describes all Socket.io events for the Caro (Gomoku) game. Use this for both backend and frontend/client to integrate realtime features.

## Overview

- Namespace: `/` (default)
- URL: `ws://localhost:3000` or your production server
- Library: [socket.io](https://socket.io/)

---

## Event List

### 1. caro:join

- **Client emit:** Join a game room
- **Payload:**
  ```json
  {
    "roomId": "room1"
  }
  ```
- **Server broadcast:**
  - Event: `caro:joined`
  - Payload:
    ```json
    {
      "userId": "user123",
      "roomId": "room1"
    }
    ```

---

### 2. caro:leave

- **Client emit:** Leave a game room
- **Payload:**
  ```json
  {
    "roomId": "room1"
  }
  ```
- **Server broadcast:**
  - Event: `caro:left`
  - Payload:
    ```json
    {
      "userId": "user123",
      "roomId": "room1"
    }
    ```

---

### 3. caro:move

- **Client emit:** Send a move
- **Payload:**
  ```json
  {
    "roomId": "room1",
    "board": [
      ["X", "O", ""],
      ["", "X", "O"],
      ["", "", ""]
    ],
    "x": 1,
    "y": 2,
    "player": "X"
  }
  ```
- **Server broadcast:**
  - Event: `caro:move`
  - Payload:
    ```json
    {
      "roomId": "room1",
      "board": [
        ["X", "O", ""],
        ["", "X", "O"],
        ["", "", ""]
      ],
      "x": 1,
      "y": 2,
      "player": "X",
      "isWin": false
    }
    ```
  - If win:
    - Event: `caro:win`
    - Payload:
      ```json
      {
        "winner": "X",
        "board": [[...]]
      }
      ```

---

### 4. caro:chat

- **Client emit:** Send a chat message
- **Payload:**
  ```json
  {
    "roomId": "room1",
    "user": "user1",
    "message": "Hello!"
  }
  ```
- **Server broadcast:**
  - Event: `caro:chat`
  - Payload:
    ```json
    {
      "user": "user1",
      "message": "Hello!"
    }
    ```

---

### 5. caro:sync

- **Client emit:** Request to sync board state (for new users or reconnect)
- **Payload:**
  ```json
  {
    "roomId": "room1",
    "board": [[...]]
  }
  ```
- **Server broadcast:**
  - Event: `caro:sync`
  - Payload:
    ```json
    {
      "board": [[...]]
    }
    ```

---

### 6. caro:error

- **Server emit:** Error notification (invalid move, etc.)
- **Payload:**
  ```json
  {
    "message": "Invalid move"
  }
  ```

---

## Notes

- All events are transmitted via socket.io, client must listen to the correct event names.
- Events `caro:joined`, `caro:left`, `caro:move`, `caro:win`, `caro:chat`, `caro:sync`, `caro:error` are emitted by the server.
- Events `caro:join`, `caro:leave`, `caro:move`, `caro:chat`, `caro:sync` are emitted by the client.

## Example usage (client JS)

```js
const socket = io("ws://localhost:3000");
socket.emit("caro:join", "room1");
socket.on("caro:joined", (data) => {
  /* ... */
});
socket.emit("caro:move", { roomId, board, x, y, player });
socket.on("caro:move", (data) => {
  /* ... */
});
socket.on("caro:win", (data) => {
  /* ... */
});
socket.emit("caro:chat", { roomId, user, message });
socket.on("caro:chat", (data) => {
  /* ... */
});
socket.on("caro:error", (err) => {
  alert(err.message);
});
```

---

## Further reference

- [Socket.io Docs](https://socket.io/docs/)
- [AsyncAPI Docs](https://www.asyncapi.com/docs/)
