export async function onRequestPost(context) {
  const APP_ID = 'cli_a94faf48a0f99bc9';
  const APP_SECRET = 'xG0gGodEldcqrPUOII8WWcZOppVjLspq';
  const APP_TOKEN = 'MjSQwHVPwiyWPxkU4oocQWeZnRe';
  const TABLE_ID = 'tbl1pugZQqoieCKr';
  const STATS_APP_TOKEN = 'NzRqbDeruanLWjsLNzhcyfU0nJf';
  const STATS_TABLE_ID = 'tblkNnC12bDALi0F';

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

    // 操作类型：query_by_phone（手机号查询）/ mark_queried（标记已查询）/ 默认（写入新记录）

    // 按手机号查询记录，返回情报码和昵称
    if (body.action === 'query_by_phone' && body.phone) {
      const searchRes = await fetch(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${APP_TOKEN}/tables/${TABLE_ID}/records/search`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filter: {
              conjunction: 'and',
              conditions: [{ field_name: '测试页手机号', operator: 'is', value: [body.phone] }],
            },
            page_size: 1,
          }),
        }
      );
      const searchData = await searchRes.json();

      if (searchData.code !== 0 || !searchData.data?.items?.length) {
        return new Response(JSON.stringify({ success: false, msg: '未找到该手机号记录' }), { headers: corsHeaders });
      }

      const fields = searchData.data.items[0].fields;
      return new Response(JSON.stringify({
        success: true,
        code: fields['情报码'] || '',
        name: fields['昵称'] || '',
      }), { headers: corsHeaders });
    }

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
          body: JSON.stringify({ fields: { '查询状态': '已查询', ...(body.phone ? { '查询页手机号': body.phone } : {}) } }),
        }
      );
      const updateData = await updateRes.json();

      if (updateData.code !== 0) {
        return new Response(JSON.stringify({ error: 'Failed to update record', detail: updateData }), { status: 500, headers: corsHeaders });
      }

      return new Response(JSON.stringify({ success: true, record_id: recordId }), { headers: corsHeaders });
    }

    if (body.action === 'log_event') {
      const { event, channel, ref } = body;
      const statsFields = {
        '事件': event,
        '渠道': channel || '',
        '来源员工': ref || '',
        '时间戳': new Date().toISOString(),
      };
      const statsRes = await fetch(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${STATS_APP_TOKEN}/tables/${STATS_TABLE_ID}/records`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: statsFields }),
        }
      );
      const statsData = await statsRes.json();

      if (statsData.code !== 0) {
        return new Response(JSON.stringify({ error: 'Failed to log event', detail: statsData }), { status: 500, headers: corsHeaders });
      }

      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
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
    const WEBHOOK_URL = 'https://open.feishu.cn/open-apis/bot/v2/hook/e9fe8f0e-a81d-4e33-ae37-f9f955e5fccc';
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
