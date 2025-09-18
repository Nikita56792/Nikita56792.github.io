// Глобальные переменные для синхронизации
let syncQueue = [];
let isSyncing = false;
let syncAttempts = 0;
const MAX_SYNC_ATTEMPTS = 5;
const SYNC_RETRY_DELAY = 2000;

// Функция сохранения настроек GitHub
function saveGithubConfig() {
  const username = document.getElementById('githubUsername').value;
  const token = document.getElementById('githubToken').value;
  const repo = document.getElementById('githubRepo').value;
  const file = document.getElementById('githubFile').value;
  
  if (!username || !token || !repo || !file) {
    showToast('Заполните все поля конфигурации GitHub', 'warning');
    return;
  }
  
  githubConfig = {
    username,
    token,
    repo,
    file,
    autoSync: true
  };
  
  saveToLocalStorage('github_config', githubConfig);
  showToast('Настройки GitHub сохранены', 'success');
}

// Функция проверки подключения к GitHub
async function testGithubConnection() {
  if (!githubConfig || !githubConfig.username || !githubConfig.token || !githubConfig.repo) {
    showToast('Сначала настройте подключение к GitHub', 'warning');
    return;
  }
  
  try {
    const response = await fetch(`https://api.github.com/repos/${githubConfig.username}/${githubConfig.repo}`, {
      headers: {
        'Authorization': `token ${githubConfig.token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (response.ok) {
      showToast('Подключение к GitHub успешно', 'success');
    } else {
      showToast('Ошибка подключения к GitHub: ' + response.statusText, 'danger');
    }
  } catch (error) {
    showToast('Ошибка подключения к GitHub: ' + error.message, 'danger');
  }
}

// Функция загрузки данных из GitHub
async function loadFromGitHub() {
  if (!githubConfig || !githubConfig.username || !githubConfig.token || !githubConfig.repo || !githubConfig.file) {
    showToast('Сначала настройте подключение к GitHub', 'warning');
    return false;
  }
  
  try {
    setSyncStatus('Синхронизация с GitHub...', 'info');
    
    const response = await fetch(`https://api.github.com/repos/${githubConfig.username}/${githubConfig.repo}/contents/${githubConfig.file}`, {
      headers: {
        'Authorization': `token ${githubConfig.token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (!response.ok) {
      // Если файл не существует, создадим его позже
      if (response.status === 404) {
        showToast('Файл данных не найден, будет создан при сохранении', 'info');
        setSyncStatus('Готово', 'success');
        return true;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    // Используем правильное декодирование Base64 с поддержкой UTF-8
    const contentStr = base64ToUtf8(data.content);
    const content = JSON.parse(contentStr);
    
    // Обновляем данные в приложении
    const appData = {
      students: content.students || [],
      scores: content.scores || [],
      adminCredentials: content.adminCredentials || { login: 'admin', password: 'admin' }
    };
    
    saveToLocalStorage(APP_KEY, appData);
    
    // Обновляем глобальные переменные
    adminCredentials = appData.adminCredentials;
    
    showToast('Данные успешно загружены из GitHub', 'success');
    setSyncStatus('Данные загружены', 'success');
    
    return true;
  } catch (error) {
    showToast('Ошибка загрузки данных из GitHub: ' + error.message, 'danger');
    setSyncStatus('Ошибка загрузки', 'danger');
    return false;
  }
}

// Функция сохранения данных в GitHub
async function saveToGitHub() {
  if (!githubConfig || !githubConfig.username || !githubConfig.token || !githubConfig.repo || !githubConfig.file) {
    showToast('Сначала настройте подключение к GitHub', 'warning');
    return false;
  }
  
  try {
    setSyncStatus('Сохранение в GitHub...', 'info');
    
    // Получаем текущий SHA файла (если существует)
    let sha = null;
    try {
      const response = await fetch(`https://api.github.com/repos/${githubConfig.username}/${githubConfig.repo}/contents/${githubConfig.file}`, {
        headers: {
          'Authorization': `token ${githubConfig.token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        sha = data.sha;
      }
    } catch (error) {
      // Файл не существует, это нормально
    }
    
    // Подготавливаем данные для сохранения
    const appData = loadFromLocalStorage(APP_KEY) || {
      students: [],
      scores: [],
      adminCredentials: adminCredentials || { login: 'admin', password: 'admin' }
    };
    
    const content = {
      students: appData.students,
      scores: appData.scores,
      adminCredentials: appData.adminCredentials,
      lastUpdated: new Date().toISOString()
    };
    
    const contentStr = JSON.stringify(content, null, 2);
    // Используем правильное кодирование Base64 с поддержкой UTF-8
    const contentBase64 = utf8ToBase64(contentStr);
    
    // Отправляем данные на GitHub
    const response = await fetch(`https://api.github.com/repos/${githubConfig.username}/${githubConfig.repo}/contents/${githubConfig.file}`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${githubConfig.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Update metacompetencies data',
        content: contentBase64,
        sha: sha
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    
    showToast('Данные успешно сохранены в GitHub', 'success');
    setSyncStatus('Данные сохранены', 'success');
    
    // Сбрасываем счетчик попыток при успешной синхронизации
    syncAttempts = 0;
    
    return true;
  } catch (error) {
    showToast('Ошибка сохранения данных в GitHub: ' + error.message, 'danger');
    setSyncStatus('Ошибка сохранения', 'danger');
    
    // Добавляем задачу в очередь для повторной попытки
    addToSyncQueue();
    
    return false;
  }
}

// Функция добавления задачи в очередь синхронизации
function addToSyncQueue() {
  if (syncAttempts < MAX_SYNC_ATTEMPTS) {
    syncAttempts++;
    setTimeout(() => {
      saveToGitHub();
    }, SYNC_RETRY_DELAY);
  } else {
    showToast(`Не удалось синхронизировать данные после ${MAX_SYNC_ATTEMPTS} попыток. Данные сохранены только локально.`, 'warning');
    setSyncStatus('Ошибка синхронизации', 'danger');
    
    // Показываем предупреждение о несохраненных данных
    showUnsavedChangesWarning();
  }
}

// Функция показа предупреждения о несохраненных данных
function showUnsavedChangesWarning() {
  const warning = document.createElement('div');
  warning.className = 'sync-warning';
  warning.innerHTML = `
    <h6>Внимание!</h6>
    <p>Данные не были синхронизированы с GitHub.</p>
    <div class="d-flex gap-2 mt-2">
      <button class="btn btn-sm btn-light" onclick="retrySync()">Повторить попытку</button>
      <button class="btn btn-sm btn-light" onclick="dismissWarning(this)">Закрыть</button>
    </div>
  `;
  
  document.body.appendChild(warning);
}

// Функция повторной попытки синхронизации
function retrySync() {
  syncAttempts = 0;
  saveToGitHub();
  
  // Удаляем предупреждение
  const warning = document.querySelector('.sync-warning');
  if (warning) {
    warning.remove();
  }
}

// Функция закрытия предупреждения
function dismissWarning(button) {
  const warning = button.closest('.sync-warning');
  if (warning) {
    warning.remove();
  }
}

// Функция установки статуса синхронизации
function setSyncStatus(message, type = 'info') {
  const syncStatus = document.getElementById('syncStatus');
  if (syncStatus) {
    syncStatus.innerHTML = `<span class="badge bg-${type}">${message}</span>`;
  }
}

// Обработчик перед закрытием страницы
window.addEventListener('beforeunload', function(e) {
  if (syncAttempts > 0 && syncAttempts < MAX_SYNC_ATTEMPTS) {
    e.preventDefault();
    e.returnValue = 'Данные еще не синхронизированы с GitHub. Вы уверены, что хотите уйти?';
    return e.returnValue;
  }
});
