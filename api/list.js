// ============================================================
// GET /api/list  —— 查詢差旅申請單清單（供主管/財務審核頁使用）
// 參數：
//   status   = pending | approved | rejected | paid  (預設全部)
//   limit    = 預設 20
//   offset   = 預設 0
//   keyword  = 姓名/表單編號關鍵字
// ============================================================
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).set(CORS).end();
  if (req.method !== 'GET') {
    res.set(CORS);
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const { status, limit = 20, offset = 0, keyword } = req.query || {};
    let query = supabase
      .from('travel_requests')
      .select('id, form_no, applicant, department, trip_type, travel_start, travel_end, destination, currency, net_payable, status, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (status && ['pending', 'approved', 'rejected', 'paid'].includes(status)) {
      query = query.eq('status', status);
    }
    if (keyword) {
      query = query.or(`form_no.ilike.%${keyword}%,applicant.ilike.%${keyword}%`);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    res.set(CORS);
    return res.status(200).json({ success: true, total: count, data });
  } catch (err) {
    console.error('[list] error:', err);
    res.set(CORS);
    return res.status(500).json({ success: false, message: err.message });
  }
};
