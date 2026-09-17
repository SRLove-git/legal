// LegalOne mini program — runtime configuration.
// Values here are the ones the Client must supply per Schedule 2 §5.
module.exports = {
  // Public API host (must end with a slash). Used by services/api.js.
  baseUrl: 'https://www.legaloneglobal.com/',

  // H5 host used for E-form filling, password-reset links and website-only redirects.
  // Must be added to WeChat 业务域名 before web-view can load it.
  h5Host: 'https://www.legaloneglobal.com',

  // Aliyun Captcha 2.0 (Schedule 2 §1).
  // Registration, forget-password and "Get Code" flows require a captcha; login does not.
  // Two supported approaches:
  //   1. WeChat mini program plugin (preferred) — set sceneId + prefix + pluginVersion
  //      and declare the plugin in app.json (see README-CAPTCHA).
  //   2. Web-view + H5 — set h5Url to the Aliyun H5 captcha page.
  // Leaving all three blank shows a clear "captcha not configured" state instead of
  // silently sending an empty captchaVerifyParam.
  captcha: {
    sceneId: '',
    prefix: '',
    pluginVersion: '',
    h5Url: ''
  }
};
