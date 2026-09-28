function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('draws');
  if (!sheet) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Missing draws sheet' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const p = e && e.parameter ? e.parameter : {};

  const timestamp = p.timestamp || new Date().toISOString();
  const hexagramNumber = p.hexagramNumber || '';
  const hexagramName = p.hexagramName || '';
  const anonymousBrowserId = p.anonymousBrowserId || '';

  sheet.appendRow([
    timestamp,
    hexagramNumber,
    hexagramName,
    anonymousBrowserId
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('心靈解籤所 3.0')
    .addItem('建立／更新統計後台', 'setupDashboard')
    .addItem('重新整理統計', 'refreshDashboard')
    .addToUi();
}

function setupDrawsSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName('draws');

  if (!sheet) {
    sheet = spreadsheet.insertSheet('draws');
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      'timestamp',
      'hexagramNumber',
      'hexagramName',
      'anonymousBrowserId'
    ]);
    sheet.setFrozenRows(1);
  }
}

function setupDashboard() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName('dashboard');

  if (!sheet) {
    sheet = spreadsheet.insertSheet('dashboard', 0);
  }

  sheet.clear();

  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 29);

  sheet.getRange('A1:F1').merge();
  sheet.getRange('A1').setValue('學生輔導中心｜心靈解籤所 3.0 統計後台');

  sheet.getRange('A3').setValue('開始日期');
  sheet.getRange('B3').setValue(thirtyDaysAgo).setNumberFormat('yyyy/mm/dd');
  sheet.getRange('D3').setValue('結束日期');
  sheet.getRange('E3').setValue(today).setNumberFormat('yyyy/mm/dd');

  sheet.getRange('A5').setValue('統計期間');
  sheet.getRange('A6').setValue('總抽籤次數');
  sheet.getRange('A7').setValue('匿名瀏覽器數');
  sheet.getRange('A8').setValue('平均每瀏覽器抽籤次數');
  sheet.getRange('A9').setValue('重複使用瀏覽器數');
  sheet.getRange('A10').setValue('重複使用比例');

  sheet.getRange('A13:D13').setValues([[
    '卦號',
    '卦名',
    '抽中次數',
    '比例'
  ]]);

  sheet.getRange('F3').setValue('使用方式');
  sheet.getRange('F4').setValue('修改 B3、E3 日期後，使用上方「心靈解籤所 3.0 → 重新整理統計」。');
  sheet.getRange('F5').setValue('匿名瀏覽器數僅用於估算，不等同真實人數。');

  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 150);
  sheet.setColumnWidth(2, 150);
  sheet.setColumnWidth(3, 120);
  sheet.setColumnWidth(4, 100);
  sheet.setColumnWidth(5, 150);
  sheet.setColumnWidth(6, 360);

  const dateRule = SpreadsheetApp.newDataValidation()
    .requireDate()
    .setAllowInvalid(false)
    .build();

  sheet.getRange('B3').setDataValidation(dateRule);
  sheet.getRange('E3').setDataValidation(dateRule);

  refreshDashboard();
  spreadsheet.setActiveSheet(sheet);
}

