// Aliyun Captcha 2.0 adapter (Schedule 2 §1).
// The mini program must NOT embed the website web JS captcha widget. We support:
//   1. the Aliyun WeChat mini program plugin (preferred), and
//   2. a Web-view + H5 fallback.
// Both paths resolve to a `captchaVerifyParam` string that is posted inside the
// business API payload (checkAvailableAndOTP / passwordRecoveryRequest).
const config = require('../config.js');

function settings() {
  return (config && config.captcha) || {};
}

// True when the plugin path is configured (SceneId + prefix + plugin version).
function pluginConfigured() {
  const c = settings();
  return !!(c.sceneId && c.prefix && c.pluginVersion);
}

// True when either supported path can produce a captchaVerifyParam.
function configured() {
  const c = settings();
  return pluginConfigured() || !!c.h5Url;
}

// Open the captcha page and resolve with the captchaVerifyParam.
// Resolves with '' when the caller may proceed without a captcha (not configured).
function verify(options) {
  options = options || {};
  if (!configured() && !options.allowUnconfigured) {
    return Promise.resolve('');
  }
  const mode = pluginConfigured() ? 'plugin' : (settings().h5Url ? 'h5' : 'unconfigured');
  const url = '/pages/captcha/captcha?mode=' + mode + '&purpose=' + encodeURIComponent(options.purpose || '');
  return new Promise(function (resolve, reject) {
    wx.navigateTo({
      url: url,
      events: {
        // The captcha page emits this through its opener event channel.
        captchaResult: function (param) { resolve(param || ''); }
      },
      fail: reject
    });
  });
}

module.exports = {
  configured: configured,
  pluginConfigured: pluginConfigured,
  settings: settings,
  verify: verify
};
