# LONGLINK 差旅費用線上申請系統 - 後端 API 部署版

## 🎯 技術架構（全部免費）
| 模組 | 服務 | 免費額度 | 用途 |
|---|---|---|---|
| 前端 + API | **Vercel** | 無限（Hobby 方案） | 靜態網站 + Serverless Functions |
| 資料庫 | **Supabase** | 500MB / 5萬筆/月 | 儲存申請單 |
| 通知 Email | **Resend** | 3000封/月 | 自動寄通知給員工/主管/財務 |
| 版本控管 | **GitHub** | 無限（公開/私有） | 程式碼託管與 Vercel 串接 |

---

## 📦 專案結構
```
longlink-travel-form/
├── api/                        # Vercel Serverless Functions（後端 API）
│   ├── submit.js               # POST 提交申請單
│   ├── list.js                 # GET 查詢申請單清單
│   └── detail.js               # GET 查詢單筆明細
├── public/                     # 前端靜態檔
│   └── index.html              # 差旅申請表單頁（已串接 API）
├── supabase/
│   └── schema.sql              # 資料表 SQL 腳本
├── package.json
├── vercel.json                 # Vercel 部署設定
└── README.md                   # 本說明文件
```

---

## 🚀 快速部署步驟（全程免費、約 30 分鐘）

### Step 1：建立 GitHub 帳號（若已有請跳過）
1. 前往 https://github.com/signup 免費註冊
2. 下載並安裝 Git（Windows/Mac）：https://git-scm.com/downloads
3. 安裝完後打開終端機輸入：
   ```bash
   git config --global user.name "您的GitHub名稱"
   git config --global user.email "您的Email"
   ```

### Step 2：建立 Supabase 資料庫（約 5 分鐘）
1. 前往 https://supabase.com/ 點「Start your project」，用 GitHub 登入
2. 點「New project」，輸入：
   - **Name**：`longlink-travel`
   - **Database Password**：自行設定並記下來
   - **Region**：選「Northeast Asia (Tokyo)」或「Singapore」（離香港最近）
3. 等待約 2 分鐘建立完成
4. 進入專案後，左側選單點「SQL Editor」→「New query」
5. 打開本專案 `supabase/schema.sql`，複製全部內容貼上，點「Run」執行
6. 左側選單點「Project Settings」（齒輪圖示）→「API」
7. 記下以下三個值（後面步驟會用到）：
   - **Project URL**（格式：`https://xxxx.supabase.co`）
   - **anon public** key（公開金鑰，可用於前端）
   - **service_role** key（後端私密金鑰，⚠️切勿外流）

### Step 3：建立 Resend 寄信服務（約 3 分鐘，選擇性）
> 若不需要自動寄 Email 通知，可跳過此步驟
1. 前往 https://resend.com/ 用 Email 免費註冊
2. 進入 Dashboard →「API Keys」→「Create API Key」
3. 名稱輸入 `longlink`，權限選「Full Access」，建立後複製金鑰
4. 首次使用需驗證發信網域，若無公司網域可先用測試模式（只能寄到自己註冊的 Email）

### Step 4：部署到 Vercel（約 5 分鐘，最關鍵步驟）
#### 4.1 下載本專案到本機
將 `longlink-travel-form` 資料夾放到電腦任意位置（例如桌面）。

#### 4.2 建立 Git Repository 並推送到 GitHub
打開終端機（Terminal / CMD），進入專案資料夾：
```bash
cd ~/Desktop/longlink-travel-form
git init
git add .
git commit -m "Initial: LONGLINK travel expense form with backend API"
```

到 GitHub 網站 →「New repository」→ 名稱取 `longlink-travel-form` → Public → Create
複製畫面上顯示的兩行指令（類似）：
```bash
git remote add origin https://github.com/您的帳號/longlink-travel-form.git
git branch -M main
git push -u origin main
```

