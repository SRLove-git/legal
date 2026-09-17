const safeArea = require('../../services/safe-area.js');
const breadcrumb = require('../../services/breadcrumb.js');
const api = require('../../services/api.js');
const auth = require('../../services/auth.js');

Page({
  behaviors: [safeArea, breadcrumb],
  data: { original: '', next: '', confirm: '', error: '', loading: false, done: false },
  onLoad() {
    auth.requireLogin();
  },
  onField(e) {
    const patch = {};
    patch[e.currentTarget.dataset.key] = e.detail.value;
    this.setData(patch);
  },
  submit() {
    const d = this.data;
    if (!d.original) return this.setData({ error: 'Please enter your current password' });
    if (!api.passwordValid(d.next)) {
      return this.setData({ error: 'Password must be at least 8 characters and include an uppercase letter, a lowercase letter and a digit.' });
    }
    if (d.next !== d.confirm) return this.setData({ error: 'Passwords do not match' });
    const self = this;
    this.setData({ loading: true, error: '' });
    api.changePassword(auth.getMemberId(), d.original, d.next).then(function () {
      self.setData({ loading: false, done: true });
    }).catch(function (err) {
      self.setData({ loading: false, error: (err && (err.description || err.message)) || 'The password provided is incorrect' });
    });
  },
  back() {
    wx.navigateBack({ delta: 1 });
  }
});
