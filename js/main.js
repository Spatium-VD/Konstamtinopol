// main.js
// Главный файл - инициализация приложения

// Глобальные переменные
let allPayments = [];
let filteredPayments = [];
let allDocuments = [];
let filteredDocuments = [];
let allDetours = [];
let accountsData = { payments: [], transactions: [] }; // Данные счетов
let mergedData = {}; // Объединённые данные по телефонам
let currentPage = 1;
let currentDocPage = 1;
let currentSort = { field: CONFIG.sortField, direction: CONFIG.sortDirection };
let currentDocSort = { field: 'employee', direction: 'asc' };
let currentEmployeePayments = [];
let currentEmployee = null; // Текущий сотрудник для карточки
let currentMode = null; // 'last-period', 'last-unpaid', null
let allPeriods = [];
let allStatuses = [];
let allPositions = [];
let allRestaurants = [];
let lastPeriod = '';
let currentScreen = 'home'; // 'home', 'payments', 'documents', 'dashboard', 'sos', 'employee'

// Элементы DOM - будем заполнять после загрузки DOM
const elements = {};

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    // Проверка пароля для доступа к платформе
    checkPlatformPassword();
    
    // Сначала инициализируем элементы DOM
    initializeDOMElements();
    
    // Затем настраиваем обработчики событий
    setupEventListeners();
    
    // И только потом загружаем данные
    loadData();
    
    // Обновление времени последнего обновления
    updateLastUpdateTime();
    
    // Периодическое обновление данных
    setInterval(() => {
        loadData();
    }, CONFIG.refreshInterval);
});

// Проверка пароля для доступа к платформе
function checkPlatformPassword() {
    // Проверяем, был ли уже введен правильный пароль в этой сессии
    const platformAccessGranted = sessionStorage.getItem('platformAccessGranted') === 'true';
    
    if (platformAccessGranted) {
        // Доступ уже предоставлен
        return;
    }
    
    // Запрашиваем пароль
    const password = prompt('Введите пароль для доступа к платформе:');
    
    if (password === CONFIG.platformPassword) {
        // Пароль правильный, сохраняем доступ в сессии
        sessionStorage.setItem('platformAccessGranted', 'true');
    } else {
        // Пароль неверный, блокируем доступ
        alert('Неверный пароль. Доступ запрещен.');
        // Перенаправляем на пустую страницу или показываем сообщение
        document.body.innerHTML = '<div style="display: flex; justify-content: center; align-items: center; height: 100vh; font-size: 24px;">Доступ запрещен. Обновите страницу и введите правильный пароль.</div>';
        throw new Error('Access denied');
    }
}

