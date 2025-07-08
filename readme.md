# My TypeScript Node.js Game Backend

## Introduction

A RESTful API backend for multi-genre games, built with Node.js, Express, TypeScript, MongoDB, and Redis. Supports user management, game rooms, realtime chat (Socket.io), items, rewards, leaderboard, JWT authentication, API documentation (Swagger), socket event documentation (AsyncAPI), and monitoring with Prometheus & Grafana. Easy deployment with Docker Compose and Nginx reverse proxy. Supports horizontal scaling with Redis adapter for Socket.io.

This backend also supports secure in-app purchases and payment processing via Stripe, allowing users to buy game items and features with real-time inventory updates after successful payment. All payment flows are handled safely with webhook verification and best practices for both development and production environments.

This project also supports advanced load balancing with HAProxy. HAProxy can be deployed in front of multiple Nginx and backend containers (on Docker Compose or Kubernetes) to distribute HTTP/WebSocket traffic efficiently, provide health checks, and enable high availability. Example manifests and configuration for HAProxy are included for both local and K8s environments, with a built-in monitoring dashboard for real-time traffic and backend health visualization.

The project is production-ready for Kubernetes (K8s) deployment, with sample manifests for all core services (backend, Nginx, MongoDB, Redis, Prometheus, Grafana, HAProxy, HPA) included. You can easily deploy, scale, monitor, and manage the entire stack on any K8s cluster (Minikube, GKE, EKS, AKS, etc.), with best practices for resource limits, autoscaling, service discovery, and secure configuration. See the `k8s/` folder and `k8s/README-k8s.md` for detailed instructions and manifest examples.

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

## Load Balancing with HAProxy on Kubernetes

- The project supports HAProxy as a load balancer in front of nginx services to improve load distribution, scalability, and system monitoring.
- Example manifest for deploying HAProxy on K8s: `k8s/haproxy-deployment.yaml` (includes Deployment, Service, ConfigMap).
- HAProxy receives all HTTP requests from outside (via NodePort or port-forward) and distributes them to nginx pods in the cluster.
- You can access the HAProxy monitoring dashboard at: `http://<minikube-ip>:32404/stats` (default user/pass is empty).
- Usage:
  1. Apply the manifest:
     ```sh
     kubectl apply -f k8s/haproxy-deployment.yaml
     ```
  2. Access API/backend via HAProxy:
     - NodePort: `http://<minikube-ip>:30081`
     - Port-forward: `kubectl port-forward service/haproxy 8080:80` then access `http://localhost:8080`
  3. HAProxy dashboard: `http://<minikube-ip>:32404/stats` or port-forward `kubectl port-forward service/haproxy 8404:8404`
- HAProxy helps the system handle high traffic, easily scale nginx/backend, and monitor backend health via the dashboard.

See detailed configuration in `k8s/haproxy-deployment.yaml` and instructions in `k8s/README-k8s.md`.

## Stripe Payment Integration

The backend supports in-app purchases using Stripe for secure and flexible payment processing. Below is the recommended flow and integration guide:

### 1. Payment Flow Overview

- Client requests to buy an item (with itemId, userId).
- Backend looks up the item price and creates a Stripe PaymentIntent with the correct amount and metadata (userId, itemId).
- Backend returns the clientSecret to the client.
- Client uses Stripe.js (web) or Stripe SDK (mobile) to complete the payment using the clientSecret.
- Stripe processes the payment and, if successful, sends a webhook (payment_intent.succeeded) to the backend.
- Backend verifies the webhook, checks metadata, and updates the user's inventory (adds the purchased item).

### 2. Environment Variables

Add these to your `.env` or `docker-compose.yml`:

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 3. API Endpoints

- `POST /payments/create-payment-intent`  
  Request body: `{ amount, currency, userId, itemId }`  
  Returns: `{ clientSecret }`
- Webhook endpoint: `POST /stripe/webhook` (Stripe will call this automatically)

### 4. Security & Best Practices

- Always lookup item price on the backend, never trust client-sent amount.
- Only unlock items for the user after receiving and verifying the Stripe webhook.
- Use Stripe test cards for development (e.g., 4242 4242 4242 4242 for VISA).
- Never commit your Stripe secret keys to git.

### 5. Testing Stripe Webhook Locally

- Install Stripe CLI: https://stripe.com/docs/stripe-cli
- Run:  
  `stripe listen --forward-to localhost:8080/stripe/webhook`
