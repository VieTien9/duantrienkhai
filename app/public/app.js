// HRM Frontend Application Logic

// State
let departmentsList = [];
let employeesList = [];

// DOM Elements
const navItems = document.querySelectorAll('.nav-item');
const tabPanes = document.querySelectorAll('.tab-pane');
const pageHeading = document.getElementById('page-heading');
const pageSubheading = document.getElementById('page-subheading');
const timeBadge = document.getElementById('current-time-badge');

// Toast Notification
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 3500);
}

// Clock Widget
function updateClock() {
  const now = new Date();
  timeBadge.textContent = now.toLocaleTimeString('vi-VN') + ' - ' + now.toLocaleDateString('vi-VN');
}
setInterval(updateClock, 1000);
updateClock();

// Tab Navigation
const tabTitles = {
  dashboard: { title: 'Bảng Điều Khiển Tổng Quan', sub: 'Hệ thống Quản lý Nhân sự Doanh nghiệp HRM' },
  employees: { title: 'Quản Lý Danh Sách Nhân Viên', sub: 'Hồ sơ nhân sự, thông tin liên lạc và chức vụ' },
  departments: { title: 'Quản Lý Cơ Cấu Phòng Ban', sub: 'Sơ đồ tổ chức phòng ban và số lượng thành viên' },
  attendance: { title: 'Quản Lý Chấm Công Điểm Danh', sub: 'Lịch sử check-in, check-out và giám sát đi làm' },
};

navItems.forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    const tabName = item.dataset.tab;
    navItems.forEach(n => n.classList.remove('active'));
    tabPanes.forEach(p => p.classList.remove('active'));

    item.classList.add('active');
    document.getElementById(`tab-${tabName}`).classList.add('active');

    pageHeading.textContent = tabTitles[tabName].title;
    pageSubheading.textContent = tabTitles[tabName].sub;

    if (tabName === 'dashboard') loadDashboard();
    if (tabName === 'employees') loadEmployees();
    if (tabName === 'departments') loadDepartments();
    if (tabName === 'attendance') loadAttendance();
  });
});

// Format Currency
function formatVND(amount) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

