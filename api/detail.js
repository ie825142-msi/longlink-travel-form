// ============================================================
// GET /api/detail?id=xxx   —— 查詢單筆申請單 + 費用項目明細
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
    const { id, form_no } = req.query || {};
    if (!id && !form_no) {
      res.set(CORS);
      return res.status(400).json({ success: false, message: '需提供 id 或 form_no' });
    }

    let q = supabase.from('travel_requests').select('*');
    q = id ? q.eq('id', id).single() : q.eq('form_no', form_no).single();
    const { data: request, error } = await q;
    if (error) throw error;

    const { data: items } = await supabase
      .from('travel_expense_items')
      .select('*')
      .eq('request_id', request.id)
      .order('item_no', { ascending: true });

    res.set(CORS);
    return res.status(200).json({ success: true, data: { ...request, items: items || [] } });
  } catch (err) {
    console.error('[detail] error:', err);
    res.set(CORS);
    return res.status(500).json({ success: false, message: err.message });
  }
};
