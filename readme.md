# My TypeScript Node.js Game Backend

## Introduction

A RESTful API backend for multi-genre games, built with Node.js, Express, TypeScript, MongoDB, and Redis. Supports user management, game rooms, realtime chat (Socket.io), items, rewards, leaderboard, JWT authentication, API documentation (Swagger), socket event documentation (AsyncAPI), and monitoring with Prometheus & Grafana. Easy deployment with Docker Compose and Nginx reverse proxy. Supports horizontal scaling with Redis adapter for Socket.io.

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
- Scalable, easy to extend, Docker Compose integration (MongoDB, Redis, Nginx)
- **Rate Limiting:** Prevents abuse and spam by limiting the number of requests per user/IP using Redis.
- **Monitoring:** Built-in Prometheus metrics endpoint and Grafana dashboard support for real-time monitoring and alerting.
- **Horizontal scaling:** Supports multi-container backend with Nginx reverse proxy and Redis adapter for Socket.io (all chat/game events are synchronized across containers).

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
├── nginx.conf            # Nginx reverse proxy config
├── package.json
├── tsconfig.json
├── README.md
├── k8s/
│   ├── app-deployment.yaml           # Triển khai backend Node.js/TypeScript
│   ├── nginx-deployment.yaml         # Triển khai Nginx reverse proxy
│   ├── nginx-configmap.yaml          # ConfigMap cho Nginx
│   ├── mongo-deployment.yaml         # Triển khai MongoDB
│   ├── redis-deployment.yaml         # Triển khai Redis
│   ├── prometheus-deployment.yaml    # Triển khai Prometheus
│   ├── prometheus-configmap.yaml     # ConfigMap cho Prometheus
│   ├── grafana-deployment.yaml       # Triển khai Grafana
│   └── README-k8s.md                 # Hướng dẫn sử dụng K8s
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

## Horizontal Scaling & Nginx Reverse Proxy

- The backend supports horizontal scaling (multi-container) using Docker Compose.
- Nginx acts as a reverse proxy and load balancer for all backend containers.
  Sticky session is not enabled by default. For WebSocket, sticky session is not required because the connection is persistent and handled by the same backend container. For long-polling, if you want to ensure all requests from the same client go to the same backend, you can enable sticky session (e.g., by cookie or header), but with WebSocket upgrade, this is usually not needed.
- Socket.io uses Redis adapter to synchronize events (chat, game, ...) across all containers.
- All WebSocket and HTTP traffic is routed through Nginx (port 80).
- Example Nginx config: see `nginx.conf`.

## Quick Start with Docker Compose

```sh
# Scale multiple backend and nginx containers (example: 4 app, 2 nginx)
docker compose up --scale app=4 --scale nginx=2 --build
```

- App: http://localhost:3000 (direct to app) or http://localhost (via Nginx/HAProxy)
- Swagger UI: http://localhost:3000/api-docs (direct) or http://localhost/api-docs (via Nginx/HAProxy)

## Scaling and Load Balancing

- To run multiple Nginx containers, remove `container_name` and use `expose: ["80"]` in your `docker-compose.yml` for nginx service.
- Use a load balancer (e.g., HAProxy) in front of all Nginx containers to distribute traffic.
- Example HAProxy config:

  ```haproxy
  frontend http-in
      bind *:80
      default_backend nginx_servers

  backend nginx_servers
      balance roundrobin
      server nginx1 nginx_1:80 check
      server nginx2 nginx_2:80 check
  ```