// 1. Dashboard Operations
async function loadDashboard() {
  try {
    const res = await fetch('/api/dashboard');
    const json = await res.json();
    if (json.success) {
      document.getElementById('stat-total-employees').textContent = json.data.totalEmployees;
      document.getElementById('stat-total-departments').textContent = json.data.totalDepartments;
      document.getElementById('stat-today-attendance').textContent = json.data.todayAttendance;
      document.getElementById('stat-on-time-today').textContent = json.data.onTimeToday;
    }
  } catch (err) {
    console.error('Error loading dashboard stats:', err);
  }

  // Load Today's Attendance Table
  try {
    const res = await fetch('/api/attendance');
    const json = await res.json();
    const tbody = document.getElementById('today-attendance-tbody');
    if (!json.success || json.data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center">Hôm nay chưa có dữ liệu chấm công.</td></tr>';
      return;
    }
    tbody.innerHTML = json.data.map(item => `
      <tr>
        <td><strong>#NV${item.employee_id}</strong></td>
        <td><strong>${item.full_name}</strong></td>
        <td>${item.department_name || 'N/A'}</td>
        <td><span class="badge badge-info">${item.check_in || '--:--'}</span></td>
        <td><span class="badge ${item.check_out ? 'badge-info' : 'badge-warning'}">${item.check_out || 'Chưa out'}</span></td>
        <td>
          <span class="badge ${item.status === 'PRESENT' ? 'badge-success' : 'badge-warning'}">
            ${item.status === 'PRESENT' ? 'Đúng giờ' : (item.status === 'LATE' ? 'Đi trễ' : item.status)}
          </span>
        </td>
        <td>${item.notes || '-'}</td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Error loading today attendance:', err);
  }
}

// Quick Attendance Checkin / Checkout
document.getElementById('btn-quick-checkin').addEventListener('click', async () => {
  const empId = document.getElementById('quick-employee-select').value;
  const notes = document.getElementById('quick-checkin-notes').value;
  if (!empId) return showToast('Vui lòng chọn nhân viên trước', 'error');

  try {
    const res = await fetch('/api/attendance/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employee_id: empId, notes })
    });
    const json = await res.json();
    if (json.success) {
      showToast(json.message);
      document.getElementById('quick-checkin-notes').value = '';
      loadDashboard();
    } else {
      showToast(json.message || 'Lỗi điểm danh', 'error');
    }
  } catch (err) {
    showToast('Lỗi máy chủ', 'error');
  }
});

document.getElementById('btn-quick-checkout').addEventListener('click', async () => {
  const empId = document.getElementById('quick-employee-select').value;
  if (!empId) return showToast('Vui lòng chọn nhân viên trước', 'error');

  try {
    const res = await fetch('/api/attendance/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employee_id: empId })
    });
    const json = await res.json();
    if (json.success) {
      showToast(json.message);
      loadDashboard();
    } else {
      showToast(json.message || 'Lỗi checkout', 'error');
    }
  } catch (err) {
    showToast('Lỗi máy chủ', 'error');
  }
});

// 2. Departments Operations
async function loadDepartments() {
  try {
    const res = await fetch('/api/departments');
    const json = await res.json();
    if (json.success) {
      departmentsList = json.data;
      updateDeptDropdowns();

      const tbody = document.getElementById('departments-tbody');
      if (departmentsList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">Chưa có phòng ban nào.</td></tr>';
        return;
      }
      tbody.innerHTML = departmentsList.map(d => `
        <tr>
          <td><strong>#PB${d.id}</strong></td>
          <td><strong>${d.name}</strong></td>
          <td>${d.description || '-'}</td>
          <td><span class="badge badge-info">${d.employee_count} thành viên</span></td>
          <td>${new Date(d.created_at).toLocaleDateString('vi-VN')}</td>
        </tr>
      `).join('');
    }
  } catch (err) {
    console.error('Error loading departments:', err);
  }
}

function updateDeptDropdowns() {
  const empDeptSelect = document.getElementById('emp-department');
  const deptFilter = document.getElementById('employee-dept-filter');

  const options = departmentsList.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
  empDeptSelect.innerHTML = '<option value="">-- Chọn phòng ban --</option>' + options;
  deptFilter.innerHTML = '<option value="">-- Tất cả phòng ban --</option>' + options;
}

// 3. Employees Operations
async function loadEmployees() {
  const search = document.getElementById('employee-search').value;
  const deptId = document.getElementById('employee-dept-filter').value;

  let url = '/api/employees?';
  if (search) url += `search=${encodeURIComponent(search)}&`;
  if (deptId) url += `department_id=${deptId}&`;

  try {
    const res = await fetch(url);
    const json = await res.json();
    if (json.success) {
      employeesList = json.data;
      updateQuickEmployeeSelect();

      const tbody = document.getElementById('employees-tbody');
      if (employeesList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">Không tìm thấy nhân viên nào phù hợp.</td></tr>';
        return;
      }

      tbody.innerHTML = employeesList.map(e => `
        <tr>
          <td><strong>#NV${e.id}</strong></td>
          <td>
            <div style="font-weight:600;">${e.full_name}</div>
            <div style="font-size:0.75rem; color:#64748b;">Gia nhập: ${new Date(e.hire_date).toLocaleDateString('vi-VN')}</div>
          </td>
          <td>
            <div>${e.email}</div>
            <div style="font-size:0.75rem; color:#64748b;">${e.phone || '-'}</div>
          </td>
          <td>${e.position}</td>
          <td><span class="badge badge-info">${e.department_name || 'Chưa gán'}</span></td>
          <td>${formatVND(e.salary)}</td>
          <td>
            <span class="badge ${e.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}">
              ${e.status === 'ACTIVE' ? 'Đang làm' : 'Nghỉ việc'}
            </span>
          </td>
          <td>
            <button class="btn-edit-sm" onclick="openEditEmployeeModal(${e.id})">Sửa</button>
            <button class="btn-danger-sm" onclick="deleteEmployee(${e.id})">Xóa</button>
          </td>
        </tr>
      `).join('');
    }
  } catch (err) {
    console.error('Error loading employees:', err);
  }
}

function updateQuickEmployeeSelect() {
  const quickSelect = document.getElementById('quick-employee-select');
  const activeEmps = employeesList.filter(e => e.status === 'ACTIVE');
  quickSelect.innerHTML = '<option value="">-- Chọn nhân viên để điểm danh --</option>' +
    activeEmps.map(e => `<option value="${e.id}">${e.full_name} (${e.position})</option>`).join('');
}

document.getElementById('employee-search').addEventListener('input', () => loadEmployees());
document.getElementById('employee-dept-filter').addEventListener('change', () => loadEmployees());

// Add / Edit Employee Modal Handling
const empModal = document.getElementById('employee-modal');
const empForm = document.getElementById('employee-form');
const btnOpenEmpModal = document.getElementById('btn-open-employee-modal');
const btnCloseEmpModal = document.getElementById('btn-close-emp-modal');
const btnCancelEmp = document.getElementById('btn-cancel-emp');

btnOpenEmpModal.addEventListener('click', () => {
  empForm.reset();
  document.getElementById('emp-id').value = '';
  document.getElementById('employee-modal-title').textContent = 'Thêm Nhân Viên Mới';
  empModal.classList.add('show');
});

function closeEmpModal() {
  empModal.classList.remove('show');
}
btnCloseEmpModal.addEventListener('click', closeEmpModal);
btnCancelEmp.addEventListener('click', closeEmpModal);

window.openEditEmployeeModal = function(id) {
  const emp = employeesList.find(e => e.id === id);
  if (!emp) return;

  document.getElementById('emp-id').value = emp.id;
  document.getElementById('emp-name').value = emp.full_name;
  document.getElementById('emp-email').value = emp.email;
  document.getElementById('emp-phone').value = emp.phone || '';
  document.getElementById('emp-position').value = emp.position;
  document.getElementById('emp-department').value = emp.department_id || '';
  document.getElementById('emp-salary').value = emp.salary || 0;
  document.getElementById('emp-status').value = emp.status;

  document.getElementById('employee-modal-title').textContent = 'Chỉnh Sửa Thông Tin Nhân Viên';
  empModal.classList.add('show');
};

empForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('emp-id').value;
  const payload = {
    full_name: document.getElementById('emp-name').value,
    email: document.getElementById('emp-email').value,
    phone: document.getElementById('emp-phone').value,
    position: document.getElementById('emp-position').value,
    department_id: document.getElementById('emp-department').value || null,
    salary: document.getElementById('emp-salary').value || 0,
    status: document.getElementById('emp-status').value,
  };

  try {
    const url = id ? `/api/employees/${id}` : '/api/employees';
    const method = id ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (json.success) {
      showToast(id ? 'Cập nhật nhân viên thành công' : 'Thêm nhân viên mới thành công');
      closeEmpModal();
      loadEmployees();
      loadDashboard();
    } else {
      showToast(json.message || 'Lỗi xử lý', 'error');
    }
  } catch (err) {
    showToast('Lỗi mạng', 'error');
  }
});

window.deleteEmployee = async function(id) {
  if (!confirm('Bạn có chắc chắn muốn xóa nhân viên này khỏi hệ thống?')) return;
  try {
    const res = await fetch(`/api/employees/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.success) {
      showToast(json.message);
      loadEmployees();
      loadDashboard();
    } else {
      showToast(json.message || 'Không thể xóa', 'error');
    }
  } catch (err) {
    showToast('Lỗi máy chủ', 'error');
  }
};

