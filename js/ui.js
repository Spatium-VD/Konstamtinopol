// ui.js
// UI функции: таблицы, навигация, модальные окна, карточка сотрудника

// Навигация между экранами
function showScreen(screenName, action = null) {
    // Скрываем все экраны
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.add('hidden');
    });
    
    // Обновляем навигацию
    elements.navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-page') === screenName) {
            link.classList.add('active');
        }
    });
    
    // Показываем нужный экран
    currentScreen = screenName;
    
    switch(screenName) {
        case 'home':
            if (elements.homeScreen) elements.homeScreen.classList.remove('hidden');
            break;
        case 'payments':
            if (elements.paymentsScreen) elements.paymentsScreen.classList.remove('hidden');
            if (action === 'last-payments') {
                setTimeout(() => showLastPeriod(), 100);
            }
            break;
        case 'documents':
            if (elements.documentsScreen) elements.documentsScreen.classList.remove('hidden');
            if (action === 'unprocessed') {
                setTimeout(() => {
                    if (elements.docStatusFilter) {
                        elements.docStatusFilter.value = 'not-processed';
                        applyDocFilters();
                    }
                }, 100);
            }
            break;
        case 'dashboard':
            // Проверяем пароль перед показом дашборда
            checkDashboardPassword();
            // После успешной проверки пароля графики отрисуются автоматически
            setTimeout(() => {
                if (elements.dashboardScreen && !elements.dashboardScreen.classList.contains('hidden')) {
                    renderDashboardCharts();
                    if (typeof renderAccountsDashboard === 'function') {
                        renderAccountsDashboard();
                    }
                }
            }, 100);
            break;
        case 'sos':
            if (elements.sosScreen) elements.sosScreen.classList.remove('hidden');
            break;
        case 'employee':
            if (elements.employeeScreen) {
                elements.employeeScreen.classList.remove('hidden');
                console.log('Экран сотрудника отображен');
            } else {
                console.error('Элемент employeeScreen не найден!');
            }
            break;
    }
    
    console.log('Переключение на экран:', screenName);
}

// Проверка пароля для доступа к дашборду
function checkDashboardPassword() {
    // Проверяем, был ли уже введен правильный пароль в этой сессии
    const dashboardAccessGranted = sessionStorage.getItem('dashboardAccessGranted') === 'true';
    
    if (dashboardAccessGranted) {
        // Доступ уже предоставлен, показываем дашборд
        if (elements.dashboardScreen) elements.dashboardScreen.classList.remove('hidden');
        return;
    }
    
    // Запрашиваем пароль
    const password = prompt('Введите пароль для доступа к дашборду:');
    
    if (password === CONFIG.dashboardPassword) {
        // Пароль правильный, сохраняем доступ в сессии
        sessionStorage.setItem('dashboardAccessGranted', 'true');
        if (elements.dashboardScreen) elements.dashboardScreen.classList.remove('hidden');
    } else {
        // Пароль неверный, возвращаемся на главную
        alert('Неверный пароль. Доступ запрещен.');
        showScreen('home');
        // Убираем активность с кнопки дашборда
        elements.navLinks.forEach(link => {
            if (link.getAttribute('data-page') === 'dashboard') {
                link.classList.remove('active');
            }
        });
    }
}

