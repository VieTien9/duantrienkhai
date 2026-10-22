const express = require('express');
const cors = require('cors');
const path = require('path');
const mysql = require('mysql2/promise');
const client = require('prom-client');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Prometheus Metrics Setup
const register = new client.Registry();
client.collectDefaultMetrics({ register, prefix: 'hrm_' });

const httpRequestsTotal = new client.Counter({
  name: 'hrm_http_requests_total',
  help: 'Total number of HTTP requests processed',
  labelNames: ['method', 'route', 'status_code'],
});
register.registerMetric(httpRequestsTotal);

const httpRequestDurationSeconds = new client.Histogram({
  name: 'hrm_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
});
register.registerMetric(httpRequestDurationSeconds);

const employeesTotalGauge = new client.Gauge({
  name: 'hrm_employees_total',
  help: 'Current total number of active employees',
});
register.registerMetric(employeesTotalGauge);

const attendanceTodayGauge = new client.Gauge({
  name: 'hrm_attendance_today_total',
  help: 'Total attendance records for today',
});
register.registerMetric(attendanceTodayGauge);

// Middleware for request metrics
app.use((req, res, next) => {
  const start = process.hrtime();
  res.on('finish', () => {
    const diff = process.hrtime(start);
    const duration = diff[0] + diff[1] / 1e9;
    const route = req.route ? req.route.path : req.path;
    httpRequestsTotal.inc({ method: req.method, route, status_code: res.statusCode });
    httpRequestDurationSeconds.observe({ method: req.method, route, status_code: res.statusCode }, duration);
  });
  next();
});

// MySQL Connection Pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'mysql_db',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'hrm_user',
  password: process.env.DB_PASSWORD || 'hrm_secure_password_2026',
  database: process.env.DB_NAME || 'hrm_db',
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
});

// Helper: Query wrapper
async function query(sql, params) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

// Update Gauges periodically
async function updateMetricsGauges() {
  try {
    const [empRows] = await pool.query("SELECT COUNT(*) AS count FROM employees WHERE status = 'ACTIVE'");
    employeesTotalGauge.set(parseInt(empRows[0].count, 10));

    const [attRows] = await pool.query("SELECT COUNT(*) AS count FROM attendance WHERE attendance_date = CURRENT_DATE()");
    attendanceTodayGauge.set(parseInt(attRows[0].count, 10));
  } catch (err) {
    // Ignore error when DB is initializing
  }
}
setInterval(updateMetricsGauges, 15000);

// --- Prometheus Metrics Endpoint ---
app.get('/metrics', async (req, res) => {
  try {
    await updateMetricsGauges();
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end(err.message);
  }
});

// --- Health Check ---
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'UP', database: 'CONNECTED (MySQL)', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: 'DOWN', database: 'DISCONNECTED', error: err.message });
  }
});

// --- API Endpoints ---