// Инициализация элементов DOM
function initializeDOMElements() {
    // Экраны
    elements.homeScreen = document.getElementById('home-screen');
    elements.paymentsScreen = document.getElementById('payments-screen');
    elements.documentsScreen = document.getElementById('documents-screen');
    elements.dashboardScreen = document.getElementById('dashboard-screen');
    elements.detoursScreen = document.getElementById('detours-screen');
    elements.sosScreen = document.getElementById('sos-screen');
    elements.employeeScreen = document.getElementById('employee-screen');
    
    // Навигация
    elements.navLinks = document.querySelectorAll('.nav-link');
    elements.quickActionBtns = document.querySelectorAll('.quick-action-btn');
    elements.partnerNameBtn = document.querySelector('.brand-partner-name[data-page="home"]');
    
    // Фильтры
    elements.periodYearFilter = document.getElementById('period-year-filter');
    elements.statusFilter = document.getElementById('status-filter');
    elements.searchInput = document.getElementById('search-input');
    elements.resetFiltersBtn = document.getElementById('reset-filters');
    elements.lastPeriodBtn = document.getElementById('last-period');
    elements.lastUnpaidBtn = document.getElementById('last-unpaid');
    
    // Индикатор режима
    elements.modeIndicator = document.getElementById('mode-indicator');
    elements.modeMessage = document.getElementById('mode-message');
    
    // Таблица
    elements.loading = document.getElementById('loading');
    elements.tableContainer = document.getElementById('table-container');
    elements.tableBody = document.getElementById('table-body');
    elements.rowCount = document.getElementById('row-count');
    elements.periodInfo = document.getElementById('period-info');
    elements.errorMessage = document.getElementById('error-message');
    elements.retryBtn = document.getElementById('retry-load');
    
    // Пагинация
    elements.prevPageBtn = document.getElementById('prev-page');
    elements.nextPageBtn = document.getElementById('next-page');
    elements.pageInfo = document.getElementById('page-info');
    
    // Фильтры документов
    elements.docStatusFilter = document.getElementById('doc-status-filter');
    elements.docPositionFilter = document.getElementById('doc-position-filter');
    elements.docRestaurantFilter = document.getElementById('doc-restaurant-filter');
    elements.docProblemsFilter = document.getElementById('doc-problems-filter');
    elements.docSearchInput = document.getElementById('doc-search-input');
    elements.docResetFiltersBtn = document.getElementById('doc-reset-filters');
    
    // Таблица документов
    elements.docLoading = document.getElementById('doc-loading');
    elements.docTableContainer = document.getElementById('doc-table-container');
    elements.docTableBody = document.getElementById('doc-table-body');
    elements.docRowCount = document.getElementById('doc-row-count');
    elements.docErrorMessage = document.getElementById('doc-error-message');
    elements.docRetryBtn = document.getElementById('doc-retry-load');
    
    // Карточка сотрудника
    elements.backButton = document.getElementById('back-button');
    elements.employeeName = document.getElementById('employee-name');
    elements.employeePhone = document.getElementById('employee-phone');
    elements.employeeCitizenship = document.getElementById('employee-citizenship');
    elements.telegramLink = document.getElementById('telegram-link');
    elements.employeeLoading = document.getElementById('employee-loading');
    elements.employeeTableContainer = document.getElementById('employee-table-container');
    elements.employeeTableBody = document.getElementById('employee-table-body');
    elements.employeeError = document.getElementById('employee-error');
    elements.employeeWarning = document.getElementById('employee-warning');
    elements.employeeDocsLoading = document.getElementById('employee-docs-loading');
    elements.employeeDocuments = document.getElementById('employee-documents');
    elements.employeeProblems = document.getElementById('employee-problems');
    elements.employeeRecommendations = document.getElementById('employee-recommendations');
    elements.problemsList = document.getElementById('problems-list');
    elements.recommendationsList = document.getElementById('recommendations-list');
    
    // Статистика
    elements.statProcessedCount = document.getElementById('stat-processed-count');
    elements.statProcessedPercent = document.getElementById('stat-processed-percent');
    
    // Итоги
    elements.totalPayments = document.getElementById('total-payments');
    elements.totalAmount = document.getElementById('total-amount');
    elements.lastPaymentDate = document.getElementById('last-payment-date');
    
    // Общее
    elements.lastUpdate = document.getElementById('last-update');
    elements.exportCsvBtn = document.getElementById('export-csv');
    
    console.log('Инициализировано элементов DOM:', Object.keys(elements).length);
}

