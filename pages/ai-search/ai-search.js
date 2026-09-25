const safeArea = require('../../services/safe-area.js');
const config = require('../../config.js');

Page({
  behaviors: [safeArea],
  data: {
    websiteUrl: config.h5Host || 'https://www.legaloneglobal.com'
  },
  copyLink() {
    wx.setClipboardData({ data: this.data.websiteUrl });
  },
  retry() {
    wx.showToast({ title: 'AI Search is currently unavailable', icon: 'none' });
  }
});
