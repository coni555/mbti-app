# MBTI App Handoff

## 项目概况
留学咨询公司（新通教育）的 MBTI 测评 H5 应用，学员自助测评 + 数据沉淀到飞书 + 企业微信引流。

## 文件结构
- `/Users/coni/Projects/mbti-app/index.html` — 单文件 HTML 应用（CSS+HTML+JS，~2800行）
- `/Users/coni/Projects/mbti-app/avatars/` — 16种 MBTI 类型的低多边形风格头像（INFJ.png ~ ESTP.png）
- `/Users/coni/Projects/mbti-app/functions/api/bitable.js` — Cloudflare Pages Function，写飞书多维表格 + 发群通知 + 查询状态更新
- `/Users/coni/Projects/mbti-app/api/bitable.js` — 旧 Vercel 云函数（已弃用，保留备份）
- `/Users/coni/Projects/mbti-app/qrcode.png` — 企业微信二维码（底部引流用）
- `/Users/coni/Projects/mbti-app/employee-qrcodes/` — 5个员工专属二维码（sisi/yingbi/ailun/ice/muchen）

## 部署架构
```
【用户端】学员访问 → 填信息 → 做32题测评 → 看到报告前3板块 → lock overlay 展示情报码/QR → 复制码 → 扫码加企微
【查询端】域名/?mode=query → 输入情报码(+可选姓名) → 查看完整报告 → 导出长图
         查询时自动更新飞书表格"查询状态"为"已查询"

数据沉淀（Cloudflare Pages 部署时可用）：
  前端 fetch → Cloudflare Pages Function (/api/bitable) → 飞书多维表格 + 群通知
```
- **自定义域名**: conilab.cn（指向 Cloudflare Pages）
- **前端 + 云函数**: Cloudflare Pages（同源部署，无跨域问题）
- **旧 Vercel 方案已弃用**: 中国大陆无法访问 Vercel

## 关键配置

### 飞书（公司账号 — 新通教育/XT）
- 飞书 App ID: cli_a94faf48a0f99bc9
- 飞书 App Secret: xG0gGodEldcqrPUOII8WWcZOppVjLspq
- 飞书多维表格 app_token: MjSQwHVPwiyWPxkU4oocQWeZnRe
- 飞书多维表格 table_id: tbl1pugZQqoieCKr
- 飞书 Webhook: https://open.feishu.cn/open-apis/bot/v2/hook/104820c9-2175-4482-b4e4-ea4620d7685e

### 飞书（个人账号 — 已弃用）
- 飞书 App ID: cli_a933f958d921dcc4
- 飞书多维表格 app_token: MR1ab1PizaBgWVskQl3csrmOnGh
- 飞书多维表格 table_id: tblW46zN3Qf0UmiI

### 其他
- GitHub 仓库: https://github.com/coni555/mbti-app
- 线上地址: https://mbti-liuxue.pages.dev

## 飞书多维表格字段
| 字段名 | 说明 |
|--------|------|
| 昵称 | 用户填写的姓名（主键字段） |
| 年级 | 高一/高二/高三/大一/大二/大三/大四/已毕业/在职/自由职业 |
| 性别 | 男/女 |
| 测试页手机号 | 测评时用户填写的手机号（原"手机号"字段已重命名） |
| 查询页手机号 | 查询页查看报告时填写的手机号（新增字段） |
| 目标国家 | 12个选项之一 |
| MBTI结果 | 如"INTJ · 建筑师" |
| 性格标签 | 如"冷静精准的战略建筑师" |
| 提交时间 | 前端生成的时间戳 |
| 来源 | 测评完成/扫码进入/咨询预约 |
| 来源员工 | ref参数对应的员工名 |
| 转化阶段 | 完成测评/仅扫码进入/提交咨询 |
| 落地页URL | 用户访问的页面URL |
| 情报码 | 如 INTJ-BCBUUE |
| 查询状态 | 员工查询后自动标记"已查询" |

