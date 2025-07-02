# HAProxy Load Balancer với Nginx (Docker)

## Mô hình tổng quan

```
Client
   |
   v
[HAProxy]  <--- Load balancer
   |
   +---> [Nginx 1] ----> [Backend Node.js]
   +---> [Nginx 2] ----> [Backend Node.js]
```

## Hướng dẫn triển khai

### 1. Chuẩn bị

- Đảm bảo đã cài Docker và Docker Compose.
- Clone hoặc tạo thư mục chứa các file cấu hình: `docker-compose.yml`, `haproxy.cfg`.

### 2. Cấu hình docker-compose.yml

```yaml
services:
  haproxy:
    image: haproxy:latest
    container_name: haproxy
    ports:
      - "80:80"
      - "8404:8404"
    volumes:
      - ./haproxy.cfg:/usr/local/etc/haproxy/haproxy.cfg:ro
    restart: unless-stopped
    networks:
      - lbnet

networks:
  lbnet:
    driver: bridge
```

### 3. Cấu hình haproxy.cfg

```haproxy
global
    # log /dev/log local0
    maxconn 4096
    daemon

defaults
    log     global
    mode    http
    option  httplog
    timeout connect 5s
    timeout client  50s
    timeout server  50s

frontend http-in
    bind *:80
    default_backend nginx_servers

backend nginx_servers
    balance roundrobin
    option httpchk GET /
    server nginx-1 <IP_NGINX_1>:80 check
    server nginx-2 <IP_NGINX_2>:80 check

listen stats
    bind *:8404
    stats enable
    stats uri /stats
    stats refresh 10s
```

> Thay `<IP_NGINX_1>` và `<IP_NGINX_2>` bằng IP thực tế của các container Nginx (xem bằng `docker network inspect <network>`)

### 4. Kết nối các container Nginx vào network của HAProxy

Nếu Nginx chạy ở project khác:

```sh
docker network connect haproxy_lbnet <tên-container-nginx-1>
docker network connect haproxy_lbnet <tên-container-nginx-2>
```

### 5. Khởi động HAProxy

```sh
docker compose up -d
```

### 6. Kiểm tra hoạt động

- Truy cập http://localhost để kiểm tra load balancing.
- Truy cập http://localhost:8404/stats để xem dashboard HAProxy.
- Xem log các container để kiểm tra request được phân phối đều.

### 7. Lưu ý

- Không nên chạy HAProxy và Nginx trong cùng một container.
- Nếu cần thêm Nginx, chỉ cần connect vào network và thêm vào haproxy.cfg.
- Nếu gặp cảnh báo log, có thể bỏ dòng `log /dev/log local0` trong haproxy.cfg.

---

Nếu cần ví dụ cho HTTPS, sticky session, hoặc tích hợp backend Node.js, hãy liên hệ để được hướng dẫn chi tiết hơn!
