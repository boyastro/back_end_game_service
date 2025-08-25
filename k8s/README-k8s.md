# Hướng dẫn triển khai & vận hành Kubernetes (K8s) cho dự án

## 1. Yêu cầu môi trường

- Đã cài đặt `kubectl` (CLI quản lý K8s)
- Đã cài đặt Minikube (hoặc kết nối tới cluster K8s cloud)
- Đã cài đặt Docker, Docker Hub (nếu build & push image)

## 2. Cấu trúc thư mục `k8s/`

- `app-deployment.yaml`: Deployment & Service cho backend Node.js/TypeScript
- `nginx-deployment.yaml`, `nginx-configmap.yaml`: Reverse proxy Nginx
- `mongo-deployment.yaml`, `redis-deployment.yaml`: Database & cache
- `prometheus-deployment.yaml`, `prometheus-configmap.yaml`: Monitoring
- `grafana-deployment.yaml`: Dashboard
- Các file khác: configmap, ingress, ...

## 3. Build & push Docker image

```sh
docker login
# Build image backend
cd .. # về thư mục gốc dự án
docker build -t boyastro/app:latest .
docker push boyastro/app:latest
```

## 4. Khởi động Minikube

```sh
minikube start
kubectl config use-context minikube
```

## 5. Triển khai toàn bộ tài nguyên K8s

```sh
kubectl apply -f k8s/
```

## 6. Kiểm tra trạng thái

```sh
kubectl get pods
kubectl get svc
```

## 7. Truy cập dịch vụ

- Truy cập backend/API qua Nginx:
  ```sh
  minikube service nginx
  ```
- Truy cập Grafana:
  ```sh
  minikube service grafana
  # hoặc truy cập http://<minikube-ip>:32000
  ```

### Dùng port-forward để truy cập Grafana

Nếu không muốn expose NodePort, bạn có thể dùng lệnh sau để truy cập Grafana qua localhost:

```sh
kubectl port-forward service/grafana 3001:3000
```

- Sau đó truy cập: http://localhost:3001
- Cửa sổ terminal phải luôn mở để duy trì port-forward.
- Có thể đổi `3001` thành port local khác nếu muốn.

### Đưa cổng Grafana ra ngoài bằng port-forward

Nếu không muốn dùng NodePort, bạn có thể port-forward Grafana ra localhost:

```sh
kubectl port-forward -n <namespace> service/grafana 3001:3000
```

- Thay `<namespace>` bằng namespace Grafana đang chạy (ví dụ: `default` hoặc `monitoring`).
- Sau đó truy cập: http://localhost:3001
- Có thể đổi `3001` thành port local khác nếu muốn.
- Cửa sổ terminal phải luôn mở để duy trì port-forward.

## 8. Expose service với port cố định bằng kubectl port-forward

Nếu bạn muốn truy cập service qua một port cố định trên máy local (thay vì port ngẫu nhiên do minikube tunnel tạo ra), hãy dùng lệnh sau:

```sh
kubectl port-forward service/nginx 8080:80
```

- Truy cập Nginx qua: http://localhost:8080
- Thay `8080` bằng port local bạn muốn, `80` là port của service trong cluster.

Tương tự, với MongoDB:

```sh
kubectl port-forward service/mongo 27017:27017
```

- Truy cập MongoDB qua: mongodb://localhost:27017

**Lưu ý:**

- Cửa sổ terminal phải luôn mở để duy trì port-forward.
- Port local (bên trái dấu `:`) là cố định nếu bạn chỉ định rõ.

## 9. Scale số lượng pod

```sh
kubectl scale deployment app --replicas=5
```

## 10. Xem log, debug

```sh
kubectl logs -l app=app
kubectl describe pod <tên-pod>
```

## 11. Xóa tài nguyên

```sh
kubectl delete -f k8s/
```

## 12. Một số lưu ý

- Sửa file YAML, apply lại để cập nhật cấu hình.
- Đảm bảo image backend đã được push lên Docker Hub trước khi deploy.
- Có thể mở rộng thêm Ingress, auto-scaling, RBAC, secret, ...

## 13. Tài liệu tham khảo

- https://kubernetes.io/docs/
- https://minikube.sigs.k8s.io/docs/
- https://hub.docker.com/

---

## 14. HPA (Horizontal Pod Autoscaler) & Metrics-server

### Triển khai HPA:

- File ví dụ: `hpa.yaml`
- kubectl port-forward service/haproxy 8080:80
- Apply:
  ```sh
  kubectl apply -f k8s/hpa.yaml
  ```
- Kiểm tra trạng thái HPA:
  ```sh
  kubectl get hpa
  # Kết quả đúng sẽ có cột TARGETS dạng cpu: 15%/70%
  ```

### Cài & sửa lỗi metrics-server (bắt buộc để HPA hoạt động):

- Kiểm tra pod metrics-server:
  ```sh
  kubectl get pods -n kube-system | grep metrics-server
  ```
