# LegalOne Global — 微信小程序克隆

本项目按 `clone-website` skill 的流程，对 `https://www.legaloneglobal.com/` 做了页面拆解、样式/资源/内容提取，
并转成原生微信小程序（WXML / WXSS / JS）。

## 导入微信开发者工具

1. 安装并打开「微信开发者工具」，用微信扫码登录。
2. 选择「导入项目」。
3. 「目录」选择本仓库根目录（也就是包含 `app.json` 的那一层），例如：

   `/Users/yangyongze/Desktop/legalone/legal`

   注意：不要选它的上一层目录，否则开发者工具会报
   `app.json: 在项目根目录未找到 app.json`。

4. AppID 使用「测试号」（或保持 `touristappid`）。
5. 点击「导入」，工具会自动编译，左侧模拟器即可看到页面。
6. 点击「预览」可用手机微信扫码真机预览。

## 已实现页面

- 首页（公告轮播、最新交易/案例、最新律所、最新律师、客户证言、文章/奖项、亮点、律师目录、律所目录、页脚、Cookie 提示）
- About / Announcements / Deals / Awards / Articles / Lawyers / Law Firms / Highlights / AI Search
- Terms / Privacy / Cookies / ESG
- 交易、文章、律师、律所四个详情模板页

## 目录

- `data/content.js` — 从原站提取的结构化内容
- 图片统一走官网/CDN 链接（`https://www.legaloneglobal.com/images/...` 与
  `https://legaloneglobal.azureedge.net/...`），小程序包内不再放本地图片副本；
  旧的 `assets/img/` 已不再被引用，可从项目里删除。
- `components/` — 共享的站点头部/页脚组件
- `pages/` — 各页面

## 接口调用（Phase 1 / Phase 2）

已按执行包中的 `LegalOne-WeChat-MiniProgram-Phase1-API.pdf`（Annex A）和
`LegalOne-WeChat-MiniProgram-Phase2-Login-API.pdf`（Annex B）接入真实接口：

- Phase 1（公开浏览，GET，无鉴权）：首页四面板、公告、文章、奖项、亮点、律师、律所、交易及详情页。
- Phase 2（登录/账号）：`POST /api/crm/member/login/`、`isValidToken`、`logout`、`GET /api/crm/member/{id}`。
- `services/api.js` 封装请求、分页编码、图片尺寸变体、字段归一化；接口失败时自动回退到 `services/fallback.js` 的本地快照。

## 使用前需要配置

1. 微信公众平台后台添加「request 合法域名」：
   `https://www.legaloneglobal.com`
2. 添加「downloadFile 合法域名」：
   `https://legaloneglobal.azureedge.net`
   `https://www.legaloneglobal.com`（页面里的图片直接引用官网图片地址，必须一起加）
3. 添加「业务域名」：
   `https://www.legaloneglobal.com`
   `https://heyzine.com`（LegalOne Pulse 官网翻页书，需完成微信业务域名校验）
4. 本地开发可在 DevTools「详情 → 本地设置」勾选「不校验合法域名」，或保持 `project.config.json` 中 `urlCheck: false`。
   **注意**：这个勾选只对模拟器有效，真机上「业务域名」照样校验。日志/页面里出现
   `web-view load failed due to not in domain list` 就是第 3 条还没配好；配置时需要把微信给的校验文件放到
   `https://www.legaloneglobal.com/` 根目录，且每 3 个月要重新校验一次。
   另外，**个人类型的小程序官方就不支持 web-view**（`<web-view>` 文档：「个人类型的小程序暂不支持使用」），
   这种情况小程序内无法打开任何会员 H5 页面，只能用兜底页的「Copy link」在浏览器里打开。

## 会员 H5 的官网导航栏（需要官网配合）

小程序用 `<web-view>` 打开会员 E-form（例如调查问卷 `/member_survey/<id>`）时，页面底部会带上官网移动端的会员导航栏和页脚。
这两块来自官网自己的样式，小程序侧去不掉：

