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
| 年级 | 大一/大二/大三/大四 |
| 性别 | 男/女 |
| 手机号 | 用户填写的手机号 |
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
| 7 | 年级索引（A=大一, B=大二, C=大三, D=大四） |
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

## 已知问题 / 待办
- 钩子设置和活码：刘媛后续提供素材，届时替换二维码
- 微信公众号是订阅号（非服务号），无法使用 JS-SDK 自定义分享卡片
- 如需更换二维码：替换 qrcode.png 文件后 push 即可

## 部署流程
```bash
cd /Users/coni/Projects/mbti-app
git add . && git commit -m "描述" && git push
# Cloudflare Pages 自动从 GitHub main 部署，通常 1-2 分钟生效
# 云函数(functions/api/bitable.js)也由 Cloudflare Pages 一并部署
```
