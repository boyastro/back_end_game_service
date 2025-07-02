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
