// api.js
// Работа с API: загрузка данных из Google Sheets

// Загрузка данных из Google Apps Script
async function loadData() {
    try {
        // Показываем индикатор загрузки данных
        const indicator = document.getElementById('data-loading-indicator');
        if (indicator) indicator.classList.remove('hidden');
        
        showLoading();
        if (elements.docLoading) elements.docLoading.classList.remove('hidden');
        
        const APPS_SCRIPT_URL = CONFIG.appsScriptUrl;
        
        console.log('Загрузка данных с:', APPS_SCRIPT_URL);
        
        const response = await fetch(APPS_SCRIPT_URL);
        
        if (!response.ok) {
            throw new Error(`Ошибка HTTP: ${response.status}`);
        }
        
        // Парсим JSON с обработкой ошибок
        let result;
        try {
            const text = await response.text();
            console.log('Получен текст ответа (первые 500 символов):', text.substring(0, 500));
            result = JSON.parse(text);
            console.log('Получен ответ от сервера:', result);
        } catch (parseError) {
            console.error('Ошибка парсинга JSON:', parseError);
            throw new Error('Неверный формат ответа от сервера');
        }
        
        // Обрабатываем данные
        processLoadedData(result);
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        
        // Для тестирования используем демо-данные
        console.log('Используются демо-данные для тестирования интерфейса');
        allPayments = generateTestData();
        allDocuments = generateTestDocuments();
        updatePeriodsAndStatuses(allPayments);
        lastPeriod = getLastPeriod(allPayments);
        populateFilters(allPayments);
        updateDocumentFilters();
        applyFilters();
        applyDocFilters();
        mergeDataByPhone();
        updateStatistics();
        showWarning('Используются демо-данные. Настройте подключение к Google Таблице.');
    } finally {
        // Скрываем индикатор загрузки после завершения
        const indicator = document.getElementById('data-loading-indicator');
        if (indicator) indicator.classList.add('hidden');
    }
}