- Nếu pod 0/1 hoặc lỗi TLS, cần thêm tham số `--kubelet-insecure-tls` vào phần args của deployment metrics-server:
  1. Sửa bằng Dashboard hoặc xuất YAML ra file, thêm dòng:
     ```yaml
     args:
       - --kubelet-insecure-tls
     ```
  2. Apply lại deployment:
     ```sh
     kubectl apply -f <file-yaml>
     ```
  3. Xóa pod metrics-server để rollout lại:
     ```sh
     kubectl delete pod -n kube-system -l k8s-app=metrics-server
     ```

### Kiểm tra metrics CPU, log:

- Xem metrics pod:
  ```sh
  kubectl top pod
  kubectl top pod | grep app
  kubectl top node
  ```
- Xem log pod app:
  ```sh
  kubectl logs <tên-pod-app>
  kubectl logs -l app=app
  kubectl logs -f <tên-pod-app> # realtime
  ```

---

## 15. Cài đặt & sử dụng Kubernetes Dashboard

### Cài đặt Dashboard:

```sh
kubectl apply -f https://raw.githubusercontent.com/kubernetes/dashboard/v2.7.0/aio/deploy/recommended.yaml
```

### Tạo tài khoản admin:

```sh
kubectl apply -f k8s/dashboard-admin.yaml
```

### Lấy token đăng nhập:

```sh
kubectl -n kubernetes-dashboard create token admin-user
```

### Mở Dashboard:

```sh
minikube dashboard
# hoặc
kubectl proxy
# rồi truy cập http://localhost:8001/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/
```

### Sửa deployment bằng Dashboard:

- Vào menu Deployments, namespace kube-system, chọn metrics-server, nhấn Edit, thêm/thay đổi args như hướng dẫn ở trên, nhấn Save.

---

## 16. Một số lệnh cơ bản để xem thông tin trong Kubernetes

| Lệnh                                                     | Chức năng                                                       |
| -------------------------------------------------------- | --------------------------------------------------------------- |
| kubectl get pods                                         | Xem danh sách pod trong namespace hiện tại                      |
| kubectl get pods -A                                      | Xem pod ở tất cả namespace                                      |
| kubectl get svc                                          | Xem danh sách service                                           |
| kubectl get deployment                                   | Xem danh sách deployment                                        |
| kubectl get hpa                                          | Xem trạng thái autoscaling (HPA)                                |
| kubectl get node                                         | Xem thông tin node trong cluster                                |
| kubectl describe pod <tên-pod>                           | Xem chi tiết pod (event, log, trạng thái)                       |
| kubectl logs <tên-pod>                                   | Xem log của pod                                                 |
| kubectl top pod                                          | Xem metrics CPU/Memory của pod (cần metrics-server)             |
| kubectl top node                                         | Xem metrics CPU/Memory của node                                 |
| kubectl get events --sort-by=.metadata.creationTimestamp | Xem các sự kiện gần nhất trong cluster                          |
| kubectl get all                                          | Xem tất cả resource (pod, svc, deployment, ...) trong namespace |

Bạn có thể thay <tên-pod> bằng tên thực tế, hoặc thêm -n <namespace> để chỉ định namespace.

---

## 17. Truy vấn log thanh toán trong Loki/Grafana

### 1. Truy vấn log payment/stripe trong Loki (Grafana > Explore)

- Truy vấn log liên quan đến payment:
  ```logql
  {app="app"} |= "payment"
  ```
- Truy vấn log liên quan đến Stripe:
  ```logql
  {app="app"} |= "stripe"
  ```
- Truy vấn log Stripe webhook:
  ```logql
  {app="app"} |= "stripe" |= "webhook"
  ```
- Truy vấn log payment có lỗi:
  ```logql
  {app="app"} |= "payment" |= "error"
  ```
- Truy vấn nhiều từ khoá (AND):
  ```logql
  {app="app"} |= "stripe" |= "success"
  ```
- Truy vấn nhiều từ khoá (OR):
  ```logql
  {app="app"} |~ "stripe|payment|checkout"
  ```

### 2. Lưu ý

- Đảm bảo Promtail đã thu thập log app và gửi về Loki.
- Nếu chưa thấy log payment/stripe, kiểm tra lại cấu hình Promtail, đường dẫn log, hoặc log app đã in ra đúng format chưa.
- Có thể filter thêm theo namespace, pod, hoặc các trường đặc thù nếu log có chứa.

---

## 18. Xem log info của app

### 1. Xem log info qua kubectl

- Xem toàn bộ log app:
  ```sh
  kubectl logs -l app=app
  ```
- Xem realtime:
  ```sh
  kubectl logs -f -l app=app
  ```
- Lọc log info (nếu app log theo level, ví dụ có từ "info"):
  ```sh
  kubectl logs -l app=app | grep info
  ```

### 2. Xem log info qua Loki/Grafana

- Vào Grafana > Explore, truy vấn:
  ```logql
  {app="app"} |= "info"
  ```
