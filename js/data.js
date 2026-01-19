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
}

// Определение статуса документов
function getDocumentStatus(doc) {
    // Проверяем что doc существует
    if (!doc || typeof doc !== 'object') {
        return 'not-processed';
    }
    
    // Проверяем статус "Оформлен" в первой колонке
    const collected = (doc.collected || '').toString().toLowerCase().trim();
    const inProcess = (doc.inProcess || '').toString().toLowerCase().trim();
    const isProcessed = collected.includes('оформлен') || inProcess.includes('оформлен');
    
    if (isProcessed) {
        return 'processed';
    }
    
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
    const totalWithDocs = allDocuments.length;
    if (elements.statProcessedCount) {
        elements.statProcessedCount.textContent = processed;
    }
    if (elements.statProcessedPercent && totalWithDocs > 0) {
        const percent = Math.round((processed / totalWithDocs) * 100);
        elements.statProcessedPercent.textContent = `(${percent}%)`;
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
function getLastPeriod(payments) {
    if (!payments || payments.length === 0) return '';
    
    // Используем предварительно вычисленные все периоды
    return allPeriods.length > 0 ? allPeriods[0] : '';
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
        filtered = filtered.filter(d => d.documentStatus === selectedStatus);
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
