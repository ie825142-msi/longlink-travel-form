-- ============================================================
-- LONGLINK 差旅費用申請系統 - Supabase 資料表結構
-- 在 Supabase SQL Editor 中執行此指令碼
-- ============================================================

-- 1. 申請單主表
CREATE TABLE IF NOT EXISTS travel_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_no         VARCHAR(30) UNIQUE NOT NULL,       -- 表單編號 TR-yyyymmdd-xxx
  applicant       VARCHAR(50) NOT NULL,              -- 申請人姓名
  employee_id     VARCHAR(30),                       -- 員工編號
  department      VARCHAR(50),                       -- 部門
  title           VARCHAR(50),                       -- 職稱
  email           VARCHAR(100),                      -- 申請人 Email（寄確認信用）
  trip_type       VARCHAR(30) DEFAULT '國內差旅',     -- 出差類型
  travel_start    DATE NOT NULL,                     -- 出差起日
  travel_end      DATE NOT NULL,                     -- 出差迄日
  departure       VARCHAR(100),                      -- 起點
  destination     VARCHAR(100),                      -- 目的地
  purpose         TEXT,                              -- 出差事由
  currency        VARCHAR(10) DEFAULT 'NTD',         -- 幣別
  total_amount    NUMERIC(12,2) DEFAULT 0,           -- 費用合計
  advance_amount  NUMERIC(12,2) DEFAULT 0,           -- 預支金額
  subsidy_amount  NUMERIC(12,2) DEFAULT 0,           -- 補助金額
  net_payable     NUMERIC(12,2) DEFAULT 0,           -- 申請撥款淨額
  payment_method  VARCHAR(20) DEFAULT '銀行匯款',     -- 付款方式
  bank_account    VARCHAR(50),                       -- 帳號（後四碼隱藏）
  remark          TEXT,                              -- 備註
  status          VARCHAR(20) DEFAULT 'pending',     -- pending/approved/rejected/paid
  attachments     JSONB DEFAULT '[]'::jsonb,         -- 附件檔名列表
  approver_note   TEXT,                              -- 主管備註
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 費用項目明細表
CREATE TABLE IF NOT EXISTS travel_expense_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id      UUID REFERENCES travel_requests(id) ON DELETE CASCADE,
  item_no         INT NOT NULL,                      -- 項次 1-10
  item_name       VARCHAR(50) NOT NULL,              -- 費用項目名稱
  detail          TEXT,                              -- 明細說明
  amount          NUMERIC(12,2) DEFAULT 0,           -- 金額
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 審核記錄表（選用，供後續審核流程擴充）
CREATE TABLE IF NOT EXISTS travel_approvals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id      UUID REFERENCES travel_requests(id) ON DELETE CASCADE,
  approver        VARCHAR(50) NOT NULL,
  action          VARCHAR(20) NOT NULL,              -- approve/reject
  comment         TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 建立索引加速查詢
CREATE INDEX IF NOT EXISTS idx_requests_status   ON travel_requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_applicant ON travel_requests(applicant);
CREATE INDEX IF NOT EXISTS idx_requests_created  ON travel_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_items_request     ON travel_expense_items(request_id);

-- 5. 啟用 RLS（Row Level Security），並用 service_role 從後端存取，避免前端直連寫入
ALTER TABLE travel_requests      ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_expense_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_approvals     ENABLE ROW LEVEL SECURITY;

-- 給 service_role 全權限（Vercel 後端使用），anon role 不開放直接寫入
-- （Supabase 預設已給 service_role 完整權限，無需另外 policy）

-- ============================================================
-- 執行完後，可在 Supabase Table Editor 看到三張表即為成功
-- ============================================================
