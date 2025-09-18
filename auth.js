// Конфигурация приложения
const APP_KEY = 'metacompetencies_tracker';
const REMEMBER_ME_KEY = 'remember_me';

// Загрузка конфигурации GitHub
let githubConfig = null;
let adminCredentials = null;

// Загрузка конфигурации из файла
async function loadConfig() {
  try {
    const response = await fetch('config.json');
    if (!response.ok) {
      throw new Error('Конфигурационный файл не найден');
    }
    const config = await response.json();
    githubConfig = config.github;
    adminCredentials = config.admin;
    return true;
  } catch (error) {
    console.error('Ошибка загрузки конфигурации:', error);
    
    // Запасной вариант - попробуем загрузить из localStorage
    const savedConfig = loadFromLocalStorage('github_config');
    if (savedConfig) {
      githubConfig = savedConfig;
      showToast('Используются сохраненные настройки GitHub', 'info');
      return true;
    }
    
    showToast('Ошибка загрузки конфигурации', 'danger');
    return false;
  }
}

// Функция входа в систему
async function login() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const rememberMe = document.getElementById('rememberMe')?.checked || false;
  
  if (!username || !password) {
    showToast('Заполните все поля', 'warning');
    return false;
  }
  
  // Загружаем конфигурацию, если еще не загружена
  if (!githubConfig || !adminCredentials) {
    const configLoaded = await loadConfig();
    if (!configLoaded) {
      showToast('Ошибка загрузки конфигурации системы', 'danger');
      return false;
    }
  }
  
  // Сохраняем данные для входа, если отмечено "Запомнить меня"
  if (rememberMe) {
    saveToLocalStorage(REMEMBER_ME_KEY, {
      username: username,
      password: password
    });
  } else {
    localStorage.removeItem(REMEMBER_ME_KEY);
  }
  
  // Проверяем вход администратора
  if (username === adminCredentials.login) {
    if (password === adminCredentials.password) {
      const user = { 
        name: 'Администратор', 
        role: 'teacher',
        isAdmin: true 
      };
      
      saveToLocalStorage('currentUser', user);
      window.location.href = 'teacher.html';
      return true;
    } else {
      showToast('Неверный пароль администратора', 'danger');
      return false;
    }
  }
  
  // Проверяем вход ученика
  const appData = loadFromLocalStorage(APP_KEY) || { students: [], scores: [] };
  const student = appData.students.find(s => s.username === username && s.password === password);
  
  if (student) {
    const user = { 
      ...student, 
      role: 'student',
      isAdmin: false 
    };
    
    saveToLocalStorage('currentUser', user);
    window.location.href = 'student.html';
    showToast('Вход выполнен как ученик: ' + student.name, 'success');
    return true;
  }
  
  showToast('Неверный логин или пароль', 'danger');
  return false;
}

// Функция выхода из системы
function logout() {
  // Очищаем запомненные данные, если пользователь выходит
  const rememberMe = document.getElementById('rememberMe')?.checked || false;
  if (!rememberMe) {
    localStorage.removeItem(REMEMBER_ME_KEY);
  }
  
  localStorage.removeItem('currentUser');
  redirectToLogin();
}

// Проверка запомненных данных для автоматического входа
function checkRememberedLogin() {
  const remembered = loadFromLocalStorage(REMEMBER_ME_KEY);
  if (remembered && remembered.username && remembered.password) {
    document.getElementById('username').value = remembered.username;
    document.getElementById('password').value = remembered.password;
    document.getElementById('rememberMe').checked = true;
    
    // Автоматический вход
    setTimeout(() => {
      login();
    }, 500);
  }
}

// Инициализация аутентификации
document.addEventListener('DOMContentLoaded', function() {
  // Если мы не на странице входа, проверяем авторизацию
  if (!window.location.pathname.endsWith('index.html')) {
    const user = loadFromLocalStorage('currentUser');
    if (!user) {
      redirectToLogin();
      return;
    }
    
    // Проверяем роль пользователя и доступ к странице
    const currentPage = window.location.pathname.split('/').pop();
    if (currentPage === 'teacher.html' && user.role !== 'teacher') {
      redirectToLogin();
      return;
    }
    
    if (currentPage === 'student.html' && user.role !== 'student') {
      redirectToLogin();
      return;
    }
    
    // Загружаем конфигурацию
    loadConfig();
  } else {
    // На странице входа проверяем запомненные данные
    checkRememberedLogin();
  }
});
