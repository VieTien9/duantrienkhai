-- Additional Seeds for rich demo
INSERT INTO employees (full_name, email, phone, position, salary, department_id, hire_date, status)
SELECT 'Đỗ Mai Linh', 'linh.do@hrm.local', '0956789012', 'Frontend Developer', 22000000, id, '2023-08-15', 'ACTIVE'
FROM departments WHERE name LIKE '%Công nghệ Thông tin%'
ON CONFLICT (email) DO NOTHING;

INSERT INTO employees (full_name, email, phone, position, salary, department_id, hire_date, status)
SELECT 'Hoàng Quốc Nam', 'nam.hoang@hrm.local', '0967890123', 'QA / Test Automation Lead', 25000000, id, '2023-04-10', 'ACTIVE'
FROM departments WHERE name LIKE '%Công nghệ Thông tin%'
ON CONFLICT (email) DO NOTHING;

INSERT INTO employees (full_name, email, phone, position, salary, department_id, hire_date, status)
SELECT 'Ngô Thanh Tùng', 'tung.ngo@hrm.local', '0978901234', 'Digital Marketing Specialist', 20000000, id, '2023-09-01', 'ACTIVE'
FROM departments WHERE name LIKE '%Marketing%'
ON CONFLICT (email) DO NOTHING;

INSERT INTO employees (full_name, email, phone, position, salary, department_id, hire_date, status)
SELECT 'Bùi Phương Thảo', 'thao.bui@hrm.local', '0989012345', 'Chuyên viên Tuyển dụng (Senior Recruiter)', 21000000, id, '2023-05-15', 'ACTIVE'
FROM departments WHERE name LIKE '%Nhân sự%'
ON CONFLICT (email) DO NOTHING;

INSERT INTO employees (full_name, email, phone, position, salary, department_id, hire_date, status)
SELECT 'Dương Văn Đức', 'duc.duong@hrm.local', '0990123456', 'Kế toán tổng hợp', 18000000, id, '2024-01-08', 'ACTIVE'
FROM departments WHERE name LIKE '%Kế toán%'
ON CONFLICT (email) DO NOTHING;

INSERT INTO employees (full_name, email, phone, position, salary, department_id, hire_date, status)
SELECT 'Lý Gia Hân', 'han.ly@hrm.local', '0909876543', 'Content Creator & PR Specialist', 17000000, id, '2024-03-01', 'ACTIVE'
FROM departments WHERE name LIKE '%Marketing%'
ON CONFLICT (email) DO NOTHING;

INSERT INTO employees (full_name, email, phone, position, salary, department_id, hire_date, status)
SELECT 'Phan Tuấn Kiệt', 'kiet.phan@hrm.local', '0918765432', 'Sales Executive B2B', 19000000, id, '2024-02-15', 'ACTIVE'
FROM departments WHERE name LIKE '%Kinh doanh%'
ON CONFLICT (email) DO NOTHING;

INSERT INTO employees (full_name, email, phone, position, salary, department_id, hire_date, status)
SELECT 'Trịnh Quỳnh Nga', 'nga.trinh@hrm.local', '0927654321', 'HR Generalist (C&B)', 18000000, id, '2023-10-01', 'ACTIVE'
FROM departments WHERE name LIKE '%Nhân sự%'
ON CONFLICT (email) DO NOTHING;

INSERT INTO employees (full_name, email, phone, position, salary, department_id, hire_date, status)
SELECT 'Vũ Đình Quang', 'quang.vu@hrm.local', '0936543210', 'Giám Đốc Điều Hành (CEO)', 65000000, id, '2020-01-01', 'ACTIVE'
FROM departments WHERE name LIKE '%Giám Đốc%'
ON CONFLICT (email) DO NOTHING;

INSERT INTO employees (full_name, email, phone, position, salary, department_id, hire_date, status)
SELECT 'Hà Minh Châu', 'chau.ha@hrm.local', '0945432109', 'Phó Giám Đốc Vận Hành (COO)', 50000000, id, '2020-05-15', 'ACTIVE'
FROM departments WHERE name LIKE '%Giám Đốc%'
ON CONFLICT (email) DO NOTHING;

-- Seed Attendance records for employees
INSERT INTO attendance (employee_id, attendance_date, check_in, check_out, status, notes)
SELECT id, CURRENT_DATE, '08:00:00', NULL, 'PRESENT', 'Đúng giờ - Sprint Review Meeting'
FROM employees WHERE email = 'linh.do@hrm.local'
ON CONFLICT (employee_id, attendance_date) DO NOTHING;

INSERT INTO attendance (employee_id, attendance_date, check_in, check_out, status, notes)
SELECT id, CURRENT_DATE, '08:50:00', NULL, 'LATE', 'Đi trễ do sự cố giao thông'
FROM employees WHERE email = 'nam.hoang@hrm.local'
ON CONFLICT (employee_id, attendance_date) DO NOTHING;

INSERT INTO attendance (employee_id, attendance_date, check_in, check_out, status, notes)
SELECT id, CURRENT_DATE, '08:05:00', NULL, 'PRESENT', 'Đúng giờ'
FROM employees WHERE email = 'tung.ngo@hrm.local'
ON CONFLICT (employee_id, attendance_date) DO NOTHING;

INSERT INTO attendance (employee_id, attendance_date, check_in, check_out, status, notes)
SELECT id, CURRENT_DATE, '08:15:00', NULL, 'PRESENT', 'Đúng giờ - Phỏng vấn ứng viên ca sáng'
FROM employees WHERE email = 'thao.bui@hrm.local'
ON CONFLICT (employee_id, attendance_date) DO NOTHING;

INSERT INTO attendance (employee_id, attendance_date, check_in, check_out, status, notes)
SELECT id, CURRENT_DATE, '08:00:00', NULL, 'PRESENT', 'Đúng giờ'
FROM employees WHERE email = 'duc.duong@hrm.local'
ON CONFLICT (employee_id, attendance_date) DO NOTHING;

INSERT INTO attendance (employee_id, attendance_date, check_in, check_out, status, notes)
SELECT id, CURRENT_DATE, '09:00:00', NULL, 'LATE', 'Đi trễ có thông báo trước'
FROM employees WHERE email = 'han.ly@hrm.local'
ON CONFLICT (employee_id, attendance_date) DO NOTHING;

INSERT INTO attendance (employee_id, attendance_date, check_in, check_out, status, notes)
SELECT id, CURRENT_DATE, '08:20:00', NULL, 'PRESENT', 'Đúng giờ - Họp khách hàng sáng'
FROM employees WHERE email = 'kiet.phan@hrm.local'
ON CONFLICT (employee_id, attendance_date) DO NOTHING;
