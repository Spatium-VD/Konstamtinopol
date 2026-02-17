// utils.js
// Вспомогательные функции: форматирование, валидация

// Нормализация телефона для сравнения
function normalizePhone(phone) {
    if (!phone) return '';
    // Убираем все нецифровые символы
    const cleaned = phone.replace(/\D/g, '');
    // Если начинается с 8, заменяем на 7
    if (cleaned.length === 11 && cleaned.startsWith('8')) {
        return '7' + cleaned.substring(1);
    }
    return cleaned;
}

// Форматирование валюты
function formatCurrency(amount) {
    return new Intl.NumberFormat('ru-RU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

// Форматирование телефона для отображения
function formatPhone(phone) {
    if (!phone) return '';
    // Убираем все нецифровые символы
    const cleaned = phone.replace(/\D/g, '');
    
    // Форматируем: +7 (XXX) XXX-XX-XX для российских номеров
    if (cleaned.length === 11 && (cleaned.startsWith('7') || cleaned.startsWith('8'))) {
        return `+7 (${cleaned.substring(1, 4)}) ${cleaned.substring(4, 7)}-${cleaned.substring(7, 9)}-${cleaned.substring(9, 11)}`;
    }
    
    return `+${cleaned}`;
}

// Форматирование телефона для Telegram
function formatPhoneForTelegram(phone) {
    if (!phone) return '';
    // Убираем все нецифровые символы
    const cleaned = phone.replace(/\D/g, '');
    
    // Для Telegram нужен номер без + и пробелов
    return cleaned;
}

// Форматирование даты на русском языке (без времени и GMT)
function formatDateRussian(dateString) {
    if (!dateString) return '';
    
    // Если это уже строка в формате DD.MM.YYYY, возвращаем как есть
    if (typeof dateString === 'string' && /^\d{2}\.\d{2}\.\d{4}$/.test(dateString.trim())) {
        return dateString.trim();
    }
    
    // Пытаемся распарсить дату
    let date;
    if (typeof dateString === 'string') {
        // Пробуем разные форматы
        const parts = dateString.split(/[.\-\/]/);
        if (parts.length === 3) {
            // Предполагаем формат DD.MM.YYYY или YYYY-MM-DD
            if (parts[0].length === 4) {
                // YYYY-MM-DD
                date = new Date(parts[0], parts[1] - 1, parts[2]);
            } else {
                // DD.MM.YYYY
                date = new Date(parts[2], parts[1] - 1, parts[0]);
            }
        } else {
            // Пробуем распарсить как ISO строку или Date строку
            date = new Date(dateString);
        }
    } else if (dateString instanceof Date) {
        date = dateString;
    } else {
        return dateString.toString();
    }
    
    // Проверяем что дата валидна
    if (isNaN(date.getTime())) {
        return dateString.toString();
    }
    
    // Форматируем на русском
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}.${month}.${year}`;
}

// Получить CSS класс для статуса
function getStatusClass(status) {
    if (!status) return 'status-other';
    
    const statusLower = status.toLowerCase();
    if (statusLower.includes('оплатили') || statusLower.includes('оплачено')) {
        return 'status-paid';
    } else if (statusLower.includes('не') || statusLower.includes('отказ')) {
        return 'status-not-paid';
    }
    return 'status-other';
}

// Debounce функция для оптимизации поиска
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