// Department Modal Handling
const deptModal = document.getElementById('dept-modal');
const deptForm = document.getElementById('dept-form');
const btnOpenDeptModal = document.getElementById('btn-open-dept-modal');
const btnCloseDeptModal = document.getElementById('btn-close-dept-modal');
const btnCancelDept = document.getElementById('btn-cancel-dept');

btnOpenDeptModal.addEventListener('click', () => {
  deptForm.reset();
  deptModal.classList.add('show');
});

function closeDeptModal() {
  deptModal.classList.remove('show');
}
btnCloseDeptModal.addEventListener('click', closeDeptModal);
btnCancelDept.addEventListener('click', closeDeptModal);

deptForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    name: document.getElementById('dept-name').value,
    description: document.getElementById('dept-desc').value,
  };
  try {
    const res = await fetch('/api/departments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (json.success) {
      showToast('Đã tạo phòng ban mới thành công');
      closeDeptModal();
      loadDepartments();
      loadDashboard();
    } else {
      showToast(json.message || 'Lỗi thêm phòng ban', 'error');
    }
  } catch (err) {
    showToast('Lỗi máy chủ', 'error');
  }
});

// 4. Attendance Full View
async function loadAttendance() {
  const dateVal = document.getElementById('attendance-date-filter').value;
  let url = '/api/attendance?';
  if (dateVal) url += `date=${dateVal}`;

  try {
    const res = await fetch(url);
    const json = await res.json();
    const tbody = document.getElementById('attendance-tbody');
    if (!json.success || json.data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" class="text-center">Không có bản ghi điểm danh trong ngày đã chọn.</td></tr>';
      return;
    }

    tbody.innerHTML = json.data.map(item => `
      <tr>
        <td><strong>#CC${item.id}</strong></td>
        <td><strong>${item.full_name}</strong></td>
        <td>${item.position}</td>
        <td>${item.department_name || 'N/A'}</td>
        <td>${new Date(item.attendance_date).toLocaleDateString('vi-VN')}</td>
        <td><span class="badge badge-info">${item.check_in || '--:--'}</span></td>
        <td><span class="badge ${item.check_out ? 'badge-info' : 'badge-warning'}">${item.check_out || 'Chưa out'}</span></td>
        <td>
          <span class="badge ${item.status === 'PRESENT' ? 'badge-success' : 'badge-warning'}">
            ${item.status === 'PRESENT' ? 'Đúng giờ' : (item.status === 'LATE' ? 'Đi trễ' : item.status)}
          </span>
        </td>
        <td>${item.notes || '-'}</td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Error loading attendance list:', err);
  }
}

document.getElementById('btn-load-attendance').addEventListener('click', () => loadAttendance());

// Initial Page Load
(async function init() {
  // Set default attendance date picker to today
  document.getElementById('attendance-date-filter').value = new Date().toISOString().split('T')[0];
  await loadDepartments();
  await loadEmployees();
  await loadDashboard();
})();