// Отображение таблицы выплат
function renderTable() {
    console.log('Отрисовка таблицы...');
    
    if (!elements.tableBody) {
        console.error('Элемент tableBody не найден');
        return;
    }
    
    if (filteredPayments.length === 0) {
        elements.tableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px;">
                    <i class="fas fa-search" style="font-size: 2rem; color: #bdc3c7; margin-bottom: 15px; display: block;"></i>
                    <p>Нет данных, соответствующих фильтрам</p>
                </td>
            </tr>
        `;
        if (elements.rowCount) {
            elements.rowCount.textContent = '0';
        }
        return;
    }
    
    // Определяем диапазон отображаемых записей
    const startIndex = (currentPage - 1) * CONFIG.itemsPerPage;
    const endIndex = Math.min(startIndex + CONFIG.itemsPerPage, filteredPayments.length);
    const pagePayments = filteredPayments.slice(startIndex, endIndex);
    
    // Генерация строк таблицы
    let tableHTML = '';
    
    pagePayments.forEach(payment => {
        // Определяем класс для статуса
        const statusClass = getStatusClass(payment.status);
        
        // Получаем данные о документах (используем нормализованный телефон)
        const normalizedPhone = normalizePhone(payment.phone);
        const docData = mergedData[normalizedPhone];
        const docForStatus = docData && docData.documents ? docData.documents : null;
        const docStatusIndicator = getDocumentStatusIndicator(docForStatus);
        
        tableHTML += `
            <tr>
                <td>${payment.period}</td>
                <td>
                    <a href="#" class="employee-link" data-id="${payment.id}">
                        ${payment.employee}
                    </a>
                </td>
                <td>${formatPhone(payment.phone)}</td>
                <td>${payment.formattedAmount}</td>
                <td class="${statusClass}">${payment.status}</td>
                <td>${docStatusIndicator}</td>
                <td>${payment.comment || '-'}</td>
            </tr>
        `;
    });
    
    elements.tableBody.innerHTML = tableHTML;
    if (elements.rowCount) {
        elements.rowCount.textContent = filteredPayments.length;
    }
    
    // Назначаем обработчики для ссылок на сотрудников
    document.querySelectorAll('.employee-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const paymentId = parseInt(link.getAttribute('data-id'));
            showEmployeeDetails(paymentId);
        });
    });
    
    console.log('Таблица отрисована, записей:', filteredPayments.length);
}

// Индикатор статуса документов - показывает реальный статус из таблицы
function getDocumentStatusIndicator(doc) {
    // Проверяем что doc существует и не null
    if (!doc || doc === null) {
        return '<span class="doc-status-indicator status-partial"><i class="fas fa-question-circle"></i> Нет данных</span>';
    }
    
    // Если передан объект документа, используем реальный статус
    if (typeof doc === 'object' && doc.realStatus !== undefined) {
        const status = (doc.realStatus || '').toString().trim();
        if (!status) {
            return '<span class="doc-status-indicator status-partial"><i class="fas fa-question-circle"></i> Нет данных</span>';
        }
        
        // Определяем класс и иконку в зависимости от статуса
        let statusClass = 'status-partial';
        let icon = 'fa-exclamation-circle';
        
        if (status.toLowerCase().includes('оформлен')) {
            statusClass = 'status-ok';
            icon = 'fa-check-circle';
        } else if (status.toLowerCase().includes('уволен')) {
            statusClass = 'status-error';
            icon = 'fa-times-circle';
        } else if (status.toLowerCase().includes('на оформлении')) {
            statusClass = 'status-warning';
            icon = 'fa-clock';
        } else if (status.toLowerCase().includes('обработке') || status.toLowerCase().includes('обновлено')) {
            statusClass = 'status-partial';
            icon = 'fa-clock';
        }
        
        return `<span class="doc-status-indicator ${statusClass}"><i class="fas ${icon}"></i> ${status}</span>`;
    }
    
    // Обратная совместимость для старого кода (если передана строка)
    if (typeof doc === 'string') {
        switch(doc) {
            case 'processed':
                return '<span class="doc-status-indicator status-ok"><i class="fas fa-check-circle"></i> Оформлен</span>';
            case 'partial':
                return '<span class="doc-status-indicator status-partial"><i class="fas fa-exclamation-circle"></i> Частично</span>';
            case 'not-processed':
                return '<span class="doc-status-indicator status-error"><i class="fas fa-times-circle"></i> Не оформлен</span>';
            default:
                return '<span class="doc-status-indicator status-partial"><i class="fas fa-question-circle"></i> Нет данных</span>';
        }
    }
    
    return '<span class="doc-status-indicator status-partial"><i class="fas fa-question-circle"></i> Нет данных</span>';
}

// Отображение таблицы документов
function renderDocumentsTable() {
    if (!elements.docTableBody) return;
    
    if (filteredDocuments.length === 0) {
        elements.docTableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px;">
                    <i class="fas fa-search" style="font-size: 2rem; color: #bdc3c7; margin-bottom: 15px; display: block;"></i>
                    <p>Нет данных, соответствующих фильтрам</p>
                </td>
            </tr>
        `;
        if (elements.docRowCount) {
            elements.docRowCount.textContent = '0';
        }
        return;
    }
    
    let tableHTML = '';
    
    filteredDocuments.forEach(doc => {
        const statusIndicator = getDocumentStatusIndicator(doc);
        const problemsBadge = doc.problems ? `<span class="problems-badge" title="${doc.problems}">${doc.problems.substring(0, 30)}${doc.problems.length > 30 ? '...' : ''}</span>` : '-';
        
        tableHTML += `
            <tr class="doc-table-row" data-phone="${doc.phone}" style="cursor: pointer;">
                <td>
                    <a href="#" class="employee-link" data-phone="${doc.phone}">
                        ${doc.employee}
                    </a>
                </td>
                <td>${formatPhone(doc.phone)}</td>
                <td>${doc.position || '-'}</td>
                <td>${doc.restaurant || '-'}</td>
                <td>${statusIndicator}</td>
                <td>${problemsBadge}</td>
            </tr>
        `;
    });
    
    elements.docTableBody.innerHTML = tableHTML;
    if (elements.docRowCount) {
        elements.docRowCount.textContent = filteredDocuments.length;
    }
    
    // Назначаем обработчики для ссылок и строк на сотрудников
    document.querySelectorAll('.employee-link[data-phone]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const phone = link.getAttribute('data-phone');
            showEmployeeDetailsByPhone(phone);
        });
    });
    
    // Клик на строку также открывает карточку
    document.querySelectorAll('.doc-table-row').forEach(row => {
        row.addEventListener('click', (e) => {
            // Не открываем если кликнули на ссылку
            if (e.target.closest('.employee-link')) return;
            
            const phone = row.getAttribute('data-phone');
            showEmployeeDetailsByPhone(phone);
        });
    });
}

