// data.js
// Работа с данными: фильтры, сортировка, статистика, объединение данных

// Слияние данных по телефону
function mergeDataByPhone() {
    mergedData = {};
    
    // Добавляем выплаты
    allPayments.forEach(payment => {
        const phone = normalizePhone(payment.phone);
        if (!mergedData[phone]) {
            mergedData[phone] = {
                phone: phone,
                payments: [],
                documents: null
            };
        }
        mergedData[phone].payments.push(payment);
    });
    
    // Добавляем документы
    allDocuments.forEach(doc => {
        const phone = normalizePhone(doc.phone);
        if (!mergedData[phone]) {
            mergedData[phone] = {
                phone: phone,
                payments: [],
                documents: null
            };
        }
        mergedData[phone].documents = doc;
    });
    
    console.log('Объединено записей:', Object.keys(mergedData).length);
    console.log('Выплат:', allPayments.length, 'Документов:', allDocuments.length);
    
    // Отладочная информация: проверяем несколько примеров
    const samplePhones = Object.keys(mergedData).slice(0, 3);
    samplePhones.forEach(phone => {
        const data = mergedData[phone];
        console.log(`Телефон ${phone}: выплат=${data.payments.length}, документов=${data.documents ? 'есть' : 'нет'}`);
        if (data.documents) {
            console.log(`  Статус: ${data.documents.realStatus || data.documents.documentStatus}`);
        }
    });
}

// Определение статуса документов
function getDocumentStatus(doc) {
    // Проверяем что doc существует
    if (!doc || typeof doc !== 'object') {
        return 'not-processed';
    }
    
    // Проверяем реальный статус из таблицы (collected или inProcess)
    const collected = (doc.collected || '').toString().toLowerCase().trim();
    const inProcess = (doc.inProcess || '').toString().toLowerCase().trim();
    const realStatus = collected || inProcess || '';
    const realStatusLower = realStatus.toLowerCase();
    
    // Если есть реальный статус из таблицы, используем его
    if (realStatus) {
        if (realStatusLower.includes('оформлен') && !realStatusLower.includes('на оформлении')) {
            return 'processed';
        }
        if (realStatusLower.includes('на оформлении') || realStatusLower.includes('обработке') || realStatusLower.includes('обновлено')) {
            return 'partial';
        }
        if (realStatusLower.includes('уволен')) {
            return 'not-processed';
        }
        // Если статус есть, но не "оформлен", считаем не оформленным
        if (!realStatusLower.includes('оформлен')) {
            return 'not-processed';
        }
    }
    
    // Если реального статуса нет, проверяем наличие документов
    const requiredDocs = {
        passport: !!(doc.passportData && doc.passportData.toString().trim()),
        registration: !!(doc.registrationEndDate && doc.registrationEndDate.toString().trim()),
        patent: !!(doc.patentIssueDate && doc.patentIssueDate.toString().trim()),
        contract: !!(doc.contractDate && doc.contractDate.toString().trim())
    };
    
    const hasAll = Object.values(requiredDocs).every(v => v);
    const hasNone = Object.values(requiredDocs).every(v => !v);
    
    if (hasAll) return 'processed';
    if (hasNone) return 'not-processed';
    return 'partial';
}

// Обновление статистики
function updateStatistics() {
    // Оформлено - только те, у кого статус именно "оформлен" в первой колонке
    const processed = allDocuments.filter(d => {
        const status = (d.collected || '').toLowerCase().trim();
        const inProcessStatus = (d.inProcess || '').toLowerCase().trim();
        // Проверяем точное совпадение со словом "оформлен"
        return status === 'оформлен' || inProcessStatus === 'оформлен';
    }).length;
    
    // Общее количество БЕЗ уволенных (для расчета процента)
    const totalWithoutDismissed = allDocuments.filter(d => {
        const realStatus = (d.realStatus || '').toLowerCase().trim();
        return !realStatus.includes('уволен');
    }).length;
    
    if (elements.statProcessedCount) {
        elements.statProcessedCount.textContent = processed;
    }
    if (elements.statProcessedPercent && totalWithoutDismissed > 0) {
        const percent = Math.round((processed / totalWithoutDismissed) * 100);
        elements.statProcessedPercent.textContent = `(${percent}%)`;
    } else if (elements.statProcessedPercent) {
        elements.statProcessedPercent.textContent = '(0%)';
    }
}

