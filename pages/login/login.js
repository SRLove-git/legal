const safeArea = require('../../services/safe-area.js');
const api = require('../../services/api.js');

Page({
  behaviors: [safeArea],
  data: {
    email: '',
    password: '',
    error: '',
    loading: false
  },
  onEmail(e) {
    this.setData({ email: e.detail.value });
  },
  onPassword(e) {
    this.setData({ password: e.detail.value });
  },
  goForgot() {
    wx.navigateTo({ url: '/pages/forgot-password/forgot-password' });
  },
  goRegister() {
    wx.navigateTo({ url: '/pages/register/register' });
  },
  doLogin() {
    const email = (this.data.email || '').trim();
    const password = this.data.password || '';
    if (!email) {
      this.setData({ error: 'Please enter your email address' });
      return;
    }
    if (!password) {
      this.setData({ error: 'Please enter your password' });
      return;
    }
    this.setData({ loading: true, error: '' });
    const self = this;

    api.login(email, password).then(function (res) {
      self.setData({ loading: false });
      if (res && res.token) {
        wx.setStorageSync('X-ACCESS-TOKEN', res.token);
        wx.setStorageSync('memberId', res.id || '');
        wx.redirectTo({ url: '/pages/dashboard/dashboard' });
      } else {
        self.setData({ error: 'System error. Please try again. If problem persists, please contact system administrator.' });
      }
    }).catch(function (err) {
      // Annex B §2.1 — code == 0 means invalid credentials
      let msg;
      if (err && err.code === 0) {
        msg = 'Login failed. We cannot verify your account with the provided credentials.';
      } else if (err && err.description) {
        msg = err.description;
      } else {
        msg = 'System error. Please try again. If problem persists, please contact system administrator.';
      }
      self.setData({ loading: false, error: msg });
    });
  }
});
