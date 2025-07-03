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
