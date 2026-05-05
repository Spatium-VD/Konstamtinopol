// ============================================
// ОБНОВЛЕННЫЙ КОД ДЛЯ НОВОЙ СТРУКТУРЫ ТАБЛИЦЫ
// Таблица: "Сырье панель Чайхана"
// ============================================

// ID вашей Google Таблицы
var SPREADSHEET_ID = '1qqUSVi8zuWH0xFrN4FxSlDs-WTp3CPSgzH3N3oycwbk';

// Названия листов
var PAYMENTS_SHEET_NAME = 'Выплаты';
var DOCUMENTS_SHEET_NAME = 'Документы';
var ACCOUNTS_SHEET_NAME = 'Счета';
var DETOURS_SHEET_NAME = 'Объезды';

// Заголовки листа «Объезды» v2 (порядок колонок A…M): без телефона/типа договора/желаемой даты — правьте в Google Таблице при необходимости.
// Колонка «Дата доставки договора» — для формул/ручного ввода в GT; в JSON поле contractDeliveryDate.
var DETOURS_HEADERS = [
  'id',
  'createdAt',
  'restaurant',
  'director',
  'employeeName',
  'employeeInn',
  'paperReason',
  'plannedVisitDate',
  'status',
  'adminDeadline',
  'adminComment',
  'Дата доставки договора',
  'updatedAt'
];

