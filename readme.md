# My TypeScript Node.js Game Backend

## Introduction

A RESTful API backend for multi-genre games, built with Node.js, Express, TypeScript, MongoDB, and Redis. Supports user management, game rooms, realtime chat (Socket.io), items, rewards, leaderboard, JWT authentication, API documentation (Swagger), socket event documentation (AsyncAPI), and monitoring with Prometheus & Grafana. Easy deployment with Docker Compose.

## Key Features

- Register, login, JWT authentication, instant token revocation with Redis
- User management: profile, friends, block, friend requests
- Game room management: create/join/invite, realtime chat, room status
- Only room members can chat, anti-spam
- Item management: buy, use, receive rewards
- Daily rewards, quests, achievements
- Match history, score statistics, leaderboard
- Auto-generated API docs with Swagger, socket docs with AsyncAPI
- Realtime support (Socket.io) for chat and games (e.g., caro)
- Advanced security: token validation via Redis, active token revocation
- Scalable, easy to extend, Docker Compose integration (MongoDB, Redis)
- **Rate Limiting:** Prevents abuse and spam by limiting the number of requests per user/IP using Redis.
- **Monitoring:** Built-in Prometheus metrics endpoint and Grafana dashboard support for real-time monitoring and alerting.

## Project Structure

```
my-ts-app/
├── src/
│   ├── controllers/      # API logic
│   ├── model/            # MongoDB schemas
│   ├── routes/           # Express routes
│   ├── middleware/       # Middleware (logger, auth, ...)
│   ├── socket/           # Realtime logic (Socket.io)
│   ├── games/            # Game logic (e.g., caro)
│   ├── utils/            # Utilities (Redis connection, ...)
│   ├── swagger.ts        # Swagger config
│   └── index.ts          # App entry point
├── asyncapi.yaml         # Socket event documentation
├── Dockerfile
├── docker-compose.yml
├── package.json
├── tsconfig.json
└── README.md
```

## Rate Limiting

- The backend implements rate limiting using Redis to prevent abuse and spam (e.g., brute-force login, API spamming).
- By default, each IP is limited to 10 requests per minute for sensitive routes (such as authentication).
- If the limit is exceeded, the API will respond with HTTP 429 (Too Many Requests).
- You can adjust the rate limit and time window in `src/middleware/rateLimit.ts`.

## Monitoring with Prometheus & Grafana

- The backend exposes a `/metrics` endpoint (Prometheus format) using `prom-client`.
- Prometheus scrapes metrics from the app and stores them for analysis.
- Grafana connects to Prometheus and provides dashboards for:
  - Request rate, error rate, latency, memory, CPU, event loop lag, etc.
- To use:
  1. Start all services with Docker Compose (see below).
  2. Access Prometheus at [http://localhost:9090](http://localhost:9090)
  3. Access Grafana at [http://localhost:3001](http://localhost:3001) (default user/pass: admin/admin)
  4. Add Prometheus as a data source in Grafana (`http://prometheus:9090`)
  5. Create dashboards or import community dashboards for Node.js/Express/Prometheus.
- You can add custom metrics in code using `prom-client` if needed.

## Quick Start with Docker Compose

```sh
docker compose up --build
```

- App: http://localhost:3000
- Swagger UI: http://localhost:3000/api-docs
- MongoDB: mongodb://localhost:27017/test (or MongoDB Atlas)
- Redis: redis://localhost:6379
- Socket.io: ws://localhost:3000

## Local Development (without Docker)

1. Install Node.js >= 18, MongoDB, Redis locally
2. Install packages:
   ```sh
   npm install
   ```
3. Create a `.env` file:
   ```env
   MONGO_URI=mongodb://localhost:27017/test
   JWT_SECRET=your_secret
   REDIS_URL=redis://localhost:6379
   ```
4. Run in dev mode:
   ```sh
   npm run dev
   ```

## Example APIs

- `POST   /auth/register` : Register user (name, age, password)
- `POST   /auth/login` : Login, receive JWT
- `POST   /auth/logout` : Logout, revoke token
- `GET    /users` : Get user list
- `POST   /users/friend-request` : Send friend request
- `POST   /users/block` : Block user
- `GET    /users/inventory` : Get user's items
- `POST   /items/buy` : Buy item
- `POST   /items/use` : Use item
- `GET    /items` : Get item list
- `POST   /reward/daily` : Claim daily reward
- `GET    /leaderboard` : View leaderboard
- `POST   /rooms` : Create game room
- `POST   /rooms/:id/join` : Join room
- `POST   /rooms/:id/invite`: Invite friend to room
- `POST   /rooms/:id/chat` : Send chat in room (members only)
- `GET    /rooms/:id` : Get room info
- `POST   /match-history` : Save match history
- `GET    /match-history/:userId` : Get user's match history

## API & Socket Documentation

- **RESTful API:**  
  Visit [http://localhost:3000/api-docs](http://localhost:3000/api-docs) (Swagger UI) for interactive API docs and sample requests/responses.
- **Socket events:**  
  See `asyncapi.yaml` for detailed socket event documentation (chat, game, ...), following the AsyncAPI standard.

## Security & Authentication

- Uses JWT for authentication, stores tokens in Redis with TTL.
- Middleware checks token validity and existence in Redis (supports instant token revocation).
- Only authenticated users can access protected APIs.

## CI/CD with GitHub Actions

- The project includes a ready-to-use GitHub Actions workflow for CI/CD automation.
- On every push or pull request to the `main` branch, the workflow will:
  1. Checkout the code
  2. Set up Node.js and install dependencies
  3. Lint and test the code
  4. Build a Docker image
  5. Log in and push the image to Docker Hub
- **How to use:**
  1. Go to your GitHub repository → Settings → Secrets and variables → Actions
  2. Add two repository secrets:
     - `DOCKERHUB_USERNAME`: your Docker Hub username
     - `DOCKERHUB_TOKEN`: your Docker Hub access token (Read & Write)
  3. Push code to `main` or open a pull request to trigger the workflow
  4. Check workflow status in the **Actions** tab on GitHub
- You can extend the workflow to auto-deploy to your server or cloud by adding deployment steps in `.github/workflows/ci-cd.yml`.

## Notes

- MongoDB and Redis data are stored in Docker volumes, not lost on container restart (unless volume is deleted).
- Do not commit `.env` file to git.
- If you encounter errors, check ESM config, import/export syntax, or container logs.
- You can check tokens in Redis with:
  ```sh
  docker compose exec redis redis-cli keys 'token:*'
  ```

---

For support, contact the dev or create an issue!
