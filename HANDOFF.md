# MBTI App Handoff

## 项目概况
留学咨询公司（新通教育）的 MBTI 测评 H5 应用，学员自助测评 + 数据沉淀到飞书 + 企业微信引流。

## 文件结构
- `/Users/coni/mbti-app/index.html` — 单文件 HTML 应用（CSS+HTML+JS，~2700行）
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

## 代码结构 (index.html ~2700行)
```
L1-8:       头部 meta + 外部依赖（Google Fonts, html2canvas）
L9-160:     CSS 样式（报告页、雷达图、海报浮层、二维码、budget卡片等）
L161-355:   HTML 结构
              - Step 0: 介绍页（含"非官方MBTI"声明）
              - Step 1: 填信息（昵称/年级/目标国家12选1/微信）
              - Step 2: 32道答题（4维度×8题）
              - Step 3: 加载动画
              - Step 4: 报告页（hero → 维度分析 → 性格 → 路径 → 优势 →
                        国家推荐 → 用户选择解读 → 学校推荐 → 预算参考 →
                        红绿灯 → 时间线 → 案例 → 声明 → 二维码 → 重新测评）
L356-365:   海报浮层
L366-430:   32道题目定义 + 评分逻辑
              - E/I: Q1-8 (1-4正向E, 5-8反向I)
              - S/N: Q9-16
              - T/F: Q17-24
              - J/P: Q25-32
L431-750:   countryAdvice(mbti, country) — 12个国家的MBTI适配分析
              含推荐指数、优势4点、劣势4点、与MBTI匹配点
              部分国家有 isF/isN/isJ 条件分支
L751-1700:  TEMPLATES 对象（16种MBTI类型完整文案）
L1701-1740: META 对象（16种类型元数据）
L1741-2030: COUNTRY_RECS 对象（16种类型的留学国家推荐，primary+secondary）
L2031-2100: TRAFFIC_LIGHTS 对象
L2100-2200: SCHOOL_RECS 对象（12个国家/地区的QS排名院校）
              + BUDGET_RECS 对象（10个国家/地区的学费/生活费/总计）
              + MBTI_TAG_MATCH（性格标签匹配高亮）
              + renderSchoolRec() / renderBudget() 渲染函数
L2200-2500: computeRadar() / drawRadar() / parseCardSections() / parseFullReport()
L2500-2600: generateReport() — 核心报告生成函数
              - 学校推荐基于 MBTI 推荐的 primary 国家（非用户选择）
              - 当用户选择 ≠ MBTI推荐时，额外显示用户选择的匹配度分析 + 预算对比
L2600-2650: generatePoster() — html2canvas导出长图
L2650-2700: sendToFeishu() — 飞书数据上报 + 员工来源追踪(?ref=xxx)
```

## 核心数据对象

### countryAdvice(mbti, country) — 国家适配分析
根据 MBTI 维度（isE/isN/isF/isJ）动态生成国家匹配分析文案。
支持12个国家/地区：美国/英国/澳大利亚/加拿大/日本/韩国/新加坡/马来西亚/欧洲/香港/其他/还没想好。

### SCHOOL_RECS[country] — 院校推荐
```js
{ '美国': [{name, qs}...], '英国': [...], ... }
```
每个国家3-5所QS排名院校。含 MBTI_TAG_MATCH 做性格标签高亮。

### BUDGET_RECS[country] — 预算参考
```js
{ tuition: 'X万/年', living: 'X万/年', total: 'X万/年', note: '备注' }
```

### COUNTRY_RECS[mbti] — 国家推荐
```js
{ primary: '国家名', primaryWhy, primaryPoints: [...],
  secondary: '国家名', secondaryCond, secondaryPoints: [...] }
```

### TRAFFIC_LIGHTS[mbti] — 红绿灯信号
```js
{ green: [...], yellow: [...], red: [...] }
```

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

## 已知问题 / 可优化项
- ~~COUNTRY_RECS 的 secondary 字段：只有 INFP/ISFP 加了日本~~ ✅ 已补全（V4.0）
- ~~版本号底部仍显示 V3.0~~ ✅ 已更新为 V4.0
- 微信公众号是订阅号（非服务号），无法使用 JS-SDK 自定义分享卡片
- 如需更换二维码：替换 qrcode.png 文件后 push 即可

## 部署流程
```bash
cd /Users/coni/mbti-app
git add index.html && git commit -m "描述" && git push
# Cloudflare Pages 自动从 GitHub main 部署，通常 1-2 分钟生效
# 云函数(functions/api/bitable.js)也由 Cloudflare Pages 一并部署
```
