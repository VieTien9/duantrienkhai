# ĐỀ 10: HỆ THỐNG QUẢN LÝ NHÂN SỰ (HRM SYSTEM)
> **Đồ án Quản Trị Hệ Thống & Triển Khai Hạ Tầng Microservices**  
> Đáp ứng toàn diện **7 Tiêu Chí Đánh Giá Đề Tài** theo tiêu chuẩn Production & DevSecOps.  
> **Cơ sở dữ liệu:** PostgreSQL 15 & pgAdmin 4

---

## 📑 MỤC LỤC
1. [Tổng Quan Kiến Trúc Hệ Thống](#1-tổng-quan-kiến-trúc-hệ-thống)
2. [Chi Tiết 7 Tiêu Chí Đánh Giá](#2-chi-tiết-7-tiêu-chí-đánh-giá)
3. [Cấu Trúc Thư Mục Dự Án](#3-cấu-trúc-thư-mục-dự-án)
4. [Hướng Dẫn Triển Khai & Khởi Chạy](#4-hướng-dẫn-triển-khai--khởi-chạy)
5. [Danh Sách Dịch Vụ, Cổng & Tài Khoản Mẫu](#5-danh-sách-dịch-vụ-cổng--tài-khoản-mẫu)
6. [Hướng Dẫn Sử Dụng pgAdmin 4 Kết Nối Database](#6-hướng-dẫn-sử-dụng-pgadmin-4-kết-nối-database)
7. [Truy Vấn Mẫu Giám Sát Metrics (PromQL)](#7-truy-vấn-mẫu-giám-sát-metrics-promql)
8. [Truy Vấn Mẫu Quản Lý Log (LogQL) Cho Loki](#8-truy-vấn-mẫu-quản-lý-log-logql-cho-loki)
9. [Kiểm Tra & Nghiệm Thu Bảo Mật (Hardening & Isolation)](#9-kiểm-tra--nghiệm-thu-bảo-mật-hardening--isolation)
10. [Bảng Checklist Nghiệm Thu 7 Tiêu Chí (Dành Cho Thi & Bảo Vệ)](#10-bảng-checklist-nghiệm-thu-7-tiêu-chí-dành-cho-thi--bảo-vệ)

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
       | (proxy /)    | (proxy /pgadmin/)
       v              v
+------------+  +---------------+
| hrm_webapp |  |  hrm_pgadmin  |
+------------+  +---------------+
       \               /
        \             /  (backend_net - Isolated)
         v           v
    +---------------------+
    |   hrm_postgres_db   | (Port 5432 nội bộ)
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
| **TC 1** | **Ứng dụng Web & Database** | Ứng dụng Node.js/Express đầy đủ chức năng quản lý nhân viên, phòng ban, điểm danh chấm công check-in/check-out; kết nối PostgreSQL (`postgres:15-alpine`) tự động khởi tạo bảng và seed dữ liệu mẫu qua `01-init.sql`. Quản trị trực quan qua pgAdmin 4. |
| **TC 2** | **Đóng gói Docker & Hardening** | `Dockerfile` đa tầng (multi-stage build), tối ưu dung lượng với Alpine Linux, chạy dưới quyền tài khoản **non-root user `node` (UID 1000)** để ngăn chặn leo thang đặc quyền container breakout. |
| **TC 3** | **Nginx Reverse Proxy & Security Headers** | Định tuyến `hrm.local:8000` vào Web App và `/pgadmin/` (hoặc `pgadmin.hrm.local`); ẩn phiên bản máy chủ `server_tokens off;` và trang bị đầy đủ **X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy**. |
| **TC 4** | **Giám sát Metrics (Prometheus + cAdvisor)** | Tích hợp thư viện `prom-client` xuất endpoint `/metrics` trên Web App; Prometheus định kỳ scrape dữ liệu hiệu năng app và container metrics từ cAdvisor mỗi 5 giây. |
| **TC 5** | **Trực quan hóa Grafana** | Tự động nạp sẵn (Provisioning) 2 nguồn dữ liệu **Prometheus** và **Loki** cùng Dashboard tổng quan thời gian thực ngay khi container Grafana khởi động. |
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
│   ├── package.json                     # Dependencies: express, pg, prom-client
│   ├── Dockerfile                       # Dockerfile Hardening chạy dưới quyền user 'node'
│   └── .dockerignore                    # Loại bỏ node_modules khi đóng gói
├── nginx/                               # Cấu hình Reverse Proxy & Security Hardening
│   ├── nginx.conf                       # File cấu hình Nginx lõi, server_tokens off, gzip
│   └── conf.d/
│       └── hrm.conf                     # Virtual host hrm.local, proxy / & /pgadmin/
├── postgres/                            # Cấu hình khởi tạo Database PostgreSQL
│   ├── init/
│   │   ├── 01-init.sql                  # Script tạo Schema + Dữ liệu mẫu (Seed Data)
│   │   └── 02-more-seeds.sql            # Script bổ sung dữ liệu nhân sự & chấm công
│   └── servers.json                     # Cấu hình tự động kết nối DB cho pgAdmin 4
├── prometheus/                          # Cấu hình Prometheus Scraper
│   └── prometheus.yml                   # Cấu hình scrape webapp:3000, cadvisor:8080, prometheus
├── grafana/                             # Cấu hình Provisioning Grafana
│   └── provisioning/
│       ├── datasources/
│       │   └── datasources.yml          # Tự động kết nối Prometheus & Loki Datasource
│       └── dashboards/
│           ├── dashboards.yml           # Khai báo nạp HRM Dashboard
│           └── hrm-dashboard.json       # JSON Dashboard hoàn chỉnh
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

> 💡 **Địa chỉ IP máy ảo hiện tại của bạn:** `172.172.6.227` (Lệnh kiểm tra: `hostname -I`)

| Dịch Vụ | Container Name | Cổng (Port) | URL Máy Ảo (Localhost) | URL Truy Cập Từ Máy Thật (LAN IP: `172.172.6.227`) | Tài Khoản Đăng Nhập |
|:---|:---|:---:|:---|:---|:---|
| **HRM Web App (Qua Nginx)** | `hrm_nginx` | **8000** | [http://localhost:8000](http://localhost:8000) hoặc [http://127.0.0.1:8000](http://127.0.0.1:8000) | [http://172.172.6.227:8000](http://172.172.6.227:8000) | Không cần login (truy cập trực tiếp) |
| **HRM Web App (Gốc)** | `hrm_webapp` | **3002** | [http://localhost:3002](http://localhost:3002) | [http://172.172.6.227:3002](http://172.172.6.227:3002) | Gốc Node.js nội bộ |
| **Prometheus Metrics** | `hrm_webapp` | **8000** | [http://localhost:8000/metrics](http://localhost:8000/metrics) | [http://172.172.6.227:8000/metrics](http://172.172.6.227:8000/metrics) | Công khai cho Scraper |
| **pgAdmin 4 (Qua Nginx)** | `hrm_nginx` | **8000** | [http://localhost:8000/pgadmin/](http://localhost:8000/pgadmin/) | [http://172.172.6.227:8000/pgadmin/](http://172.172.6.227:8000/pgadmin/) | **Email:** `admin@hrm.com`<br>**Pass:** `Admin@HRM2026!` |
| **pgAdmin 4 (Trực tiếp)** | `hrm_pgadmin` | **5051** | [http://localhost:5051](http://localhost:5051) | [http://172.172.6.227:5051](http://172.172.6.227:5051) | **Email:** `admin@hrm.com`<br>**Pass:** `Admin@HRM2026!` |
| **Prometheus Server** | `hrm_prometheus` | **9091** | [http://localhost:9091](http://localhost:9091) | [http://172.172.6.227:9091](http://172.172.6.227:9091) | Không yêu cầu |
| **Grafana Dashboard** | `hrm_grafana` | **3001** | [http://localhost:3001](http://localhost:3001) | [http://172.172.6.227:3001](http://172.172.6.227:3001) | **User:** `admin`<br>**Pass:** `Admin@Grafana2026!` |
| **cAdvisor** | `hrm_cadvisor` | **8085** | [http://localhost:8085](http://localhost:8085) | [http://172.172.6.227:8085](http://172.172.6.227:8085) | Không yêu cầu |
| **Loki Log Engine** | `hrm_loki` | **3100** | [http://localhost:3100](http://localhost:3100) | [http://172.172.6.227:3100](http://172.172.6.227:3100) | REST API |
| **PostgreSQL Database** | `hrm_postgres_db` | **5432 (Nội bộ)** | Kết nối nội bộ qua `backend_net` | Chỉ mở trong `backend_net` | **DB:** `hrm_db`<br>**User:** `hrm_user`<br>**Pass:** `hrm_secure_password_2026` |

---

## 6. HƯỚNG DẪN SỬ DỤNG PGADMIN 4 KẾT NỐI DATABASE

1. Mở trình duyệt và truy cập: [http://172.172.6.227:8000/pgadmin/](http://172.172.6.227:8000/pgadmin/) (hoặc [http://172.172.6.227:5051](http://172.172.6.227:5051)).
2. Đăng nhập với tài khoản quản trị pgAdmin:
   - **Email:** `admin@hrm.com`
   - **Password:** `Admin@HRM2026!`
3. Đăng ký kết nối tới Database PostgreSQL:
   - Click chuột phải vào **Servers** -> Chọn **Register** -> **Server...**
   - **Tab General:** Nhập tên kết nối gợi nhớ (Ví dụ: `HRM Postgres Server`).
   - **Tab Connection:**
     - **Host name/address:** `postgres_db` *(Tên service trong Docker network)*
     - **Port:** `5432`
     - **Maintenance database:** `hrm_db`
     - **Username:** `hrm_user`
     - **Password:** `hrm_secure_password_2026`
   - Nhấn **Save**.
4. Quản lý dữ liệu trực quan:
   - Mở cây thư mục: `Servers -> HRM Postgres Server -> Databases -> hrm_db -> Schemas -> public -> Tables`.
   - Xem và truy vấn 3 bảng dữ liệu:
     - `employees` (Danh sách nhân sự)
     - `departments` (Phòng ban)
     - `attendance` (Lịch sử chấm công điểm danh)

---

## 7. TRUY VẤN MẪU GIÁM SÁT METRICS (PROMQL)

Truy cập Prometheus tại [http://172.172.6.227:9091](http://172.172.6.227:9091) hoặc Grafana tại [http://172.172.6.227:3001](http://172.172.6.227:3001):

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

Truy cập Grafana [http://172.172.6.227:3001](http://172.172.6.227:3001) -> Vào mục **Explore** -> Chọn nguồn **Loki**:

- **Xem log Web App:** `{container="hrm_webapp"}`
- **Xem log Nginx:** `{container="hrm_nginx"}`
- **Xem log PostgreSQL Database:** `{container="hrm_postgres_db"}`
- **Xem log pgAdmin 4:** `{container="hrm_pgadmin"}`

---

## 9. KIỂM TRA & NGHIỆM THU BẢO MẬT (HARDENING & ISOLATION)

### 9.1. Nghiệm thu Non-root User Container (Tiêu chí 2)
```bash
docker exec -it hrm_webapp whoami
# Kết quả trả về: node
```

### 9.2. Nghiệm thu Nginx Security Hardening Headers (Tiêu chí 3)
```bash
curl -I http://172.172.6.227:8000
# Kết quả: Server: nginx (đã ẩn version), X-Frame-Options: SAMEORIGIN, X-Content-Type-Options: nosniff, X-XSS-Protection: 1; mode=block
```

### 9.3. Nghiệm thu Phân tách mạng nội bộ (Network Isolation - Tiêu chí 7)
Container PostgreSQL (`hrm_postgres_db`) chỉ thuộc `backend_net`:
```bash
docker exec -it hrm_nginx ping -c 2 postgres_db
# Kết quả: Bad address / Destination Host Unreachable (Không thể kết nối trực tiếp tới PostgreSQL từ Nginx)
```

---

## 10. BẢNG CHECKLIST NGHIỆM THU 7 TIÊU CHÍ (DÀNH CHO THI & BẢO VỆ)

Bảng tổng hợp giúp báo cáo viên / thí sinh kiểm tra và trình bày trực tiếp cho Hội đồng Giám khảo:

| Tiêu Chí | Yêu Cầu Chấm Điểm | Trạng Thái | Thao Tác / Lệnh Demo Nhanh | Kết Quả Thực Tế |
|:---|:---|:---:|:---|:---|
| **TC 1: Web & DB** | Web App hoàn chỉnh, CRUD, kết nối DB PostgreSQL, quản trị qua pgAdmin 4. | **ĐẠT (100%)** | Mở trình duyệt: [http://172.172.6.227:8000](http://172.172.6.227:8000)<br>pgAdmin 4: [http://172.172.6.227:8000/pgadmin/](http://172.172.6.227:8000/pgadmin/) | Dữ liệu phong phú: 15 nhân viên, 6 phòng ban, 11 lượt chấm công. Thực hiện CRUD và check-in/check-out tức thì. |
| **TC 2: Docker Hardening** | Multi-stage build, Alpine Linux, tài khoản non-root. | **ĐẠT (100%)** | `docker exec -it hrm_webapp whoami` | Trả về `node` (UID 1000, ngăn chặn privilege escalation). |
| **TC 3: Reverse Proxy** | Nginx làm cổng vào duy nhất, ẩn server version, kèm security headers. | **ĐẠT (100%)** | `curl -I http://172.172.6.227:8000` | `Server: nginx` (ẩn ver), `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`. |
| **TC 4: Metrics Monitoring** | Xuất Prometheus metrics, scrape định kỳ app & container. | **ĐẠT (100%)** | `curl -s http://172.172.6.227:8000/metrics` hoặc vào [http://172.172.6.227:9091/targets](http://172.172.6.227:9091/targets) | Cả 3 target (webapp, cadvisor, prometheus) đều `UP 100%`. Có `hrm_employees_total 15`, `hrm_attendance_today_total 11`. |
| **TC 5: Grafana Dashboard** | Tự động provisioning datasources và Dashboard trực quan. | **ĐẠT (100%)** | Đăng nhập Grafana [http://172.172.6.227:3001](http://172.172.6.227:3001) (`admin` / `Admin@Grafana2026!`) | Dashboard "HRM - Đề 10" sẵn sàng: KPI nhân sự, biểu đồ req/s, P95 latency, CPU/RAM container và logs container. |
| **TC 6: Log tập trung** | Promtail gom logs Docker socket đẩy Loki, truy vấn LogQL. | **ĐẠT (100%)** | Vào Grafana -> **Explore** -> Chọn nguồn **Loki** -> Query `{container="hrm_webapp"}` | Stream log real-time xuất hiện tức thì, truy vấn linh hoạt. |
| **TC 7: Network Isolation** | Tách mạng `frontend_net` & `backend_net`. DB cô lập hoàn toàn. | **ĐẠT (100%)** | `docker exec -it hrm_nginx ping -c 2 postgres_db` | Bị chặn hoàn toàn (Bad address / Unreachable), Nginx và Internet không thể chạm tới PostgreSQL. |

