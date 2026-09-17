const safeArea = require('../../services/safe-area.js');
const api = require('../../services/api.js');

Page({
  behaviors: [safeArea],
  data: { email: '', token: '', password: '', confirm: '', error: '', loading: false, linkOk: false, done: false },
  onLoad(options) {
    const email = decodeURIComponent(options.email || '');
    const token = decodeURIComponent(options.token || '');
    this.setData({ email: email, token: token });
    if (!email || !token) {
      this.setData({ error: 'This recovery link is incomplete. Please request a new one.' });
      return;
    }
    const self = this;
    api.checkPasswordRecoveryLink(email, token).then(function () {
      self.setData({ linkOk: true });
    }).catch(function (err) {
      self.setData({ error: (err && (err.description || err.message)) || 'This recovery link is invalid or has expired. Please request a new one.' });
    });
  },
  onField(e) {
    const patch = {};
    patch[e.currentTarget.dataset.key] = e.detail.value;
    this.setData(patch);
  },
  submit() {
    const d = this.data;
    if (!api.passwordValid(d.password)) {
      return this.setData({ error: 'Password must be at least 8 characters and include an uppercase letter, a lowercase letter and a digit.' });
    }
    if (d.password !== d.confirm) return this.setData({ error: 'Passwords do not match' });
    const self = this;
    this.setData({ loading: true, error: '' });
    api.passwordRecovery(d.email, d.token, d.password).then(function () {
      self.setData({ loading: false, done: true });
    }).catch(function (err) {
      self.setData({ loading: false, error: (err && (err.description || err.message)) || 'Reset password failed. This could be due to a temporary system issue. Please try again shortly.' });
    });
  },
  backToLogin() {
    wx.redirectTo({ url: '/pages/login/login' });
  }
});
