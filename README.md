# ĐỀ 10: HỆ THỐNG QUẢN LÝ NHÂN SỰ (HRM SYSTEM)
> **Đồ án Quản Trị Hệ Thống & Triển Khai Hạ Tầng Microservices**  
> Đáp ứng toàn diện **7 Tiêu Chí Đánh Giá Đề Tài** theo tiêu chuẩn Production & DevSecOps.  
> **Cơ sở dữ liệu:** MySQL 8.0 & phpMyAdmin

---

## 📑 MỤC LỤC
1. [Tổng Quan Kiến Trúc Hệ Thống](#1-tổng-quan-kiến-trúc-hệ-thống)
2. [Chi Tiết 7 Tiêu Chí Đánh Giá](#2-chi-tiết-7-tiêu-chí-đánh-giá)
3. [Cấu Trúc Thư Mục Dự Án](#3-cấu-trúc-thư-mục-dự-án)
4. [Hướng Dẫn Triển Khai & Khởi Chạy](#4-hướng-dẫn-triển-khai--khởi-chạy)
5. [Danh Sách Dịch Vụ, Cổng & Tài Khoản Mẫu](#5-danh-sách-dịch-vụ-cổng--tài-khoản-mẫu)
6. [Hướng Dẫn Sử Dụng phpMyAdmin](#6-hướng-dẫn-sử-dụng-phpmyadmin)
7. [Truy Vấn Mẫu Giám Sát Metrics (PromQL)](#7-truy-vấn-mẫu-giám-sát-metrics-promql)
8. [Truy Vấn Mẫu Quản Lý Log (LogQL) Cho Loki](#8-truy-vấn-mẫu-quản-lý-log-logql-cho-loki)
9. [Kiểm Tra & Nghiệm Thu Bảo Mật (Hardening & Isolation)](#9-kiểm-tra--nghiệm-thu-bảo-mật-hardening--isolation)

---

## 1. TỔNG QUAN KIẾN TRÚC HỆ THỐNG

Hệ thống Quản lý Nhân sự (HRM) gồm 9 dịch vụ độc lập phối hợp qua 2 mạng nội bộ:

```
[ Client / Browser (hrm.local:8000) ]
             |
             v (Port 8000)
    +--------------------+
    |     hrm_nginx      | <--- Reverse Proxy + Security Hardening Headers
    +--------------------+
       |              |
       | (proxy /)    | (proxy /phpmyadmin/)
       v              v
+------------+  +---------------+
| hrm_webapp |  | hrm_phpmyadmin|
+------------+  +---------------+
       \               /
        \             /  (backend_net - Isolated)
         v           v
    +---------------------+
    |     hrm_mysql_db    | (Port 3306 nội bộ)
    +---------------------+

------------------- GIÁM SÁT & LOGGING (frontend_net) -------------------
  [ hrm_cadvisor ] ----> [ hrm_prometheus ] <----+ [ hrm_webapp (/metrics) ]
  (Port 8085)             (Port 9091)
                                 |
                                 v
                        [  hrm_grafana   ] <----+ [ hrm_loki ] <--- [ hrm_promtail ]
                        (Port 3001)                (Port 3100)       (Docker socket)
```

---

## 2. CHI TIẾT 7 TIÊU CHÍ ĐÁNH GIÁ

| STT | Tiêu Chí Đánh Giá | Giải Pháp Đã Triển Khai |
|:---:|:---|:---|
| **TC 1** | **Ứng dụng Web & Database** | Ứng dụng Node.js/Express đầy đủ chức năng quản lý nhân viên, phòng ban, điểm danh chấm công check-in/check-out; kết nối MySQL tự động khởi tạo bảng và seed dữ liệu mẫu qua `01-init.sql`. Quản trị qua phpMyAdmin. |
| **TC 2** | **Đóng gói Docker & Hardening** | `Dockerfile` đa tầng (multi-stage build), tối ưu dung lượng với Alpine Linux, chạy dưới quyền tài khoản **non-root user `node` (UID 1000)** để ngăn chặn leo thang đặc quyền container breakout. |
| **TC 3** | **Nginx Reverse Proxy & Security Headers** | Định tuyến `hrm.local:8000` vào Web App và `/phpmyadmin/`; ẩn phiên bản máy chủ `server_tokens off;` và trang bị đầy đủ **X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy**. |
| **TC 4** | **Giám sát Metrics (Prometheus + cAdvisor)** | Tích hợp thư viện `prom-client` xuất endpoint `/metrics` trên Web App; Prometheus định kỳ scrape dữ liệu hiệu năng app và container metrics từ cAdvisor mỗi 5 giây. |
| **TC 5** | **Trực quan hóa Grafana** | Tự động nạp sẵn (Provisioning) 2 nguồn dữ liệu **Prometheus** và **Loki** ngay khi container Grafana khởi động, không cần thao tác cấu hình thủ công. |
| **TC 6** | **Quản lý Log tập trung (Loki + Promtail)** | Promtail tự động thu thập stream log từ Docker socket (`/var/run/docker.sock`) của toàn bộ 9 container và đẩy về Loki; hỗ trợ truy vấn LogQL chi tiết. |
| **TC 7** | **Phân tách mạng (Network Isolation) & Bảo mật .env** | Thiết lập 2 mạng ảo riêng biệt: `frontend_net` (public access) và `backend_net` (private internal). **Database MySQL chỉ nằm trong `backend_net`**, ngăn chặn hoàn toàn truy cập trực tiếp từ Nginx và Internet; quản lý biến môi trường qua `.env`. |

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
│   ├── package.json                     # Dependencies: express, mysql2, prom-client
│   ├── Dockerfile                       # Dockerfile Hardening chạy dưới quyền user 'node'
│   └── .dockerignore                    # Loại bỏ node_modules khi đóng gói
├── nginx/                               # Cấu hình Reverse Proxy & Security Hardening
│   ├── nginx.conf                       # File cấu hình Nginx lõi, server_tokens off, gzip
│   └── conf.d/
│       └── hrm.conf                     # Virtual host hrm.local, proxy / & /phpmyadmin/
├── mysql/                               # Cấu hình khởi tạo Database MySQL
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

### Bước 4.1: Khởi chạy toàn bộ hệ thống bằng Docker Compose
Thực hiện lệnh sau tại thư mục gốc của dự án:

```bash
docker compose up -d --build
```

### Bước 4.2: Kiểm tra trạng thái các container
```bash
docker compose ps
```
*Tất cả 9 container phải có trạng thái `Up` hoặc `Up (healthy)`.*

### Bước 4.3: Dừng hệ thống khi không sử dụng
```bash
docker compose down
```

---

## 5. DANH SÁCH DỊCH VỤ, CỔNG & TÀI KHOẢN MẪU

> 💡 **Địa chỉ IP máy thật của bạn:** `192.168.1.45`

| Dịch Vụ | Container Name | Cổng (Port) | URL (Domain / Localhost) | URL Máy Thật (LAN IP: `192.168.1.45`) | Tài Khoản Đăng Nhập |
|:---|:---|:---:|:---|:---|:---|
| **HRM Web App (Qua Nginx)** | `hrm_nginx` | **8000** | [http://hrm.local:8000](http://hrm.local:8000) hoặc [http://localhost:8000](http://localhost:8000) | [http://192.168.1.45:8000](http://192.168.1.45:8000) | Không cần login (truy cập trực tiếp) |
| **HRM Web App (Gốc)** | `hrm_webapp` | **3002** | [http://localhost:3002](http://localhost:3002) | [http://192.168.1.45:3002](http://192.168.1.45:3002) | Gốc Node.js nội bộ |
| **Prometheus Metrics** | `hrm_webapp` | **8000** | [http://hrm.local:8000/metrics](http://hrm.local:8000/metrics) | [http://192.168.1.45:8000/metrics](http://192.168.1.45:8000/metrics) | Công khai cho Scraper |
| **phpMyAdmin (Qua Nginx)** | `hrm_nginx` | **8000** | [http://hrm.local:8000/phpmyadmin/](http://hrm.local:8000/phpmyadmin/) | [http://192.168.1.45:8000/phpmyadmin/](http://192.168.1.45:8000/phpmyadmin/) | **User:** `hrm_user` (hoặc `root`)<br>**Pass:** `hrm_secure_password_2026` |
| **phpMyAdmin (Trực tiếp)** | `hrm_phpmyadmin` | **5052** | [http://localhost:5052](http://localhost:5052) | [http://192.168.1.45:5052](http://192.168.1.45:5052) | **User:** `hrm_user`<br>**Pass:** `hrm_secure_password_2026` |
| **Prometheus Server** | `hrm_prometheus` | **9091** | [http://localhost:9091](http://localhost:9091) | [http://192.168.1.45:9091](http://192.168.1.45:9091) | Không yêu cầu |
| **Grafana Dashboard** | `hrm_grafana` | **3001** | [http://localhost:3001](http://localhost:3001) | [http://192.168.1.45:3001](http://192.168.1.45:3001) | **User:** `admin`<br>**Pass:** `Admin@Grafana2026!` |
| **cAdvisor** | `hrm_cadvisor` | **8085** | [http://localhost:8085](http://localhost:8085) | [http://192.168.1.45:8085](http://192.168.1.45:8085) | Không yêu cầu |
| **Loki Log Engine** | `hrm_loki` | **3100** | [http://localhost:3100](http://localhost:3100) | [http://192.168.1.45:3100](http://192.168.1.45:3100) | REST API |
| **MySQL Database** | `hrm_mysql_db` | **3306 (Nội bộ)** | Kết nối nội bộ qua `backend_net` | Chỉ mở trong `backend_net` | **DB:** `hrm_db`<br>**User:** `hrm_user` / `root`<br>**Pass:** `hrm_secure_password_2026` |

---

## 6. HƯỚNG DẪN SỬ DỤNG PHPMYADMIN

1. Mở trình duyệt và truy cập: [http://192.168.1.45:8000/phpmyadmin/](http://192.168.1.45:8000/phpmyadmin/) (hoặc [http://192.168.1.45:5052](http://192.168.1.45:5052)).
2. Đăng nhập cực kỳ đơn giản với:
   - **Tài khoản thường:**
     - **Tên người dùng (Username):** `hrm_user`
     - **Mật khẩu (Password):** `hrm_secure_password_2026`
   - **Hoặc tài khoản Quản trị tối cao (Root):**
     - **Tên người dùng (Username):** `root`
     - **Mật khẩu (Password):** `hrm_root_password_2026`
3. Nhấp vào database `hrm_db` ở cột bên trái để xem các bảng:
   - `employees` (Danh sách nhân sự)
   - `departments` (Phòng ban)
   - `attendance` (Lịch sử chấm công điểm danh)

---

## 7. TRUY VẤN MẪU GIÁM SÁT METRICS (PROMQL)

Truy cập Prometheus tại [http://192.168.1.45:9091](http://192.168.1.45:9091) hoặc Grafana tại [http://192.168.1.45:3001](http://192.168.1.45:3001):

- **Tổng số request theo route & status:**
  ```promql
  sum(hrm_http_requests_total) by (route, status_code)
  ```
- **Tốc độ request trên giây:**
  ```promql
  sum(rate(hrm_http_requests_total[1m])) by (method, route)
  ```
- **Thời gian phản hồi P95 Latency:**
  ```promql
  histogram_quantile(0.95, sum(rate(hrm_http_request_duration_seconds_bucket[5m])) by (le))
  ```
- **Tổng số nhân viên trong hệ thống:**
  ```promql
  hrm_employees_total
  ```
- **Số lượt điểm danh hôm nay:**
  ```promql
  hrm_attendance_today_total
  ```

---

## 8. TRUY VẤN MẪU QUẢN LÝ LOG (LOGQL) CHO LOKI

Truy cập Grafana [http://192.168.1.45:3001](http://192.168.1.45:3001) -> Vào mục **Explore** -> Chọn nguồn **Loki**:

- **Xem log Web App:** `{container="hrm_webapp"}`
- **Xem log Nginx:** `{container="hrm_nginx"}`
- **Xem log MySQL Database:** `{container="hrm_mysql_db"}`
- **Xem log phpMyAdmin:** `{container="hrm_phpmyadmin"}`

---

## 9. KIỂM TRA & NGHIỆM THU BẢO MẬT (HARDENING & ISOLATION)

### 9.1. Nghiệm thu Non-root User Container (Tiêu chí 2)
```bash
docker exec -it hrm_webapp whoami
# Kết quả trả về: node
```

### 9.2. Nghiệm thu Nginx Security Hardening Headers (Tiêu chí 3)
```bash
curl -I http://192.168.1.45:8000
# Kết quả: Server: nginx (đã ẩn version), X-Frame-Options: SAMEORIGIN, X-Content-Type-Options: nosniff, X-XSS-Protection: 1; mode=block
```

### 9.3. Nghiệm thu Phân tách mạng nội bộ (Network Isolation - Tiêu chí 7)
Container MySQL (`hrm_mysql_db`) chỉ thuộc `backend_net`:
```bash
docker exec -it hrm_nginx ping -c 2 mysql_db
# Kết quả: Bad address / Destination Host Unreachable (Không thể kết nối trực tiếp tới MySQL từ Nginx)
```
