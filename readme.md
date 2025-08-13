# My TypeScript Node.js Game Backend

## Introduction

A RESTful API backend for multi-genre games, built with Node.js, Express, TypeScript, MongoDB, and Redis. Supports user management, game rooms, realtime chat (Socket.io), items, rewards, leaderboard, JWT authentication, API documentation (Swagger), socket event documentation (AsyncAPI), and monitoring with Prometheus & Grafana. Easy deployment with Docker Compose and Nginx reverse proxy. Supports horizontal scaling with Redis adapter for Socket.io.

This backend also supports secure in-app purchases and payment processing via Stripe, allowing users to buy game items and features with real-time inventory updates after successful payment. All payment flows are handled safely with webhook verification and best practices for both development and production environments.

This project also supports advanced load balancing with HAProxy. HAProxy can be deployed in front of multiple Nginx and backend containers (on Docker Compose or Kubernetes) to distribute HTTP/WebSocket traffic efficiently, provide health checks, and enable high availability. Example manifests and configuration for HAProxy are included for both local and K8s environments, with a built-in monitoring dashboard for real-time traffic and backend health visualization.

The project is production-ready for Kubernetes (K8s) deployment, with sample manifests for all core services (backend, Nginx, MongoDB, Redis, Prometheus, Grafana, HAProxy, HPA) included. You can easily deploy, scale, monitor, and manage the entire stack on any K8s cluster (Minikube, GKE, EKS, AKS, etc.), with best practices for resource limits, autoscaling, service discovery, and secure configuration. See the `k8s/` folder and `k8s/README-k8s.md` for detailed instructions and manifest examples.

## About K3s

K3s is a lightweight, certified Kubernetes distribution designed for production workloads in resource-constrained environments, edge computing, and IoT. It is easy to install, requires minimal system resources, and is fully compatible with standard Kubernetes APIs and tooling. K3s is ideal for running Kubernetes clusters on virtual machines (such as AWS EC2), bare metal, or even on devices like Raspberry Pi. It simplifies cluster management, supports automatic updates, and is widely used for development, CI/CD, and production deployments where simplicity and efficiency are priorities.

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

## AI & Game Logic

- Built-in AI for games (e.g., caro, chess) using minimax, alpha-beta pruning, move ordering, killer moves, transposition table.
- Chess AI supports repetition avoidance, threefold repetition detection, opening principles (develop minor pieces, control center), and robust move ordering.
- Easily extendable for new games in `src/games/`.

## Testing & Quality Assurance

- All modules have sample tests in the `tests/` folder.
- Uses Jest for unit and integration tests.
- Key features (auth, game, payment, socket) are covered by automated tests.
- Run tests:
  ```sh
  npm test
  ```

## Extending & Customization

- Add new games by creating modules in `src/games/`.
- Extend item, quest, achievement schemas in `src/model/`.
- Integrate external services (email, push notification, analytics) via middleware or service modules.

## Security Best Practices

- Uses helmet, rate limit, and input validation to prevent XSS, SQL/NoSQL injection.
- All sensitive APIs require JWT authentication.
- Redis stores tokens for instant revocation.
- Never commit `.env` or secrets to git.

## Troubleshooting & FAQ

- MongoDB/Redis connection errors: check environment variables and container status.
- Stripe webhook issues: verify webhook config and backend logs.
- Socket.io not realtime: check Redis adapter and Nginx/HAProxy config.
- HTTP 429 errors: review rate limit settings.

## Contribution Guide

- Fork the repo, create a new branch, commit code, open a pull request.
- Write tests for new features.
- Ensure code follows TypeScript and ESLint standards.
- All contributions are reviewed via GitHub Actions CI/CD.

## Performance & Scaling Tips

- Use Redis adapter for Socket.io to scale realtime chat/game.
- Use HPA for automatic backend scaling under load.
- Monitor performance and alerts with Prometheus/Grafana.
- Consider CDN for static files if needed.

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
│   ├── app-deployment.yaml           # Deploy backend Node.js/TypeScript
│   ├── nginx-deployment.yaml         # Deploy Nginx reverse proxy
│   ├── nginx-configmap.yaml          # ConfigMap for Nginx
│   ├── mongo-deployment.yaml         # Deploy MongoDB
│   ├── redis-deployment.yaml         # Deploy Redis
│   ├── prometheus-deployment.yaml    # Deploy Prometheus
│   ├── prometheus-configmap.yaml     # ConfigMap for Prometheus
│   ├── grafana-deployment.yaml       # Deploy Grafana
│   └── README-k8s.md                 # K8s usage guide
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

- `app-deployment.yaml`: Deploy backend Node.js/TypeScript
- `nginx-deployment.yaml`, `nginx-configmap.yaml`: Deploy Nginx reverse proxy
- `mongo-deployment.yaml`, `redis-deployment.yaml`: Database & cache
- `prometheus-deployment.yaml`, `prometheus-configmap.yaml`: Monitoring
- `grafana-deployment.yaml`: Dashboard

### Quick Deployment with Minikube

1. **Preparation:**

- Install `kubectl`, `minikube`, Docker.
- Build & push backend image to Docker Hub:
  ```sh
  docker login
  docker build -t boyastro/app:latest .
  docker push boyastro/app:latest
  ```

2. **Start Minikube:**

```sh
minikube start
kubectl config use-context minikube
```

3. **Deploy the entire stack:**

```sh
kubectl apply -f k8s/
```

4. **Check status:**

```sh
kubectl get pods
kubectl get svc
```

5. **Access services:**

