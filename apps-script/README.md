# v3 匿名抽籤統計：Google Apps Script

此資料流不使用 Firebase。

網站只送出：

- timestamp
- hexagramNumber
- hexagramName
- anonymousBrowserId

不送出姓名、學號、email、問題內容。

## 建立方式

1. 建立一份新的 Google Sheet。
2. 在試算表中開啟「擴充功能 → Apps Script」。
3. 將 `Code.gs` 的內容貼入 Apps Script。
4. 先執行一次 `setupDrawsSheet()`，建立 `draws` 工作表與欄位。
5. Apps Script 選「部署 → 新增部署」。
6. 類型選「網頁應用程式」。
7. 執行身分選「我」。
8. 存取權限需允許網站訪客送出 POST；實際選項依 Workspace 管理政策而定。
9. 取得部署後的 Web App URL。
10. 將該 URL 填入網站 `js/stats.js` 的 `ENDPOINT`。

## 隱私說明

`anonymousBrowserId` 是網站首次使用時隨機產生、存於瀏覽器 localStorage 的 UUID。

它只能用於估算同一瀏覽器是否重複使用網站，不能可靠識別真實個人。換裝置、換瀏覽器、無痕模式或清除網站資料都可能產生新的 ID。
