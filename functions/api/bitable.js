export async function onRequestPost(context) {
  const APP_ID = 'cli_a933f958d921dcc4';
  const APP_SECRET = 'iElNIFJ8zLDJjJzCTkOEwfBPHLZBx8Yh';
  const APP_TOKEN = 'MR1ab1PizaBgWVskQl3csrmOnGh';
  const TABLE_ID = 'tblW46zN3Qf0UmiI';

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  try {
    const fields = await context.request.json();

    // 1. 获取 tenant_access_token
    const tokenRes = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET }),
    });
    const tokenData = await tokenRes.json();
    if (tokenData.code !== 0) {
      return new Response(JSON.stringify({ error: 'Failed to get token', detail: tokenData }), { status: 500, headers: corsHeaders });
    }
    const token = tokenData.tenant_access_token;

    // 2. 写入多维表格
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
      return new Response(JSON.stringify({ error: 'Failed to create record', detail: recordData }), { status: 500, headers: corsHeaders });
    }

    // 3. 飞书群通知（best-effort）
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
    context.waitUntil(
      fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {})
    );

    return new Response(JSON.stringify({ success: true, record_id: recordData.data.record.record_id }), { headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Server error', detail: err.message }), { status: 500, headers: corsHeaders });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
