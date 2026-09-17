const safeArea = require('../../services/safe-area.js');
const breadcrumb = require('../../services/breadcrumb.js');
const api = require('../../services/api.js');
const captcha = require('../../services/captcha.js');

Page({
  behaviors: [safeArea, breadcrumb],
  data: { email: '', error: '', loading: false, done: false, captchaReady: false },
  onLoad() {
    this.setData({ captchaReady: captcha.configured() });
  },
  onEmail(e) {
    this.setData({ email: e.detail.value });
  },
  submit() {
    const email = (this.data.email || '').trim();
    if (!email) return this.setData({ error: 'Please enter your email address' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return this.setData({ error: 'Please enter a valid email address' });
    const self = this;
    this.setData({ loading: true, error: '' });
    captcha.verify({ purpose: 'forgot' }).then(function (param) {
      return api.passwordRecoveryRequest(email, param);
    }).then(function () {
      self.setData({ loading: false, done: true });
    }).catch(function (err) {
      self.setData({ loading: false, error: (err && (err.description || err.message)) || 'Could not send the recovery email.' });
    });
  },
  backToLogin() {
    wx.redirectTo({ url: '/pages/login/login' });
  }
});
