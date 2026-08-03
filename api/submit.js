// ============================================================
// POST /api/submit  —— 員工送出差旅費用申請單
// 流程：接收表單 → 寫入 Supabase → 寄出通知 Email → 回應結果
// ============================================================
const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const resend = process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 'skip'
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// CORS 表頭（允許外部呼叫；若只在同網域使用可移除）
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

module.exports = async (req, res) => {
  // 處理瀏覽器 preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).set(CORS).end();
  }
  if (req.method !== 'POST') {
    res.set(CORS);
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const data = req.body || {};

    // ---------- 1. 基本欄位驗證 ----------
    if (!data.applicant || !data.travel_date_start || !data.travel_date_end) {
      res.set(CORS);
      return res.status(400).json({ success: false, message: '必填欄位（申請人/出差日期）未填寫' });
    }
    if (!Array.isArray(data.items) || data.items.length === 0) {
      res.set(CORS);
      return res.status(400).json({ success: false, message: '請至少填寫一筆費用' });
    }

    // 若前端未帶 form_no，自動生成
    const formNo = data.form_no || generateFormNo();

    // ---------- 2. 資料清洗與防呆 ----------
    // Email 格式再驗一次（避免前端送來奇怪字串）
    const emailRe = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    const safeEmail = data.email && emailRe.test(data.email) ? data.email : null;

    // 日期格式必須是 YYYY-MM-DD，否則轉 null 讓 DB 用預設/報錯
    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    const travelStart = dateRe.test(data.travel_date_start || '') ? data.travel_date_start : null;
    const travelEnd   = dateRe.test(data.travel_date_end   || '') ? data.travel_date_end   : null;
    if (!travelStart || !travelEnd) {
      res.set(CORS);
      return res.status(400).json({ success: false, message: '出差日期格式錯誤，請使用 YYYY-MM-DD' });
    }

    // 付款方式白名單
    const PAY_METHODS = ['銀行匯款', '支票', '現金'];
    const payMethod = PAY_METHODS.includes(data.payment_method) ? data.payment_method : '銀行匯款';

    // 幣別白名單
    const CURRENCIES = ['NTD', 'USD', 'CNY', 'JPY', 'EUR', 'HKD'];
    const currency = CURRENCIES.includes(data.currency) ? data.currency : 'NTD';

    // 出差類型白名單
    const TRIP_TYPES = ['國內差旅', '國外出差', '通勤交通', '教育訓練'];
    const tripType = TRIP_TYPES.includes(data.trip_type) ? data.trip_type : '國內差旅';

    // 金額防呆：轉成數字並取小數點後兩位
    const num = v => {
      const n = Number(v);
      return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
    };

    // ---------- 3. 寫入主表 ----------
    const { data: inserted, error } = await supabase
      .from('travel_requests')
      .insert({
        form_no: formNo,
        applicant:      String(data.applicant || '').slice(0, 50),
        employee_id:    data.employee_id ? String(data.employee_id).slice(0, 30) : null,
        department:     data.department  ? String(data.department).slice(0, 50)  : null,
        title:          data.title       ? String(data.title).slice(0, 50)       : null,
        email:          safeEmail,
        trip_type:      tripType,
        travel_start:   travelStart,
        travel_end:     travelEnd,
        departure:      data.departure   ? String(data.departure).slice(0, 100) : null,
        destination:    data.destination ? String(data.destination).slice(0, 100) : null,
        purpose:        data.purpose     ? String(data.purpose) : null,
        currency:       currency,
        total_amount:   num(data.total),
        advance_amount: num(data.advance),
        subsidy_amount: num(data.subsidy),
        net_payable:    num(data.net_payable),
        payment_method: payMethod,
        bank_account:   data.bank_account ? String(data.bank_account).slice(0, 50) : null,
        remark:         data.remark       ? String(data.remark) : null,
        attachments:    Array.isArray(data.attachments) ? data.attachments.map(String) : [],
      })
      .select('id')
      .single();

    if (error) throw error;

    // ---------- 4. 寫入費用項目 ----------
    const itemRows = (data.items || []).map((it, i) => ({
      request_id: inserted.id,
      item_no:    Number(it.no) || (i + 1),
      item_name:  String(it.name || '其他').slice(0, 50),
      detail:     it.detail ? String(it.detail) : '',
      amount:     num(it.amount),
    }));
    if (itemRows.length === 0) {
      res.set(CORS);
      return res.status(400).json({ success: false, message: '請至少填寫一筆費用' });
    }
    const { error: itemErr } = await supabase
      .from('travel_expense_items')
      .insert(itemRows);
    if (itemErr) throw itemErr;
    await sendNotifications(data, formNo).catch((e) => {
      console.warn('Email send failed (non-blocking):', e.message);
    });

    // ---------- 5. 回應 ----------
    res.set(CORS);
    return res.status(200).json({
      success: true,
      id: inserted.id,
      form_no: formNo,
      message: '申請單已送出，系統已寄發確認信',
    });
  } catch (err) {
    console.error('[submit] error:', err);
    res.set(CORS);
    return res.status(500).json({ success: false, message: err.message || '伺服器錯誤' });
  }
};

// -------------------- 工具函式 --------------------
function generateFormNo() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const seq = String(Math.floor(Math.random() * 900) + 100);
  return `TR-${ymd}-${seq}`;
}

async function sendNotifications(data, formNo) {
  if (!resend) return;

  const approvalEmail = process.env.APPROVAL_EMAIL;
  const amountText = `${data.currency || 'NTD'} ${Number(data.net_payable || 0).toLocaleString()}`;

  // 給申請人的確認信
  if (data.email) {
    await resend.emails.send({
      from: 'LONGLINK 差旅申請 <no-reply@longlink.com>',
      to: data.email,
      subject: `[LONGLINK] 差旅費用申請已送出 ${formNo}`,
      html: `
        <h2>差旅費用申請確認</h2>
        <p>${data.applicant} 您好，您的差旅費用申請單已成功送出，將進入主管審核流程。</p>
        <ul>
          <li>表單編號：<b>${formNo}</b></li>
          <li>出差期間：${data.travel_date_start} ~ ${data.travel_date_end}</li>
          <li>申請撥款：<b>${amountText}</b></li>
          <li>付款方式：${data.payment_method || '銀行匯款'}</li>
        </ul>
        <p>如有補件需求，財務單位將另行通知。<br/>LONGLINK 行政系統</p>
      `,
    });
  }

  // 給主管/財務的通知信
  if (approvalEmail) {
    await resend.emails.send({
      from: 'LONGLINK 差旅申請 <no-reply@longlink.com>',
      to: approvalEmail,
      subject: `[待審核] ${data.applicant} 送出差旅費用申請 ${formNo}`,
      html: `
        <h2>新差旅費用申請待審核</h2>
        <ul>
          <li>申請人：<b>${data.applicant}</b>（${data.department || ''} / ${data.title || ''}）</li>
          <li>表單編號：<b>${formNo}</b></li>
          <li>出差期間：${data.travel_date_start} ~ ${data.travel_date_end}</li>
          <li>起迄：${data.departure || ''} → ${data.destination || ''}</li>
          <li>事由：${data.purpose || ''}</li>
          <li>申請撥款：<b>${amountText}</b></li>
        </ul>
        <p>請登入後台審核系統進行核准/駁回。</p>
      `,
    });
  }
}

      `,
    });
  }
}