// Функция для обработки загруженных данных
function processLoadedData(result) {
    console.log('Получены данные:', result);
    
    // Проверяем наличие результата
    if (!result) {
        console.error('Результат пустой');
        showError();
        return;
    }
    
    let hasErrors = false;
    
    // ДИАГНОСТИКА: проверяем что пришло от сервера
    console.log('Есть поле data?', !!result.data);
    console.log('Есть поле documents?', !!result.documents);
    console.log('Количество выплат:', result.data ? result.data.length : 0);
    console.log('Количество документов:', result.documents ? result.documents.length : 0);
    
    // Обработка выплат
    try {
        if (result.data && Array.isArray(result.data)) {
            // Преобразуем данные в нужный формат
            allPayments = result.data.map((item, index) => {
                try {
                    const inn = (item.inn || '').toString().trim();
                    
                    return {
                        id: index + 1,
                        year: item.year || new Date().getFullYear(),
                        period: (item.period || '').toString().trim(),
                        employee: (item.employee || '').toString().trim(),
                        phone: normalizePhone(String(item.phone || '')),
                        amount: parseFloat(item.amount) || 0,
                        status: (item.status || '').toString().trim(),
                        comment: (item.comment || '').toString().trim(),
                        inn: inn, // ⭐ ДОБАВЛЕНО: ИНН
                        formattedAmount: formatCurrency(parseFloat(item.amount) || 0)
                    };
                } catch (e) {
                    console.warn('Ошибка при обработке выплаты:', e, item);
                    return null;
                }
            }).filter(p => p !== null);
            
            console.log('Обработано выплат:', allPayments.length);
            
            // ДИНАМИЧЕСКОЕ ОПРЕДЕЛЕНИЕ ПЕРИОДОВ И СТАТУСОВ
            updatePeriodsAndStatuses(allPayments);
            
            // Определяем последний период (для обратной совместимости)
            const lastPeriodData = getLastPeriodAndYear(allPayments);
            lastPeriod = lastPeriodData ? lastPeriodData.period : '';
            console.log('Последний период:', lastPeriod);
            
            // Заполняем фильтры
            populateFilters(allPayments);
            
            // Слияние данных по ИНН ДО применения фильтров
            mergeDataByINN();
            
            // Применяем фильтры и отображаем данные
            applyFilters();
            
            hideError();
        } else {
            console.warn('Выплаты не загружены или формат данных неверный. result.data:', result.data);
            allPayments = [];
            hasErrors = true;
            
            // Инициализируем пустые фильтры
            if (elements.periodYearFilter) elements.periodYearFilter.innerHTML = '<option value="">Все периоды</option>';
            if (elements.statusFilter) elements.statusFilter.innerHTML = '<option value="">Все статусы</option>';
            
            // Применяем фильтры чтобы показать пустую таблицу
            applyFilters();
            
            // Все равно скрываем загрузку
            hideLoading();
        }
    } catch (error) {
        console.error('Ошибка при обработке выплат:', error);
        allPayments = [];
        hasErrors = true;
    }
    
    // Обработка документов
    try {
        if (result.documents && Array.isArray(result.documents)) {
            allDocuments = result.documents.map((item, index) => {
                try {
                    // Определяем реальный статус из таблицы (collected или inProcess)
                    const collected = item.collected ? String(item.collected).trim() : '';
                    const inProcess = item.inProcess ? String(item.inProcess).trim() : '';
                    const realStatus = collected || inProcess || '';
                    
                    // Безопасный вызов getDocumentStatus
                    let documentStatus = 'not-processed';
                    try {
                        documentStatus = getDocumentStatus(item || {});
                    } catch (e) {
                        console.warn('Ошибка при определении статуса документа:', e, item);
                    }
                    
                    const inn = (item.inn || '').toString().trim();
                    
                    return {
                        id: index + 1,
                        collected: collected,
                        inProcess: inProcess,
                        project: (item.project || '').toString().trim(),
                        city: (item.city || '').toString().trim(),
                        position: (item.position || '').toString().trim(),
                        restaurant: (item.restaurant || '').toString().trim(),
                        comment: (item.comment || '').toString().trim(),
                        vacation: (item.vacation || '').toString().trim(),
                        passportIssueDate: (item.passportIssueDate || '').toString().trim(),
                        birthDate: (item.birthDate || '').toString().trim(),
                        passportData: (item.passportData || '').toString().trim(),
                        employee: (item.employee || '').toString().trim(),
                        phone: normalizePhone(String(item.phone || '')),
                        inn: inn, // ⭐ ДОБАВЛЕНО: ИНН
                        citizenship: (item.citizenship || '').toString().trim(),
                        documentsLink: (item.documentsLink || '').toString().trim(),
                        problems: (item.problems || '').toString().trim(),
                        registrationEndDate: (item.registrationEndDate || '').toString().trim(),
                        patentIssueDate: (item.patentIssueDate || '').toString().trim(),
                        contractDate: (item.contractDate || '').toString().trim(),
                        contractLink: (item.contractLink || '').toString().trim(),
                        dismissedDate: (item.dismissedDate || '').toString().trim(),
                        documentStatus: documentStatus,
                        realStatus: realStatus
                    };
                } catch (e) {
                    console.error('Ошибка при обработке документа:', e, item);
                    return null;
                }
            }).filter(doc => doc !== null);
            
            console.log('Обработано документов:', allDocuments.length);
            
            // Обновляем фильтры документов
            updateDocumentFilters();
            
            // Пересобираем объединенные данные после загрузки документов
            mergeDataByINN();
            
            // Перерисовываем таблицу выплат, если она открыта
            if (currentScreen === 'payments' && filteredPayments.length > 0) {
                renderTable();
            }
            
            // Применяем фильтры документов
            applyDocFilters();
            
            if (elements.docLoading) elements.docLoading.classList.add('hidden');
            if (elements.docTableContainer) elements.docTableContainer.classList.remove('hidden');
            if (elements.docErrorMessage) elements.docErrorMessage.classList.add('hidden');
        } else {
            console.warn('Документы не загружены. result.documents:', result.documents);
            allDocuments = [];
            
            if (elements.docLoading) elements.docLoading.classList.add('hidden');
            if (elements.docTableContainer) {
                elements.docTableContainer.classList.remove('hidden');
                if (elements.docTableBody) {
                    elements.docTableBody.innerHTML = `
                        <tr>
                            <td colspan="6" style="text-align: center; padding: 40px;">
                                <i class="fas fa-exclamation-triangle" style="font-size: 2rem; color: var(--warning); margin-bottom: 15px; display: block;"></i>
                                <p><strong>Документы не загружены</strong></p>
                                <p style="font-size: 13px; color: var(--gray-600); margin-top: 10px;">
                                    Проверьте:<br>
                                    • Существует ли лист "Документы" в Google Таблице<br>
                                    • Обновлён ли код Google Apps Script<br>
                                    • Есть ли данные в листе "Документы"
                                </p>
                            </td>
                        </tr>
                    `;
                }
            }
            if (elements.docErrorMessage) elements.docErrorMessage.classList.add('hidden');
        }
    } catch (error) {
        console.error('Ошибка при обработке документов:', error);
        allDocuments = [];
        hasErrors = true;
        
        if (elements.docLoading) elements.docLoading.classList.add('hidden');
        if (elements.docTableContainer) {
            elements.docTableContainer.classList.remove('hidden');
            if (elements.docTableBody) {
                elements.docTableBody.innerHTML = `
                    <tr>
                        <td colspan="6" style="text-align: center; padding: 40px;">
                            <i class="fas fa-exclamation-triangle" style="font-size: 2rem; color: var(--danger); margin-bottom: 15px; display: block;"></i>
                            <p><strong>Ошибка при загрузке документов</strong></p>
                            <p style="font-size: 13px; color: var(--gray-600); margin-top: 10px;">
                                ${error.message || 'Неизвестная ошибка'}
                            </p>
                        </td>
                    </tr>
                `;
            }
        }
    }
    
    // Слияние данных по телефону (если еще не было выполнено)
    try {
        if (Object.keys(mergedData).length === 0) {
            mergeDataByPhone();
        }
    } catch (error) {
        console.error('Ошибка при слиянии данных:', error);
    }
    
    // Обновляем статистику
    try {
        updateStatistics();
    } catch (error) {
        console.error('Ошибка при обновлении статистики:', error);
    }
    
    // Обработка данных счетов
    try {
        if (result.accounts) {
            accountsData = result.accounts;
            console.log('Данные счетов получены:', accountsData);
            console.log('Загружено выплат из листа "Счета":', accountsData.payments ? accountsData.payments.length : 0);
            console.log('Загружено транзакций:', accountsData.transactions ? accountsData.transactions.length : 0);
        } else {
            console.warn('Данные счетов не загружены');
            accountsData = { payments: [], transactions: [] };
        }
    } catch (error) {
        console.error('Ошибка при обработке данных счетов:', error);
        accountsData = { payments: [], transactions: [] };
    }
    
    // Обновляем время последнего обновления
    try {
        updateLastUpdateTime();
    } catch (error) {
        console.error('Ошибка при обновлении времени:', error);
    }
    
    // Обновляем графики на дашборде если он открыт
    try {
        if (currentScreen === 'dashboard') {
            setTimeout(() => {
                renderDashboardCharts();
                renderAccountsDashboard();
            }, 100);
        }
    } catch (error) {
        console.error('Ошибка при обновлении графиков:', error);
    }
    
    // Если были ошибки, но данные частично загружены, скрываем индикатор загрузки
    if (hasErrors && (allPayments.length > 0 || allDocuments.length > 0)) {
        hideLoading();
    }
}