// Сортировка таблицы выплат
function sortTable(field) {
    if (currentSort.field === field) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.field = field;
        currentSort.direction = 'desc';
    }
    
    updateSortIcons();
    sortPayments();
    renderTable();
}

// Обновление иконок сортировки
function updateSortIcons() {
    document.querySelectorAll('#payments-table th i').forEach(icon => {
        icon.className = 'fas fa-sort';
    });
    
    const activeTh = document.querySelector(`#payments-table th[data-sort="${currentSort.field}"]`);
    if (activeTh) {
        const icon = activeTh.querySelector('i');
        icon.className = currentSort.direction === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
    }
}

// Сортировка таблицы документов
function sortDocumentTable(field) {
    if (currentDocSort.field === field) {
        currentDocSort.direction = currentDocSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentDocSort.field = field;
        currentDocSort.direction = 'asc';
    }
    
    sortDocuments();
    renderDocumentsTable();
}

// Пагинация
function changePage(delta) {
    const totalPages = Math.ceil(filteredPayments.length / CONFIG.itemsPerPage);
    const newPage = currentPage + delta;
    
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        renderTable();
        updatePagination();
    }
}

function updatePagination() {
    const totalPages = Math.ceil(filteredPayments.length / CONFIG.itemsPerPage);
    
    if (elements.pageInfo) {
        elements.pageInfo.textContent = `Страница ${currentPage} из ${totalPages}`;
    }
    if (elements.prevPageBtn) {
        elements.prevPageBtn.disabled = currentPage <= 1;
    }
    if (elements.nextPageBtn) {
        elements.nextPageBtn.disabled = currentPage >= totalPages;
    }
    if (elements.prevPageBtn && elements.prevPageBtn.parentElement) {
        elements.prevPageBtn.parentElement.classList.toggle('hidden', totalPages <= 1);
    }
}

// Экспорт в CSV
function exportToCSV() {
    if (filteredPayments.length === 0) {
        alert('Нет данных для экспорта');
        return;
    }
    
    const headers = ['Период выплаты', 'Сотрудник', 'Телефон', 'Сумма из реестра', 'Статус', 'Комментарий'];
    const rows = filteredPayments.map(payment => [
        payment.period,
        payment.employee,
        payment.phone,
        payment.amount,
        payment.status,
        payment.comment || ''
    ]);
    
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.href = url;
    link.setAttribute('download', `выплаты_${new Date().toISOString().slice(0, 10)}.csv`);
    link.click();
    
    URL.revokeObjectURL(url);
}

// Отображение деталей сотрудника
function showEmployeeDetails(paymentId) {
    console.log('Показать детали сотрудника, ID:', paymentId);
    
    // Находим платеж по ID
    const payment = allPayments.find(p => p.id === paymentId);
    if (!payment) {
        console.error('Платеж не найден:', paymentId);
        return;
    }
    
    showEmployeeDetailsByPhone(payment.phone, payment);
}