// Функция, вызываемая при GET запросе
function doGet(e) {
  try {
    // Открываем таблицу
    var spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);

    // --- API: заявки на объезды (GET + base64 JSON в параметре p) ---
    if (e && e.parameter && e.parameter.action === 'detourCreate') {
      ensureDetoursSheet_(spreadsheet);
      var sheetD = spreadsheet.getSheetByName(DETOURS_SHEET_NAME);
      var payload = decodePayload_(e.parameter.p);
      var created = appendDetourRow_(sheetD, payload);
      return jsonResponse_({ success: true, detour: created });
    }
    if (e && e.parameter && e.parameter.action === 'detourUpdate') {
      ensureDetoursSheet_(spreadsheet);
      var sheetU = spreadsheet.getSheetByName(DETOURS_SHEET_NAME);
      var upd = decodePayload_(e.parameter.p);
      updateDetourRow_(sheetU, upd);
      return jsonResponse_({ success: true });
    }
    
    // ===================== ЛИСТ ВЫПЛАТ =====================
    var paymentsSheet = spreadsheet.getSheetByName(PAYMENTS_SHEET_NAME);
    var paymentsData = [];
    
    if (paymentsSheet) {
      var paymentsValues = paymentsSheet.getDataRange().getValues();
      var paymentHeaders = paymentsValues[0];
      
      // НОВАЯ СТРУКТУРА КОЛОНОК:
      // A (0): Год
      // B (1): Период выплаты
      // C (2): Сотрудник
      // D (3): Телефон
      // E (4): Сумма из реестра
      // F (5): Удержание
      // G (6): Итог с удержанием
      // H (7): Комиссия платформы
      // I (8): ИТОГ к выплате
      // J (9): Статус
      // K (10): Комментарий
      // L (11): ИНН ⭐ НОВОЕ
      
      var paymentColumnIndexes = {
        year: findColumnIndex(paymentHeaders, ['Год', 'год']),
        period: findColumnIndex(paymentHeaders, ['Период выплаты', 'Период', 'период']),
        employee: findColumnIndex(paymentHeaders, ['Сотрудник', 'ФИО', 'Имя', 'сотрудник', 'фио']),
        phone: findColumnIndex(paymentHeaders, ['Телефон', 'Номер телефона', 'телефон', 'номер']),
        amount: findColumnIndex(paymentHeaders, ['Сумма из реестра', 'Сумма', 'сумма']),
        status: findColumnIndex(paymentHeaders, ['Статус', 'статус']),
        comment: findColumnIndex(paymentHeaders, ['Комментарий', 'комментарий']),
        inn: findColumnIndex(paymentHeaders, ['ИНН', 'инн']) // ⭐ НОВОЕ
      };
      
      // Обрабатываем данные, начиная со второй строки
      for (var i = 1; i < paymentsValues.length; i++) {
        var row = paymentsValues[i];
        
        // Пропускаем пустые строки
        if (!row[paymentColumnIndexes.employee] || row[paymentColumnIndexes.employee] === '') {
          continue;
        }
        
        // Преобразуем сумму в число
        var amount = parseFloat(row[paymentColumnIndexes.amount]) || 0;
        
        // Преобразуем год в число
        var year = parseInt(row[paymentColumnIndexes.year]) || new Date().getFullYear();
        
        // ИНН - новая колонка L (индекс 11)
        var inn = '';
        if (paymentColumnIndexes.inn >= 0 && row[paymentColumnIndexes.inn]) {
          inn = String(row[paymentColumnIndexes.inn]).trim();
        }
        
        paymentsData.push({
          id: i,
          year: year,
          period: row[paymentColumnIndexes.period] || '',
          employee: row[paymentColumnIndexes.employee] || '',
          phone: String(row[paymentColumnIndexes.phone] || ''),
          amount: amount,
          status: row[paymentColumnIndexes.status] || '',
          comment: row[paymentColumnIndexes.comment] || '',
          inn: inn // ⭐ ДОБАВЛЕНО: ИНН
        });
      }
    }
    
    // ===================== ЛИСТ ДОКУМЕНТЫ =====================
    var documentsSheet = spreadsheet.getSheetByName(DOCUMENTS_SHEET_NAME);
    var documentsData = [];
    
    if (documentsSheet) {
      var documentsValues = documentsSheet.getDataRange().getValues();
      
      // НОВАЯ СТРУКТУРА КОЛОНОК:
      // A (0): Статус
      // B (1): Проект
      // C (2): Город
      // D (3): Должность
      // E (4): Ресторан
      // F (5): Комментарий
      // G (6): Дата проверки в РКЛ
      // H (7): Отпуск
      // I (8): ИНН ⭐ НОВОЕ
      // J (9): серия патента
      // K (10): Номер патента
      // L (11): Серия бланка патента
      // M (12): Номер бланка патента
      // N (13): Дата выдачи паспорта
      // O (14): Дата рождения
      // P (15): Паспортные данные
      // Q (16): ФИО ⭐ ПЕРЕМЕСТИЛОСЬ (было K/10)
      // R (17): Номер телефона ⭐ ПЕРЕМЕСТИЛОСЬ (было L/11)
      // S (18): Гражданство
      // T (19): Ссылка на полный пакет документов
      // U (20): Проблемы
      // V (21): Регистрация дата окончания
      // W (22): патент дата выдачи
      // X (23): договор дата заключения
      // Y (24): ссылка на договор
      // Z (25): Уволен (дата)
      
      var documentColumnIndexes = {
        status: 0,           // A - Статус (Собран/В обработке)
        project: 1,          // B - Проект
        city: 2,             // C - Город
        position: 3,         // D - Должность
        restaurant: 4,      // E - Ресторан
        comment: 5,         // F - Комментарий
        rklCheckDate: 6,     // G - Дата проверки в РКЛ
        vacation: 7,        // H - Отпуск
        inn: 8,             // I - ИНН ⭐ НОВОЕ
        patentSeries: 9,     // J - серия патента
        patentNumber: 10,   // K - Номер патента
        patentBlankSeries: 11, // L - Серия бланка патента
        patentBlankNumber: 12, // M - Номер бланка патента
        passportIssueDate: 13, // N - Дата выдачи паспорта
        birthDate: 14,      // O - Дата рождения
        passportData: 15,   // P - Паспортные данные
        employee: 16,       // Q - ФИО ⭐ ПЕРЕМЕСТИЛОСЬ
        phone: 17,          // R - Номер телефона ⭐ ПЕРЕМЕСТИЛОСЬ
        citizenship: 18,    // S - Гражданство
        documentsLink: 19,  // T - Ссылка на полный пакет документов
        problems: 20,       // U - Проблемы
        registrationEndDate: 21, // V - Регистрация дата окончания
        patentIssueDate: 22,    // W - патент дата выдачи
        contractDate: 23,       // X - договор дата заключения
        contractLink: 24,       // Y - ссылка на договор
        dismissedDate: 25       // Z - Уволен (дата)
      };
      
      // Обрабатываем данные, начиная со второй строки
      for (var j = 1; j < documentsValues.length; j++) {
        var row = documentsValues[j];
        
        // Пропускаем пустые строки (проверяем ФИО или телефон или ИНН)
        var employee = row[documentColumnIndexes.employee] ? String(row[documentColumnIndexes.employee]).trim() : '';
        var phone = row[documentColumnIndexes.phone] ? String(row[documentColumnIndexes.phone]).trim() : '';
        var inn = row[documentColumnIndexes.inn] ? String(row[documentColumnIndexes.inn]).trim() : '';
        
        if (!employee && !phone && !inn) {
          continue;
        }
        
        // Обрабатываем статус (колонка A)
        var collected = '';
        var inProcess = '';
        var colA = row[documentColumnIndexes.status] ? String(row[documentColumnIndexes.status]).trim() : '';
        
        if (colA) {
          if (colA.toLowerCase().includes('собран') && !colA.toLowerCase().includes('обработке')) {
            collected = colA;
          } else if (colA.toLowerCase().includes('обработке') || colA.toLowerCase().includes('обновлено')) {
            inProcess = colA;
          } else if (colA.toLowerCase().includes('собран') && colA.toLowerCase().includes('обработке')) {
            var parts = colA.split(/\s+/);
            if (parts[0].toLowerCase().includes('собран')) collected = parts[0];
            if (parts.length > 1 && parts[1].toLowerCase().includes('обработке')) {
              inProcess = parts.slice(1).join(' ');
            }
          } else {
            if (colA.toLowerCase() === 'обновлено') {
              collected = colA;
            } else {
              inProcess = colA;
            }
          }
        }
        
        // Преобразуем даты из Excel формата (числа) в читаемый формат
        function formatExcelDate(excelDate) {
          if (!excelDate) return '';
          if (typeof excelDate === 'string') return excelDate.trim();
          if (typeof excelDate === 'number') {
            var date = new Date((excelDate - 25569) * 86400 * 1000);
            var day = ('0' + date.getDate()).slice(-2);
            var month = ('0' + (date.getMonth() + 1)).slice(-2);
            var year = date.getFullYear();
            return day + '.' + month + '.' + year;
          }
          return String(excelDate).trim();
        }
        
        documentsData.push({
          id: j,
          collected: collected,
          inProcess: inProcess,
          project: row[documentColumnIndexes.project] ? String(row[documentColumnIndexes.project]).trim() : '',
          city: row[documentColumnIndexes.city] ? String(row[documentColumnIndexes.city]).trim() : '',
          position: row[documentColumnIndexes.position] ? String(row[documentColumnIndexes.position]).trim() : '',
          restaurant: row[documentColumnIndexes.restaurant] ? String(row[documentColumnIndexes.restaurant]).trim() : '',
          comment: row[documentColumnIndexes.comment] ? String(row[documentColumnIndexes.comment]).trim() : '',
          rklCheckDate: formatExcelDate(row[documentColumnIndexes.rklCheckDate]),
          vacation: row[documentColumnIndexes.vacation] ? String(row[documentColumnIndexes.vacation]).trim() : '',
          inn: inn, // ⭐ ДОБАВЛЕНО: ИНН
          patentSeries: row[documentColumnIndexes.patentSeries] ? String(row[documentColumnIndexes.patentSeries]).trim() : '',
          patentNumber: row[documentColumnIndexes.patentNumber] ? String(row[documentColumnIndexes.patentNumber]).trim() : '',
          patentBlankSeries: row[documentColumnIndexes.patentBlankSeries] ? String(row[documentColumnIndexes.patentBlankSeries]).trim() : '',
          patentBlankNumber: row[documentColumnIndexes.patentBlankNumber] ? String(row[documentColumnIndexes.patentBlankNumber]).trim() : '',
          passportIssueDate: formatExcelDate(row[documentColumnIndexes.passportIssueDate]),
          birthDate: formatExcelDate(row[documentColumnIndexes.birthDate]),
          passportData: row[documentColumnIndexes.passportData] ? String(row[documentColumnIndexes.passportData]).trim() : '',
          employee: employee,
          phone: phone,
          citizenship: row[documentColumnIndexes.citizenship] ? String(row[documentColumnIndexes.citizenship]).trim() : '',
          documentsLink: row[documentColumnIndexes.documentsLink] ? String(row[documentColumnIndexes.documentsLink]).trim() : '',
          problems: row[documentColumnIndexes.problems] ? String(row[documentColumnIndexes.problems]).trim() : '',
          registrationEndDate: formatExcelDate(row[documentColumnIndexes.registrationEndDate]),
          patentIssueDate: formatExcelDate(row[documentColumnIndexes.patentIssueDate]),
          contractDate: formatExcelDate(row[documentColumnIndexes.contractDate]),
          contractLink: row[documentColumnIndexes.contractLink] ? String(row[documentColumnIndexes.contractLink]).trim() : '',
          dismissedDate: formatExcelDate(row[documentColumnIndexes.dismissedDate])
        });
      }
    }
    
    // ===================== ЛИСТ СЧЕТА =====================
    var accountsSheet = spreadsheet.getSheetByName(ACCOUNTS_SHEET_NAME);
    var accountsData = {
      payments: [],         // Данные выплат из листа "Счета" (A-H)
      transactions: [],    // История оплат (L-N)
      breakdown: []         // Разбивка счетов (P-Z транспонированная)
    };
    
    if (accountsSheet) {
      var accountsValues = accountsSheet.getDataRange().getValues();
      
      // ОБНОВЛЕННАЯ СТРУКТУРА (добавлена колонка "Год"):
      // A-I: Контроль счетов
      //   A (0): Год ⭐ НОВОЕ
      //   B (1): Период
      //   C (2): Месяц
      //   D (3): ФОТ
      //   E (4): Выручка
      //   F (5): Оплачено
      //   G (6): Разница
      //   H (7): Статус
      //   I (8): Комментарий
      // J-K: Суммы
      //   J (9): Сумма (может быть заголовком или значением)
      //   K (10): К оплате / Оплачено / Разница
      // M-O: История оплат
      //   M (12): Лицо ⭐ СМЕСТИЛОСЬ
      //   N (13): Дата ⭐ СМЕСТИЛОСЬ
      //   O (14): Сумма ⭐ СМЕСТИЛОСЬ
      // Q-AA: Транспонированная таблица разбивки счетов
      //   Q (16): Разбивки (заголовок) ⭐ СМЕСТИЛОСЬ
      //   R-AA (17-26): Названия лиц/сумм ⭐ СМЕСТИЛОСЬ
      
      // Обрабатываем данные выплат (A-I)
      for (var i = 1; i < accountsValues.length; i++) {
        var row = accountsValues[i];
        
        var year = parseInt(row[0]) || new Date().getFullYear(); // A (0) - Год ⭐ НОВОЕ
        var period = String(row[1] || '').trim(); // B (1) - Период ⭐ СМЕСТИЛОСЬ
        
        // Пропускаем пустые строки (проверяем период)
        if (!period || period === '') {
          continue;
        }
        
        // Пропускаем строки которые не являются периодами
        // Формат может быть: "1-31.10.2025" или "16.10-5.11"
        if (!period.match(/^\d+[-\.]\d+/) && !period.match(/^\d+-\d+\.\d+\.\d+$/)) {
          continue;
        }
        
        var month = String(row[2] || '').trim(); // C (2) - Месяц ⭐ СМЕСТИЛОСЬ
        var fot = parseFloat(row[3]) || 0; // D (3) - ФОТ ⭐ СМЕСТИЛОСЬ
        var revenue = parseFloat(row[4]) || 0; // E (4) - Выручка ⭐ СМЕСТИЛОСЬ
        var paid = parseFloat(row[5]) || 0; // F (5) - Оплачено ⭐ СМЕСТИЛОСЬ
        var difference = parseFloat(row[6]) || 0; // G (6) - Разница ⭐ СМЕСТИЛОСЬ
        var status = String(row[7] || '').trim(); // H (7) - Статус ⭐ СМЕСТИЛОСЬ
        var comment = String(row[8] || '').trim(); // I (8) - Комментарий ⭐ СМЕСТИЛОСЬ
        
        accountsData.payments.push({
          year: year, // ⭐ ДОБАВЛЕНО: Год
          period: period,
          month: month,
          fot: fot,
          revenue: revenue,
          paid: paid,
          difference: difference,
          status: status,
          comment: comment
        });
      }
      
      // Обрабатываем историю оплат (M-O)
      for (var i = 1; i < accountsValues.length; i++) {
        var row = accountsValues[i];
        
        var accountName = row[12] ? String(row[12]).trim() : ''; // M (12) - Лицо ⭐ СМЕСТИЛОСЬ
        var dateValue = row[13]; // N (13) - Дата ⭐ СМЕСТИЛОСЬ
        var amountValue = row[14]; // O (14) - Сумма ⭐ СМЕСТИЛОСЬ
        
        // Пропускаем если нет суммы
        if (!amountValue || amountValue === '') {
          continue;
        }
        
        var amount = 0;
        if (typeof amountValue === 'number') {
          amount = amountValue;
        } else if (typeof amountValue === 'string') {
          var amountStr = String(amountValue).trim().replace(/\s/g, '').replace(',', '.');
          amount = parseFloat(amountStr) || 0;
        }
        
        if (amount === 0) continue;
        
        var dateStr = '';
        if (dateValue) {
          if (typeof dateValue === 'string') {
            dateStr = dateValue.trim();
          } else if (dateValue instanceof Date) {
            var day = ('0' + dateValue.getDate()).slice(-2);
            var month = ('0' + (dateValue.getMonth() + 1)).slice(-2);
            var year = dateValue.getFullYear();
            dateStr = day + '.' + month + '.' + year;
          } else if (typeof dateValue === 'number') {
            var date = new Date((dateValue - 25569) * 86400 * 1000);
            var day = ('0' + date.getDate()).slice(-2);
            var month = ('0' + (date.getMonth() + 1)).slice(-2);
            var year = date.getFullYear();
            dateStr = day + '.' + month + '.' + year;
          }
        }
        
        if (accountName && amount !== 0) {
          accountsData.transactions.push({
            id: accountsData.transactions.length + 1,
            date: dateStr,
            amount: amount,
            account: accountName
          });
        }
      }
      
      // Обрабатываем разбивку счетов (Q-AA транспонированная)
      // Заголовок в Q (16), данные в R-AA (17-26) ⭐ СМЕСТИЛОСЬ
      if (accountsValues.length > 0) {
        var headerRow = accountsValues[0];
        var breakdownHeaders = [];
        
        // Собираем заголовки из R-AA (17-26) ⭐ СМЕСТИЛОСЬ
        for (var col = 17; col <= 26 && col < headerRow.length; col++) {
          var header = String(headerRow[col] || '').trim();
          if (header) {
            breakdownHeaders.push({ index: col, name: header });
          }
        }
        
        // Обрабатываем данные разбивки (начиная со строки 1)
        for (var i = 1; i < accountsValues.length; i++) {
          var row = accountsValues[i];
          var periodValue = String(row[16] || '').trim(); // Q (16) - период разбивки ⭐ СМЕСТИЛОСЬ
          
          if (!periodValue || periodValue === '') continue;
          
          var breakdownRow = {
            period: periodValue,
            breakdowns: {}
          };
          
          // Собираем данные по каждому лицу
          for (var h = 0; h < breakdownHeaders.length; h++) {
            var headerInfo = breakdownHeaders[h];
            var value = row[headerInfo.index];
            var amount = 0;
            
            if (value !== undefined && value !== null && value !== '') {
              if (typeof value === 'number') {
                amount = value;
              } else if (typeof value === 'string') {
                var amountStr = String(value).trim().replace(/\s/g, '').replace(',', '.');
                amount = parseFloat(amountStr) || 0;
              }
            }
            
            breakdownRow.breakdowns[headerInfo.name] = amount;
          }
          
          accountsData.breakdown.push(breakdownRow);
        }
      }
    }
    
    // ===================== ЛИСТ ОБЪЕЗДЫ =====================
    ensureDetoursSheet_(spreadsheet);
    var detoursSheet = spreadsheet.getSheetByName(DETOURS_SHEET_NAME);
    var detoursData = readDetoursAsObjects_(detoursSheet);

    // Возвращаем данные
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        data: paymentsData,
        documents: documentsData,
        accounts: accountsData,
        detours: detoursData,
        timestamp: new Date().toISOString(),
        totalRecords: paymentsData.length,
        totalDocuments: documentsData.length
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString(),
        message: 'Ошибка при загрузке данных из Google Таблицы',
        data: [],
        documents: [],
        accounts: { payments: [], transactions: [], breakdown: [] },
        detours: []
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * POST: те же действия, что и GET с action + p (на случай длинных JSON).
 */
function doPost(e) {
  try {
    var spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    var body = {};
    if (e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }
    var action = body.action;
    var payload = body.payload || {};

    if (action === 'detourCreate') {
      ensureDetoursSheet_(spreadsheet);
      var sheetD = spreadsheet.getSheetByName(DETOURS_SHEET_NAME);
      var created = appendDetourRow_(sheetD, payload);
      return jsonResponse_({ success: true, detour: created });
    }
    if (action === 'detourUpdate') {
      ensureDetoursSheet_(spreadsheet);
      var sheetU = spreadsheet.getSheetByName(DETOURS_SHEET_NAME);
      updateDetourRow_(sheetU, payload);
      return jsonResponse_({ success: true });
    }
    return jsonResponse_({ success: false, error: 'unknown_action' });
  } catch (err) {
    return jsonResponse_({ success: false, error: String(err) });
  }
}

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function decodePayload_(p) {
  if (!p) throw new Error('empty_payload');
  var s = String(p).trim().replace(/ /g, '+');
  try {
    var bytes = Utilities.base64Decode(s);
    var jsonStr = Utilities.newBlob(bytes).getDataAsString('UTF-8');
    return JSON.parse(jsonStr);
  } catch (e1) {
    return JSON.parse(decodeURIComponent(s));
  }
}

function ensureDetoursSheet_(spreadsheet) {
  var sh = spreadsheet.getSheetByName(DETOURS_SHEET_NAME);
  if (!sh) {
    sh = spreadsheet.insertSheet(DETOURS_SHEET_NAME);
  }
  var width = Math.max(DETOURS_HEADERS.length, sh.getLastColumn() || 0, 1);
  var first = sh.getRange(1, 1, 1, width).getValues()[0];
  var empty = true;
  for (var i = 0; i < first.length; i++) {
    if (String(first[i] || '').trim() !== '') {
      empty = false;
      break;
    }
  }
  if (empty) {
    sh.getRange(1, 1, 1, DETOURS_HEADERS.length).setValues([DETOURS_HEADERS]);
    sh.setFrozenRows(1);
  }
}

/**
 * Запуск из редактора Apps Script: меню «Выполнить» → выбрать createDetoursSheet → Run.
 * Создаёт лист «Объезды» (если его нет), записывает заголовки в 1-ю строку и закрепляет её.
 * Безопасно вызывать повторно: существующий лист не удаляется, строка заголовков перезаписывается.
 */
function createDetoursSheet() {
  var spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sh = spreadsheet.getSheetByName(DETOURS_SHEET_NAME);
  if (!sh) {
    sh = spreadsheet.insertSheet(DETOURS_SHEET_NAME);
  }
  sh.getRange(1, 1, 1, DETOURS_HEADERS.length).setValues([DETOURS_HEADERS]);
  sh.setFrozenRows(1);
  var msg = 'Готово: лист «' + DETOURS_SHEET_NAME + '», заголовки A1:M1 (v2, 13 колонок).';
  Logger.log(msg);
  return msg;
}

function detoursHeadersRow_(sheet) {
  var lc = sheet.getLastColumn();
  var lr = sheet.getLastRow();
  if (lr < 1 || lc < 1) return DETOURS_HEADERS.slice();
  return sheet.getRange(1, 1, 1, lc).getValues()[0];
}

function detoursHeaderToKey_(cell) {
  var raw = String(cell || '').trim();
  if (!raw) return '';
  var compact = raw.toLowerCase().replace(/\s+/g, '').replace(/ё/g, 'е');
  var map = {
    'id': 'id',
    'createdat': 'createdAt',
    'restaurant': 'restaurant',
    'director': 'director',
    'employeename': 'employeeName',
    'employeephone': 'employeePhone',
    'телефон': 'employeePhone',
    'employeeinn': 'employeeInn',
    'инн': 'employeeInn',
    'contracttype': 'contractType',
    'типдоговора': 'contractType',
    'paperreason': 'paperReason',
    'зачембумага': 'paperReason',
    'plannedvisitdate': 'plannedVisitDate',
    'визит': 'plannedVisitDate',
    'визитворган': 'plannedVisitDate',
    'desireddeliverydate': 'desiredDeliveryDate',
    'желаемаядоставка': 'desiredDeliveryDate',
    'status': 'status',
    'статус': 'status',
    'admindeadline': 'adminDeadline',
    'admincomment': 'adminComment',
    'updatedat': 'updatedAt',
    'contractdeliverydate': 'contractDeliveryDate',
    'датадоставкидоговора': 'contractDeliveryDate'
  };
  return map[compact] || '';
}

function detoursColIndexByKey_(sheet, key) {
  var headers = detoursHeadersRow_(sheet);
  for (var i = 0; i < headers.length; i++) {
    if (detoursHeaderToKey_(headers[i]) === key) return i + 1;
  }
  return -1;
}

function formatDetourValueOut_(val, key) {
  if (val === undefined || val === null || val === '') return '';
  if (val instanceof Date) {
    if (key === 'createdAt' || key === 'updatedAt') {
      return Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
    }
    return Utilities.formatDate(val, Session.getScriptTimeZone(), 'dd.MM.yyyy');
  }
  return String(val);
}

function readDetoursAsObjects_(sheet) {
  if (!sheet) return [];
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  var headerRow = values[0];
  var out = [];
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    var obj = {};
    for (var c = 0; c < headerRow.length; c++) {
      var key = detoursHeaderToKey_(headerRow[c]);
      if (!key) continue;
      var v = row[c];
      obj[key] = formatDetourValueOut_(v === undefined || v === null ? '' : v, key);
    }
    if (String(obj.id || '').trim() !== '') {
      out.push(obj);
    }
  }
  return out;
}

