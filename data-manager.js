// Глобальные переменные для данных приложения
let students = [];
let scores = [];

// Загрузка данных приложения
function loadAppData() {
  const appData = loadFromLocalStorage(APP_KEY) || {
    students: [],
    scores: [],
    adminCredentials: { login: 'admin', password: 'admin' }
  };
  
  students = appData.students || [];
  scores = appData.scores || [];
  
  if (appData.adminCredentials) {
    adminCredentials = appData.adminCredentials;
  }
  
  return appData;
}

// Сохранение данных приложения
function saveAppData() {
  const appData = {
    students: students,
    scores: scores,
    adminCredentials: adminCredentials,
    lastUpdated: new Date().toISOString()
  };
  
  const saved = saveToLocalStorage(APP_KEY, appData);
  
  if (saved && githubConfig && githubConfig.autoSync) {
    saveToGitHub();
  }
  
  return saved;
}

// Функции для работы с учениками
function addStudent(name, group) {
  if (!name || !group) {
    showToast('Заполните все поля', 'warning');
    return false;
  }
  
  // Генерируем логин и пароль
  const username = name.toLowerCase().replace(/\s+/g, '');
  const password = 'password'; // Простой пароль по умолчанию
  
  const newStudent = {
    id: students.length > 0 ? Math.max(...students.map(s => s.id)) + 1 : 1,
    name: name,
    group: group,
    username: username,
    password: password
  };
  
  students.push(newStudent);
  const saved = saveAppData();
  
  if (saved) {
    showToast('Ученик добавлен. Логин: ' + username + ', Пароль: password', 'success');
  }
  
  return newStudent;
}

function deleteStudent(id) {
  if (!confirm('Вы уверены, что хотите удалить этого ученика?')) {
    return false;
  }
  
  // Удаляем ученика
  students = students.filter(student => student.id !== id);
  
  // Удаляем все баллы ученика
  scores = scores.filter(score => score.studentId !== id);
  
  const saved = saveAppData();
  
  if (saved) {
    showToast('Ученик удален', 'success');
  }
  
  return true;
}

// Функции для работы с баллами
function addScore(studentId, period, category, points) {
  if (!studentId || isNaN(points)) {
    showToast('Заполните все поля', 'warning');
    return false;
  }
  
  const newScore = {
    id: scores.length > 0 ? Math.max(...scores.map(s => s.id)) + 1 : 1,
    studentId: studentId,
    period: period,
    category: category,
    points: points
  };
  
  scores.push(newScore);
  const saved = saveAppData();
  
  if (saved) {
    showToast('Баллы добавлены', 'success');
  }
  
  return newScore;
}

// Функции для отображения данных
function renderStudentsList() {
  const tbody = document.getElementById('studentsList');
  if (!tbody) return;
  
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

function populateStudentDropdown() {
  const select = document.getElementById('scoreStudent');
  if (!select) return;
  
  select.innerHTML = '';
  
  students.forEach(student => {
    const option = document.createElement('option');
    option.value = student.id;
    option.textContent = `${student.name} (${student.group})`;
    select.appendChild(option);
  });
}

function populateStudentSelector() {
  const select = document.getElementById('viewStudentSelect');
  if (!select) return;
  
  select.innerHTML = '<option value="">-- Выберите ученика --</option>';
  
  students.forEach(student => {
    const option = document.createElement('option');
    option.value = student.id;
    option.textContent = `${student.name} (${student.group})`;
    select.appendChild(option);
  });
}

// Функции для графиков
function renderGroupChart() {
  const ctx = document.getElementById('groupChart');
  if (!ctx) return;
  
  if (window.groupChart) {
    window.groupChart.destroy();
  }
  
  // Подготовка данных для графика
  const studentScores = {};
  
  students.forEach(student => {
    studentScores[student.id] = {
      student: student,
      total: 0
    };
  });
  
  scores.forEach(score => {
    if (studentScores[score.studentId]) {
      studentScores[score.studentId].total += score.points;
    }
  });
  
  const studentNames = Object.values(studentScores).map(s => s.student.name);
  const totals = Object.values(studentScores).map(s => s.total);
  
  window.groupChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: studentNames,
      datasets: [{
        label: 'Общее количество баллов',
        data: totals,
        backgroundColor: 'rgba(78, 115, 223, 0.5)',
        borderColor: 'rgba(78, 115, 223, 1)',
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

function renderProgressChart(studentId) {
  const ctx = document.getElementById('progressChart');
  if (!ctx) return;
  
  if (window.progressChart) {
    window.progressChart.destroy();
  }
  
  // Группируем баллы по периодам
  const studentScores = scores.filter(score => score.studentId === studentId);
  const periods = [...new Set(studentScores.map(s => s.period))];
  
  const periodTotals = periods.map(period => {
    return studentScores.filter(s => s.period === period)
                     .reduce((sum, s) => sum + s.points, 0);
  });
  
  window.progressChart = new Chart(ctx, {
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

function renderRadarChart(studentId) {
  const ctx = document.getElementById('radarChart');
  if (!ctx) return;
  
  if (window.radarChart) {
    window.radarChart.destroy();
  }
  
  // Группируем баллы по категориям
  const studentScores = scores.filter(score => score.studentId === studentId);
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
    return studentScores.filter(s => s.category === category)
                     .reduce((sum, s) => sum + s.points, 0);
  });
  
  window.radarChart = new Chart(ctx, {
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

function renderScoresTable(studentId) {
  const tbody = document.getElementById('scoresTable');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  const studentScores = scores.filter(score => score.studentId === studentId);
  
  studentScores.forEach(score => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${score.period}</td>
      <td>${score.category}</td>
      <td>${score.points}</td>
    `;
    tbody.appendChild(tr);
  });
}