// ДИНАМИЧЕСКОЕ ОБНОВЛЕНИЕ ПЕРИОДОВ И СТАТУСОВ
function updatePeriodsAndStatuses(payments) {
    // Получаем все уникальные периоды
    const periodsSet = new Set();
    const statusesSet = new Set();
    
    payments.forEach(payment => {
        if (payment.period) periodsSet.add(payment.period);
        if (payment.status) statusesSet.add(payment.status);
    });
    
    // Сортируем периоды (предполагаем формат DD.MM-DD.MM)
    allPeriods = Array.from(periodsSet).sort((a, b) => {
        // Простая сортировка по строкам, для более сложной нужен парсинг дат
        return b.localeCompare(a); // От новых к старым
    });
    
    // Сортируем статусы
    allStatuses = Array.from(statusesSet).sort();
    
    console.log('Найдено периодов:', allPeriods.length);
    console.log('Найдено статусов:', allStatuses.length);
    
    // Сохраняем в localStorage для будущих сессий
    try {
        localStorage.setItem('payment_periods', JSON.stringify(allPeriods));
        localStorage.setItem('payment_statuses', JSON.stringify(allStatuses));
    } catch (e) {
        console.log('Не удалось сохранить в localStorage:', e);
    }
}

// Заполнение фильтров
function populateFilters(payments) {
    console.log('Заполнение фильтров...');
    
    // Годы (динамически из данных)
    const years = [...new Set(payments.map(p => p.year))].sort((a, b) => b - a);
    if (elements.yearFilter) {
        elements.yearFilter.innerHTML = '<option value="">Все годы</option>';
        years.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            elements.yearFilter.appendChild(option);
        });
    }
    
    // Периоды (динамически из allPeriods)
    if (elements.periodFilter) {
        elements.periodFilter.innerHTML = '<option value="">Все периоды</option>';
        allPeriods.forEach(period => {
            const option = document.createElement('option');
            option.value = period;
            option.textContent = period;
            elements.periodFilter.appendChild(option);
        });
    }
    
    // Статусы (динамически из allStatuses)
    if (elements.statusFilter) {
        elements.statusFilter.innerHTML = '<option value="">Все статусы</option>';
        allStatuses.forEach(status => {
            const option = document.createElement('option');
            option.value = status;
            option.textContent = status;
            elements.statusFilter.appendChild(option);
        });
    }
    
    console.log('Фильтры заполнены');
}

// Применение фильтров
function applyFilters() {
    console.log('Применение фильтров...');
    
    // Сбрасываем специальные режимы
    exitMode();
    
    // Применяем фильтры
    let filtered = [...allPayments];
    
    // Фильтр по году
    const selectedYear = elements.yearFilter ? elements.yearFilter.value : '';
    if (selectedYear) {
        filtered = filtered.filter(p => p.year == selectedYear);
    }
    
    // Фильтр по периоду
    const selectedPeriod = elements.periodFilter ? elements.periodFilter.value : '';
    if (selectedPeriod) {
        filtered = filtered.filter(p => p.period === selectedPeriod);
        if (elements.periodInfo) {
            elements.periodInfo.textContent = `Период: ${selectedPeriod}`;
        }
    } else {
        if (elements.periodInfo) {
            elements.periodInfo.textContent = '';
        }
    }
    
    // Фильтр по статусу
    const selectedStatus = elements.statusFilter ? elements.statusFilter.value : '';
    if (selectedStatus) {
        filtered = filtered.filter(p => p.status === selectedStatus);
    }
    
    // Фильтр по поиску
    const searchTerm = elements.searchInput ? elements.searchInput.value.toLowerCase() : '';
    if (searchTerm) {
        filtered = filtered.filter(p => 
            p.employee.toLowerCase().includes(searchTerm) || 
            p.phone.includes(searchTerm)
        );
    }
    
    filteredPayments = filtered;
    currentPage = 1;
    
    // Сортировка
    sortPayments();
    
    // Отображение
    renderTable();
    updatePagination();
    
    console.log('Фильтры применены, записей:', filteredPayments.length);
}

