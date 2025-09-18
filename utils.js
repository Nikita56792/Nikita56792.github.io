// Функции для работы с UTF-8 и Base64
function utf8ToBase64(str) {
  try {
    // Кодируем строку в UTF-8 перед преобразованием в Base64
    const utf8Bytes = new TextEncoder().encode(str);
    let binary = '';
    for (let i = 0; i < utf8Bytes.length; i++) {
      binary += String.fromCharCode(utf8Bytes[i]);
    }
    return btoa(binary);
  } catch (e) {
    console.error("Ошибка преобразования в Base64:", e);
    // Альтернативный метод для старых браузеров
    return btoa(unescape(encodeURIComponent(str)));
  }
}

function base64ToUtf8(base64) {
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch (e) {
    console.error("Ошибка преобразования из Base64:", e);
    // Альтернативный метод для старых браузеров
    return decodeURIComponent(escape(atob(base64)));
  }
}

// Функции работы с уведомлениями
function showToast(message, type = 'info') {
  const toastContainer = document.querySelector('.toast-container') || createToastContainer();
  const toastId = 'toast-' + Date.now();
  
  const toast = document.createElement('div');
  toast.className = `toast align-items-center text-white bg-${type} border-0`;
  toast.id = toastId;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');
  toast.setAttribute('aria-atomic', 'true');
  
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">
        ${message}
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
  `;
  
  toastContainer.appendChild(toast);
  
  // Используем Bootstrap Toast, если доступен
  if (typeof bootstrap !== 'undefined' && bootstrap.Toast) {
    const bsToast = new bootstrap.Toast(toast, {
      delay: 3000
    });
    bsToast.show();
    
    // Удаляем toast после скрытия
    toast.addEventListener('hidden.bs.toast', function() {
      toast.remove();
    });
  } else {
    // Простая реализация, если Bootstrap не загружен
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }
}

function createToastContainer() {
  const container = document.createElement('div');
  container.className = 'toast-container';
  document.body.appendChild(container);
  return container;
}

// Функции для работы с localStorage
function saveToLocalStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error('Ошибка сохранения в localStorage:', e);
    return false;
  }
}

function loadFromLocalStorage(key) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error('Ошибка загрузки из localStorage:', e);
    return null;
  }
}

// Функция для проверки авторизации
function checkAuth(requiredRole = null) {
  const user = loadFromLocalStorage('currentUser');
  const isAuthenticated = user !== null;
  
  if (!isAuthenticated) {
    return false;
  }
  
  if (requiredRole && user.role !== requiredRole) {
    return false;
  }
  
  return true;
}

// Функция для редиректа на страницу входа
function redirectToLogin() {
  window.location.href = 'index.html';
}
