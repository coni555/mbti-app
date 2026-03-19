# MBTI App Handoff

## 项目概况
留学咨询公司（新通教育）的 MBTI 测评 H5 应用，学员自助测评 + 数据沉淀到飞书 + 企业微信引流。

## 文件结构
- `/Users/coni/mbti-app/index.html` — 单文件 HTML 应用（CSS+HTML+JS，~2800行）
- `/Users/coni/mbti-app/avatars/` — 16种 MBTI 类型的低多边形风格头像（INFJ.png ~ ESTP.png）
- `/Users/coni/mbti-app/functions/api/bitable.js` — Cloudflare Pages Function，写飞书多维表格 + 发群通知
- `/Users/coni/mbti-app/api/bitable.js` — 旧 Vercel 云函数（已弃用，保留备份）
- `/Users/coni/mbti-app/qrcode.png` — 企业微信二维码（底部引流用）
- `/Users/coni/mbti-app/employee-qrcodes/` — 5个员工专属二维码（sisi/yingbi/ailun/ice/muchen）

## 部署架构
```
学员访问 Cloudflare Pages (mbti-liuxue.pages.dev)
  → 填信息 → 做32题测评 → 看报告 → 扫码加企业微信
                                    ↓
                        前端 fetch → Cloudflare Pages Function (/api/bitable)
                                    ↓
                        ┌────────────┴────────────┐
                        ↓                         ↓
                飞书多维表格                飞书群消息通知
```
- **前端 + 云函数**: Cloudflare Pages（同源部署，无跨域问题）
- **旧 Vercel 方案已弃用**: 中国大陆无法访问 Vercel

## 关键配置
- GitHub 仓库: https://github.com/coni555/mbti-app
- 线上地址: https://mbti-liuxue.pages.dev
- 飞书 App ID: cli_a933f958d921dcc4
- 飞书 App Secret: iElNIFJ8zLDJjJzCTkOEwfBPHLZBx8Yh
- 飞书多维表格 app_token: MR1ab1PizaBgWVskQl3csrmOnGh
- 飞书多维表格 table_id: tblW46zN3Qf0UmiI
- 飞书 Webhook: https://open.feishu.cn/open-apis/bot/v2/hook/104820c9-2175-4482-b4e4-ea4620d7685e

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
- 顶部：左侧 MBTI 角色头像（avatars/[TYPE].png） + 右侧类型名/副标题/标签
- 右上角虚线邮票装饰 (STUDY ABROAD)
- 虚线分隔线
- 下方 2×2 网格：小组作业/恋爱配对/穿搭风格/生活人设

### 时间窗口 — 结构化渲染
formatTimeline() 函数将纯文本转为结构化 HTML（段落分隔、箭头列表、高亮卡片）。

### 内容免责声明
封面页 + 报告结尾都有三条声明（仅反映留学人格/基于当前状态/可能随经历变化）。

## 员工追踪
- 5个员工各有专属二维码（employee-qrcodes/），扫码链接带 `?ref=员工名`
- 前端通过 sessionStorage 保存 ref 参数，测评完成时随数据发送到飞书
- 飞书表格"来源"列记录来源员工

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
16. ✅ 留学人设明信片卡片 + 16种MBTI角色头像

## 已知问题 / 可优化项
- 微信公众号是订阅号（非服务号），无法使用 JS-SDK 自定义分享卡片
- 如需更换二维码：替换 qrcode.png 文件后 push 即可

## 部署流程
```bash
cd /Users/coni/mbti-app
git add . && git commit -m "描述" && git push
# Cloudflare Pages 自动从 GitHub main 部署，通常 1-2 分钟生效
# 云函数(functions/api/bitable.js)也由 Cloudflare Pages 一并部署
```