function nextDetourId_(sheet) {
  var last = sheet.getLastRow();
  if (last < 2) return 'D1';
  var maxNum = 0;
  var ids = sheet.getRange(2, 1, last, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    var id = String(ids[i][0] || '').trim();
    var m = id.match(/^D(\d+)$/);
    if (m) {
      var n = parseInt(m[1], 10);
      if (n > maxNum) maxNum = n;
    }
  }
  return 'D' + (maxNum + 1);
}

function detoursAppendCell_(key, id, payload, nowIso) {
  if (!key) return '';
  switch (key) {
    case 'id':
      return id;
    case 'createdAt':
    case 'updatedAt':
      return nowIso;
    case 'restaurant':
      return String(payload.restaurant || '');
    case 'director':
      return String(payload.director || '');
    case 'employeeName':
      return String(payload.employeeName || '');
    case 'employeeInn':
      return String(payload.employeeInn || '');
    case 'paperReason':
      return String(payload.paperReason || '');
    case 'plannedVisitDate':
      return formatDateOrEmpty_(payload.plannedVisitDate);
    case 'status':
      return 'Новая';
    case 'adminDeadline':
      return '';
    case 'adminComment':
      return '';
    case 'contractDeliveryDate':
      return '';
    // Старые листы с лишними колонками — заполняем из payload, если были
    case 'employeePhone':
      return String(payload.employeePhone || '');
    case 'contractType':
      return String(payload.contractType || '');
    case 'desiredDeliveryDate':
      return formatDateOrEmpty_(payload.desiredDeliveryDate);
    default:
      return '';
  }
}