## 情报码系统（V5，2026-03-26）

### 措辞体系
- 兑换码 → **情报码**
- 顾问 → **情报员**
- 统一"MBTI留学情报局"主题

### 用户流程（报告预览诱惑）
```
测评完成 → Step 4 报告页：
  ├─ 可见区域：维度分析 + 性格解密 + 留学路径 + 推荐专业（诱惑用户）
  └─ Lock overlay：
      ├─ 🔒 完整报告已生成 + 7个待解锁板块标签
      ├─ 情报码展示 + 复制按钮
      ├─ 三步引导（复制码→扫码→发送）
      └─ 企微二维码
  ⚠️ 无自助解锁按钮，用户只能通过查询页(?mode=query)输入情报码查看完整报告
```

### 码格式
`INTJ-BCBPKX`（4位MBTI + 分隔符 + 6位编码，共11位）

| 位置 | 含义 |
|------|------|
| 1-4 | MBTI类型（明文） |
| 5 | 分隔符 `-` |
| 6 | 目标国家索引（A=美国, B=英国, C=澳大利亚...共12个） |
| 7 | 年级索引（A=大一, B=大二, C=大三, D=大四, E=高一, F=高二, G=高三, H=已毕业, J=在职, K=自由职业） |
| 8 | 性别索引（A=男, B=女） |
| 9-11 | 随机字符（防重复） |

