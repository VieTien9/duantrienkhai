# ĐỀ 10: HỆ THỐNG QUẢN LÝ NHÂN SỰ (HRM SYSTEM)
> **Đồ án Quản Trị Hệ Thống & Triển Khai Hạ Tầng Microservices**  
> Đáp ứng toàn diện **7 Tiêu Chí Đánh Giá Đề Tài** theo tiêu chuẩn Production & DevSecOps.

---

## 📑 MỤC LỤC
1. [Tổng Quan Kiến Trúc Hệ Thống](#1-tổng-quan-kiến-trúc-hệ-thống)
2. [Chi Tiết 7 Tiêu Chí Đánh Giá](#2-chi-tiết-7-tiêu-chí-đánh-giá)
3. [Cấu Trúc Thư Mục Dự Án](#3-cấu-trúc-thư-mục-dự-án)
4. [Hướng Dẫn Triển Khai & Khởi Chạy](#4-hướng-dẫn-triển-khai--khởi-chạy)
5. [Danh Sách Dịch Vụ, Cổng & Tài Khoản Mẫu](#5-danh-sách-dịch-vụ-cổng--tài-khoản-mẫu)
6. [Hướng Dẫn Sử Dụng pgAdmin Kết Nối Database](#6-hướng-dẫn-sử-dụng-pgadmin-kết-nối-database)
7. [Truy Vấn Mẫu Giám Sát Metrics (PromQL)](#7-truy-vấn-mẫu-giám-sát-metrics-promql)
8. [Truy Vấn Mẫu Quản Lý Log (LogQL) Cho Loki](#8-truy-vấn-mẫu-quản-lý-log-logql-cho-loki)
9. [Kiểm Tra & Nghiệm Thu Bảo Mật (Hardening & Isolation)](#9-kiểm-tra--nghiệm-thu-bảo-mật-hardening--isolation)

---

## 1. TỔNG QUAN KIẾN TRÚC HỆ THỐNG

Hệ thống Quản lý Nhân sự (HRM) được thiết kế theo mô hình **Multi-Container Architecture** với 9 dịch vụ độc lập, phối hợp nhịp nhàng:

```
[ Client / Browser (hrm.local) ]
             |
             v (Port 80)
    +------------------+
    |   hrm_nginx      | <--- Reverse Proxy + Security Hardening Headers
    +------------------+
       |            |
       | (proxy /)  | (proxy /pgadmin/)
       v            v
+------------+  +-------------+
| hrm_webapp |  | hrm_pgadmin |
+------------+  +-------------+
       \             /
        \           /  (backend_net - Isolated)
         v         v
    +---------------------+
    |   hrm_postgres_db   | (Port 5432 nội bộ)
    +---------------------+

------------------- GIÁM SÁT & LOGGING (frontend_net) -------------------
  [ hrm_cadvisor ] ----> [ hrm_prometheus ] <----+ [ hrm_webapp (/metrics) ]
                                 |
                                 v
                        [  hrm_grafana   ] <----+ [ hrm_loki ] <--- [ hrm_promtail ]
                        (Port 3001)                (Port 3100)       (Docker logs)
```

---

## 2. CHI TIẾT 7 TIÊU CHÍ ĐÁNH GIÁ

| STT | Tiêu Chí Đánh Giá | Giải Pháp Đã Triển Khai |
|:---:|:---|:---|
| **TC 1** | **Ứng dụng Web & Database** | Ứng dụng Node.js/Express đầy đủ chức năng quản lý nhân viên, phòng ban, điểm danh chấm công check-in/check-out; kết nối PostgreSQL tự động khởi tạo bảng và seed dữ liệu mẫu qua `01-init.sql`. |
| **TC 2** | **Đóng gói Docker & Hardening** | `Dockerfile` đa tầng (multi-stage build), tối ưu dung lượng với Alpine Linux, chạy dưới quyền tài khoản **non-root user `node` (UID 1000)** để ngăn chặn leo thang đặc quyền container breakout. |
| **TC 3** | **Nginx Reverse Proxy & Security Headers** | Định tuyến tên miền `hrm.local` vào Web App và `/pgadmin/` (hoặc `pgadmin.hrm.local`); ẩn phiên bản máy chủ `server_tokens off;` và trang bị đầy đủ **X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy**. |
| **TC 4** | **Giám sát Metrics (Prometheus + cAdvisor)** | Tích hợp thư viện `prom-client` xuất endpoint `/metrics` trên Web App; Prometheus định kỳ scrape dữ liệu hiệu năng app và container metrics từ cAdvisor mỗi 5 giây. |
| **TC 5** | **Trực quan hóa Grafana** | Tự động nạp sẵn (Provisioning) 2 nguồn dữ liệu **Prometheus** và **Loki** ngay khi container Grafana khởi động, không cần thao tác cấu hình thủ công. |
| **TC 6** | **Quản lý Log tập trung (Loki + Promtail)** | Promtail tự động thu thập stream log từ Docker socket (`/var/run/docker.sock`) của toàn bộ 9 container và đẩy về Loki; hỗ trợ truy vấn LogQL chi tiết. |
| **TC 7** | **Phân tách mạng (Network Isolation) & Bảo mật .env** | Thiết lập 2 mạng ảo riêng biệt: `frontend_net` (public access) và `backend_net` (private internal). **Database PostgreSQL chỉ nằm trong `backend_net`**, ngăn chặn hoàn toàn truy cập trực tiếp từ Nginx và Internet; quản lý biến môi trường qua `.env`. |

---

## 3. CẤU TRÚC THƯ MỤC DỰ ÁN

```
hrm-system/
├── app/                                 # Mã nguồn Web Application (Node.js/Express)
│   ├── public/                          # Giao diện Frontend hiện đại
│   │   ├── index.html                   # Giao diện Dashboard, Quản lý Nhân sự, Điểm danh
│   │   ├── style.css                    # Bảng màu sắc & phong cách giao diện hiện đại
│   │   └── app.js                       # Logic tương tác API, Modal & xử lý sự kiện
│   ├── server.js                        # REST API + Cấu hình Prometheus Metrics (/metrics)
│   ├── package.json                     # Danh sách phụ thuộc (express, pg, prom-client)
│   ├── Dockerfile                       # Dockerfile Hardening chạy dưới quyền user 'node'
│   └── .dockerignore                    # Loại bỏ node_modules khi đóng gói
├── nginx/                               # Cấu hình Reverse Proxy & Security Hardening
│   ├── nginx.conf                       # File cấu hình Nginx lõi, server_tokens off, gzip
│   └── conf.d/
│       └── hrm.conf                     # Virtual host hrm.local, proxy_pass & Security Headers
├── postgres/                            # Cấu hình khởi tạo Database
│   └── init/
│       └── 01-init.sql                  # Script tạo Schema + Dữ liệu mẫu (Seed Data)
├── prometheus/                          # Cấu hình Prometheus Scraper
│   └── prometheus.yml                   # Cấu hình scrape webapp:3000, cadvisor:8080, prometheus
├── grafana/                             # Cấu hình Provisioning Grafana
│   └── provisioning/
│       └── datasources/
│           └── datasources.yml          # Tự động kết nối Prometheus & Loki Datasource
├── loki/                                # Cấu hình Loki Log Aggregator
│   └── loki-config.yaml                 # Cấu hình lưu trữ chunks, schema TSDB
├── promtail/                            # Cấu hình Promtail Log Collector
│   └── promtail-config.yaml             # Thu thập log từ Docker containers qua socket
├── .env                                 # Biến môi trường hệ thống
├── .env.example                         # File biến môi trường mẫu
├── .gitignore                           # Danh sách loại trừ khi commit Git
├── docker-compose.yml                   # Tệp cấu hình tổng thể 9 dịch vụ & 2 mạng riêng biệt
└── README.md                            # Hướng dẫn chi tiết toàn diện
```

---

## 4. HƯỚNG DẪN TRIỂN KHAI & KHỞI CHẠY

### Bước 4.1: Cấu hình phân giải tên miền nội bộ (`/etc/hosts`)
Để truy cập dịch vụ qua tên miền `hrm.local` và `pgadmin.hrm.local`, thêm bản ghi sau vào file `/etc/hosts` (hoặc `C:\Windows\System32\drivers\etc\hosts` trên Windows):

```bash
# Mở file hosts với quyền sudo (Linux/macOS)
sudo nano /etc/hosts

# Thêm dòng sau:
127.0.0.1 hrm.local pgadmin.hrm.local
```

### Bước 4.2: Chuẩn bị tệp biến môi trường
File `.env` đã được chuẩn bị sẵn trong thư mục. Quý vị có thể xem hoặc tùy chỉnh nếu muốn:
```bash
cp -n .env.example .env
```

### Bước 4.3: Khởi chạy toàn bộ hệ thống bằng Docker Compose
Thực hiện lệnh sau tại thư mục gốc của dự án:

```bash
# Build ứng dụng webapp và khởi động toàn bộ 9 container ở chế độ chạy ngầm (detached)
docker-compose up -d --build
```

### Bước 4.4: Kiểm tra trạng thái các container
```bash
docker-compose ps
```
*Tất cả 9 container phải có trạng thái `Up` hoặc `Up (healthy)`.*

### Bước 4.5: Xem log khi cần kiểm tra
```bash
docker-compose logs -f webapp
docker-compose logs -f nginx
```

### Bước 4.6: Dừng hệ thống khi không sử dụng
```bash
docker-compose down
# Hoặc nếu muốn xóa sạch dữ liệu volume:
# docker-compose down -v
```

---

## 5. DANH SÁCH DỊCH VỤ, CỔNG & TÀI KHOẢN MẪU

| Dịch Vụ | Container Name | Cổng Truy Cập (Port) | Địa Chỉ Truy Cập (URL) | Tài Khoản Đăng Nhập |
|:---|:---|:---:|:---|:---|
| **HRM Web App (Qua Nginx)** | `hrm_nginx` | **80** | [http://hrm.local](http://hrm.local) hoặc [http://localhost](http://localhost) | Không cần login (truy cập trực tiếp) |
| **HRM Web App (Gốc)** | `hrm_webapp` | **3000** | [http://localhost:3000](http://localhost:3000) | Gốc Node.js nội bộ |
| **Prometheus Metrics** | `hrm_webapp` | **3000 / 80** | [http://hrm.local/metrics](http://hrm.local/metrics) | Công khai cho Scraper |
| **pgAdmin 4 (Qua Nginx)** | `hrm_nginx` | **80** | [http://hrm.local/pgadmin/](http://hrm.local/pgadmin/) | **User:** `admin@hrm.local`<br>**Pass:** `Admin@HRM2026!` |
| **pgAdmin 4 (Trực tiếp)** | `hrm_pgadmin` | **5050** | [http://localhost:5050](http://localhost:5050) | **User:** `admin@hrm.local`<br>**Pass:** `Admin@HRM2026!` |
| **Prometheus Server** | `hrm_prometheus` | **9090** | [http://localhost:9090](http://localhost:9090) | Không yêu cầu |
| **Grafana Dashboard** | `hrm_grafana` | **3001** | [http://localhost:3001](http://localhost:3001) | **User:** `admin`<br>**Pass:** `Admin@Grafana2026!` |
| **cAdvisor** | `hrm_cadvisor` | **8080** | [http://localhost:8080](http://localhost:8080) | Không yêu cầu |
| **Loki Log Engine** | `hrm_loki` | **3100** | [http://localhost:3100](http://localhost:3100) | REST API |
| **PostgreSQL Database** | `hrm_postgres_db` | **5432 (Nội bộ)** | Kết nối nội bộ qua `backend_net` | **DB:** `hrm_db`<br>**User:** `hrm_user`<br>**Pass:** `hrm_secure_password_2026` |

---

## 6. HƯỚNG DẪN SỬ DỤNG PGADMIN KẾT NỐI DATABASE

1. Mở trình duyệt và truy cập: [http://hrm.local/pgadmin/](http://hrm.local/pgadmin/) (hoặc [http://localhost:5050](http://localhost:5050)).
2. Đăng nhập với:
   - **Email:** `admin@hrm.local`
   - **Password:** `Admin@HRM2026!`
3. Tạo kết nối tới cơ sở dữ liệu PostgreSQL:
   - Nhấp chuột phải vào mục **Servers** chọn **Register** -> **Server...**
   - **Tab General:** Điền tên máy chủ gợi nhớ (Ví dụ: `HRM Database Server`).
   - **Tab Connection:**
     - **Host name/address:** `postgres_db` *(Tên hostname nội bộ container)*
     - **Port:** `5432`
     - **Maintenance database:** `hrm_db`
     - **Username:** `hrm_user`
     - **Password:** `hrm_secure_password_2026`
   - Bấm **Save**.
4. Truy cập các bảng `departments`, `employees`, `attendance` tại đường dẫn:  
   `Servers -> HRM Database Server -> Databases -> hrm_db -> Schemas -> public -> Tables`.

---

## 7. TRUY VẤN MẪU GIÁM SÁT METRICS (PROMQL)

Truy cập Prometheus tại [http://localhost:9090/graph](http://localhost:9090/graph) hoặc bảng điều khiển Grafana tại [http://localhost:3001](http://localhost:3001) và sử dụng các câu truy vấn sau:

### 7.1. Giám sát Ứng dụng HRM (Application Metrics):
- **Tổng số request nhận được theo route và status code:**
  ```promql
  sum(hrm_http_requests_total) by (route, status_code)
  ```
- **Tốc độ request trên giây (Request Rate per second):**
  ```promql
  sum(rate(hrm_http_requests_total[1m])) by (method, route)
  ```
- **Thời gian phản hồi 95th Percentile (P95 Latency) tính theo giây:**
  ```promql
  histogram_quantile(0.95, sum(rate(hrm_http_request_duration_seconds_bucket[5m])) by (le))
  ```
- **Tổng số nhân viên đang làm việc trong hệ thống:**
  ```promql
  hrm_employees_total
  ```
- **Số lượng lượt chấm công ngày hôm nay:**
  ```promql
  hrm_attendance_today_total
  ```

### 7.2. Giám sát Tài nguyên Container (cAdvisor Metrics):
- **Phần trăm CPU sử dụng của từng container (% CPU):**
  ```promql
  sum(rate(container_cpu_usage_seconds_total{name=~"hrm_.*"}[1m])) by (name) * 100
  ```
- **Dung lượng RAM đang tiêu thụ (Megabytes):**
  ```promql
  container_memory_usage_bytes{name=~"hrm_.*"} / 1024 / 1024
  ```
- **Băng thông mạng truyền vào (Network Ingress Bytes/s):**
  ```promql
  sum(rate(container_network_receive_bytes_total{name=~"hrm_.*"}[1m])) by (name)
  ```

---

## 8. TRUY VẤN MẪU QUẢN LÝ LOG (LOGQL) CHO LOKI

Truy cập Grafana [http://localhost:3001](http://localhost:3001) -> Vào mục **Explore** -> Chọn nguồn dữ liệu **Loki** ở thanh chọn phía trên.

- **Xem toàn bộ log thời gian thực của ứng dụng Web HRM:**
  ```logql
  {container="hrm_webapp"}
  ```
- **Tìm các bản ghi log chứa cảnh báo hoặc lỗi trong Web App:**
  ```logql
  {container="hrm_webapp"} |= "error"
  ```
- **Xem log truy cập của Nginx Reverse Proxy:**
  ```logql
  {container="hrm_nginx"}
  ```
- **Lọc các request HTTP phát sinh lỗi 5xx trên Nginx:**
  ```logql
  {container="hrm_nginx"} |~ "HTTP/1\\.[01]\" 5[0-9]{2}"
  ```
- **Xem log hoạt động và kết nối của cơ sở dữ liệu PostgreSQL:**
  ```logql
  {container="hrm_postgres_db"}
  ```
- **Đếm số lượng bản ghi log theo phút của container Webapp:**
  ```logql
  count_over_time({container="hrm_webapp"}[1m])
  ```

---

## 9. KIỂM TRA & NGHIỆM THU BẢO MẬT (HARDENING & ISOLATION)

### 9.1. Nghiệm thu Non-root User Container (Tiêu chí 2)
Kiểm tra container `hrm_webapp` không chạy dưới quyền `root`:
```bash
docker exec -it hrm_webapp whoami
# Kết quả trả về: node

docker exec -it hrm_webapp id
# Kết quả trả về: uid=1000(node) gid=1000(node)
```

### 9.2. Nghiệm thu Nginx Security Hardening Headers (Tiêu chí 3)
Kiểm tra các header bảo mật và việc ẩn phiên bản Nginx:
```bash
curl -I http://localhost
```
*Kết quả phản hồi chứa đầy đủ:*
```http
HTTP/1.1 200 OK
Server: nginx                      <-- Đã ẩn số phiên bản (server_tokens off)
X-Frame-Options: SAMEORIGIN        <-- Chống tấn công Clickjacking
X-Content-Type-Options: nosniff    <-- Chống MIME-sniffing
X-XSS-Protection: 1; mode=block    <-- Chống Cross-Site Scripting
Referrer-Policy: strict-origin-when-cross-origin
```

### 9.3. Nghiệm thu Phân tách mạng nội bộ (Network Isolation - Tiêu chí 7)
Container PostgreSQL (`hrm_postgres_db`) chỉ thuộc `backend_net` và hoàn toàn không nằm trong `frontend_net`. 
1. **Kiểm tra từ Nginx (nằm ở `frontend_net`):**
   ```bash
   docker exec -it hrm_nginx ping -c 2 postgres_db
   # Kết quả: Bad address / Destination Host Unreachable (Không thể phân giải / Không thể kết nối tới DB)
   ```
2. **Kiểm tra từ Webapp (nằm ở cả 2 mạng để làm cầu nối):**
   ```bash
   docker exec -it hrm_webapp ping -c 2 postgres_db
   # Kết quả: 2 packets transmitted, 2 received, 0% packet loss (Kết nối thành công)
   ```
3. **Kiểm tra từ bên ngoài máy Host:**
   Cổng 5432 của PostgreSQL **không hề được mở ra máy host** (`ports:` không map 5432), bảo vệ tuyệt đối dữ liệu doanh nghiệp khỏi các đợt scan port từ Internet.

---
**Chúc mừng bạn đã hoàn thành triển khai trọn gói Đề 10: Hệ thống Quản trị Nhân sự (HRM)!**