- `<web-view>` 会自动铺满页面并覆盖其他组件，`cover-view` 可覆盖的原生组件只有 map / video / canvas / camera / live-player / live-pusher，**不包含 web-view**；
- 官网也没有无导航栏的独立问卷页（路由里 `forms/:formType/:formId` 只对 `deal-submission` 生效）。

所以在"表单不改、只要去掉导航栏"的前提下，只能由官网按"当前是否在小程序 web-view 中"隐藏这两块。微信会把 web-view 的 UA
标记为 `miniProgram`（微信 7.0.0+），页面内也可用 `window.__wxjs_environment === 'miniprogram'` 判断。官网共享 JS 加：

```js
if (window.__wxjs_environment === 'miniprogram' || /miniProgram/i.test(navigator.userAgent)) {
  document.documentElement.classList.add('in-miniprogram');
}
```

样式加（`92px` 与官网给底部导航预留的高度一致，避免露出空白）：

```css
.in-miniprogram .memberpage .member-dashboard-sidebar { display: none; }
.in-miniprogram .memberpage .member-dashboard-body,
.in-miniprogram .memberpage .footer { padding-bottom: 0; margin-bottom: 0; }
```

浏览器访问官网不受影响，表单本身零改动。另需注意：会员 H5 的登录态取自官网自己写的
`sessionStorage['X-ACCESS-TOKEN']` + `localStorage['memberId']`（并经 `POST /api/crm/member/isValidToken/` 校验，失败会跳到 `./sign_in`），
小程序的 token 存在 wx storage，两者不互通——所以 web-view 里的会员页面还需要一次官网登录态。

## 说明

- 详情正文通过 `stripHtml` 转纯文本渲染（小程序无 innerHTML），登录/注册外的会员、验证、支付、问卷等 Phase 2 范围暂未实现。
- 未实现注册 OTP/验证码（需阿里云验证码 SDK）；`Login` 目前使用邮箱/密码登录接口。
- 自定义字体用系统字体近似原站的 Helvetica Neue / Montserrat。

## 配置（config.js）

`config.js` 是运行时配置入口：

- `baseUrl` — 接口域名（默认 `https://www.legaloneglobal.com/`）
- `h5Host` — E-form / 找回密码 / 网站跳转用的 H5 域名（需加入小程序「业务域名」）
- `captcha` — 阿里云验证码 2.0 的 SceneId / Prefix / 插件版本 / H5 URL，见 `README-CAPTCHA.md`

## Phase 2（会员）已实现页面

- `pages/register/register` — 注册（邮箱 + 验证码 → OTP → 创建账号）
- `pages/forgot-password/forgot-password` — 忘记密码（验证码 → 发送找回邮件）
- `pages/reset-password/reset-password` — 重置密码（邮件链接 → 新密码）
- `pages/login/login` — 登录（无验证码）
- `pages/captcha/captcha` — 阿里云验证码页（插件 / H5 / 未配置三种状态）
- `pages/dashboard/dashboard` — 会员仪表盘，按官网登录后个人主页还原：欢迎语、Upcoming schedule（Survey + Award，含 All / Asia / China 筛选与 E-form / PDF 入口）、Saved items / My verification(s) / My award submission(s) / My account / My profile / Welcome 卡片（底部会员导航按需求未保留）
- `pages/account/account` — Account Settings 菜单
- `pages/account-access/account-access` — 修改邮箱（captcha → Get Code → OTP → Submit）
- `pages/change-password/change-password` — 修改密码
- `pages/change-sector/change-sector` — 切换 sector（30 天冷却）
- `pages/profile-edit/profile-edit` — 完善/更新资料（按 sector 矩阵，含律所联想）
- `pages/form-download/form-download` — 奖项表单下载（PDF）+ E-form 入口
- `pages/webview/webview` — H5 承载页（web-view + 复制链接兜底）

接口层见 `services/api.js`（Annex A + Annex B 全覆盖），会话见 `services/auth.js`，
验证码见 `services/captcha.js`，sector 矩阵见 `services/sector.js`。
