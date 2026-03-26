export async function onRequestPost(context) {
  const APP_ID = 'cli_a94faf48a0f99bc9';
  const APP_SECRET = 'xG0gGodEldcqrPUOII8WWcZOppVjLspq';
  const APP_TOKEN = 'MjSQwHVPwiyWPxkU4oocQWeZnRe';
  const TABLE_ID = 'tbl1pugZQqoieCKr';

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  try {
    const body = await context.request.json();

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

    // 判断操作类型：mark_queried（标记已查询）或 默认（写入新记录）
    if (body.action === 'mark_queried' && body.code) {
      // 按情报码搜索记录
      const searchRes = await fetch(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${APP_TOKEN}/tables/${TABLE_ID}/records/search`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filter: {
              conjunction: 'and',
              conditions: [{ field_name: '情报码', operator: 'is', value: [body.code] }],
            },
            page_size: 1,
          }),
        }
      );
      const searchData = await searchRes.json();

      if (searchData.code !== 0 || !searchData.data?.items?.length) {
        return new Response(JSON.stringify({ success: false, msg: '未找到该情报码记录' }), { headers: corsHeaders });
      }

      const recordId = searchData.data.items[0].record_id;

      // 更新查询状态为"已查询"
      const updateRes = await fetch(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${APP_TOKEN}/tables/${TABLE_ID}/records/${recordId}`,
        {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: { '查询状态': '已查询' } }),
        }
      );
      const updateData = await updateRes.json();

      if (updateData.code !== 0) {
        return new Response(JSON.stringify({ error: 'Failed to update record', detail: updateData }), { status: 500, headers: corsHeaders });
      }

      return new Response(JSON.stringify({ success: true, record_id: recordId }), { headers: corsHeaders });
    }

    // 默认操作：写入新记录
    const fields = body;
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

    // 飞书群通知（best-effort）
    const WEBHOOK_URL = 'https://open.feishu.cn/open-apis/bot/v2/hook/104820c9-2175-4482-b4e4-ea4620d7685e';
    const lines = Object.entries(fields)
      .filter(([k]) => k !== '来源')
      .map(([k, v]) => `**${k}：** ${v}`);
    const payload = {
      msg_type: 'interactive',
      card: {
        header: {
          title: { tag: 'plain_text', content: '🔍 新测评完成' },
          template: 'gold',
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