function refreshDashboard() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const drawSheet = spreadsheet.getSheetByName('draws');
  const dashboard = spreadsheet.getSheetByName('dashboard');

  if (!drawSheet) throw new Error('找不到 draws 工作表。請先執行 setupDrawsSheet()。');
  if (!dashboard) throw new Error('找不到 dashboard 工作表。請先執行 setupDashboard()。');

  const startValue = dashboard.getRange('B3').getValue();
  const endValue = dashboard.getRange('E3').getValue();

  if (!(startValue instanceof Date) || isNaN(startValue)) {
    throw new Error('開始日期格式不正確。');
  }
  if (!(endValue instanceof Date) || isNaN(endValue)) {
    throw new Error('結束日期格式不正確。');
  }

  const start = new Date(startValue);
  start.setHours(0, 0, 0, 0);

  const endExclusive = new Date(endValue);
  endExclusive.setDate(endExclusive.getDate() + 1);
  endExclusive.setHours(0, 0, 0, 0);

  if (start >= endExclusive) {
    throw new Error('結束日期必須等於或晚於開始日期。');
  }

  const lastRow = drawSheet.getLastRow();
  const rows = lastRow > 1
    ? drawSheet.getRange(2, 1, lastRow - 1, 4).getValues()
    : [];

  const filtered = rows.filter(row => {
    const raw = row[0];
    const date = raw instanceof Date ? raw : new Date(raw);
    return !isNaN(date) && date >= start && date < endExclusive;
  });

  const browserCounts = new Map();
  const hexagramCounts = new Map();

  filtered.forEach(row => {
    const number = String(row[1] ?? '').trim();
    const name = String(row[2] ?? '').trim();
    const browserId = String(row[3] ?? '').trim();

    if (browserId) {
      browserCounts.set(browserId, (browserCounts.get(browserId) || 0) + 1);
    }

    const key = number + '|' + name;
    const current = hexagramCounts.get(key) || {
      number,
      name,
      count: 0
    };
    current.count += 1;
    hexagramCounts.set(key, current);
  });

  const totalDraws = filtered.length;
  const uniqueBrowsers = browserCounts.size;
  const averageDraws = uniqueBrowsers > 0 ? totalDraws / uniqueBrowsers : 0;
  const repeatBrowsers = Array.from(browserCounts.values()).filter(count => count > 1).length;
  const repeatRate = uniqueBrowsers > 0 ? repeatBrowsers / uniqueBrowsers : 0;

  const periodText =
    Utilities.formatDate(start, Session.getScriptTimeZone(), 'yyyy/MM/dd') +
    ' ～ ' +
    Utilities.formatDate(new Date(endExclusive.getTime() - 1), Session.getScriptTimeZone(), 'yyyy/MM/dd');

  dashboard.getRange('B5').setValue(periodText);
  dashboard.getRange('B6').setValue(totalDraws);
  dashboard.getRange('B7').setValue(uniqueBrowsers);
  dashboard.getRange('B8').setValue(averageDraws).setNumberFormat('0.00');
  dashboard.getRange('B9').setValue(repeatBrowsers);
  dashboard.getRange('B10').setValue(repeatRate).setNumberFormat('0.0%');

  const clearRows = Math.max(dashboard.getMaxRows() - 13, 1);
  dashboard.getRange(14, 1, clearRows, 4).clearContent();

  const ranking = Array.from(hexagramCounts.values())
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return Number(a.number || 999) - Number(b.number || 999);
    })
    .map(item => [
      item.number,
      item.name,
      item.count,
      totalDraws > 0 ? item.count / totalDraws : 0
    ]);

  if (ranking.length > 0) {
    dashboard.getRange(14, 1, ranking.length, 4).setValues(ranking);
    dashboard.getRange(14, 4, ranking.length, 1).setNumberFormat('0.0%');
  }

  dashboard.getRange('H3:I3').setValues([['日期', '抽籤次數']]);
  const dailyCounts = new Map();

  filtered.forEach(row => {
    const raw = row[0];
    const date = raw instanceof Date ? raw : new Date(raw);
    const key = Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy/MM/dd');
    dailyCounts.set(key, (dailyCounts.get(key) || 0) + 1);
  });

  const dailyRows = Array.from(dailyCounts.entries())
    .sort((a, b) => a[0].localeCompare(b[0]));

  const dailyClearRows = Math.max(dashboard.getMaxRows() - 3, 1);
  dashboard.getRange(4, 8, dailyClearRows, 2).clearContent();

  if (dailyRows.length > 0) {
    dashboard.getRange(4, 8, dailyRows.length, 2).setValues(dailyRows);
  }

  dashboard.getRange('K3:L3').setValues([['匿名瀏覽器', '抽籤次數']]);
  const browserRows = Array.from(browserCounts.entries())
    .sort((a, b) => b[1] - a[1]);

  dashboard.getRange(4, 11, dailyClearRows, 2).clearContent();

  if (browserRows.length > 0) {
    dashboard.getRange(4, 11, browserRows.length, 2).setValues(browserRows);
  }

  SpreadsheetApp.flush();
}
