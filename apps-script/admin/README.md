# v3 網頁版統計管理後台

為避免公開的匿名收件 Web App 同時暴露統計資料，管理後台請建立為**另一個獨立的 Apps Script 專案**。

## 檔案
- `AdminCode.gs`：讀取 Google Sheet 並提供統計 API。
- `Index.html`：網頁版 dashboard。

## 安全架構
- 公開收件 Apps Script：任何人可 POST，只負責寫入 `draws`。
- 管理後台 Apps Script：獨立專案，限制登入者存取。
- 不要把後台 `doGet()` 加到公開收件專案。

## 設定
1. 開啟原本 Google Sheet，從網址取得 Spreadsheet ID。
2. 到 https://script.google.com 建立「新專案」。
3. 將 `AdminCode.gs` 貼到 Code.gs。
4. 把 `ADMIN_SPREADSHEET_ID` 改成你的 Spreadsheet ID。
5. 新增 HTML 檔，命名為 `Index`，貼入 `Index.html`。
6. 在 Apps Script 專案設定確認時區為 Asia/Taipei。
7. 部署 → 新增部署 → 網頁應用程式。
8. 建議「執行身分」選**存取網頁應用程式的使用者**，並限制只有允許的 Google／Workspace 使用者可存取。
9. 管理者本身也必須有該 Google Sheet 的讀取權限。

若 Workspace 的部署選項不同，請優先採用能限制校內／指定登入者的設定，不要選「任何人」。
