# PDF Breeze

一個重視隱私的 PDF 線上工具。所有文件都在瀏覽器本機處理，不會上傳到伺服器。

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

## 透過 GitHub 部署到 Zeabur

1. 在 GitHub 建立新的 repository，將此專案 push 上去。
2. 登入 Zeabur，建立 Project，選擇 **Deploy New Service → GitHub**。
3. 選取剛建立的 repository；Zeabur 會讀取 `zbpack.json` 自動建置與啟動。
4. 部署完成後，在服務的 **Networking** 頁面產生網域。

不需要資料庫、物件儲存或任何環境變數。
