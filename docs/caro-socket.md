# Caro Game Socket API Documentation

This document describes all Socket.io events for the Caro (Gomoku) game. Sử dụng cho cả backend và frontend/client để tích hợp realtime.

## Tổng quan

- Namespace: `/` (mặc định)
- URL: `ws://localhost:3000` hoặc production server
- Thư viện: [socket.io](https://socket.io/)

---

## Event List

### 1. caro:join

- **Client emit:** Tham gia phòng chơi
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

- **Client emit:** Rời phòng chơi
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

- **Client emit:** Gửi nước đi
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
  - Nếu thắng:
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

- **Client emit:** Gửi tin nhắn chat
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

- **Client emit:** Yêu cầu đồng bộ trạng thái bàn cờ (dành cho user mới vào/phục hồi kết nối)
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

- **Server emit:** Báo lỗi (nước đi không hợp lệ, v.v.)
- **Payload:**
  ```json
  {
    "message": "Invalid move"
  }
  ```

---

## Lưu ý

- Tất cả event đều truyền qua socket.io, client cần lắng nghe đúng tên event.
- Các event `caro:joined`, `caro:left`, `caro:move`, `caro:win`, `caro:chat`, `caro:sync`, `caro:error` là do server emit.
- Các event `caro:join`, `caro:leave`, `caro:move`, `caro:chat`, `caro:sync` là do client emit.

## Ví dụ sử dụng (client JS)

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

## Tham khảo thêm

- [Socket.io Docs](https://socket.io/docs/)
- [AsyncAPI Docs](https://www.asyncapi.com/docs/)
