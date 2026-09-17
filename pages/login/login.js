const api = require('../../services/api.js');

Page({
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
        wx.redirectTo({ url: '/pages/account/account' });
      } else if (res && res.code === 0) {
        self.setData({ error: 'Login failed. We cannot verify your account with the provided credentials.' });
      } else if (res && res.description) {
        self.setData({ error: res.description });
      } else {
        self.setData({ error: 'System error. Please try again. If problem persists, please contact system administrator.' });
      }
    }).catch(function (err) {
      self.setData({ loading: false });
      self.setData({ error: (err && err.message) || 'System error. Please try again.' });
    });
  }
});
