# PDF Breeze

一個重視隱私的 PDF 線上工具。所有文件都在瀏覽器本機處理，不會上傳到伺服器。

## 線上使用

[開啟 PDF Breeze](https://ctsai0124.github.io/pdf-breeze/)

## 功能

- 合併多份 PDF
- 擷取指定頁面
- 旋轉所有頁面
- 縮小 PDF（將頁面影像化以降低檔案大小）
- 重新排序或刪除頁面
- 加入頁碼
- PDF 轉 JPG
- JPG／PNG 圖片轉 PDF

## 本機開發

```bash
npm install
npm run dev
```

開啟 `http://localhost:3000`。

## 發布

推送到 `master` 後，GitHub Actions 會建立靜態網站並自動發布至 GitHub Pages。

不需要伺服器、資料庫、物件儲存或環境變數。