// 1. Dashboard summary stats
app.get('/api/dashboard', async (req, res) => {
  try {
    const [totalEmp] = await pool.query("SELECT COUNT(*) AS count FROM employees WHERE status = 'ACTIVE'");
    const [totalDept] = await pool.query("SELECT COUNT(*) AS count FROM departments");
    const [todayAtt] = await pool.query("SELECT COUNT(*) AS count FROM attendance WHERE attendance_date = CURRENT_DATE()");
    const [onTime] = await pool.query("SELECT COUNT(*) AS count FROM attendance WHERE attendance_date = CURRENT_DATE() AND status = 'PRESENT'");

    res.json({
      success: true,
      data: {
        totalEmployees: parseInt(totalEmp[0].count, 10),
        totalDepartments: parseInt(totalDept[0].count, 10),
        todayAttendance: parseInt(todayAtt[0].count, 10),
        onTimeToday: parseInt(onTime[0].count, 10),
      }
    });
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Departments API
app.get('/api/departments', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT d.*, COUNT(e.id) AS employee_count
      FROM departments d
      LEFT JOIN employees e ON d.id = e.department_id AND e.status = 'ACTIVE'
      GROUP BY d.id
      ORDER BY d.id ASC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/departments', async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Tên phòng ban là bắt buộc' });
  try {
    const [result] = await pool.execute(
      'INSERT INTO departments (name, description) VALUES (?, ?)',
      [name, description || null]
    );
    const [newDept] = await pool.query('SELECT * FROM departments WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: newDept[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Employees API
app.get('/api/employees', async (req, res) => {
  const { search, department_id, status } = req.query;
  try {
    let sql = `
      SELECT e.*, d.name AS department_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      sql += ` AND (e.full_name LIKE ? OR e.email LIKE ? OR e.position LIKE ?)`;
    }
    if (department_id) {
      params.push(department_id);
      sql += ` AND e.department_id = ?`;
    }
    if (status) {
      params.push(status);
      sql += ` AND e.status = ?`;
    }

    sql += ' ORDER BY e.id DESC';
    const [rows] = await pool.execute(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/employees', async (req, res) => {
  const { full_name, email, phone, position, salary, department_id, hire_date } = req.body;
  if (!full_name || !email || !position) {
    return res.status(400).json({ success: false, message: 'Vui lòng điền đủ họ tên, email và vị trí' });
  }
  try {
    const hireDateVal = hire_date || new Date().toISOString().split('T')[0];
    const [result] = await pool.execute(
      `INSERT INTO employees (full_name, email, phone, position, salary, department_id, hire_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
      [full_name, email, phone || null, position, salary || 0, department_id || null, hireDateVal]
    );
    const [newEmp] = await pool.query('SELECT * FROM employees WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: newEmp[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/employees/:id', async (req, res) => {
  const { id } = req.params;
  const { full_name, email, phone, position, salary, department_id, status } = req.body;
  try {
    await pool.execute(
      `UPDATE employees
       SET full_name = COALESCE(?, full_name),
           email = COALESCE(?, email),
           phone = COALESCE(?, phone),
           position = COALESCE(?, position),
           salary = COALESCE(?, salary),
           department_id = COALESCE(?, department_id),
           status = COALESCE(?, status)
       WHERE id = ?`,
      [full_name, email, phone, position, salary, department_id, status, id]
    );
    const [updated] = await pool.query('SELECT * FROM employees WHERE id = ?', [id]);
    if (updated.length === 0) return res.status(404).json({ success: false, message: 'Không tìm thấy nhân viên' });
    res.json({ success: true, data: updated[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/employees/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.execute('DELETE FROM employees WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Không tìm thấy nhân viên' });
    res.json({ success: true, message: 'Đã xóa nhân viên thành công' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Attendance API
app.get('/api/attendance', async (req, res) => {
  const { date } = req.query;
  try {
    let sql = `
      SELECT a.*, e.full_name, e.position, d.name AS department_name
      FROM attendance a
      JOIN employees e ON a.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
    `;
    const params = [];
    if (date) {
      params.push(date);
      sql += ` WHERE a.attendance_date = ?`;
    } else {
      sql += ` WHERE a.attendance_date = CURRENT_DATE()`;
    }
    sql += ' ORDER BY a.created_at DESC';
    const [rows] = await pool.execute(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/attendance/checkin', async (req, res) => {
  const { employee_id, notes } = req.body;
  if (!employee_id) return res.status(400).json({ success: false, message: 'Thiếu mã nhân viên' });
  try {
    const now = new Date();
    const currentTime = now.toTimeString().split(' ')[0]; // HH:MM:SS
    const isLate = now.getHours() > 8 || (now.getHours() === 8 && now.getMinutes() > 30);
    const status = isLate ? 'LATE' : 'PRESENT';
    const checkinNote = notes || (isLate ? 'Đi trễ sau 08:30' : 'Đúng giờ');

    await pool.execute(
      `INSERT INTO attendance (employee_id, attendance_date, check_in, status, notes)
       VALUES (?, CURRENT_DATE(), ?, ?, ?)
       ON DUPLICATE KEY UPDATE check_in = VALUES(check_in), status = VALUES(status), notes = VALUES(notes)`,
      [employee_id, currentTime, status, checkinNote]
    );

    const [record] = await pool.query(
      'SELECT * FROM attendance WHERE employee_id = ? AND attendance_date = CURRENT_DATE()',
      [employee_id]
    );
    res.json({ success: true, message: 'Điểm danh Check-in thành công', data: record[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/attendance/checkout', async (req, res) => {
  const { employee_id } = req.body;
  if (!employee_id) return res.status(400).json({ success: false, message: 'Thiếu mã nhân viên' });
  try {
    const currentTime = new Date().toTimeString().split(' ')[0];
    const [result] = await pool.execute(
      `UPDATE attendance
       SET check_out = ?
       WHERE employee_id = ? AND attendance_date = CURRENT_DATE()`,
      [currentTime, employee_id]
    );
    if (result.affectedRows === 0) {
      return res.status(400).json({ success: false, message: 'Nhân viên chưa Check-in ngày hôm nay' });
    }
    const [record] = await pool.query(
      'SELECT * FROM attendance WHERE employee_id = ? AND attendance_date = CURRENT_DATE()',
      [employee_id]
    );
    res.json({ success: true, message: 'Check-out hoàn tất', data: record[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[HRM System] Server running on http://0.0.0.0:${PORT}`);
  console.log(`[HRM System] Database: MySQL connected`);
  console.log(`[HRM System] Metrics available at http://0.0.0.0:${PORT}/metrics`);
});
