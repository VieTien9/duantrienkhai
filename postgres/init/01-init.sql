-- Database Initialization for HRM System (Đề 10)

CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(20),
    position VARCHAR(100) NOT NULL,
    salary NUMERIC(12, 2) NOT NULL DEFAULT 0,
    department_id INT REFERENCES departments(id) ON DELETE SET NULL,
    hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, INACTIVE
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    employee_id INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
    check_in TIME,
    check_out TIME,
    status VARCHAR(20) NOT NULL DEFAULT 'PRESENT', -- PRESENT, LATE, ABSENT, LEAVE
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_employee_daily_attendance UNIQUE (employee_id, attendance_date)
);

-- Seed Initial Departments (6 Phòng Ban Toàn Diện)
INSERT INTO departments (name, description) VALUES
    ('Phòng Công nghệ Thông tin (IT)', 'Phát triển phần mềm, quản trị hạ tầng mạng, DevOps và an toàn thông tin'),
    ('Phòng Nhân sự (HR)', 'Tuyển dụng, đào tạo, quản lý chính sách đãi ngộ và văn hóa doanh nghiệp'),
    ('Phòng Kế toán - Tài chính', 'Quản lý thu chi ngân sách, quyết toán thuế, bảng lương và báo cáo tài chính'),
    ('Phòng Kinh doanh (Sales)', 'Phát triển mạng lưới khách hàng B2B/B2C, mở rộng thị phần và đạt chỉ tiêu doanh thu'),
    ('Phòng Marketing & Truyền thông', 'Xây dựng thương hiệu, quản trị chiến dịch quảng bá kỹ thuật số (Digital Ads, SEO, PR)'),
    ('Ban Giám Đốc (Board of Directors)', 'Hoạch định chiến lược tổng thể, điều hành hoạt động kinh doanh và quản trị rủi ro')
ON CONFLICT (name) DO NOTHING;

-- Seed Employees (15 Nhân Sự Tiêu Biểu Mọi Cấp Bậc)
INSERT INTO employees (full_name, email, phone, position, salary, department_id, hire_date, status) VALUES
    ('Nguyễn Văn An', 'an.nguyen@hrm.local', '0901234567', 'DevOps / SysAdmin Lead', 35000000, 1, '2023-01-15', 'ACTIVE'),
    ('Trần Thị Bích', 'bich.tran@hrm.local', '0912345678', 'HR Manager', 28000000, 2, '2022-06-01', 'ACTIVE'),
    ('Lê Hoàng Cường', 'cuong.le@hrm.local', '0923456789', 'Senior Backend Engineer', 30000000, 1, '2023-03-20', 'ACTIVE'),
    ('Phạm Thu Dung', 'dung.pham@hrm.local', '0934567890', 'Kế toán trưởng (Chief Accountant)', 32000000, 3, '2021-11-10', 'ACTIVE'),
    ('Võ Minh Hải', 'hai.vo@hrm.local', '0945678901', 'Trưởng phòng Kinh doanh (Sales Lead)', 35000000, 4, '2022-02-01', 'ACTIVE'),
    ('Đỗ Mai Linh', 'linh.do@hrm.local', '0956789012', 'Frontend Developer', 22000000, 1, '2023-08-15', 'ACTIVE'),
    ('Hoàng Quốc Nam', 'nam.hoang@hrm.local', '0967890123', 'QA / Test Automation Lead', 25000000, 1, '2023-04-10', 'ACTIVE'),
    ('Ngô Thanh Tùng', 'tung.ngo@hrm.local', '0978901234', 'Digital Marketing Specialist', 20000000, 5, '2023-09-01', 'ACTIVE'),
    ('Bùi Phương Thảo', 'thao.bui@hrm.local', '0989012345', 'Chuyên viên Tuyển dụng (Senior Recruiter)', 21000000, 2, '2023-05-15', 'ACTIVE'),
    ('Dương Văn Đức', 'duc.duong@hrm.local', '0990123456', 'Kế toán tổng hợp', 18000000, 3, '2024-01-08', 'ACTIVE'),
    ('Lý Gia Hân', 'han.ly@hrm.local', '0909876543', 'Content Creator & PR', 17000000, 5, '2024-03-01', 'ACTIVE'),
    ('Phan Tuấn Kiệt', 'kiet.phan@hrm.local', '0918765432', 'Sales Executive B2B', 19000000, 4, '2024-02-15', 'ACTIVE'),
    ('Trịnh Quỳnh Nga', 'nga.trinh@hrm.local', '0927654321', 'HR Generalist (C&B)', 18000000, 2, '2023-10-01', 'ACTIVE'),
    ('Vũ Đình Quang', 'quang.vu@hrm.local', '0936543210', 'Giám Đốc Điều Hành (CEO)', 65000000, 6, '2020-01-01', 'ACTIVE'),
    ('Hà Minh Châu', 'chau.ha@hrm.local', '0945432109', 'Phó Giám Đốc Vận Hành (COO)', 50000000, 6, '2020-05-15', 'ACTIVE')
ON CONFLICT (email) DO NOTHING;

-- Seed Attendance for Today (Đầy Đủ Trạng Thái & Ghi Chú)
INSERT INTO attendance (employee_id, attendance_date, check_in, check_out, status, notes) VALUES
    (1, CURRENT_DATE, '07:55:00', NULL, 'PRESENT', 'Đúng giờ - Ca trực sáng hạ tầng'),
    (2, CURRENT_DATE, '08:02:00', NULL, 'PRESENT', 'Đúng giờ'),
    (3, CURRENT_DATE, '08:45:00', NULL, 'LATE', 'Đi trễ 15 phút do tắc đường'),
    (4, CURRENT_DATE, '07:50:00', '17:30:00', 'PRESENT', 'Đúng giờ - Đã hoàn thành ca làm việc'),
    (5, CURRENT_DATE, '08:10:00', NULL, 'PRESENT', 'Đúng giờ'),
    (6, CURRENT_DATE, '08:00:00', NULL, 'PRESENT', 'Đúng giờ - Sprint Review Meeting'),
    (7, CURRENT_DATE, '08:50:00', NULL, 'LATE', 'Đi trễ do sự cố phương tiện'),
    (8, CURRENT_DATE, '08:05:00', NULL, 'PRESENT', 'Đúng giờ'),
    (9, CURRENT_DATE, '08:15:00', NULL, 'PRESENT', 'Đúng giờ - Phỏng vấn ứng viên'),
    (10, CURRENT_DATE, '08:00:00', NULL, 'PRESENT', 'Đúng giờ'),
    (11, CURRENT_DATE, '09:00:00', NULL, 'LATE', 'Đi trễ có thông báo trước'),
    (12, CURRENT_DATE, '08:20:00', NULL, 'PRESENT', 'Đúng giờ - Gặp đối tác sáng')
ON CONFLICT (employee_id, attendance_date) DO NOTHING;
