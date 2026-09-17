const api = require('../../services/api.js');

Page({
  data: { member: null, loading: true },
  onLoad() {
    const token = wx.getStorageSync('X-ACCESS-TOKEN');
    const memberId = wx.getStorageSync('memberId');
    if (!token || !memberId) {
      wx.redirectTo({ url: '/pages/login/login' });
      return;
    }
    this.load(memberId);
  },
  load(memberId) {
    const self = this;
    api.getMember(memberId).then(function (m) {
      self.setData({ member: m || {}, loading: false });
    }).catch(function () {
      self.setData({ loading: false });
      wx.showToast({ title: 'Failed to load profile', icon: 'none' });
    });
  },
  doLogout() {
    const memberId = wx.getStorageSync('memberId');
    const self = this;
    api.logout(memberId).then(function () {
      self.clearSession();
    }).catch(function () {
      self.clearSession();
    });
  },
  clearSession() {
    wx.removeStorageSync('X-ACCESS-TOKEN');
    wx.removeStorageSync('memberId');
    wx.reLaunch({ url: '/pages/index/index' });
  }
});
