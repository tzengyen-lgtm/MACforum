# 2026/8/7 陸委會座談會｜協辦確認頁

一個放在 GitHub Pages 的單頁靜態網站，給東海協辦方了解會議現況並協助確認。
議程資料即時讀取自 Google 試算表，所以在試算表改完，任何人重新整理網頁就看到最新版。

## 架構

- **Google 試算表（正本）**：欄位 `時間 / 議程 / 主講 / 確認方`，要改議程就改這裡。
- **靜態網頁（唯讀顯示）**：`index.html` 讀試算表並排版顯示，包含基本資訊、議程、東海待確認事項。
- **下載 Word 議程**：由瀏覽器產生乾淨的 `.doc`，不含「確認方」欄。
- **東海確認**：建議用一份 Google 表單，東海填完送出即回到中山（連結填在 `site.js` 的 `CONFIG.confirmFormUrl`）。

## 要改什麼，改哪裡

- 議程內容 → 直接改 Google 試算表（不用動程式、不用重新發佈）。
- 會議基本資訊（日期、地點、聯絡人、晚宴等）→ 改 `site.js` 最上面的 `MEETING`。
- 試算表 / 確認表單連結 → 改 `site.js` 最上面的 `CONFIG`。

`CONFIG.csvUrl` 是 Google 試算表「檔案 → 共用 → 發佈到網路 → CSV」的連結。
若試算表暫時讀不到，網頁會自動改用 `site.js` 裡的 `DEFAULT_AGENDA` 墊著，不會空白。

## 檔案

- `index.html`：主頁（單頁）
- `site.js`：設定、讀取試算表、產生 Word
- `styles.css`：樣式
- `agenda.html`：舊網址，會自動轉到 `index.html`

## 發佈到 GitHub Pages

把資料夾推上 GitHub 後，在 repository 的 `Settings > Pages` 選擇從 `main` 分支根目錄發布。
可直接執行 `publish-to-github.ps1` 一鍵提交與推送。
