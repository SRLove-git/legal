const captcha = require('../../services/captcha.js');

Page({
  data: {
    mode: 'unconfigured',
    configured: false,
    h5Url: '',
    sceneId: '',
    prefix: '',
    purpose: ''
  },
  onLoad(options) {
    const c = captcha.settings();
    this.setData({
      mode: options.mode || 'unconfigured',
      configured: captcha.configured(),
      h5Url: c.h5Url || '',
      sceneId: c.sceneId || '',
      prefix: c.prefix || '',
      purpose: decodeURIComponent(options.purpose || '')
    });
  },
  // Plugin path success handler — see README-CAPTCHA.md for the plugin declaration.
  onPluginSuccess(e) {
    const param = (e && e.detail && (e.detail.captchaVerifyParam || e.detail.verifyParam)) || '';
    this.finish(param);
  },
  // DevTools-only escape hatch so the rest of the flow stays testable before the
  // Client supplies the SceneId / Prefix. The live API still validates the captcha.
  devContinue() {
    this.finish('');
  },
  finish(param) {
    try {
      const ch = this.getOpenerEventChannel && this.getOpenerEventChannel();
      if (ch && ch.emit) ch.emit('captchaResult', param || '');
    } catch (e) {}
    wx.navigateBack({ delta: 1 });
  }
});