- Hoặc xem toàn bộ log app:
  ```logql
  {app="app"}
  ```
- Có thể filter thêm theo namespace, pod, hoặc từ khoá khác.

### 3. Lưu ý

- Nếu app chưa log theo level (info, error, warn...), nên chuẩn hoá log để dễ filter.
- Promtail sẽ thu thập stdout/stderr của container, nên mọi log `console.log` đều sẽ xuất hiện ở đây.

---

## Cài đặt Loki bằng Helm

Bạn có thể cài Loki (và Promtail) nhanh chóng bằng Helm chart chính thức:

### 1. Thêm repo Helm Loki

```sh
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update
```

### 2. Cài đặt Loki

```sh
helm install loki grafana/loki-stack --set promtail.enabled=true
```

- Lệnh này sẽ cài cả Loki, Promtail, và các thành phần liên quan.
- Nếu muốn chỉ cài Loki:
  ```sh
  helm install loki grafana/loki
  ```

### 3. Kiểm tra pod/service

```sh
kubectl get pods -l app.kubernetes.io/name=loki
kubectl get svc -l app.kubernetes.io/name=loki
```

### 4. Truy cập Loki từ Grafana

- Nếu Grafana và Loki ở **cùng namespace** (ví dụ đều ở `monitoring`):
  - Thêm datasource Loki trong Grafana với URL: `http://loki:3100`
- Nếu Grafana và Loki ở **khác namespace**:
  - Thêm datasource Loki với URL: `http://loki.<namespace-loki>.svc.cluster.local:3100`
    - Ví dụ: Loki ở namespace `monitoring`, URL sẽ là: `http://loki.monitoring.svc.cluster.local:3100`
- Nếu dùng port-forward:

  ```sh
  kubectl port-forward -n <namespace-loki> service/loki 3100:3100
  ```

  → Truy cập Loki qua: `http://localhost:3100`

- Đảm bảo Grafana có thể resolve đúng DNS nội bộ hoặc sử dụng port-forward nếu chạy ngoài cluster.

### 5. Gỡ cài đặt Loki

```sh
helm uninstall loki
```

### 6. Lưu ý

- Có thể custom cấu hình bằng các tham số `--set` hoặc file values.yaml.
- Nếu cluster có nhiều namespace, có thể thêm `-n <namespace>` vào các lệnh trên.

ssh -i my-ec2-key.pem ec2-user@54.179.50.108
scp -i my-ec2-key.pem /k8s/app-deployment.yaml ec2-user@154.179.50.108:/home/ec2-user/
sudo /usr/local/bin/k3s kubectl get pods
sudo /usr/local/bin/k3s kubectl get svc
sudo /usr/local/bin/k3s kubectl logs <tên-pod>
sudo /usr/local/bin/k3s kubectl logs -l app=app

# Hiển thị log thời gian thực của app nào đó

kubectl logs -l app=nginx -f

# Hiển thị log thời gian thực của app nào đó

kubectl logs <tên-pod> -f

kubectl logs -l app=app -f

kubectl delete -f app-deployment.yaml
kubectl apply -f app-deployment.yaml

kubectl delete pod --all

# Khởi động lại k3s

sudo systemctl restart k3s

# Áp dụng cho Folder hiện tại

kubectl apply -f .
sudo /usr/local/bin/k3s kubectl get pods
kubectl apply -f redis-deployment.yaml
kubectl apply -f app-deployment.yaml
kubectl apply -f nginx-configmap.yaml
kubectl apply -f nginx-deployment.yaml
kubectl apply -f haproxy-deployment.yaml

# Copy file từ server về Destop

scp -i my-ec2-key.pem ec2-user@54.179.50.108:~/\*.yaml ~/Desktop/

# Copy file từ local lên Ec2

scp -i my-ec2-key.pem ./k3s/app-deployment.yaml ec2-user@54.179.50.108:/home/ec2-user/

# Copy file từ Modal từ local lên Ec2

mkdir model
scp -i my-ec2-key.pem ./tfjs_model/model.json ec2-user@54.179.50.108:/home/ec2-user/
scp -i my-ec2-key.pem ./tfjs_model/group1-shard1of1.bin ec2-user@54.179.50.108:/home/ec2-user/

# Tạo Docker mới chạy trên linux(t2.micro)

docker buildx build --platform linux/amd64 -t boyastro/app:latest . --push

# Gỡ cài đặt K3s

sudo /usr/local/bin/k3s-uninstall.sh

# Cài đặt K3s

curl -sfL https://get.k3s.io | INSTALL_K3S_SKIP_SELINUX_RPM=true sh -

# Xóa dữ liệu cũ (nếu muốn sạch hoàn toàn)

sudo rm -rf /etc/rancher/k3s
sudo rm -rf /var/lib/rancher/k3s

# Kiểm tra sự kiện (events) liên quan đến Redis:

kubectl describe pod -l app=redis