- Use the webhook secret shown in the CLI output for STRIPE_WEBHOOK_SECRET.
- Test payments using Stripe test cards and check logs for webhook events.

### 6. References

- [Stripe Node.js SDK](https://stripe.com/docs/api)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)

See `docs/stripe-guide.md` for a more detailed step-by-step guide and troubleshooting tips.

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

## Triển khai lên AWS EC2 với Terraform và K3s

### 1. Chuẩn bị

- Đăng ký tài khoản AWS, tạo key pair EC2 (ví dụ: my-ec2-key.pem).
- Cài đặt AWS CLI, Terraform, Docker (nếu build image).
- Đảm bảo đã build và push image backend lên Docker Hub:
  ```sh
  docker login
  docker build -t boyastro/app:latest .
  docker push boyastro/app:latest
  ```

### 2. Tạo hạ tầng EC2 và cài đặt K3s bằng Terraform

- Cấu hình file `terraform/main.tf` với thông tin:
  - AMI Amazon Linux 2 (x86_64, ví dụ: ami-004a7732acfcc1e2d)
  - Instance type: t2.micro (Free Tier)
  - Key pair, security group đã mở port 22 (SSH), 80, 443, 30081 (NodePort HAProxy), 6379 (Redis, nếu cần)
- Khởi tạo và apply Terraform:
  ```sh
  cd terraform
  terraform init
  terraform apply
  ```
- Terraform sẽ tự động:
  - Tạo EC2, gán security group
  - Copy manifest K8s lên EC2
  - Cài đặt K3s
  - Apply manifest (triển khai backend, nginx, redis, haproxy, ...)

### 3. Cấu hình Security Group

- Mở port cần thiết trên EC2:
  - 22: SSH
  - 80, 443: HTTP/HTTPS (nginx/haproxy)
  - 30081: NodePort HAProxy (public cho client/API Gateway)
  - 6379: Redis (nên chỉ mở private)
- Có thể dùng AWS CLI để mở port:
  ```sh
  aws ec2 authorize-security-group-ingress --group-id <sg-id> --protocol tcp --port 30081 --cidr 0.0.0.0/0
  ```

### 4. Truy cập dịch vụ

- Lấy public IP EC2:
  ```sh
  terraform output
  # hoặc xem trên AWS Console
  ```
- Truy cập API/backend qua HAProxy/nginx:
  - http://<EC2_IP>:30081 (NodePort HAProxy)
  - http://<EC2_IP> (nếu dùng nginx/HAProxy listen 80)
- Truy cập Swagger UI:
  - http://<EC2_IP>:30081/api-docs

### 5. Tích hợp AWS API Gateway (tuỳ chọn)

- Có thể dùng Terraform để tạo API Gateway reverse proxy về EC2/HAProxy/nginx.
- Tham khảo file `terraform/api-gateway/api-gateway.tf` để tự động hoá resource API Gateway, mapping path, stage, endpoint.
- Sau khi apply, truy cập API qua endpoint dạng:
  ```
  https://<api-id>.execute-api.<region>.amazonaws.com/prod/<path>
  ```
- Lưu ý: API Gateway HTTP/REST không proxy được WebSocket/socket.io, chỉ dùng cho REST API.

### 6. Quản trị, log, debug

- SSH vào EC2:
  ```sh
  ssh -i my-ec2-key.pem ec2-user@<EC2_IP>
  ```
- Kiểm tra pod, log, event:
  ```sh
  sudo /usr/local/bin/k3s kubectl get pods
  sudo /usr/local/bin/k3s kubectl logs -l app=app
  sudo /usr/local/bin/k3s kubectl get svc
  sudo /usr/local/bin/k3s kubectl describe pod <pod-name>
  ```
- Copy file YAML giữa local và EC2:
  ```sh
  scp -i my-ec2-key.pem ./k3s/app-deployment.yaml ec2-user@<EC2_IP>:/home/ec2-user/k8s/
  scp -i my-ec2-key.pem ec2-user@<EC2_IP>:/home/ec2-user/k8s/app-deployment.yaml ./
  ```

### 7. Lưu ý khi triển khai production

- Nên dùng Elastic IP cho EC2 để IP không thay đổi.
- Bảo mật port, chỉ mở port public cần thiết.
- Có thể tích hợp thêm SSL (Let's Encrypt) trên nginx/HAProxy.
- Sử dụng các dịch vụ bảo mật AWS: IAM, Security Group, WAF, CloudTrail, ...
- Theo dõi chi phí AWS, tận dụng Free Tier.

---
