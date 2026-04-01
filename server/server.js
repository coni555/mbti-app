const http = require('http');
const https = require('https');

const APP_ID = 'cli_a94faf48a0f99bc9';
const APP_SECRET = 'xG0gGodEldcqrPUOII8WWcZOppVjLspq';
const APP_TOKEN = 'MjSQwHVPwiyWPxkU4oocQWeZnRe';
const TABLE_ID = 'tbl1pugZQqoieCKr';
const STATS_APP_TOKEN = 'NzRqbDeruanLWjsLNzhcyfU0nJf';
const STATS_TABLE_ID = 'tblkNnC12bDALi0F';
const WEBHOOK_URL = 'https://open.feishu.cn/open-apis/bot/v2/hook/e9fe8f0e-a81d-4e33-ae37-f9f955e5fccc';

function fetchJSON(url, options) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.request({
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve({ raw: data }); }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function getToken() {
  const data = await fetchJSON('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET }),
  });
  if (data.code !== 0) throw new Error('Failed to get token: ' + JSON.stringify(data));
  return data.tenant_access_token;
}

async function handleRequest(body) {
  const token = await getToken();

  // 按手机号查询
  if (body.action === 'query_by_phone' && body.phone) {
    const searchData = await fetchJSON(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${APP_TOKEN}/tables/${TABLE_ID}/records/search`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filter: { conjunction: 'and', conditions: [{ field_name: '测试页手机号', operator: 'is', value: [body.phone] }] },
          page_size: 1,
        }),
      }
    );
    if (searchData.code !== 0 || !searchData.data?.items?.length) {
      return { success: false, msg: '未找到该手机号记录' };
    }
    const fields = searchData.data.items[0].fields;
    return { success: true, code: fields['情报码'] || '', name: fields['昵称'] || '' };
  }

  // 标记已查询
  if (body.action === 'mark_queried' && body.code) {
    const searchData = await fetchJSON(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${APP_TOKEN}/tables/${TABLE_ID}/records/search`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filter: { conjunction: 'and', conditions: [{ field_name: '情报码', operator: 'is', value: [body.code] }] },
          page_size: 1,
        }),
      }
    );
    if (searchData.code !== 0 || !searchData.data?.items?.length) {
      return { success: false, msg: '未找到该情报码记录' };
    }
    const recordId = searchData.data.items[0].record_id;
    const updateFields = { '查询状态': '已查询' };
    if (body.phone) updateFields['查询页手机号'] = body.phone;
    const updateData = await fetchJSON(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${APP_TOKEN}/tables/${TABLE_ID}/records/${recordId}`,
      {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: updateFields }),
      }
    );
    if (updateData.code !== 0) {
      return { error: 'Failed to update record', detail: updateData };
    }
    return { success: true, record_id: recordId };
  }

  if (body.action === 'log_event') {
    const { event, channel, ref } = body;
    const statsFields = {
      '事件': event,
      '渠道': channel || '',
      '来源员工': ref || '',
      '时间戳': new Date().toISOString(),
    };
    const statsResp = await fetchJSON(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${STATS_APP_TOKEN}/tables/${STATS_TABLE_ID}/records`,
      {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: statsFields }),
      }
    );
    if (statsResp.code !== 0) {
      return { error: 'Failed to log event', detail: statsResp };
    }
    return { ok: true };
  }

  // 默认：写入新记录
  const fields = body;
  const recordData = await fetchJSON(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${APP_TOKEN}/tables/${TABLE_ID}/records`,
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
    }
  );
  if (recordData.code !== 0) {
    return { error: 'Failed to create record', detail: recordData };
  }

  // 飞书群通知（best-effort）
  const lines = Object.entries(fields).filter(([k]) => k !== '来源').map(([k, v]) => `**${k}：** ${v}`);
  fetchJSON(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      msg_type: 'interactive',
      card: {
        header: { title: { tag: 'plain_text', content: '🔍 新测评完成' }, template: 'gold' },
        elements: [{ tag: 'div', text: { tag: 'lark_md', content: lines.join('\n') } }],
      },
    }),
  }).catch(() => {});

  return { success: true, record_id: recordData.data.record.record_id };
}

const server = http.createServer((req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/api/bitable') {
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', async () => {
      try {
        const body = JSON.parse(data);
        const result = await handleRequest(body);
        res.writeHead(result.error ? 500 : 200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Server error', detail: err.message }));
      }
    });
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(3000, '127.0.0.1', () => {
  console.log('API server running on http://127.0.0.1:3000');
});