#### 4.3 在 Vercel 匯入專案
1. 前往 https://vercel.com/ 點「Sign Up」→ 用 **GitHub** 登入（首次需授權）
2. 進入 Dashboard 後，點「Add New...」→「Project」
3. 在「Import Git Repository」找到剛才 push 的 `longlink-travel-form`，點「Import」
4. 在「Configure Project」頁面，找到「Environment Variables」（環境變數），加入以下 4 個：
   | Key | Value |
   |---|---|
   | `SUPABASE_URL` | Step 2 複製的 Project URL |
   | `SUPABASE_SERVICE_KEY` | Step 2 複製的 service_role key |
   | `RESEND_API_KEY` | Step 3 的 Resend API Key（若跳過填 `skip`） |
   | `APPROVAL_EMAIL` | 主管/財務接收通知的 Email，例如 `finance@longlink.com` |
5. 點「Deploy」，等待約 1-2 分鐘
6. 看到 🎉 恭喜畫面，點「Go to Dashboard」→ 畫面會顯示您的網址，例如 `https://longlink-travel-form.vercel.app`
7. **點擊該網址**，就能看到 LONGLINK 差旅申請表上線了！

### Step 5：驗證 API 是否正常
1. 打開網址，填寫測試資料，點「送出申請」
2. 若看到綠色「送出成功」訊息代表前端正常
3. 回到 Supabase → 左側「Table Editor」→ 選 `travel_requests` 資料表
4. 應該會看到剛才送出的申請單資料 🎊
5. 回到 Vercel Dashboard → 專案 →「Functions」可看到 API 呼叫記錄

### Step 6（選用）：綁定公司網域
1. Vercel 專案 →「Settings」→「Domains」
2. 輸入您想要的網址，例如 `expense.longlink.com`
3. 按照畫面指示，到您的 DNS 服務商（Cloudflare/GoDaddy/阿里雲等）加上一筆 CNAME 記錄
4. 驗證完成後即可用自己的網址存取

---

## 🔌 API 端點說明

### `POST /api/submit`
提交差旅申請單（員工填表時呼叫）

**Request Body（JSON）：**
```json
{
  "form_no": "TR-20260803-001",
  "applicant": "Ian Sun",
  "employee_id": "LL001",
  "department": "工程部",
  "title": "Engineer",
  "email": "ian@longlink.com",
  "trip_type": "國內差旅",
  "travel_date_start": "2026-08-03",
  "travel_date_end": "2026-08-03",
  "departure": "林口",
  "destination": "松翰",
  "purpose": "客戶拜訪",
  "currency": "NTD",
  "items": [
    {"no":1,"name":"油資","detail":"10公里 × 8元","amount":80},
    {"no":4,"name":"計程車資","detail":"機場到客戶","amount":350}
  ],
  "total": 430,
  "advance": 0,
  "subsidy": 0,
  "net_payable": 430,
  "payment_method": "銀行匯款",
  "bank_account": "000-00-000000",
  "attachment_count": 2
}
```

**Response：**
```json
{"success":true,"id":"xxx-xxx-xxx","form_no":"TR-20260803-001"}
```

### `GET /api/list?status=pending&limit=20`
查詢申請單清單（給主管/財務審核頁用）

### `GET /api/detail?id=xxx-xxx-xxx`
查詢單筆申請單完整明細

---

## 📧 Email 通知說明
申請送出成功後，系統自動寄兩封信：
1. **申請人**：確認信，含表單編號與摘要
2. **主管/財務**（`APPROVAL_EMAIL`）：通知有新申請待審核

> 正式使用前請至 Resend 加入您的公司 Email 網域，才能寄送到外部信箱。

---

## 🔒 常見問題

**Q：免費額度夠公司多少人用？**
A：Vercel Hobby 每月 10 萬次 API 呼叫、Supabase 免費版 50萬次資料庫請求，對一般中小企業（50-100人）綽綽有餘。

**Q：員工資料會安全嗎？**
A：Supabase 資料庫走 TLS 加密，Service Role Key 只存在 Vercel 環境變數，前端無法存取，符合基本個資規範。

**Q：以後要改內容怎麼辦？**
A：只要修改電腦本機的程式碼，重新 `git push` 後 Vercel 會自動重新部署，無需手動上傳。

**Q：員工怎麼用手機填？**
A：網站本身是 RWD 響應式設計，手機打開 Vercel 網址就能直接填寫送出。

**Q：後續想加審核流程？**
A：可在 Supabase 新增 `approvals` 表，後端 API 加上「主管核准 / 財務核准 / 駁回」三個 endpoint，前端再做一個審核後台頁即可。