// Режим: Последний период (все выплаты)
function showLastPeriod() {
    console.log('Показать последний период');
    
    if (!lastPeriod) {
        console.log('Нет данных о последнем периоде');
        return;
    }
    
    currentMode = 'last-period';
    
    // Сбрасываем фильтры
    if (elements.yearFilter) elements.yearFilter.value = '';
    if (elements.periodFilter) elements.periodFilter.value = '';
    if (elements.statusFilter) elements.statusFilter.value = '';
    if (elements.searchInput) elements.searchInput.value = '';
    
    // Показываем все записи последнего периода
    filteredPayments = allPayments.filter(p => p.period === lastPeriod);
    
    // Показываем индикатор режима
    showModeIndicator(`Показаны <strong>все выплаты</strong> за последний период: <strong>${lastPeriod}</strong>`);
    
    // Обновляем интерфейс
    currentPage = 1;
    sortPayments();
    renderTable();
    updatePagination();
    
    console.log('Показано записей последнего периода:', filteredPayments.length);
}

// Режим: Неоплаченные в последнем периоде
function showLastUnpaid() {
    console.log('Показать неоплаченные последнего периода');
    
    if (!lastPeriod) {
        console.log('Нет данных о последнем периоде');
        return;
    }
    
    currentMode = 'last-unpaid';
    
    // Сбрасываем фильтры
    if (elements.yearFilter) elements.yearFilter.value = '';
    if (elements.periodFilter) elements.periodFilter.value = '';
    if (elements.statusFilter) elements.statusFilter.value = '';
    if (elements.searchInput) elements.searchInput.value = '';
    
    // Показываем только НЕОПЛАЧЕННЫЕ записи последнего периода
    const unpaidStatuses = allStatuses.filter(status => 
        !status.toLowerCase().includes('оплатили') && 
        !status.toLowerCase().includes('оплачено')
    );
    
    filteredPayments = allPayments.filter(p => 
        p.period === lastPeriod && unpaidStatuses.includes(p.status)
    );
    
    // Показываем индикатор режима
    showModeIndicator(`Показаны <strong>неоплаченные выплаты</strong> за период: <strong>${lastPeriod}</strong>`);
    
    // Обновляем интерфейс
    currentPage = 1;
    sortPayments();
    renderTable();
    updatePagination();
    
    console.log('Показано неоплаченных записей:', filteredPayments.length);
}

// Выход из специального режима
function exitMode() {
    if (!currentMode) return;
    
    currentMode = null;
    if (elements.modeIndicator) {
        elements.modeIndicator.classList.add('hidden');
    }
    if (elements.lastPeriodBtn) {
        elements.lastPeriodBtn.classList.remove('active');
    }
    if (elements.lastUnpaidBtn) {
        elements.lastUnpaidBtn.classList.remove('active');
    }
}

// Показать индикатор режима
function showModeIndicator(message) {
    if (!elements.modeIndicator || !elements.modeMessage) return;
    
    elements.modeMessage.innerHTML = message;
    elements.modeIndicator.classList.remove('hidden');
    
    // Активируем соответствующую кнопку
    if (currentMode === 'last-period' && elements.lastPeriodBtn) {
        elements.lastPeriodBtn.classList.add('active');
        if (elements.lastUnpaidBtn) elements.lastUnpaidBtn.classList.remove('active');
    } else if (currentMode === 'last-unpaid' && elements.lastUnpaidBtn) {
        elements.lastUnpaidBtn.classList.add('active');
        if (elements.lastPeriodBtn) elements.lastPeriodBtn.classList.remove('active');
    }
}