- Point your domain or client to the HAProxy IP/hostname.
- MongoDB: mongodb://localhost:27017/test (or MongoDB Atlas)
- Redis: redis://localhost:6379
- Socket.io: ws://localhost:3000 (or ws://localhost)
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001

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
  Visit [http://localhost/api-docs](http://localhost/api-docs) (Swagger UI) for interactive API docs and sample requests/responses. (If using Nginx reverse proxy, use port 80)
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

## Kubernetes (K8s) Support

Dự án hỗ trợ triển khai production-ready trên Kubernetes với các manifest mẫu trong thư mục `k8s/`:

- `app-deployment.yaml`: Triển khai backend Node.js/TypeScript
- `nginx-deployment.yaml`, `nginx-configmap.yaml`: Reverse proxy Nginx
- `mongo-deployment.yaml`, `redis-deployment.yaml`: Database & cache
- `prometheus-deployment.yaml`, `prometheus-configmap.yaml`: Monitoring
- `grafana-deployment.yaml`: Dashboard

### Triển khai nhanh với Minikube

1. **Chuẩn bị:**
   - Cài đặt `kubectl`, `minikube`, Docker.
   - Build & push image backend lên Docker Hub:
     ```sh
     docker login
     docker build -t boyastro/app:latest .
     docker push boyastro/app:latest
     ```
2. **Khởi động Minikube:**
   ```sh
   minikube start
   kubectl config use-context minikube
   ```
3. **Triển khai toàn bộ stack:**
   ```sh
   kubectl apply -f k8s/
   ```
4. **Kiểm tra trạng thái:**
   ```sh
   kubectl get pods
   kubectl get svc
   ```
5. **Truy cập dịch vụ:**
   - API/backend qua Nginx:
     ```sh
     minikube service nginx
     # hoặc http://127.0.0.1:<port> do minikube cung cấp
     ```
   - Grafana:
     ```sh
     minikube service grafana
     ```
6. **Cấu hình MongoDB:**
   - Dùng MongoDB nội bộ K8s (`mongodb://mongo:27017/gamedata`) hoặc MongoDB Atlas cloud (cập nhật biến môi trường `MONGO_URI`).
   - Nếu dùng Atlas, whitelist IP node/cluster trên trang Atlas.
7. **Scale, log, debug:**
   ```sh
   kubectl scale deployment app --replicas=5
   kubectl logs -l app=app
   kubectl describe pod <tên-pod>
   ```
8. **Xóa tài nguyên:**
   ```sh
   kubectl delete -f k8s/
   ```
9. **Lưu ý:**
   - Có thể mở rộng với Ingress, auto-scaling, RBAC, secret, ...
   - Tham khảo thêm file `k8s/README-k8s.md` để biết chi tiết cấu hình từng thành phần.

### Production/Cloud

- Có thể deploy lên GKE, EKS, AKS hoặc bất kỳ cluster K8s nào bằng cách apply các manifest trong `k8s/`.
- Nên cấu hình thêm Ingress, SSL, auto-scaling, RBAC, monitoring, alerting cho môi trường production.

## Horizontal Pod Autoscaler (HPA) cho Kubernetes

- Dự án đã cung cấp sẵn file `k8s/hpa.yaml` để tự động scale số lượng pod backend dựa trên mức sử dụng CPU.
- HPA sẽ tự động tăng/giảm số lượng pod của deployment app khi CPU trung bình vượt quá hoặc thấp hơn ngưỡng cấu hình (ví dụ: 70%).
- Cấu hình mẫu:
  ```yaml
  apiVersion: autoscaling/v2
  kind: HorizontalPodAutoscaler
  metadata:
    name: app-hpa
  spec:
    scaleTargetRef:
      apiVersion: apps/v1
      kind: Deployment
      name: app
    minReplicas: 3
    maxReplicas: 10
    metrics:
      - type: Resource
        resource:
          name: cpu
          target:
            type: Utilization
            averageUtilization: 70
  ```
- Để sử dụng:
  1. Đảm bảo đã cài đặt và fix xong metrics-server (xem hướng dẫn trong `k8s/README-k8s.md`).
  2. Apply HPA:
     ```sh
     kubectl apply -f k8s/hpa.yaml
     ```
  3. Kiểm tra trạng thái autoscale:
     ```sh
     kubectl get hpa
     ```
  4. Tăng tải (stress test) để kiểm tra HPA tự động scale pod.
- HPA giúp backend tự động mở rộng khi tải tăng cao và thu nhỏ khi tải giảm, tối ưu tài nguyên và chi phí vận hành.

Tham khảo chi tiết về HPA và metrics-server trong file `k8s/README-k8s.md`.

## Notes

- MongoDB and Redis data are stored in Docker volumes, so data is not lost when containers are restarted (unless the volume is deleted).
- Do not commit the `.env` file to git to protect sensitive information.
- If you encounter errors, check:
  - ESM/CommonJS configuration, import/export syntax suitable for your Node.js environment.
  - Container logs using `docker compose logs <service>` to see runtime error details.
  - Automated test results:
    - If you see `Test Suites: 1 passed, 1 total` and `Tests: 5 passed, 5 total`, it means all tests passed successfully.
    - If there are test errors, check your test files and Jest configuration (`jest.config.js` should use `module.exports`).
- To check tokens in Redis:
  ```sh
  docker compose exec redis redis-cli keys 'token:*'
  ```
- You can extend CI/CD to auto-deploy to your server/cloud by adding deploy steps in `.github/workflows/ci-cd.yml`.
- You can add custom metrics for Prometheus using `prom-client` in your code.
- If you want to add more practical tests for modules, create test files in the `tests/` folder or alongside the module.

---

For support, contact the dev or create an issue!