// Настройка обработчиков событий
function setupEventListeners() {
    console.log('Настройка обработчиков событий...');
    
    // Навигация
    elements.navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.getAttribute('data-page');
            showScreen(page);
        });
    });
    
    // Обработчик для кнопки "Партнер – Чайхана" в навигации
    const partnerNameBtn = document.querySelector('.brand-partner-name[data-page="home"]');
    if (partnerNameBtn) {
        partnerNameBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showScreen('home');
        });
    }
    
    // Быстрые действия
    elements.quickActionBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Если это внешняя ссылка (например, Telegram), не перехватываем клик
            if (btn.hasAttribute('href') && btn.getAttribute('href').startsWith('http')) {
                return; // Позволяем браузеру обработать ссылку
            }
            
            e.preventDefault();
            const page = btn.getAttribute('data-page');
            const action = btn.getAttribute('data-action');
            if (page) {
                showScreen(page, action);
            }
        });
    });
    
    // Фильтры выплат (проверяем существование элементов)
    if (elements.periodYearFilter) elements.periodYearFilter.addEventListener('change', applyFilters);
    if (elements.statusFilter) elements.statusFilter.addEventListener('change', applyFilters);
    if (elements.searchInput) elements.searchInput.addEventListener('input', debounce(applyFilters, 300));
    if (elements.resetFiltersBtn) elements.resetFiltersBtn.addEventListener('click', resetFilters);
    
    // Фильтры документов
    if (elements.docStatusFilter) elements.docStatusFilter.addEventListener('change', applyDocFilters);
    if (elements.docPositionFilter) elements.docPositionFilter.addEventListener('change', applyDocFilters);
    if (elements.docRestaurantFilter) elements.docRestaurantFilter.addEventListener('change', applyDocFilters);
    if (elements.docProblemsFilter) elements.docProblemsFilter.addEventListener('change', applyDocFilters);
    if (elements.docSearchInput) elements.docSearchInput.addEventListener('input', debounce(applyDocFilters, 300));
    if (elements.docResetFiltersBtn) elements.docResetFiltersBtn.addEventListener('click', resetDocFilters);
    
    if (elements.docRetryBtn) elements.docRetryBtn.addEventListener('click', loadData);
    
    // Кнопки специальных режимов (могут отсутствовать в демо-режиме)
    if (elements.lastPeriodBtn) {
        elements.lastPeriodBtn.addEventListener('click', () => showLastPeriod());
        console.log('Кнопка "Последний период" найдена');
    } else {
        console.log('Кнопка "Последний период" не найдена');
    }
    
    if (elements.lastUnpaidBtn) {
        elements.lastUnpaidBtn.addEventListener('click', () => showLastUnpaid());
        console.log('Кнопка "Неоплаченные" найдена');
    } else {
        console.log('Кнопка "Неоплаченные" не найдена');
    }
    
    // Пагинация
    if (elements.prevPageBtn) elements.prevPageBtn.addEventListener('click', () => changePage(-1));
    if (elements.nextPageBtn) elements.nextPageBtn.addEventListener('click', () => changePage(1));
    
    // Кнопки
    if (elements.retryBtn) elements.retryBtn.addEventListener('click', loadData);
    if (elements.backButton) elements.backButton.addEventListener('click', showMainScreen);
    if (elements.exportCsvBtn) elements.exportCsvBtn.addEventListener('click', exportToCSV);
    
    // Объезды: кнопки, фильтр, модальное окно
    const detoursNewBtn = document.getElementById('detours-new-btn');
    if (detoursNewBtn) detoursNewBtn.addEventListener('click', () => openDetourModal());
    const detoursReloadBtn = document.getElementById('detours-reload-btn');
    if (detoursReloadBtn) detoursReloadBtn.addEventListener('click', () => loadData());
    const detoursStatusFilter = document.getElementById('detours-status-filter');
    if (detoursStatusFilter) {
        detoursStatusFilter.addEventListener('change', () => {
            if (typeof renderDetoursTable === 'function') renderDetoursTable();
        });
    }
    const detourModalEl = document.getElementById('detour-modal');
    const detourModalClose = document.getElementById('detour-modal-close');
    const detourModalCancel = document.getElementById('detour-form-cancel');
    if (detourModalClose) detourModalClose.addEventListener('click', () => closeDetourModal());
    if (detourModalCancel) detourModalCancel.addEventListener('click', () => closeDetourModal());
    if (detourModalEl) {
        detourModalEl.addEventListener('click', (e) => {
            if (e.target === detourModalEl) closeDetourModal();
        });
    }
    const detourForm = document.getElementById('detour-form');
    if (detourForm) {
        detourForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const statusEl = document.getElementById('detour-form-status');
            const sel = document.getElementById('detour-employee-select');
            const idx = sel ? parseInt(sel.value, 10) : NaN;
            if (typeof _detourEmployeeList === 'undefined' || isNaN(idx) || !_detourEmployeeList[idx]) {
                if (statusEl) statusEl.textContent = 'Выберите сотрудника из базы.';
                return;
            }
            const emp = _detourEmployeeList[idx];
            const submitBtn = document.getElementById('detour-form-submit');
            if (statusEl) statusEl.textContent = 'Отправка заявки...';
            if (submitBtn) submitBtn.disabled = true;
            try {
                const payload = {
                    restaurant: document.getElementById('detour-restaurant').value.trim(),
                    director: document.getElementById('detour-director').value.trim(),
                    employeeName: emp.employee,
                    employeePhone: emp.phone,
                    employeeInn: emp.inn,
                    contractType: document.getElementById('detour-contract-type').value.trim(),
                    paperReason: document.getElementById('detour-paper-reason').value.trim(),
                    plannedVisitDate: document.getElementById('detour-planned-visit').value,
                    desiredDeliveryDate: document.getElementById('detour-desired-delivery').value
                };
                await createDetourRequestApi(payload);
                if (statusEl) statusEl.textContent = 'Заявка отправлена.';
                closeDetourModal();
                await loadData();
            } catch (err) {
                console.error(err);
                if (statusEl) statusEl.textContent = err.message || 'Ошибка отправки';
            } finally {
                if (submitBtn) submitBtn.disabled = false;
            }
        });
    }
    const detourEmpSel = document.getElementById('detour-employee-select');
    if (detourEmpSel) {
        detourEmpSel.addEventListener('change', () => {
            const i = parseInt(detourEmpSel.value, 10);
            if (typeof _detourEmployeeList !== 'undefined' && !isNaN(i) && _detourEmployeeList[i] && _detourEmployeeList[i].restaurant) {
                const rIn = document.getElementById('detour-restaurant');
                if (rIn) rIn.value = _detourEmployeeList[i].restaurant;
            }
        });
    }
    
    // Дашборд: обновить данные (только если задан dataApiUrl — серверная сборка)
    const dashboardRefreshBtn = document.getElementById('dashboard-refresh-data');
    if (dashboardRefreshBtn && CONFIG.dataApiUrl) {
        dashboardRefreshBtn.addEventListener('click', async () => {
            const btn = dashboardRefreshBtn;
            const origText = btn.innerHTML;
            if (window.location.protocol === 'file:') {
                alert('Серверная версия должна открываться через сервер.\nЗапустите: npm start\nи откройте в браузере: http://localhost:3000');
                return;
            }
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Обновление…';
            try {
                const res = await fetch('/api/refresh', { method: 'POST' });
                const json = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
                await loadData();
                btn.innerHTML = '<i class="fas fa-check"></i> Готово';
                setTimeout(() => { btn.innerHTML = origText; btn.disabled = false; }, 2000);
            } catch (e) {
                console.error('Ошибка обновления данных:', e);
                const isNetworkError = e.message === 'Failed to fetch' || e.name === 'TypeError';
                if (isNetworkError) {
                    alert('Не удалось связаться с сервером. Убедитесь, что приложение открыто по адресу сервера (например http://localhost:3000), а не как файл.');
                }
                btn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Ошибка';
                setTimeout(() => { btn.innerHTML = origText; btn.disabled = false; }, 3000);
            }
        });
    }
    
    // Сортировка таблицы
    document.querySelectorAll('#payments-table th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const field = th.getAttribute('data-sort');
            sortTable(field);
        });
    });
    
    // Сортировка таблицы сотрудника
    document.querySelectorAll('#employee-payments-table th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const field = th.getAttribute('data-sort');
            sortEmployeeTable(field);
        });
    });
    
    // Сортировка таблицы документов
    document.querySelectorAll('#documents-table th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const field = th.getAttribute('data-sort');
            sortDocumentTable(field);
        });
    });
    
    console.log('Обработчики событий настроены');
}

