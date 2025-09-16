// Конфигурация
const API_URL = 'https://script.google.com/u/0/home/projects/18F8jIWk6rkw1IQDLrVTAkoWXxBKEewExKQsxghxJOoTk4d2K1UNjQyVM/edit';

// Глобальные переменные
let currentUser = null;
let groupChart = null;
let progressChart = null;
let radarChart = null;

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    // Навигация
    document.getElementById('teacherLink').addEventListener('click', function(e) {
        e.preventDefault();
        showTeacherView();
    });
    
    document.getElementById('studentLink').addEventListener('click', function(e) {
        e.preventDefault();
        showLoginView();
    });
    
    document.getElementById('logoutLink').addEventListener('click', function(e) {
        e.preventDefault();
        logout();
    });
});

// Навигация
function showLoginView() {
    document.getElementById('loginPage').classList.remove('hidden');
    document.getElementById('teacherView').classList.add('hidden');
    document.getElementById('studentView').classList.add('hidden');
    document.getElementById('logoutLink').style.display = 'none';
    currentUser = null;
}

function showTeacherView() {
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('teacherView').classList.remove('hidden');
    document.getElementById('studentView').classList.add('hidden');
    document.getElementById('logoutLink').style.display = 'block';
    loadTeacherData();
}

function showStudentView() {
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('teacherView').classList.add('hidden');
    document.getElementById('studentView').classList.remove('hidden');
    document.getElementById('logoutLink').style.display = 'block';
    loadStudentData();
}

// API функции
async function apiCall(params) {
    const urlParams = new URLSearchParams(params);
    const response = await fetch(`${API_URL}?${urlParams}`);
    return await response.json();
}

async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
        alert('Заполните все поля');
        return;
    }
    
    try {
        const result = await apiCall({
            action: 'login',
            username: username,
            password: password
        });
        
        if (result.success) {
            currentUser = result.student;
            showStudentView();
        } else {
            alert(result.message);
        }
    } catch (error) {
        alert('Ошибка при входе в систему');
    }
}

function logout() {
    currentUser = null;
    showLoginView();
}

// Функции преподавателя
async function loadTeacherData() {
    try {
        // Загрузка списка учеников
        const students = await apiCall({ action: 'getStudents' });
        renderStudentsList(students);
        populateStudentDropdown(students);
        
        // Загрузка статистики
        const statistics = await apiCall({ action: 'getStatistics' });
        renderGroupChart(statistics);
    } catch (error) {
        alert('Ошибка загрузки данных');
    }
}

function renderStudentsList(students) {
    const tbody = document.getElementById('studentsList');
    tbody.innerHTML = '';
    
    students.forEach(student => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${student.id}</td>
            <td>${student.name}</td>
            <td>${student.group}</td>
            <td>
                <button class="btn btn-danger btn-sm" onclick="deleteStudent(${student.id})">Удалить</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function populateStudentDropdown(students) {
    const select = document.getElementById('scoreStudent');
    select.innerHTML = '';
    
    students.forEach(student => {
        const option = document.createElement('option');
        option.value = student.id;
        option.textContent = `${student.name} (${student.group})`;
        select.appendChild(option);
    });
}

async function addStudent() {
    const name = document.getElementById('newStudentName').value;
    const group = document.getElementById('newStudentGroup').value;
    
    if (!name || !group) {
        alert('Заполните все поля');
        return;
    }
    
    try {
        await apiCall({
            action: 'addStudent',
            name: name,
            group: group
        });
        
        // Очищаем поля и обновляем список
        document.getElementById('newStudentName').value = '';
        document.getElementById('newStudentGroup').value = '';
        loadTeacherData();
        
        alert('Ученик добавлен');
    } catch (error) {
        alert('Ошибка при добавлении ученика');
    }
}

async function deleteStudent(id) {
    if (!confirm('Вы уверены, что хотите удалить этого ученика?')) {
        return;
    }
    
    try {
        await apiCall({
            action: 'deleteStudent',
            id: id
        });
        
        loadTeacherData();
        alert('Ученик удален');
    } catch (error) {
        alert('Ошибка при удалении ученика');
    }
}

async function addScore() {
    const studentId = document.getElementById('scoreStudent').value;
    const period = document.getElementById('scorePeriod').value;
    const category = document.getElementById('scoreCategory').value;
    const points = document.getElementById('scorePoints').value;
    
    if (!studentId || !points) {
        alert('Заполните все поля');
        return;
    }
    
    try {
        await apiCall({
            action: 'addScore',
            studentId: studentId,
            period: period,
            category: category,
            points: points
        });
        
        // Очищаем поле баллов
        document.getElementById('scorePoints').value = '';
        
        alert('Баллы добавлены');
    } catch (error) {
        alert('Ошибка при добавлении баллов');
    }
}

function renderGroupChart(statistics) {
    const ctx = document.getElementById('groupChart').getContext('2d');
    
    if (groupChart) {
        groupChart.destroy();
    }
    
    // Подготовка данных для графика
    const students = Object.values(statistics).map(s => s.student.name);
    const totals = Object.values(statistics).map(s => s.total);
    
    groupChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: students,
            datasets: [{
                label: 'Общее количество баллов',
                data: totals,
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Функции ученика
async function loadStudentData() {
    if (!currentUser) return;
    
    try {
        // Загрузка баллов ученика
        const scores = await apiCall({
            action: 'getScores',
            studentId: currentUser.id
        });
        
        renderScoresTable(scores);
        renderProgressChart(scores);
        renderRadarChart(scores);
    } catch (error) {
        alert('Ошибка загрузки данных');
    }
}

function renderScoresTable(scores) {
    const tbody = document.getElementById('scoresTable');
    tbody.innerHTML = '';
    
    scores.forEach(score => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${score.period}</td>
            <td>${score.category}</td>
            <td>${score.points}</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderProgressChart(scores) {
    const ctx = document.getElementById('progressChart').getContext('2d');
    
    if (progressChart) {
        progressChart.destroy();
    }
    
    // Группируем баллы по периодам
    const periods = [...new Set(scores.map(s => s.period))];
    const periodTotals = periods.map(period => {
        return scores.filter(s => s.period === period)
                     .reduce((sum, s) => sum + s.points, 0);
    });
    
    progressChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: periods,
            datasets: [{
                label: 'Баллы по периодам',
                data: periodTotals,
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 2,
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function renderRadarChart(scores) {
    const ctx = document.getElementById('radarChart').getContext('2d');
    
    if (radarChart) {
        radarChart.destroy();
    }
    
    // Группируем баллы по категориям
    const categories = [
        'Критическое мышление',
        'Эмоциональный интеллект',
        'Командная работа',
        'Креативность',
        'Цифровая грамотность',
        'Проектное мышление',
        'Рефлексия'
    ];
    
    const categoryTotals = categories.map(category => {
        return scores.filter(s => s.category === category)
                     .reduce((sum, s) => sum + s.points, 0);
    });
    
    radarChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: categories,
            datasets: [{
                label: 'Баллы по категориям',
                data: categoryTotals,
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                borderColor: 'rgba(255, 99, 132, 1)',
                borderWidth: 2,
                pointBackgroundColor: 'rgba(255, 99, 132, 1)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    beginAtZero: true
                }
            }
        }
    });
}