// Отображение деталей сотрудника по телефону
function showEmployeeDetailsByPhone(phone, payment = null) {
    // Нормализуем телефон для поиска
    const normalizedPhone = normalizePhone(phone);
    console.log('Поиск сотрудника по телефону:', phone, 'нормализованный:', normalizedPhone);
    
    // Находим платеж если не передан
    if (!payment) {
        payment = allPayments.find(p => normalizePhone(p.phone) === normalizedPhone);
    }
    
    // Находим документы по нормализованному телефону
    const doc = allDocuments.find(d => normalizePhone(d.phone) === normalizedPhone);
    
    if (!payment && !doc) {
        console.error('Сотрудник не найден ни в выплатах, ни в документах:', normalizedPhone);
        alert('Сотрудник не найден в документах. Возможные причины:\n• Номер телефона отличается в таблицах\n• Документы ещё не поданы\n• Сотрудник оформлен через другого оператора');
        return;
    }
    
    // Формируем объект текущего сотрудника
    currentEmployee = {
        employee: payment?.employee || doc?.employee || '',
        phone: payment?.phone || doc?.phone || phone,
        citizenship: doc?.citizenship || '',
        payment: payment || null,
        document: doc || null
    };
    
    console.log('Найден сотрудник:', currentEmployee);
    
    // Находим все платежи этого сотрудника по нормализованному телефону
    currentEmployeePayments = allPayments.filter(p => normalizePhone(p.phone) === normalizedPhone);
    
    // Заполняем информацию о сотруднике
    if (elements.employeeName) {
        elements.employeeName.textContent = currentEmployee.employee;
    }
    if (elements.employeePhone) {
        elements.employeePhone.textContent = `📱 ${formatPhone(currentEmployee.phone)}`;
    }
    if (elements.employeeCitizenship && currentEmployee.citizenship) {
        elements.employeeCitizenship.textContent = `🌍 ${currentEmployee.citizenship}`;
    }
    
    // Настраиваем Telegram ссылку
    if (elements.telegramLink) {
        const phoneNumber = formatPhoneForTelegram(currentEmployee.phone);
        const telegramUrl = `${CONFIG.telegramUrl}+${phoneNumber}`;
        elements.telegramLink.href = telegramUrl;
        elements.telegramLink.title = `Написать ${currentEmployee.employee} в Telegram`;
    }
    
    // Проверяем несовпадение данных между листами
    const paymentName = payment?.employee || '';
    const docName = doc?.employee || '';
    const paymentPhone = payment?.phone || '';
    const docPhone = doc?.phone || '';
    
    // Показываем предупреждение если имена или телефоны отличаются
    if (payment && doc && (paymentName.toLowerCase().trim() !== docName.toLowerCase().trim() || 
        normalizePhone(paymentPhone) !== normalizePhone(docPhone))) {
        showEmployeeDataMismatchWarning(paymentName, docName, paymentPhone, docPhone);
    } else {
        // Скрываем предупреждение если оно было показано ранее
        const mismatchWarning = document.getElementById('employee-mismatch-warning');
        if (mismatchWarning) {
            mismatchWarning.classList.add('hidden');
        }
    }
    
    // Переключаем экраны ПЕРЕД отображением данных
    showScreen('employee');
    
    // Отображаем документы
    renderEmployeeDocuments();
    
    // Отображаем историю выплат
    renderEmployeeTable();
    
    console.log('Загружено выплат сотрудника:', currentEmployeePayments.length);
    console.log('Карточка сотрудника открыта:', currentEmployee.employee);
}