// Генерация тестовых данных документов (для демонстрации)
function generateTestDocuments() {
    const employees = [
        { name: "Нурланбеков Омурлан Нурланбекович", phone: "79299185427", citizenship: "Кыргызстан", position: "Кассир", restaurant: "Часовая 11 стр 2" },
        { name: "Курбанова Саломат Амиркуловна", phone: "79252580102", citizenship: "Узбекистан", position: "Официант", restaurant: "Ресторан 1" },
        { name: "Дусматов Равшан Алишерович", phone: "79254088185", citizenship: "Таджикистан", position: "Повар", restaurant: "Ресторан 2" },
    ];
    
    const testDocs = [];
    
    employees.forEach((emp, index) => {
        const hasAllDocs = index === 0;
        const hasPartial = index === 1;
        
        const collectedStatus = hasAllDocs ? 'Оформлен' : '';
        const inProcessStatus = hasPartial ? 'В обработке' : '';
        const realStatus = collectedStatus || inProcessStatus || '';
        
        testDocs.push({
            id: index + 1,
            collected: collectedStatus,
            inProcess: inProcessStatus,
            project: 'Проект Чайхана',
            city: 'Москва',
            position: emp.position,
            restaurant: emp.restaurant,
            comment: hasPartial ? 'В РКЛ' : '',
            vacation: '',
            passportIssueDate: hasAllDocs ? '01.04.2024' : '',
            birthDate: '16.07.2006',
            passportData: hasAllDocs ? 'PE1336294' : '',
            employee: emp.name,
            phone: normalizePhone(emp.phone),
            citizenship: emp.citizenship,
            documentsLink: hasAllDocs ? 'https://drive.google.com/...' : '',
            problems: index === 2 ? 'Отсутствует патент, Качество скана паспорта низкое' : '',
            registrationEndDate: hasAllDocs ? '15.01.2025' : '',
            patentIssueDate: hasAllDocs ? '10.10.2024' : '',
            contractDate: hasAllDocs ? '10.11.2024' : '',
            contractLink: hasAllDocs ? 'https://drive.google.com/contract...' : '',
            dismissedDate: '',
            documentStatus: hasAllDocs ? 'processed' : (hasPartial ? 'partial' : 'not-processed'),
            realStatus: realStatus
        });
    });
    
    return testDocs;
}