// Сброс фильтров
function resetFilters() {
    console.log('Сброс фильтров');
    
    if (elements.yearFilter) elements.yearFilter.value = '';
    if (elements.periodFilter) elements.periodFilter.value = '';
    if (elements.statusFilter) elements.statusFilter.value = '';
    if (elements.searchInput) elements.searchInput.value = '';
    
    exitMode();
    applyFilters();
}

// Определение последнего периода
/**
 * Парсит период в формате "DD.MM-DD.MM" и возвращает последнее число периода
 * @param {string} period - Период в формате "16.10-5.11" или "06.11-15.11"
 * @returns {string|null} - Последнее число периода в формате "DD.MM" или null
 */
function parsePeriodEndDate(period) {
    if (!period || typeof period !== 'string') return null;
    
    // Убираем пробелы и разбиваем по дефису
    const parts = period.trim().split('-');
    if (parts.length !== 2) return null;
    
    // Берем последнюю часть (последнее число периода)
    const endDate = parts[1].trim();
    
    // Проверяем формат DD.MM
    if (!endDate.match(/^\d{1,2}\.\d{1,2}$/)) return null;
    
    return endDate;
}

/**
 * Создает объект Date из года и даты в формате "DD.MM"
 * @param {number} year - Год (например, 2025)
 * @param {string} dateStr - Дата в формате "DD.MM" (например, "5.11")
 * @returns {Date|null} - Объект Date или null при ошибке
 */
function createDateFromYearAndPeriod(year, dateStr) {
    if (!year || !dateStr) return null;
    
    const parts = dateStr.split('.');
    if (parts.length !== 2) return null;
    
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Месяцы в JS начинаются с 0
    
    if (isNaN(day) || isNaN(month) || month < 0 || month > 11) return null;
    
    return new Date(year, month, day);
}

/**
 * Определяет последний период выплаты на основе года и последнего числа периода
 * @param {Array} payments - Массив выплат с полями year и period
 * @returns {string} - Последний период (строка в формате "DD.MM-DD.MM")
 */
function getLastPeriod(payments) {
    if (!payments || payments.length === 0) return '';
    
    let lastPeriod = null;
    let lastDate = null;
    
    // Проходим по всем выплатам и находим период с максимальной датой окончания
    payments.forEach(payment => {
        if (!payment.period || !payment.year) return;
        
        // Парсим последнее число периода
        const endDateStr = parsePeriodEndDate(payment.period);
        if (!endDateStr) return;
        
        // Создаем дату из года и последнего числа периода
        const periodEndDate = createDateFromYearAndPeriod(payment.year, endDateStr);
        if (!periodEndDate) return;
        
        // Если это первый период или дата больше текущей максимальной
        if (!lastDate || periodEndDate > lastDate) {
            lastDate = periodEndDate;
            lastPeriod = payment.period;
        }
    });
    
    console.log('Определен последний период:', lastPeriod, 'с датой окончания:', lastDate);
    
    return lastPeriod || '';
}

// Сортировка выплат
function sortPayments() {
    filteredPayments.sort((a, b) => {
        let valueA = a[currentSort.field];
        let valueB = b[currentSort.field];
        
        if (currentSort.field === 'amount') {
            valueA = a.amount;
            valueB = b.amount;
        }
        
        if (currentSort.field === 'period') {
            return currentSort.direction === 'asc' 
                ? valueA.localeCompare(valueB)
                : valueB.localeCompare(valueA);
        }
        
        if (typeof valueA === 'string' && typeof valueB === 'string') {
            return currentSort.direction === 'asc'
                ? valueA.localeCompare(valueB)
                : valueB.localeCompare(valueA);
        }
        
        return currentSort.direction === 'asc' ? valueA - valueB : valueB - valueA;
    });
}