**字符集**: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`（30字符，去掉 I/O/0/1 防混淆）

### 查询状态追踪
- 云函数支持 `{ action: 'mark_queried', code: 'INTJ-XXXX' }` 请求
- 按情报码搜索记录 → 更新"查询状态"字段为"已查询"
- 查询页提交后自动触发，无需手动操作

## 核心数据对象

### countryAdvice(mbti, country) — 国家适配分析
根据 MBTI 维度（isE/isN/isF/isJ）动态生成国家匹配分析文案。
支持12个国家/地区：美国/英国/澳大利亚/加拿大/日本/韩国/新加坡/马来西亚/欧洲/香港/其他/还没想好。

### SCHOOL_RECS[country] — 院校推荐
每个国家3-5所QS排名院校。含 MBTI_TAG_MATCH 做性格标签高亮。

### BUDGET_RECS[country] — 预算参考
tuition/living/total/note，覆盖10个国家/地区。

### COUNTRY_RECS[mbti] — 国家推荐
primary + secondary，16种类型全部补全（含日本/韩国/新加坡/马来西亚）。

### TRAFFIC_LIGHTS[mbti] — 红绿灯信号
green/yellow/red 三级。

## 报告页关键板块

### 用户选择 vs MBTI推荐 — 四种联动逻辑
| 情况 | 行为 |
|------|------|
| 用户选 = primary 国家 | 肯定"你的直觉很准"，不显示对比 |
| 用户选 = secondary 国家 | 温和提示"在你的条件适配区"，显示对比+预算 |
| 用户选 ≠ 推荐范围 | 完整对比分析（桥接措辞+预算对比+院校推荐） |
| 用户选 = 还没想好/其他 | 不显示，保持原样 |

院校推荐也联动：当用户选择 ≠ 推荐国时，折叠面板同时展示两个国家的院校。

### 留学人设 — 明信片卡片
- 顶部：左侧像素动物（Canvas 代码生成，见 PIXEL_ANIMALS 对象）+ 右侧类型名/副标题/标签
- 右上角虚线邮票装饰 (STUDY ABROAD)
- 虚线分隔线
- 下方 2×2 网格：小组作业/恋爱配对/穿搭风格/生活人设

## 像素动物系统（V3，2026-03）
16 种 MBTI 对应动物，全部通过 Canvas 代码生成，无外部图片依赖：

| MBTI | 动物 | | MBTI | 动物 |
|------|------|-|------|------|
| INTJ | 猫头鹰 | | ISTJ | 熊 |
| INTP | 猫 | | ISFJ | 狗 |
| ENTJ | 狮子 | | ESTJ | 鹰 |
| ENTP | 狐狸 | | ESFJ | 蜜蜂 |
| INFJ | 鹿 | | ISTP | 狼 |
| INFP | 兔子 | | ISFP | 熊猫 |
| ENFJ | 海豚 | | ESTP | 老虎 |
| ENFP | 鹦鹉 | | ESFP | 猴子 |

**技术实现：**
- `PIXEL_ANIMALS` 对象：每种动物 = 16×16 网格索引 + 调色板
- `drawPixelAnimal(canvas, mbtiType)` 函数：8× 放大渲染到 128×128 canvas
- 明信片区 `<canvas>` 替代原 `<img>`，html2canvas 导出无 CORS 问题

### 时间窗口 — 结构化渲染
formatTimeline() 函数将纯文本转为结构化 HTML（段落分隔、箭头列表、高亮卡片）。

### 内容免责声明
封面页 + 报告结尾都有三条声明（仅反映留学人格/基于当前状态/可能随经历变化）。

## 员工追踪
- 5个员工各有专属二维码（employee-qrcodes/），扫码链接带 `?ref=员工名`
- 前端通过 sessionStorage 保存 ref 参数，测评完成时随数据发送到飞书
- 飞书表格"来源员工"列记录来源

## 已完成需求 ✅
1. ✅ 导出长图（html2canvas截图 → 全屏浮层展示 → 长按保存）
2. ✅ 留学人格标签（META.tags，hero区域下方显示）
3. ✅ 留学国家/地区推荐（COUNTRY_RECS，根据MBTI类型自动推荐）
4. ✅ 案例板块（反面案例，「{MBTI}申请走过的坑」）
5. ✅ TRAFFIC_LIGHTS 红绿灯模块
6. ✅ 企业微信二维码（底部引流）
7. ✅ 员工专属二维码 + 来源追踪
8. ✅ Vercel → Cloudflare Pages Functions 迁移（中国可访问）
9. ✅ 32题 MBTI 测试（4维度×8题，替代原15题）
10. ✅ QS100院校推荐（可折叠）+ "非官方MBTI"声明
11. ✅ V4迭代：国家从7→12、预算数据、用户选择解读、换行修复
12. ✅ V4.0版本号 + COUNTRY_RECS secondary 全部补全
13. ✅ 内容免责声明（封面+结尾）
14. ✅ 用户选择与MBTI推荐四种联动（对比措辞+院校联动）
15. ✅ 时间窗口结构化排版（formatTimeline）
16. ✅ 留学人设明信片卡片 + 16种MBTI角色头像（原 avatars/ PNG）
17. ✅ 像素动物系统 V1-V3：Canvas 代码生成，全部16种逐条细化
18. ✅ 飞书数据同步排查：验证全链路正常
19. ✅ 兑换码→情报码系统：测评完生成情报码，锁定报告，引导加企微
20. ✅ 查询页：?mode=query 入口，输入情报码解码渲染报告+导出长图
21. ✅ 用户姓名改为选填
22. ✅ 自定义域名 conilab.cn 绑定
23. ✅ 交付打包：纯前端单文件 + 部署说明文档
24. ✅ V5 措辞统一：兑换码→情报码、顾问→情报员
25. ✅ V5 报告预览诱惑：前3板块可见 + lock overlay 集成情报码/QR
26. ✅ V5 移除自助解锁按钮：用户只能通过查询页查看完整报告
27. ✅ V5 飞书表格迁移：个人账号→公司账号（新凭证+新表格+完整字段）
28. ✅ V5 查询状态追踪：员工查询后自动标记"已查询"
29. ✅ V5 性别/手机号录入修复
30. ✅ V5 查询页措辞面向用户：查询入口、你的姓名或昵称
31. ✅ 查询页手机号严格校验：必须11位纯数字，自动过滤字母，1开头
32. ✅ 查询结果页清理：隐藏"重新测评"按钮，去除测评页残留元素
33. ✅ 查询结果页分享活码：底部二维码替换为裂变活码 + "1min生成你的留学版MBTI专属报告！"
34. ✅ 导出长图包含分享活码：查询模式下长图带活码，测评模式不含
35. ✅ 最终交付打包：三渠道测试页.zip + 查询页.zip（桌面）
36. ✅ ch3 移除员工专属二维码覆盖逻辑（ref 追踪不影响企微码显示）
37. ✅ ch3 推广员工二维码生成：饶品慧/屈翔/徐欣/赵绮雯/陶红（拼音 ref，存 ch3-employee-qrcodes/）
38. ✅ ch1/ch2 lock overlay 改造：移除企微二维码，改为三位情报员头像+名称展示（会魔法的微微/安安不怕难/宇宙小太阳sunny）
39. ✅ 飞书群通知 webhook 更新至新群（MBTI留学活动信息推送）
40. ✅ 员工查询入口 ?mode=staff：只需情报码，不记录查询状态，不对学员开放
41. ✅ 漏斗统计埋点：页面访问/信息提交/开始答题三层事件写入飞书"漏斗统计"表
42. ✅ 飞书仪表盘"转化漏斗"：漏斗图（层1-3）+ 指标卡（层4测试完成 / 层6查询报告）
43. ✅ ch3 新增员工陶红二维码（ref=taohong，存 ch3-employee-qrcodes/陶红.png）
44. ✅ 漏斗统计合并为五层：测试完成/查询报告埋点写入漏斗统计表，仪表盘合并为单一漏斗图，历史数据已补录
45. ✅ 年级选项扩展：原4选项（大一~大四）→10选项（高一/高二/高三/大一~大四/已毕业/在职/自由职业），标签改为"目前所处阶段？"，情报码编码/解码同步更新

## 飞书多维表格（更新）

| 资源 | Token |
|------|-------|
| wiki_token（URL中显示） | MjSQwHVPwiyWPxkU4oocQWeZnRe |
| 实际 base_token | NzRqbDeruanLWjsLNzhcyfU0nJf |
| 主数据表 table_id | tbl1pugZQqoieCKr（表名：数据表）|
| 漏斗统计表 table_id | tblkNnC12bDALi0F（表名：漏斗统计）|
| 仪表盘 dashboard_id | blkm6u1TJ8w0Qy0R（名：转化漏斗）|

### 漏斗统计表字段
| 字段 | 类型 | 说明 |
|------|------|------|
| 事件 | 单选 | 页面访问 / 信息提交 / 开始答题 / 测试完成 / 查询报告 |
| 渠道 | 文本 | ch1 / ch2 / ch3 / main |
| 来源员工 | 文本 | activeRef 值 |
| 时间戳 | 文本 | ISO 字符串 |

### 漏斗模型完整说明（五层，2026-04-02 更新）
| 层 | 内容 | 数据来源 |
|----|------|---------|
| 1 | 网页点击 | 漏斗统计表（事件=页面访问），每 session 记录一次 |
| 2 | 信息填写 | 漏斗统计表（事件=信息提交） |
| 3 | 测试参与 | 漏斗统计表（事件=开始答题） |
| 4 | 测试完成 | 漏斗统计表（事件=测试完成），sendToFeishu('report') 后触发 |
| 5 | 查询报告 | 漏斗统计表（事件=查询报告），mark_queried 后触发 |

## 员工头像文件
路径：`employee-avatars/`
| 文件 | 对应情报员 |
|------|---------|
| wewei.jpg | 会魔法的微微 |
| anan.png | 安安不怕难 |
| sunny.png | 宇宙小太阳sunny |

## 项目状态：🟢 运行中（2026-04-01）

**主用部署：Cloudflare Pages**
- 地址：https://mbti-liuxue.pages.dev
- 自动从 GitHub main 部署

**备用部署：阿里云 ECS（闲置）**

### 阿里云 ECS 部署（2026-03-31 完成，当前闲置）

**服务器信息**
- 实例：Ubuntu 22.04 + 宝塔面板，2核2G，100Mbps
- 公网 IP：**114.55.52.62**（可直接访问，无需备案）
- 地域：华东1（杭州）
- SSH：`ssh root@114.55.52.62`，密码见本地保存

**部署架构**
- 静态文件：Nginx 托管 `/var/www/mbti/`
- 后端 API：Node.js（`/var/www/mbti/api/server.js`），PM2 守护，监听 127.0.0.1:3000
- Nginx 反向代理 `/api/bitable` → Node.js

**当前可用地址（IP直连，无需备案）**
| 页面 | 地址 |
|------|------|
| ch1 星火计划 | http://114.55.52.62/ch1/ |
| ch2 新通代言人 | http://114.55.52.62/ch2/ |
| ch3 南昌开放版 | http://114.55.52.62/ch3/ |
| 查询页 | http://114.55.52.62/?mode=query |

**域名状态**
- DNS 记录：`mbti-liuxue.conilab.cn` → `114.55.52.62`（已配置）
- **待办：ICP 备案**——国内服务器用自定义域名必须备案，约 20 天，需新通教育公司资质去办
- 备案完成前用 IP 地址访问

**常用运维命令**
```bash
# 重启 API 服务
pm2 restart mbti-api
# 查看 API 日志
pm2 logs mbti-api
# 重载 Nginx
systemctl reload nginx
# 更新文件后重设权限
chown -R www-data:www-data /var/www/mbti
```

### 代码变更（已部署到 ECS，未推送 GitHub）
1. **手机号字段拆分**：飞书表格"手机号"→"测试页手机号"+"查询页手机号"
   - `index.html` / `ch1/ch2/ch3/index.html`：sendToFeishu() 改为"测试页手机号"
   - `functions/api/bitable.js` / `server/server.js`：query_by_phone 搜索"测试页手机号"，mark_queried 写入"查询页手机号"
2. **飞书表格已更新**：刘媛已在表格中重命名+新建字段
3. **新增 `server/server.js`**：Node.js 版后端，适配 ECS 部署（原 Cloudflare Pages Function 格式不兼容）

## 待完成
- [ ] 压测数据清理：飞书表格中"压测"测试记录需手动删除
- [ ] 验证漏斗埋点：访问 ch1 → 填信息 → 答题，确认飞书"漏斗统计"表有三条记录写入

## 压测结果（2026-03-31）
- 静态页面（ch1）：1000 请求 / 100 并发 → **100% 成功**，平均 0.56s
- API 接口：500 请求 / 50 并发 → 96.4% 成功，失败原因为飞书 API 限流（非服务器问题）
- 结论：Cloudflare 性能无瓶颈，瓶颈在飞书 API 频率限制

## 已知限制
- 微信公众号是订阅号（非服务号），无法使用 JS-SDK 自定义分享卡片
- 如需更换二维码：替换对应 png 文件后 push 即可（share-qrcode.png / qrcode.png / channel-qrcodes/）
- 飞书多维表格 API 有频率限制（约100次/分钟），高并发场景需注意

## 部署流程

### 当前：Cloudflare Pages（仍在运行）
```bash
cd /Users/coni/Desktop/运营/mbti留学策划归档
git add . && git commit -m "描述" && git push
# Cloudflare Pages 自动从 GitHub main 部署，通常 1-2 分钟生效
# 云函数(functions/api/bitable.js)也由 Cloudflare Pages 一并部署
```

### 计划：阿里云 ECS（迁移中）
- ECS IP: 114.55.52.62
- 系统: Ubuntu 22.04 + 宝塔面板
- 方案A（推荐）：前端放 ECS/Nginx，API 继续走 Cloudflare（改 BITABLE_API 为绝对路径）
- 方案B：前端+后端全部放 ECS（需将云函数改写为 Express 服务）