// Показать предупреждение о несовпадении данных
function showEmployeeDataMismatchWarning(paymentName, docName, paymentPhone, docPhone) {
    // Создаем или находим элемент предупреждения
    let warningElement = document.getElementById('employee-mismatch-warning');
    
    if (!warningElement) {
        // Создаем элемент если его нет
        warningElement = document.createElement('div');
        warningElement.id = 'employee-mismatch-warning';
        warningElement.className = 'employee-mismatch-warning';
        
        // Вставляем после заголовка сотрудника
        const employeeHeader = document.querySelector('.employee-header');
        if (employeeHeader && employeeHeader.parentElement) {
            employeeHeader.parentElement.insertBefore(warningElement, employeeHeader.nextSibling);
        }
    }
    
    const nameDiff = paymentName.toLowerCase().trim() !== docName.toLowerCase().trim();
    const phoneDiff = normalizePhone(paymentPhone) !== normalizePhone(docPhone);
    
    let message = '<strong>⚠️ Внимание: Данные сотрудника различаются между листами</strong><br><br>';
    
    if (nameDiff) {
        message += `• <strong>Имя в выплатах:</strong> ${paymentName || 'не указано'}<br>`;
        message += `• <strong>Имя в документах:</strong> ${docName || 'не указано'}<br><br>`;
    }
    
    if (phoneDiff) {
        message += `• <strong>Телефон в выплатах:</strong> ${formatPhone(paymentPhone) || 'не указано'}<br>`;
        message += `• <strong>Телефон в документах:</strong> ${formatPhone(docPhone) || 'не указано'}<br><br>`;
    }
    
    message += 'Если вы видите уведомление о том, что сотрудник не оформлен, перейдите в раздел "Документы" и попробуйте найти его по имени или телефону.<br>';
    message += 'В дальнейшем мы добавим уникальный идентификатор сотрудника для корректной работы системы.';
    
    warningElement.innerHTML = `
        <div class="mismatch-content">
            <i class="fas fa-exclamation-triangle"></i>
            <div class="mismatch-text">${message}</div>
        </div>
    `;
    
    warningElement.classList.remove('hidden');
}

