const safeArea = require('../../services/safe-area.js');
const api = require('../../services/api.js');
const auth = require('../../services/auth.js');
const captcha = require('../../services/captcha.js');

Page({
  behaviors: [safeArea],
  data: {
    member: null,
    newEmail: '',
    otp: '',
    isBusinessEmail: true,
    step: 1,
    cooldown: 0,
    error: '',
    loading: false,
    done: false
  },
  onLoad() {
    if (!auth.requireLogin()) return;
    const self = this;
    api.getMember(auth.getMemberId()).then(function (m) {
      self.setData({ member: m || {} });
    }).catch(function () {});
  },
  onField(e) {
    const patch = {};
    patch[e.currentTarget.dataset.key] = e.detail.value;
    this.setData(patch);
  },
  onType(e) {
    this.setData({ isBusinessEmail: !!e.detail.value });
  },
  // §3.5.1 — new email → captcha → Get Code (60s cooldown)
  getCode() {
    const email = (this.data.newEmail || '').trim();
    if (!email) return this.setData({ error: 'Please enter the new email address' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return this.setData({ error: 'Please enter a valid email address' });
    const self = this;
    this.setData({ loading: true, error: '' });
    captcha.verify({ purpose: 'email-change' }).then(function (param) {
      return api.checkAvailableAndOTP(email, param);
    }).then(function (res) {
      self.setData({ loading: false, step: 2 });
      if (res && res.token) wx.setStorageSync('X-CAPTCHA-VERIFIED', res.token);
      self.startCooldown();
    }).catch(function (err) {
      self.setData({ loading: false, error: (err && (err.description || err.message)) || 'Could not send the code.' });
    });
  },
  startCooldown() {
    const self = this;
    this.setData({ cooldown: 60 });
    if (this._timer) clearInterval(this._timer);
    this._timer = setInterval(function () {
      const n = self.data.cooldown - 1;
      self.setData({ cooldown: n > 0 ? n : 0 });
      if (n <= 0) clearInterval(self._timer);
    }, 1000);
  },
  onUnload() {
    if (this._timer) clearInterval(this._timer);
  },
  submit() {
    if (!this.data.otp) return this.setData({ error: 'Please enter the verification code' });
    const self = this;
    this.setData({ loading: true, error: '' });
    api.updateAccessEmail(auth.getMemberId(), this.data.newEmail.trim(), this.data.otp.trim(), this.data.isBusinessEmail)
      .then(function () {
        self.setData({ loading: false, done: true });
      }).catch(function (err) {
        self.setData({ loading: false, error: (err && (err.description || err.message)) || 'Update failed. This could be due to a temporary system issue. Please try again shortly.' });
      });
  },
  back() {
    wx.navigateBack({ delta: 1 });
  }
});