// Генерация тестовых данных (для демонстрации)
function generateTestData() {
    const periods = ['01.12-15.12', '16.11-30.11', '06.11-15.11', '16.10-5.11'];
    const statuses = ['Оплатили', 'оплатили в QUGO', 'Не платим', 'В обработке', 'Ожидает подтверждения'];
    
    const testData = [];
    
    const employees = [
        { name: "Нурланбеков Омурлан Нурланбекович", phone: "79299185427" },
        { name: "Курбанова Саломат Амиркуловна", phone: "79252580102" },
        { name: "Дусматов Равшан Алишерович", phone: "79254088185" },
        { name: "Курбонова Гулжахон Абдуразоковна", phone: "79255103455" },
        { name: "Назаров Тухтасин Мухаммади Угли", phone: "79264200393" },
        { name: "Маматова Хуршедахон Исроиловна", phone: "79288542471" },
        { name: "Шерназаров Зариф Акбарали Угли", phone: "79336677836" },
        { name: "Анорбоев Шахзод Тулгин Угли", phone: "79777470317" },
        { name: "Хамракулов Ойбек Хурсанович", phone: "79779593169" },
        { name: "Тожиева Наргиза Аминова", phone: "79856292007" },
        { name: "Мухаммаджонов Акмалджон Аюбович", phone: "79955553419" }
    ];
    
    let id = 1;
    for (const period of periods) {
        for (const employee of employees) {
            const amount = Math.floor(Math.random() * 100000) + 10000;
            const statusIndex = Math.floor(Math.random() * statuses.length);
            const comment = Math.random() > 0.7 ? 'Тестовый комментарий' : '';
            
            testData.push({
                id: id++,
                year: 2025,
                period: period,
                employee: employee.name,
                phone: employee.phone,
                amount: amount,
                status: statuses[statusIndex],
                comment: comment,
                formattedAmount: formatCurrency(amount)
            });
        }
    }
    
    return testData;
}

// Глобальная функция для выхода из режима
window.exitMode = exitMode;