// Отображение таблицы выплат сотрудника
function renderEmployeeTable() {
    if (!elements.employeeTableBody) return;
    
    if (currentEmployeePayments.length === 0) {
        elements.employeeTableBody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; padding: 40px;">
                    Нет данных о выплатах
                </td>
            </tr>
        `;
        if (elements.totalPayments) elements.totalPayments.textContent = '0';
        if (elements.totalAmount) elements.totalAmount.textContent = '0';
        if (elements.lastPaymentDate) elements.lastPaymentDate.textContent = '-';
        return;
    }
    
    // Сортируем по периоду (от новых к старым)
    currentEmployeePayments.sort((a, b) => b.period.localeCompare(a.period));
    
    // Генерация строк таблицы
    let tableHTML = '';
    let totalAmount = 0;
    let lastPayment = '';
    
    currentEmployeePayments.forEach(payment => {
        const statusClass = getStatusClass(payment.status);
        
        tableHTML += `
            <tr>
                <td>${payment.period}</td>
                <td>${payment.formattedAmount}</td>
                <td class="${statusClass}">${payment.status}</td>
                <td>${payment.comment || '-'}</td>
            </tr>
        `;
        
        totalAmount += payment.amount;
        
        // Определяем последнюю выплату
        if (!lastPayment || payment.period > lastPayment) {
            lastPayment = payment.period;
        }
    });
    
    elements.employeeTableBody.innerHTML = tableHTML;
    if (elements.totalPayments) elements.totalPayments.textContent = currentEmployeePayments.length;
    if (elements.totalAmount) elements.totalAmount.textContent = formatCurrency(totalAmount);
    if (elements.lastPaymentDate) elements.lastPaymentDate.textContent = lastPayment;
    
    // Показываем таблицу
    if (elements.employeeLoading) elements.employeeLoading.classList.add('hidden');
    if (elements.employeeTableContainer) elements.employeeTableContainer.classList.remove('hidden');
    if (elements.employeeError) elements.employeeError.classList.add('hidden');
}

// Сортировка таблицы сотрудника
function sortEmployeeTable(field) {
    currentEmployeePayments.sort((a, b) => {
        if (field === 'period') {
            return b.period.localeCompare(a.period);
        } else if (field === 'amount') {
            return b.amount - a.amount;
        } else if (field === 'status') {
            return a.status.localeCompare(b.status);
        }
        return 0;
    });
    
    renderEmployeeTable();
}

// Отображение документов сотрудника
function renderEmployeeDocuments() {
    if (!currentEmployee) return;
    
    // Показываем загрузку
    if (elements.employeeDocsLoading) elements.employeeDocsLoading.classList.remove('hidden');
    if (elements.employeeDocuments) elements.employeeDocuments.classList.add('hidden');
    
    setTimeout(() => {
        const doc = currentEmployee.document;
        
        if (!doc) {
            // Нет данных о документах
            if (elements.employeeWarning) {
                const warningReason = document.getElementById('warning-reason');
                if (warningReason) {
                    warningReason.innerHTML = `
                        <strong>Возможные причины:</strong><br>
                        1. Документы не поданы<br>
                        2. Неверный номер телефона в таблице<br>
                        3. Оформление через другого оператора<br><br>
                        <strong>Действия:</strong><br>
                        1. Проверьте номер телефона в таблице документов<br>
                        2. Если не подавали — подайте документы срочно<br>
                        3. Свяжитесь с оператором
                    `;
                }
                elements.employeeWarning.classList.remove('hidden');
            }
            
            if (elements.employeeDocsLoading) elements.employeeDocsLoading.classList.add('hidden');
            return;
        }
        
        // Скрываем предупреждение если документы есть
        if (elements.employeeWarning) elements.employeeWarning.classList.add('hidden');
        
        // Проверяем статус "Оформлен" в первой колонке (collected или inProcess)
        const isProcessed = (doc.collected && doc.collected.toLowerCase().includes('оформлен')) || 
                           (doc.inProcess && doc.inProcess.toLowerCase().includes('оформлен'));
        
        // Формируем список документов
        let documentsHTML = '';
        
        // Паспорт
        documentsHTML += `
            <div class="document-item ${doc.passportData ? 'status-ok' : 'status-error'}">
                <div class="document-icon">
                    <i class="fas fa-${doc.passportData ? 'check-circle' : 'times-circle'}"></i>
                </div>
                <div class="document-info">
                    <div class="document-label">Паспорт</div>
                    <div class="document-value">${doc.passportData || 'Отсутствует'}</div>
                    ${doc.passportIssueDate ? `<small style="color: var(--gray-600);">Выдан: ${formatDateRussian(doc.passportIssueDate)}</small>` : ''}
                </div>
            </div>
        `;
        
        // Дата рождения
        if (doc.birthDate) {
            documentsHTML += `
                <div class="document-item status-ok">
                    <div class="document-icon">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <div class="document-info">
                        <div class="document-label">Дата рождения</div>
                        <div class="document-value">${formatDateRussian(doc.birthDate)}</div>
                    </div>
                </div>
            `;
        }
        
        // Регистрация
        documentsHTML += `
            <div class="document-item ${doc.registrationEndDate ? 'status-warning' : 'status-error'}">
                <div class="document-icon">
                    <i class="fas fa-${doc.registrationEndDate ? 'exclamation-circle' : 'times-circle'}"></i>
                </div>
                <div class="document-info">
                    <div class="document-label">Регистрация</div>
                    <div class="document-value">${doc.registrationEndDate ? `Истекает: ${formatDateRussian(doc.registrationEndDate)}` : 'Отсутствует'}</div>
                </div>
            </div>
        `;
        
        // Патент
        documentsHTML += `
            <div class="document-item ${doc.patentIssueDate ? 'status-ok' : 'status-error'}">
                <div class="document-icon">
                    <i class="fas fa-${doc.patentIssueDate ? 'check-circle' : 'times-circle'}"></i>
                </div>
                <div class="document-info">
                    <div class="document-label">Патент</div>
                    <div class="document-value">${doc.patentIssueDate ? `Выдан: ${formatDateRussian(doc.patentIssueDate)}` : 'Отсутствует'}</div>
                </div>
            </div>
        `;
        
        // Договор
        documentsHTML += `
            <div class="document-item ${doc.contractDate ? 'status-ok' : 'status-error'}">
                <div class="document-icon">
                    <i class="fas fa-${doc.contractDate ? 'check-circle' : 'times-circle'}"></i>
                </div>
                <div class="document-info">
                    <div class="document-label">Договор</div>
                    <div class="document-value">${doc.contractDate ? `Заключён: ${formatDateRussian(doc.contractDate)}` : 'Отсутствует'}</div>
                    ${doc.contractLink ? `<small><a href="${doc.contractLink}" target="_blank">Ссылка на договор</a></small>` : ''}
                </div>
            </div>
        `;
        
        // Ссылка на полный пакет
        if (doc.documentsLink) {
            documentsHTML += `
                <div class="document-item status-ok" style="grid-column: 1 / -1;">
                    <div class="document-icon">
                        <i class="fas fa-link"></i>
                    </div>
                    <div class="document-info">
                        <div class="document-label">Полный пакет документов</div>
                        <div class="document-value">
                            <a href="${doc.documentsLink}" target="_blank">${doc.documentsLink}</a>
                        </div>
                    </div>
                </div>
            `;
        }
        
        const documentsGrid = elements.employeeDocuments?.querySelector('.documents-grid');
        if (documentsGrid) {
            documentsGrid.innerHTML = documentsHTML;
        }
        
        // Проблемы - показываем только если статус НЕ "Оформлен"
        if (!isProcessed && doc.problems && doc.problems.trim()) {
            const problems = doc.problems.split(',').map(p => p.trim()).filter(Boolean);
            if (elements.problemsList) {
                elements.problemsList.innerHTML = problems.map(p => `<li>${p}</li>`).join('');
            }
            if (elements.employeeProblems) {
                elements.employeeProblems.classList.remove('hidden');
            }
        } else {
            if (elements.employeeProblems) {
                elements.employeeProblems.classList.add('hidden');
            }
        }
        
        // Рекомендации
        const recommendations = generateRecommendations(doc);
        if (recommendations.length > 0) {
            if (elements.recommendationsList) {
                elements.recommendationsList.innerHTML = recommendations.map(r => `<li>${r}</li>`).join('');
            }
            if (elements.employeeRecommendations) {
                elements.employeeRecommendations.classList.remove('hidden');
            }
        } else {
            if (elements.employeeRecommendations) {
                elements.employeeRecommendations.classList.add('hidden');
            }
        }
        
        // Показываем документы
        if (elements.employeeDocsLoading) elements.employeeDocsLoading.classList.add('hidden');
        if (elements.employeeDocuments) elements.employeeDocuments.classList.remove('hidden');
    }, 300);
}

// Генерация рекомендаций
function generateRecommendations(doc) {
    // Проверяем статус "Оформлен" - если оформлен, не показываем рекомендации
    const isProcessed = (doc.collected && doc.collected.toLowerCase().includes('оформлен')) || 
                       (doc.inProcess && doc.inProcess.toLowerCase().includes('оформлен'));
    
    if (isProcessed) {
        return []; // Если оформлен - нет рекомендаций
    }
    
    const recommendations = [];
    
    if (!doc.passportData) {
        recommendations.push('Запросить паспорт у сотрудника');
    }
    
    if (!doc.registrationEndDate) {
        recommendations.push('Проверить наличие регистрации');
    }
    
    if (!doc.patentIssueDate) {
        recommendations.push('Запросить патент у сотрудника');
    }
    
    if (!doc.contractDate) {
        recommendations.push('Заключить договор');
    }
    
    if (doc.registrationEndDate) {
        const endDate = new Date(doc.registrationEndDate.split('.').reverse().join('-'));
        const now = new Date();
        const daysUntilExpiry = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
        if (daysUntilExpiry < 30 && daysUntilExpiry > 0) {
            recommendations.push(`Регистрация истекает через ${daysUntilExpiry} дней. Необходимо продление`);
        }
    }
    
    if (doc.problems && doc.problems.toLowerCase().includes('качество')) {
        recommendations.push('Перезагрузить скан паспорта с лучшим качеством');
    }
    
    return recommendations;
}

// Вспомогательные функции UI
function showMainScreen() {
    showScreen('home');
}

function showLoading() {
    if (elements.loading) elements.loading.classList.remove('hidden');
    if (elements.tableContainer) elements.tableContainer.classList.add('hidden');
    if (elements.errorMessage) elements.errorMessage.classList.add('hidden');
}

function hideLoading() {
    if (elements.loading) elements.loading.classList.add('hidden');
    if (elements.tableContainer) elements.tableContainer.classList.remove('hidden');
}

function showError() {
    if (elements.loading) elements.loading.classList.add('hidden');
    if (elements.tableContainer) elements.tableContainer.classList.add('hidden');
    if (elements.errorMessage) elements.errorMessage.classList.remove('hidden');
}

function hideError() {
    if (elements.errorMessage) elements.errorMessage.classList.add('hidden');
    hideLoading();
}

function showWarning(message) {
    const warningDiv = document.createElement('div');
    warningDiv.className = 'warning-message';
    warningDiv.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        <p>${message}</p>
        <button onclick="this.parentElement.remove()">×</button>
    `;
    
    const container = document.querySelector('.container');
    if (container) {
        container.prepend(warningDiv);
    }
}

function updateLastUpdateTime() {
    const now = new Date();
    const formattedTime = now.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    if (elements.lastUpdate) {
        elements.lastUpdate.textContent = `Последнее обновление: ${formattedTime}`;
    }
}

// Функция форматирования валюты (используется в charts.js для счетов)
function formatCurrency(amount) {
    return new Intl.NumberFormat('ru-RU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}
