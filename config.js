// config.js
// Конфигурация приложения

const CONFIG = {
    // API
    appsScriptUrl: 'https://script.google.com/macros/s/AKfycbyl3W8gDtZcjWuwwhLfE_EmRXGSbViv7xwjPuNn8cVoXvnlKuDz2xCBy_kMWiBmUdQ-nA/exec',
    
    // UI
    itemsPerPage: 50,
    sortDirection: 'desc',
    sortField: 'period',
    
    // Обновление данных
    refreshInterval: 5 * 60 * 1000, // 5 минут
    dataUpdateDelay: 2 * 60 * 1000, // 2-3 минуты на обновление из Google
    
    // Telegram
    telegramUrl: 'https://t.me/',
    
    // Безопасность
    dashboardPassword: '445566'
};