function appendDetourRow_(sheet, payload) {
  var nowIso = new Date().toISOString();
  var id = nextDetourId_(sheet);
  var headers = detoursHeadersRow_(sheet);
  var row = [];
  for (var i = 0; i < headers.length; i++) {
    var k = detoursHeaderToKey_(headers[i]);
    row.push(detoursAppendCell_(k, id, payload, nowIso));
  }
  sheet.appendRow(row);
  return {
    id: id,
    createdAt: nowIso,
    restaurant: String(payload.restaurant || ''),
    director: String(payload.director || ''),
    employeeName: String(payload.employeeName || ''),
    employeeInn: String(payload.employeeInn || ''),
    paperReason: String(payload.paperReason || ''),
    plannedVisitDate: formatDateOrEmpty_(payload.plannedVisitDate),
    status: 'Новая',
    adminDeadline: '',
    adminComment: '',
    contractDeliveryDate: '',
    updatedAt: nowIso
  };
}

function formatDateOrEmpty_(v) {
  if (v === undefined || v === null || v === '') return '';
  var s = String(v).trim();
  if (!s) return '';
  return s.length >= 10 ? s.substring(0, 10) : s;
}

function updateDetourRow_(sheet, payload) {
  var id = String(payload.id || '').trim();
  if (!id) throw new Error('missing_id');
  var values = sheet.getDataRange().getValues();
  var rowIndex = -1;
  for (var r = 1; r < values.length; r++) {
    if (String(values[r][0] || '').trim() === id) {
      rowIndex = r + 1;
      break;
    }
  }
  if (rowIndex < 2) throw new Error('row_not_found');
  var nowIso = new Date().toISOString();
  var col;
  if (payload.status !== undefined) {
    col = detoursColIndexByKey_(sheet, 'status');
    if (col > 0) sheet.getRange(rowIndex, col).setValue(String(payload.status));
  }
  if (payload.adminDeadline !== undefined) {
    col = detoursColIndexByKey_(sheet, 'adminDeadline');
    if (col > 0) sheet.getRange(rowIndex, col).setValue(String(payload.adminDeadline));
  }
  if (payload.adminComment !== undefined) {
    col = detoursColIndexByKey_(sheet, 'adminComment');
    if (col > 0) sheet.getRange(rowIndex, col).setValue(String(payload.adminComment));
  }
  col = detoursColIndexByKey_(sheet, 'updatedAt');
  if (col > 0) sheet.getRange(rowIndex, col).setValue(nowIso);
}

// Вспомогательная функция для поиска индекса колонки
function findColumnIndex(headers, possibleNames) {
  for (var i = 0; i < headers.length; i++) {
    var header = String(headers[i] || '').toLowerCase().trim();
    for (var j = 0; j < possibleNames.length; j++) {
      if (header === possibleNames[j].toLowerCase()) {
        return i;
      }
    }
  }
  return -1;
}
