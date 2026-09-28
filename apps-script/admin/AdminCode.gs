const ADMIN_SPREADSHEET_ID = 'PASTE_SPREADSHEET_ID_HERE';

function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('心靈解籤所 3.0｜統計管理後台')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function getDashboardData(startDateText, endDateText) {
  if (!ADMIN_SPREADSHEET_ID || ADMIN_SPREADSHEET_ID === 'PASTE_SPREADSHEET_ID_HERE') {
    throw new Error('尚未設定 ADMIN_SPREADSHEET_ID。');
  }

  const sheet = SpreadsheetApp.openById(ADMIN_SPREADSHEET_ID).getSheetByName('draws');
  if (!sheet) throw new Error('找不到 draws 工作表。');

  const tz = Session.getScriptTimeZone() || 'Asia/Taipei';
  const today = new Date();
  const defaultEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const defaultStart = new Date(defaultEnd);
  defaultStart.setDate(defaultStart.getDate() - 29);

  const start = parseDateInput_(startDateText, defaultStart);
  const end = parseDateInput_(endDateText, defaultEnd);
  const endExclusive = new Date(end);
  endExclusive.setDate(endExclusive.getDate() + 1);

  if (start >= endExclusive) {
    throw new Error('結束日期必須等於或晚於開始日期。');
  }

  const lastRow = sheet.getLastRow();
  const rows = lastRow > 1
    ? sheet.getRange(2, 1, lastRow - 1, 4).getValues()
    : [];

  const filtered = rows.filter(row => {
    const raw = row[0];
    const date = raw instanceof Date ? raw : new Date(raw);
    return !isNaN(date) && date >= start && date < endExclusive;
  });

  const browserCounts = new Map();
  const hexagramCounts = new Map();
  const dailyCounts = new Map();

  filtered.forEach(row => {
    const raw = row[0];
    const date = raw instanceof Date ? raw : new Date(raw);
    const number = String(row[1] ?? '').trim();
    const name = String(row[2] ?? '').trim();
    const browserId = String(row[3] ?? '').trim();

    if (browserId) {
      browserCounts.set(browserId, (browserCounts.get(browserId) || 0) + 1);
    }

    const hexKey = number + '|' + name;
    const hex = hexagramCounts.get(hexKey) || { number, name, count: 0 };
    hex.count += 1;
    hexagramCounts.set(hexKey, hex);

    const dayKey = Utilities.formatDate(date, tz, 'yyyy-MM-dd');
    dailyCounts.set(dayKey, (dailyCounts.get(dayKey) || 0) + 1);
  });

  const totalDraws = filtered.length;
  const uniqueBrowsers = browserCounts.size;
  const averageDraws = uniqueBrowsers ? totalDraws / uniqueBrowsers : 0;
  const repeatBrowsers = Array.from(browserCounts.values()).filter(n => n > 1).length;
  const repeatRate = uniqueBrowsers ? repeatBrowsers / uniqueBrowsers : 0;

  const hexagrams = Array.from(hexagramCounts.values())
    .sort((a, b) => b.count - a.count || Number(a.number || 999) - Number(b.number || 999))
    .map(item => ({
      number: item.number,
      name: item.name,
      count: item.count,
      rate: totalDraws ? item.count / totalDraws : 0
    }));

  const daily = Array.from(dailyCounts.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, count]) => ({ date, count }));

  return {
    period: {
      start: Utilities.formatDate(start, tz, 'yyyy-MM-dd'),
      end: Utilities.formatDate(end, tz, 'yyyy-MM-dd')
    },
    kpis: {
      totalDraws,
      uniqueBrowsers,
      averageDraws,
      repeatBrowsers,
      repeatRate
    },
    daily,
    hexagrams
  };
}

function parseDateInput_(text, fallback) {
  if (!text) return new Date(fallback);
  const parts = String(text).split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return new Date(fallback);
  return new Date(parts[0], parts[1] - 1, parts[2]);
}


function getDashboardCsv(startDateText, endDateText) {
  if (!ADMIN_SPREADSHEET_ID || ADMIN_SPREADSHEET_ID === 'PASTE_SPREADSHEET_ID_HERE') {
    throw new Error('尚未設定 ADMIN_SPREADSHEET_ID。');
  }

  const sheet = SpreadsheetApp.openById(ADMIN_SPREADSHEET_ID).getSheetByName('draws');
  if (!sheet) throw new Error('找不到 draws 工作表。');

  const tz = Session.getScriptTimeZone() || 'Asia/Taipei';
  const today = new Date();
  const defaultEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const defaultStart = new Date(defaultEnd);
  defaultStart.setDate(defaultStart.getDate() - 29);

  const start = parseDateInput_(startDateText, defaultStart);
  const end = parseDateInput_(endDateText, defaultEnd);
  const endExclusive = new Date(end);
  endExclusive.setDate(endExclusive.getDate() + 1);

  const lastRow = sheet.getLastRow();
  const rows = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, 4).getValues() : [];

  const filtered = rows.filter(row => {
    const raw = row[0];
    const date = raw instanceof Date ? raw : new Date(raw);
    return !isNaN(date) && date >= start && date < endExclusive;
  });

  const escapeCsv = value => '"' + String(value == null ? '' : value).replace(/"/g, '""') + '"';
  const lines = [
    ['timestamp', 'hexagramNumber', 'hexagramName', 'anonymousBrowserId'],
    ...filtered.map(row => {
      const raw = row[0];
      const date = raw instanceof Date ? raw : new Date(raw);
      return [
        Utilities.formatDate(date, tz, 'yyyy-MM-dd HH:mm:ss'),
        row[1],
        row[2],
        row[3]
      ];
    })
  ];

  return '\uFEFF' + lines.map(row => row.map(escapeCsv).join(',')).join('\r\n');
}
