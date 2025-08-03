let todos = [];

// โหลดข้อมูลจาก data_task.json
async function loadTodos() {
    try {
        const res = await fetch('data_task.json');
        todos = await res.json();
        renderTable();
        if (localStorage.getItem('todo_tab') === 'kanban') {
            renderKanban();
        }
    } catch (e) {
        todos = [];
        renderTable();
    }
}

// บันทึกข้อมูลกลับไปที่ data_task.json ผ่าน PHP
async function saveTodos() {
    await fetch('save_task.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(todos)
    });
}

// ฟังก์ชันแปลง effort เป็นตัวเลข (High=3, Medium=2, Low=1)
function effortValue(effort) {
    if (effort === 'High') return 3;
    if (effort === 'Medium') return 2;
    return 1;
}
// ฟังก์ชันแปลง status เป็นตัวเลข (Not started=1, In progress=2, Done=3)
function statusValue(status) {
    if (status === 'Not started') return 1;
    if (status === 'In progress') return 2;
    return 3;
}

let editingIndex = null;

// ฟังก์ชันแสดงตารางและเรียงลำดับ
function renderTable() {
    const now = new Date();
    todos.forEach(todo => {
        todo.remainSec = Math.max(0, Math.floor((new Date(todo.deadline) - now) / 1000));
    });
    todos.sort((a, b) => {
        if (effortValue(b.effort) !== effortValue(a.effort)) {
            return effortValue(b.effort) - effortValue(a.effort);
        }
        if (statusValue(a.status) !== statusValue(b.status)) {
            return statusValue(a.status) - statusValue(b.status);
        }
        return a.remainSec - b.remainSec;
    });

    const tbody = document.getElementById('todo-body');
    tbody.innerHTML = '';
    todos.forEach((todo, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                ${todo.title}
                <button class="open-btn" title="เปิด" onclick="openSidePanel(
                    '${todo.title}',
                    '${todo.priority}',
                    '${todo.effort}',
                    '${todo.status}',
                    '${todo.deadline}',
                    ${idx}
                )">
                    <img src="./open.svg" alt="เปิด">เปิด
                </button>
            </td>
            <td><span class="badge ${todo.priority.toLowerCase()}">${todo.priority}</span></td>
            <td><span class="badge ${todo.effort.toLowerCase()}">${todo.effort}</span></td>
            <td><span class="status">${todo.status}</span></td>
            <td><input type="checkbox"></td>
            <td>${formatDeadline(todo.deadline)}</td>
            <td><span class="remain-time" data-deadline="${todo.deadline}"></span></td>
        `;
        tbody.appendChild(tr);
    });
    updateRemainTimes();
}

// ฟังก์ชันแสดง Kanban board
function renderKanban() {
    const notStartedCol = document.getElementById('not-started-col');
    const inProgressCol = document.getElementById('in-progress-col');
    const doneCol = document.getElementById('done-col');
    notStartedCol.innerHTML = '';
    inProgressCol.innerHTML = '';
    doneCol.innerHTML = '';

    todos.forEach((todo, idx) => {
        const taskDiv = document.createElement('div');
        taskDiv.className = 'kanban-task';
        taskDiv.style.cursor = 'pointer';
        taskDiv.innerHTML = `<span>${todo.title}</span>`;
        taskDiv.onclick = () => openSidePanel(
            todo.title,
            todo.priority,
            todo.effort,
            todo.status,
            todo.deadline,
            idx
        );

        if (todo.status === 'Not started') {
            notStartedCol.appendChild(taskDiv);
        } else if (todo.status === 'In progress') {
            inProgressCol.appendChild(taskDiv);
        } else if (todo.status === 'Done') {
            doneCol.appendChild(taskDiv);
        }
    });
}

function formatDeadline(deadline) {
    const d = new Date(deadline);
    const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    return (
        d.getDate() + ' ' +
        thaiMonths[d.getMonth()] + ' ' +
        (d.getFullYear() + 543) + ' ' +
        d.getHours().toString().padStart(2, '0') + ':' +
        d.getMinutes().toString().padStart(2, '0')
    );
}

// ฟังก์ชันอัปเดตเวลาที่เหลือและแจ้งเตือน
function updateRemainTimes() {
    const now = new Date();
    document.querySelectorAll('.remain-time').forEach((el, idx) => {
        const deadline = new Date(el.getAttribute('data-deadline'));
        let diff = Math.floor((deadline - now) / 1000);
        const oneDayInSeconds = 86400;

        // แจ้งเตือนล่วงหน้า 1 วัน
        if (diff >= oneDayInSeconds - 10 && diff <= oneDayInSeconds + 10) {
            const notifiedKey = `notified_1day_${todos[idx].title}`;
            if (!localStorage.getItem(notifiedKey)) {
                showNotification(`เหลือ 1 วันสำหรับงาน: ${todos[idx].title}`);
                localStorage.setItem(notifiedKey, '1');
            }
        }

        if (diff < 0) {
            // แจ้งเตือนเมื่อหมดเวลา
            const notifiedKey = `notified_expired_${todos[idx].title}`;
            if (!localStorage.getItem(notifiedKey)) {
                showNotification(`หมดเวลาสำหรับงาน: ${todos[idx].title}`);
                localStorage.setItem(notifiedKey, '1');
            }
            el.textContent = 'หมดเวลา';
        } else {
            const notifiedKey = `notified_expired_${todos[idx].title}`;
            localStorage.removeItem(notifiedKey); // รีเซ็ตเมื่อเวลายังไม่หมด
            const d = Math.floor(diff / 86400);
            diff %= 86400;
            const h = Math.floor(diff / 3600);
            diff %= 3600;
            const m = Math.floor(diff / 60);
            const s = diff % 60;
            el.textContent =
                (d ? d + ' วัน ' : '') +
                (h ? h + ' ชม. ' : '') +
                (m ? m + ' นาที ' : '') +
                (s + ' วิ');
        }
    });
}

setInterval(updateRemainTimes, 1000);

// จดจำ tab ล่าสุดด้วย localStorage
function showTab(tab) {
    document.getElementById('table-tab').classList.toggle('hidden', tab !== 'table');
    document.getElementById('kanban-tab').classList.toggle('hidden', tab !== 'kanban');
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-btn')[tab === 'table' ? 0 : 1].classList.add('active');
    localStorage.setItem('todo_tab', tab);
    if (tab === 'kanban') {
        renderKanban();
    }
}

// เปิด tab ล่าสุดเมื่อโหลดหน้าเว็บ
window.onload = function () {
    var tab = localStorage.getItem('todo_tab') || 'table';
    showTab(tab);
    loadTodos();
};

function openSidePanel(title, priority, effort, status, deadline, idx = null) {
    document.getElementById('panel-title').textContent = title;
    document.getElementById('panel-priority').textContent = priority;
    document.getElementById('panel-effort').textContent = effort;
    document.getElementById('panel-status').textContent = status;

    document.getElementById('panel-time').textContent = formatDeadline(deadline);

    document.getElementById('panel-priority').className = 'badge ' + priority.toLowerCase();
    document.getElementById('panel-effort').className = 'badge ' + effort.toLowerCase();
    document.getElementById('panel-status').className = 'status';

    editingIndex = idx;

    const panel = document.getElementById('side-panel');
    panel.classList.remove('hidden');
    setTimeout(function () {
        panel.classList.add('show');
    }, 10);
}

function editPanel() {
    if (editingIndex === null) return;
    const todo = todos[editingIndex];
    document.querySelector('#edit-task-modal #task-title').value = todo.title;
    document.querySelector('#edit-task-modal #task-priority').value = todo.priority;
    document.querySelector('#edit-task-modal #task-effort').value = todo.effort;
    document.querySelector('#edit-task-modal #task-status').value = todo.status;
    document.querySelector('#edit-task-modal #task-deadline').value = todo.deadline;
    closeSidePanel();
    document.getElementById('edit-task-modal').style.display = 'flex';
}

function closeEditTaskModal() {
    document.getElementById('edit-task-modal').style.display = 'none';
}

function closeSidePanel() {
    const panel = document.getElementById('side-panel');
    panel.classList.remove('show');
    setTimeout(function () {
        panel.classList.add('hidden');
    }, 200);
}

async function saveEditTask() {
    if (editingIndex === null) return;
    const title = document.querySelector('#edit-task-modal #task-title').value.trim();
    const priority = document.querySelector('#edit-task-modal #task-priority').value;
    const effort = document.querySelector('#edit-task-modal #task-effort').value;
    const status = document.querySelector('#edit-task-modal #task-status').value;
    const deadline = document.querySelector('#edit-task-modal #task-deadline').value;

    if (!title || !deadline) {
        Swal.fire({
            icon: 'error',
            title: 'ข้อผิดพลาด',
            text: 'กรุณากรอกชื่องานและเดดไลน์',
        });
        return;
    }

    todos[editingIndex] = { title, priority, effort, status, deadline };
    editingIndex = null;
    closeEditTaskModal();
    renderTable();
    if (localStorage.getItem('todo_tab') === 'kanban') {
        renderKanban();
    }
    await saveTodos();
    Swal.fire({
        icon: 'success',
        title: 'แก้ไขงานสำเร็จ',
        text: `งาน "${title}" ถูกแก้ไขเรียบร้อยแล้ว!`,
        timer: 1500,
        showConfirmButton: false
    });
}

// ฟังก์ชันสำหรับ modal เพิ่มงาน
function openAddTaskModal() {
    document.getElementById('add-task-modal').style.display = 'flex';
}

function closeAddTaskModal() {
    document.getElementById('add-task-modal').style.display = 'none';
    document.getElementById('task-title').value = '';
    document.getElementById('task-priority').value = 'High';
    document.getElementById('task-effort').value = 'Low';
    document.getElementById('task-status').value = 'Not started';
    document.getElementById('task-deadline').value = '';
}

async function addNewTask() {
    const title = document.getElementById('task-title').value.trim();
    const priority = document.getElementById('task-priority').value;
    const effort = document.getElementById('task-effort').value;
    const status = document.getElementById('task-status').value;
    const deadline = document.getElementById('task-deadline').value;

    if (!title || !deadline) {
        Swal.fire({
            icon: 'error',
            title: 'ข้อผิดพลาด',
            text: 'กรุณากรอกชื่องานและเดดไลน์',
        });
        return;
    }

    todos.push({
        title,
        priority,
        effort,
        status,
        deadline
    });

    closeAddTaskModal();
    renderTable();
    if (localStorage.getItem('todo_tab') === 'kanban') {
        renderKanban();
    }
    await saveTodos();
    Swal.fire({
        icon: 'success',
        title: 'เพิ่มงานสำเร็จ',
        text: `งาน "${title}" ถูกเพิ่มเรียบร้อยแล้ว!`,
        timer: 1500,
        showConfirmButton: false
    });
}

// ขออนุญาตแจ้งเตือน
if (Notification.permission !== "granted") {
    Notification.requestPermission();
}

function showNotification(text) {
    if (Notification.permission === "granted") {
        const notification = new Notification("แจ้งเตือน", {
            body: text,
            icon: "https://cdn-icons-png.flaticon.com/512/561/561127.png"
        });
        notification.onclick = () => {
            window.focus();
            notification.close();
        };
    }
}