// Обновление фильтров документов
function updateDocumentFilters() {
    // Должности
    const positions = [...new Set(allDocuments.map(d => d.position).filter(Boolean))].sort();
    if (elements.docPositionFilter) {
        elements.docPositionFilter.innerHTML = '<option value="">Все должности</option>';
        positions.forEach(pos => {
            const option = document.createElement('option');
            option.value = pos;
            option.textContent = pos;
            elements.docPositionFilter.appendChild(option);
        });
    }
    
    // Рестораны
    const restaurants = [...new Set(allDocuments.map(d => d.restaurant).filter(Boolean))].sort();
    if (elements.docRestaurantFilter) {
        elements.docRestaurantFilter.innerHTML = '<option value="">Все рестораны</option>';
        restaurants.forEach(rest => {
            const option = document.createElement('option');
            option.value = rest;
            option.textContent = rest;
            elements.docRestaurantFilter.appendChild(option);
        });
    }
    
    allPositions = positions;
    allRestaurants = restaurants;
}

// Применение фильтров документов
function applyDocFilters() {
    console.log('Применение фильтров документов...');
    
    let filtered = [...allDocuments];
    
    // Фильтр по статусу
    const selectedStatus = elements.docStatusFilter ? elements.docStatusFilter.value : '';
    if (selectedStatus) {
        filtered = filtered.filter(d => {
            // Для фильтра "Уволен" (not-processed) проверяем реальный статус из таблицы
            if (selectedStatus === 'not-processed') {
                const realStatus = (d.realStatus || '').toLowerCase().trim();
                const hasDismissedDate = d.dismissedDate && d.dismissedDate.toString().trim() !== '';
                // Уволен = статус содержит "уволен" ИЛИ есть дата увольнения
                return realStatus.includes('уволен') || hasDismissedDate;
            }
            // Для других фильтров используем documentStatus
            return d.documentStatus === selectedStatus;
        });
    }
    
    // Фильтр по должности
    const selectedPosition = elements.docPositionFilter ? elements.docPositionFilter.value : '';
    if (selectedPosition) {
        filtered = filtered.filter(d => d.position === selectedPosition);
    }
    
    // Фильтр по ресторану
    const selectedRestaurant = elements.docRestaurantFilter ? elements.docRestaurantFilter.value : '';
    if (selectedRestaurant) {
        filtered = filtered.filter(d => d.restaurant === selectedRestaurant);
    }
    
    // Фильтр по проблемам
    const selectedProblems = elements.docProblemsFilter ? elements.docProblemsFilter.value : '';
    if (selectedProblems === 'has-problems') {
        filtered = filtered.filter(d => d.problems && d.problems.trim() !== '');
    } else if (selectedProblems === 'no-problems') {
        filtered = filtered.filter(d => !d.problems || d.problems.trim() === '');
    }
    
    // Фильтр по поиску
    const searchTerm = elements.docSearchInput ? elements.docSearchInput.value.toLowerCase() : '';
    if (searchTerm) {
        filtered = filtered.filter(d => 
            d.employee.toLowerCase().includes(searchTerm) || 
            d.phone.includes(searchTerm)
        );
    }
    
    filteredDocuments = filtered;
    currentDocPage = 1;
    
    // Сортировка
    sortDocuments();
    
    // Отображение
    renderDocumentsTable();
    
    console.log('Фильтры документов применены, записей:', filteredDocuments.length);
}

// Сброс фильтров документов
function resetDocFilters() {
    if (elements.docStatusFilter) elements.docStatusFilter.value = '';
    if (elements.docPositionFilter) elements.docPositionFilter.value = '';
    if (elements.docRestaurantFilter) elements.docRestaurantFilter.value = '';
    if (elements.docProblemsFilter) elements.docProblemsFilter.value = '';
    if (elements.docSearchInput) elements.docSearchInput.value = '';
    
    applyDocFilters();
}

// Сортировка документов
function sortDocuments() {
    filteredDocuments.sort((a, b) => {
        let valueA = a[currentDocSort.field];
        let valueB = b[currentDocSort.field];
        
        if (typeof valueA === 'string' && typeof valueB === 'string') {
            return currentDocSort.direction === 'asc'
                ? valueA.localeCompare(valueB)
                : valueB.localeCompare(valueA);
        }
        
        return currentDocSort.direction === 'asc' ? valueA - valueB : valueB - valueA;
    });
}
