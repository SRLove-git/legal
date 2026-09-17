# Captcha / domain checklist (Schedule 2 §1 and §5)

Phase 2 requires **Aliyun Captcha 2.0** before these flows:

- registration (`checkAvailableAndOTP`)
- forget password (`passwordRecoveryRequest`)
- email "Get Code" when changing the account email (`checkAvailableAndOTP`)

Login has **no** captcha. The website web-JS captcha widget must **not** be embedded.

## What the Client must provide

1. Aliyun mini program **SceneId** and **Prefix**, and enable the **WeChat plugin** for the
   mini program if the plugin path is used.
2. The mini program **AppID / admin** access to add the plugin.
3. Confirmation that token auth works without cookies.
4. WeChat console configuration:
   - `request` 合法域名: `https://www.legaloneglobal.com`
   - `downloadFile` 合法域名: `https://legaloneglobal.azureedge.net`
   - 业务域名 (for `<web-view>`): the H5 host, e.g. `https://www.legaloneglobal.com`
5. Verification / website-only URLs that the mini program opens read-only.
6. Test accounts (multiple sectors, incomplete + complete profile).

## Where to configure

Everything lives in [`config.js`](./config.js):

```js
captcha: {
  sceneId: '',        // Aliyun SceneId
  prefix: '',         // Aliyun Prefix
  pluginVersion: '',  // filled once the plugin is enabled
  h5Url: ''           // alternative: Aliyun H5 captcha URL (web-view path)
}
```

`services/captcha.js` automatically picks the mode:

| Config state | Mode | Behaviour |
| --- | --- | --- |
| `sceneId` + `prefix` + `pluginVersion` | plugin | [`pages/captcha/captcha`](./pages/captcha/captcha.wxml) renders the Aliyun plugin component |
| `h5Url` only | H5 | the captcha page loads the Aliyun H5 captcha in a `<web-view>` |
| none set | unconfigured | the captcha page explains what is missing and offers a DevTools-only bypass |

The bypass exists so the rest of the registration / recovery flow stays testable before the
Client supplies SceneId / Prefix. The live API validates `captchaVerifyParam` server-side, so
requests are rejected until the captcha is configured.

## Enabling the WeChat plugin (preferred path)

1. Add the Aliyun captcha plugin to the mini program in the WeChat admin (第三方设置 → 插件管理).
2. Fill `sceneId`, `prefix`, `pluginVersion` in `config.js`.
3. Declare the plugin in `app.json`:

   ```json
   "plugins": {
     "aliyunCaptcha": {
       "version": "<pluginVersion>",
       "provider": "<aliyun plugin appid>"
     }
   }
   ```

4. In `pages/captcha/captcha.json` add the plugin component to `usingComponents`:

   ```json
   "usingComponents": {}
   ```
   → becomes the plugin component path, e.g.
   `"aliyun-captcha": "plugin://aliyunCaptcha/captcha"`

5. Uncomment the component in `pages/captcha/captcha.wxml`:

   ```html
   <aliyun-captcha scene-id="{{sceneId}}" prefix="{{prefix}}" bind:success="onPluginSuccess" />
   ```

   The page already routes the returned `captchaVerifyParam` back to the calling page.

## Fallback path (web-view + H5)

Set `captcha.h5Url` to the Aliyun H5 captcha page and add its host to 业务域名. The captcha page
renders `<web-view src="{{h5Url}}">`. Navigating back must hand the `captchaVerifyParam` to the
caller — provide the page with a bridge event if the H5 cannot post back directly.
