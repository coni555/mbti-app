export default async function handler(req, res) {
  // 设置 CORS 头，允许 GitHub Pages 跨域调用
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const APP_ID = 'cli_a933f958d921dcc4';
  const APP_SECRET = 'iElNIFJ8zLDJjJzCTkOEwfBPHLZBx8Yh';
  const APP_TOKEN = 'MR1ab1PizaBgWVskQl3csrmOnGh';
  const TABLE_ID = 'tblW46zN3Qf0UmiI';

  try {
    // 1. 获取 tenant_access_token
    const tokenRes = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET }),
    });
    const tokenData = await tokenRes.json();
    if (tokenData.code !== 0) {
      return res.status(500).json({ error: 'Failed to get token', detail: tokenData });
    }
    const token = tokenData.tenant_access_token;

    // 2. 写入多维表格
    const fields = req.body;
    const recordRes = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${APP_TOKEN}/tables/${TABLE_ID}/records`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fields }),
      }
    );
    const recordData = await recordRes.json();

    if (recordData.code !== 0) {
      return res.status(500).json({ error: 'Failed to create record', detail: recordData });
    }

    // 3. 同时发飞书群通知（保留原有 webhook）
    const WEBHOOK_URL = 'https://open.feishu.cn/open-apis/bot/v2/hook/104820c9-2175-4482-b4e4-ea4620d7685e';
    const lines = Object.entries(fields)
      .filter(([k]) => k !== '来源')
      .map(([k, v]) => `**${k}：** ${v}`);
    const payload = {
      msg_type: 'interactive',
      card: {
        header: {
          title: { tag: 'plain_text', content: fields['微信号'] ? '📱 新咨询预约' : '🔍 新测评完成' },
          template: fields['微信号'] ? 'green' : 'gold',
        },
        elements: [{ tag: 'div', text: { tag: 'lark_md', content: lines.join('\n') } }],
      },
    };
    // 群通知是 best-effort，不影响主流程
    fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {});

    res.status(200).json({ success: true, record_id: recordData.data.record.record_id });
  } catch (err) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
}
