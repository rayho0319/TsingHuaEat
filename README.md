# 清華吃 Tsing Hua Eat — 可執行網站原型

這是依照課程企劃開發的教學／展示版，**不是已部署的正式網站**。資料庫會在首次執行時自動建立，並載入八家**虛構示範餐廳**。請勿將示範資料當成真實店家資訊。

## 在 Windows 執行

1. 安裝 Python 3.10 以上版本。
2. 在此資料夾開啟終端機，執行：

```powershell
py -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

3. 在瀏覽器開啟 http://127.0.0.1:5000

macOS/Linux 使用 `python3 -m venv .venv`、`source .venv/bin/activate`。

## 已完成

- 手機友善的響應式介面
- 預算／餐點類型篩選、隨機抽選
- 使用者註冊／登入（密碼雜湊儲存）
- 1–5 星滑桿評分與文字評論（每個帳號每店一筆，可更新）
- 自訂收藏／排除群組，整合篩選
- SQLite 持久化資料
- 依本站抽選次數排序的簡易熱門榜（Extra 示範）

## 尚未完成／正式上線前必須處理

- AI 分析尚未串接；評分極端值剔除演算法尚未實作（目前使用一般平均分）
- 真實餐廳資料、店家資料維護機制與資料來源驗證
- Email 驗證、忘記密碼、濫用防護、管理員功能、隱私政策、備份
- 安全的 HTTPS 部署、強隨機 `SECRET_KEY`、正式資料庫與伺服器設定
- 公開多使用者環境可能更適合 PostgreSQL 等託管資料庫
- 完整 PWA（manifest、service worker、離線支援）尚未實作

## 專案結構

- `app.py`：Flask 路由、登入、篩選資料 API、SQLite 操作
- `templates/index.html`：網站畫面
- `static/style.css`：視覺與響應式設計
- `static/app.js`：篩選、抽選、評論、群組的前端互動
- `the.db`：執行後自動生成的本機資料庫（不需分享給其他人）

## 公開部署

這個程式可作為 Flask 部署的起點，但**目前不建議直接公開給真實使用者**。部署時請先補齊上方安全與資料維護事項。手機可以直接透過瀏覽器使用；加入主畫面並不等於已具備完整 PWA 功能。