- API/backend via Nginx:
  ```sh
  minikube service nginx
  # or http://127.0.0.1:<port> provided by minikube
  ```
- Grafana:
  ```sh
  minikube service grafana
  ```

6. **Configure MongoDB:**

- Use internal K8s MongoDB (`mongodb://mongo:27017/gamedata`) or MongoDB Atlas cloud (update `MONGO_URI` env variable).
- If using Atlas, whitelist node/cluster IPs in Atlas dashboard.

7. **Scale, log, debug:**

```sh
kubectl scale deployment app --replicas=5
kubectl logs -l app=app
kubectl describe pod <pod-name>
```

8. **Delete resources:**

```sh
kubectl delete -f k8s/
```

9. **Notes:**

- Can extend with Ingress, auto-scaling, RBAC, secret, ...
- See `k8s/README-k8s.md` for detailed configuration of each component.

### Production/Cloud

- You can deploy to GKE, EKS, AKS or any K8s cluster by applying manifests in `k8s/`.
- Should configure Ingress, SSL, auto-scaling, RBAC, monitoring, alerting for production environments.

## Horizontal Pod Autoscaler (HPA) for Kubernetes

- The project provides `k8s/hpa.yaml` for automatic backend pod scaling based on CPU usage.
- HPA will automatically increase/decrease the number of pods in the app deployment when average CPU exceeds or falls below the configured threshold (e.g., 70%).
- Example configuration:
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
- To use:
  1. Make sure metrics-server is installed and fixed (see instructions in `k8s/README-k8s.md`).
  2. Apply HPA:
  ```sh
  kubectl apply -f k8s/hpa.yaml
  ```
  3. Check autoscale status:
  ```sh
  kubectl get hpa
  ```
  4. Stress test to verify HPA auto-scaling.
- HPA helps backend automatically scale out when load increases and scale in when load decreases, optimizing resources and operating costs.

See details about HPA and metrics-server in `k8s/README-k8s.md`.

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

# Deploying on AWS EC2 with Terraform and K3s

### 1. Preparation

- Register an AWS account and create an EC2 key pair (e.g., my-ec2-key.pem).
- Install AWS CLI, Terraform, and Docker (if you need to build images).
- Make sure you have built and pushed your backend image to Docker Hub:
  ```sh
  docker login
  docker build -t boyastro/app:latest .
  docker push boyastro/app:latest
  ```

### 2. Provision EC2 and Install K3s with Terraform

- Configure `terraform/main.tf` with:
  - Amazon Linux 2 AMI (x86_64, e.g., ami-004a7732acfcc1e2d)
  - Instance type: t2.micro (Free Tier)
  - Key pair, security group with open ports: 22 (SSH), 80, 443, 30081 (HAProxy NodePort), 6379 (Redis, if needed)
- Initialize and apply Terraform:
  ```sh
  cd terraform
  terraform init
  terraform apply
  ```
- Terraform will automatically:
  - Create EC2 and assign security group
  - Copy K8s manifests to EC2
  - Install K3s
  - Apply manifests (deploy backend, nginx, redis, haproxy, ...)

### 3. Configure Security Group

- Open necessary ports on EC2:
  - 22: SSH
  - 80, 443: HTTP/HTTPS (nginx/haproxy)
  - 30081: HAProxy NodePort (public for client/API Gateway)
  - 6379: Redis (should be private only)
- You can use AWS CLI to open ports:
  ```sh
  aws ec2 authorize-security-group-ingress --group-id <sg-id> --protocol tcp --port 30081 --cidr 0.0.0.0/0
  ```

### 4. Access Services

- Get EC2 public IP:
  ```sh
  terraform output
  # or check on AWS Console
  ```
- Access API/backend via HAProxy/nginx:
  - http://<EC2_IP>:30081 (HAProxy NodePort)
  - http://<EC2_IP> (if nginx/HAProxy listens on 80)
- Access Swagger UI:
  - http://<EC2_IP>:30081/api-docs

### 5. Integrate AWS API Gateway (optional)

- You can use Terraform to create an API Gateway reverse proxy to EC2/HAProxy/nginx.
- See `terraform/api-gateway/api-gateway.tf` for automated API Gateway resource, path mapping, stage, endpoint.
- After applying, access API via endpoint like:
  ```
  https://<api-id>.execute-api.<region>.amazonaws.com/prod/<path>
  ```
- Note: API Gateway HTTP/REST cannot proxy WebSocket/socket.io, only REST API.

### 6. Management, Logging, Debugging

- SSH into EC2:
  ```sh
  ssh -i my-ec2-key.pem ec2-user@<EC2_IP>
  ```
- Check pods, logs, events:
  ```sh
  sudo /usr/local/bin/k3s kubectl get pods
  sudo /usr/local/bin/k3s kubectl logs -l app=app
  sudo /usr/local/bin/k3s kubectl get svc
  sudo /usr/local/bin/k3s kubectl describe pod <pod-name>
  ```
- Copy YAML files between local and EC2:
  ```sh
  scp -i my-ec2-key.pem ./k3s/app-deployment.yaml ec2-user@<EC2_IP>:/home/ec2-user/k8s/
  scp -i my-ec2-key.pem ec2-user@<EC2_IP>:/home/ec2-user/k8s/app-deployment.yaml ./
  ```

### 7. Production Deployment Notes

- Use Elastic IP for EC2 to keep the IP static.
- Secure your ports, only open necessary public ports.
- You can integrate SSL (Let's Encrypt) on nginx/HAProxy.
- Use AWS security services: IAM, Security Group, WAF, CloudTrail, ...
- Monitor AWS costs and utilize Free Tier where possible.
