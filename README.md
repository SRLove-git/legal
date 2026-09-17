# LegalOne Global — 微信小程序克隆

本项目按 `clone-website` skill 的流程，对 `https://www.legaloneglobal.com/` 做了页面拆解、样式/资源/内容提取，
并转成原生微信小程序（WXML / WXSS / JS）。

## 导入微信开发者工具

1. 安装并打开「微信开发者工具」，用微信扫码登录。
2. 选择「导入项目」。
3. 「目录」选择本文件夹（包含 `app.json` 的根目录）：

   `/Users/srlove/Documents/Code/legaloneglob`

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
- `assets/img/` — 已本地化的图片资源
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
3. 本地开发可在 DevTools「详情 → 本地设置」勾选「不校验合法域名」，或保持 `project.config.json` 中 `urlCheck: false`。

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
- `pages/dashboard/dashboard` — 会员仪表盘（欢迎语、账号服务、三张活动摘要）
- `pages/account/account` — Account Settings 菜单
- `pages/account-access/account-access` — 修改邮箱（captcha → Get Code → OTP → Submit）
- `pages/change-password/change-password` — 修改密码
- `pages/change-sector/change-sector` — 切换 sector（30 天冷却）
- `pages/profile-edit/profile-edit` — 完善/更新资料（按 sector 矩阵，含律所联想）
- `pages/form-download/form-download` — 奖项表单下载（PDF）+ E-form 入口
- `pages/webview/webview` — H5 承载页（web-view + 复制链接兜底）

接口层见 `services/api.js`（Annex A + Annex B 全覆盖），会话见 `services/auth.js`，
验证码见 `services/captcha.js`，sector 矩阵见 `services/sector.js`。
