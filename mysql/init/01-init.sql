-- Database Initialization for HRM System (MySQL version)

CREATE DATABASE IF NOT EXISTS hrm_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE hrm_db;

CREATE TABLE IF NOT EXISTS departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS employees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(20),
    position VARCHAR(100) NOT NULL,
    salary DECIMAL(12, 2) NOT NULL DEFAULT 0,
    department_id INT,
    hire_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, INACTIVE
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_employee_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    attendance_date DATE NOT NULL,
    check_in TIME,
    check_out TIME,
    status VARCHAR(20) NOT NULL DEFAULT 'PRESENT', -- PRESENT, LATE, ABSENT, LEAVE
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_attendance_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    CONSTRAINT uq_employee_daily_attendance UNIQUE (employee_id, attendance_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed Initial Departments
INSERT INTO departments (name, description) VALUES
    ('Phòng Công nghệ Thông tin (IT)', 'Phát triển phần mềm, quản trị hạ tầng mạng và bảo mật'),
    ('Phòng Nhân sự (HR)', 'Tuyển dụng, đào tạo, quản lý chính sách và chế độ nhân sự'),
    ('Phòng Kế toán - Tài chính', 'Quản lý thu chi, bảng lương và báo cáo tài chính'),
    ('Phòng Kinh doanh (Sales)', 'Phát triển khách hàng, mở rộng thị trường và bán hàng')
ON DUPLICATE KEY UPDATE name=name;

-- Seed Initial Employees
INSERT INTO employees (full_name, email, phone, position, salary, department_id, hire_date, status) VALUES
    ('Nguyễn Văn An', 'an.nguyen@hrm.local', '0901234567', 'DevOps / SysAdmin Lead', 35000000, 1, '2023-01-15', 'ACTIVE'),
    ('Trần Thị Bích', 'bich.tran@hrm.local', '0912345678', 'HR Manager', 25000000, 2, '2022-06-01', 'ACTIVE'),
    ('Lê Hoàng Cường', 'cuong.le@hrm.local', '0923456789', 'Backend Engineer', 28000000, 1, '2023-03-20', 'ACTIVE'),
    ('Phạm Thu Dung', 'dung.pham@hrm.local', '0934567890', 'Senior Accountant', 22000000, 3, '2021-11-10', 'ACTIVE'),
    ('Võ Minh Hải', 'hai.vo@hrm.local', '0945678901', 'Sales Specialist', 20000000, 4, '2024-02-01', 'ACTIVE')
ON DUPLICATE KEY UPDATE email=email;

-- Seed Attendance for Today
INSERT INTO attendance (employee_id, attendance_date, check_in, check_out, status, notes) VALUES
    (1, CURRENT_DATE(), '08:00:00', NULL, 'PRESENT', 'Đúng giờ'),
    (2, CURRENT_DATE(), '08:05:00', NULL, 'PRESENT', 'Đúng giờ'),
    (3, CURRENT_DATE(), '08:45:00', NULL, 'LATE', 'Đi trễ do kẹt xe'),
    (4, CURRENT_DATE(), '07:55:00', NULL, 'PRESENT', 'Đúng giờ')
ON DUPLICATE KEY UPDATE check_in=check_in;
