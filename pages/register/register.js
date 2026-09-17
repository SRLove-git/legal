const safeArea = require('../../services/safe-area.js');
const api = require('../../services/api.js');
const auth = require('../../services/auth.js');
const captcha = require('../../services/captcha.js');

const SALUTATIONS = ['Mr', 'Ms', 'Mrs', 'Dr', 'Prof'];

Page({
  behaviors: [safeArea],
  data: {
    step: 1,
    salutations: SALUTATIONS,
    salutationIndex: 0,
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirm: '',
    promoCode: '',
    otp: '',
    error: '',
    loading: false,
    cooldown: 0,
    captchaReady: false
  },
  onLoad() {
    this.setData({ captchaReady: captcha.configured() });
    const promo = wx.getStorageSync('promoCode');
    if (promo) this.setData({ promoCode: promo });
  },
  onField(e) {
    const key = e.currentTarget.dataset.key;
    const patch = {};
    patch[key] = e.detail.value;
    this.setData(patch);
  },
  onSalutation(e) {
    this.setData({ salutationIndex: Number(e.detail.value) });
  },
  // Step 1 — validate, run captcha, then request the OTP email.
  sendOtp() {
    const d = this.data;
    const email = (d.email || '').trim();
    if (!email) return this.setData({ error: 'Please enter your email address' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return this.setData({ error: 'Please enter a valid email address' });
    if (!d.firstName) return this.setData({ error: 'Please enter your first name' });
    if (!d.lastName) return this.setData({ error: 'Please enter your last name' });
    if (!api.passwordValid(d.password)) {
      return this.setData({ error: 'Password must be at least 8 characters and include an uppercase letter, a lowercase letter and a digit.' });
    }
    if (d.password !== d.confirm) return this.setData({ error: 'Passwords do not match' });

    const self = this;
    this.setData({ loading: true, error: '' });
    captcha.verify({ purpose: 'register' }).then(function (param) {
      if (!param && !captcha.configured()) {
        wx.showToast({ title: 'Captcha not configured', icon: 'none' });
      }
      return api.checkAvailableAndOTP(email, param);
    }).then(function (res) {
      self.setData({ loading: false });
      if (res && res.captchaVerifyResult === false) {
        self.setData({ error: res.description || 'Verification failed. Please try again.' });
        return;
      }
      if (res && res.token) wx.setStorageSync('X-CAPTCHA-VERIFIED', res.token);
      self.setData({ step: 2, error: '' });
      self.startCooldown();
    }).catch(function (err) {
      self.setData({ loading: false, error: (err && (err.description || err.message)) || 'Could not send the verification code.' });
    });
  },
  resend() {
    if (this.data.cooldown > 0 || this.data.loading) return;
    const self = this;
    const token = wx.getStorageSync('X-CAPTCHA-VERIFIED');
    this.setData({ loading: true, error: '' });
    api.checkAndResendOTP(this.data.email.trim(), token).then(function () {
      self.setData({ loading: false });
      wx.showToast({ title: 'Code sent', icon: 'none' });
      self.startCooldown();
    }).catch(function (err) {
      self.setData({ loading: false, error: (err && (err.description || err.message)) || 'Could not resend the code.' });
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
  // Step 2 — validate the OTP, create the member, then route to the profile wizard.
  createAccount() {
    const self = this;
    const d = this.data;
    if (!d.otp) return this.setData({ error: 'Please enter the verification code' });
    this.setData({ loading: true, error: '' });
    api.validateOTP(d.email.trim(), d.otp.trim()).then(function (res) {
      const otpToken = (res && res.token) || '';
      wx.setStorageSync('X-OTP-TOKEN', otpToken);
      return api.createMember({
        salutation: SALUTATIONS[d.salutationIndex],
        firstName: d.firstName,
        lastName: d.lastName,
        businessEmail: d.email.trim(),
        password: d.password,
        promoCode: d.promoCode || ''
      }, otpToken, d.otp.trim());
    }).then(function (res) {
      if (!res || !res.token) throw new Error('Could not create the account.');
      auth.saveSession(res.token, res.id);
      return api.getMember(res.id).catch(function () { return null; });
    }).then(function (member) {
      self.setData({ loading: false });
      wx.removeStorageSync('X-CAPTCHA-VERIFIED');
      wx.removeStorageSync('X-OTP-TOKEN');
      if (member && !auth.isProfileComplete(member)) {
        wx.redirectTo({ url: '/pages/profile-edit/profile-edit?mode=complete' });
      } else {
        wx.redirectTo({ url: '/pages/dashboard/dashboard' });
      }
    }).catch(function (err) {
      self.setData({ loading: false, error: (err && (err.description || err.message)) || 'Could not create the account.' });
    });
  },
  goLogin() {
    wx.redirectTo({ url: '/pages/login/login' });
  }
});
