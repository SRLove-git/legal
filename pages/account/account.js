const safeArea = require('../../services/safe-area.js');
const api = require('../../services/api.js');

Page({
  behaviors: [safeArea],
  data: { member: null, loading: true, verifications: [], dealSubs: [], awardSubs: [] },
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
      self.loadDashboard(memberId);
    }).catch(function () {
      self.setData({ loading: false });
      wx.showToast({ title: 'Failed to load profile', icon: 'none' });
    });
  },
  // Annex B §7 — dashboard lists, display at most 3 rows each
  loadDashboard(memberId) {
    const self = this;
    api.getVerifications(memberId).then(function (list) {
      self.setData({
        verifications: (list || []).slice(0, 3).map(function (v) {
          return {
            orderId: v.orderId,
            number: api.showVerificationNumber(v.status, v.id),
            status: api.verificationStatus(v.status, v.paymentStatus),
            submitted: v.submittedDate,
            expiry: v.expiry
          };
        })
      });
    }).catch(function () {});
    api.getDealSubmissions(memberId).then(function (list) {
      self.setData({
        dealSubs: (list || []).slice(0, 3).map(function (s) {
          return { name: s.dealName, date: s.creationDate, status: api.submissionStatus(s.status) };
        })
      });
    }).catch(function () {});
    api.getAwardSubmissions(memberId).then(function (list) {
      self.setData({
        awardSubs: (list || []).slice(0, 3).map(function (s) {
          return { name: s.awardName, date: s.creationDate, status: api.submissionStatus(s.status) };
        })
      });
    }).catch(function () {});
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
